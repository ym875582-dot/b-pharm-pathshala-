
/* =========================================================
   B PHARM PATHSHALA
   Main JavaScript File
   Supabase Authentication, Notes & Admin Upload
   ========================================================= */

/*
  IMPORTANT:
  1. Replace SUPABASE_URL with your Supabase project URL.
  2. Replace SUPABASE_ANON_KEY with your Supabase publishable
     key (or legacy anon key).
  3. Never put your Supabase service_role/secret key here.
*/

// ---------------- SUPABASE CONFIGURATION ----------------

const SUPABASE_URL = "YOUR_SUPABASE_PROJECT_URL";
const SUPABASE_ANON_KEY = "YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY";

const NOTES_BUCKET = "notes-pdf";
const PRODUCTS_BUCKET = "product-images";

const supabaseClient =
  window.supabase &&
  SUPABASE_URL !== "YOUR_SUPABASE_PROJECT_URL" &&
  SUPABASE_ANON_KEY !== "YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY"
    ? window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_ANON_KEY
      )
    : null;

// ---------------- GLOBAL STATE ----------------

let currentUser = null;
let currentProfile = null;
let isAdmin = false;
let authMode = "login";
let allNotes = [];
let allProducts = [];

// ---------------- HELPER FUNCTIONS ----------------

function getElement(id) {
  return document.getElementById(id);
}

function showMessage(elementId, message, type = "info") {
  const element = getElement(elementId);
  if (!element) return;

  element.textContent = message;
  element.className = "message " + type;
  element.style.display = "block";
}

function clearMessage(elementId) {
  const element = getElement(elementId);
  if (!element) return;

  element.textContent = "";
  element.style.display = "none";
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    };

    return entities[character];
  });
}

function formatPrice(price) {
  const amount = Number(price);

  if (!Number.isFinite(amount) || amount <= 0) {
    return "Free";
  }

  return "₹" + amount.toLocaleString("en-IN");
}

function setButtonLoading(button, loading, loadingText = "Please wait...") {
  if (!button) return;

  if (loading) {
    button.dataset.originalText = button.textContent;
    button.disabled = true;
    button.textContent = loadingText;
  } else {
    button.disabled = false;

    if (button.dataset.originalText) {
      button.textContent = button.dataset.originalText;
      delete button.dataset.originalText;
    }
  }
}

function getFileExtension(fileName) {
  const parts = String(fileName).split(".");
  return parts.length > 1
    ? parts.pop().toLowerCase()
    : "";
}

function makeSafeFileName(fileName) {
  const extension = getFileExtension(fileName);
  const baseName = fileName
    .replace(/\.[^/.]+$/, "")
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);

  const uniqueId =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : Date.now() + "-" + Math.random().toString(36).slice(2);

  return `${uniqueId}-${baseName || "file"}${extension ? "." + extension : ""}`;
}

function isValidPDF(file) {
  return Boolean(
    file &&
    file.type === "application/pdf" &&
    file.size <= 25 * 1024 * 1024
  );
}

function isValidImage(file) {
  return Boolean(
    file &&
    ["image/jpeg", "image/png", "image/webp"].includes(file.type) &&
    file.size <= 5 * 1024 * 1024
  );
}

function showSetupWarning() {
  if (supabaseClient) return;

  console.error(
    "B Pharm Pathshala: Please configure SUPABASE_URL and SUPABASE_ANON_KEY in app.js."
  );
}

// ---------------- INITIALIZATION ----------------

document.addEventListener("DOMContentLoaded", async () => {
  showSetupWarning();
  setCurrentYear();
  setupNavigation();
  setupAuthModal();
  setupFilters();
  setupAdminForm();
  setupLogout();

  if (!supabaseClient) {
    showMessage(
      "adminMessage",
      "Supabase setup बाकी है। app.js में अपना Project URL और Publishable/anon key डालें।",
      "error"
    );
    return;
  }

  await initializeApplication();
});

function setCurrentYear() {
  const yearElement = getElement("year");

  if (yearElement) {
    yearElement.textContent = new Date().getFullYear();
  }
}

function setupNavigation() {
  const loginButton = getElement("loginBtn");

  if (loginButton) {
    loginButton.addEventListener("click", () => {
      openAuthModal("login");
    });
  }

  const toggleAuthButton = getElement("toggleAuthMode");

  if (toggleAuthButton) {
    toggleAuthButton.addEventListener("click", () => {
      switchAuthMode();
    });
  }
}

// ---------------- AUTHENTICATION ----------------

async function initializeApplication() {
  const {
    data: { session },
    error
  } = await supabaseClient.auth.getSession();

  if (error) {
    console.error("Session error:", error.message);
  }

  currentUser = session?.user ?? null;

  if (currentUser) {
    await loadUserProfile();
  } else {
    updateAuthenticationUI();
  }

  supabaseClient.auth.onAuthStateChange((_event, session) => {
    currentUser = session?.user ?? null;

    // Avoid awaiting Supabase requests directly inside this callback.
    setTimeout(async () => {
      if (currentUser) {
        await loadUserProfile();
      } else {
        currentProfile = null;
        isAdmin = false;
        updateAuthenticationUI();
        hideAdminDashboard();
      }
    }, 0);
  });

  await loadNotes();
  await loadProducts();
}

function setupAuthModal() {
  const authForm = getElement("authForm");

  if (authForm) {
    authForm.addEventListener("submit", handleAuthSubmit);
  }

  const modal = getElement("authModal");

  if (modal) {
    modal.addEventListener("click", (event) => {
      if (event.target === modal) {
        closeAuthModal();
      }
    });
  }

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeAuthModal();
    }
  });
}


function openAuthModal(mode = "login") {
  authMode = mode;

  const modal = getElement("authModal");

  if (!modal) {
    alert('Login window नहीं मिली। index.html में authModal ID जाँचें।');
    console.error('Missing element: authModal');
    return;
  }

  modal.classList.remove("hidden");
  modal.classList.add("active");
  modal.style.display = "flex";
  modal.setAttribute("aria-hidden", "false");

  updateAuthModalText();
  clearMessage("authMessage");

  const emailInput = getElement("authEmail");

  if (emailInput) {
    emailInput.focus();
  }
}

function closeAuthModal() {
    const modal = document.getElementById("authModal");
    modal.classList.remove("active");
    modal.style.display = "none";
}


function switchAuthMode() {
  authMode = authMode === "login" ? "signup" : "login";
  updateAuthModalText();
  clearMessage("authMessage");
}

function updateAuthModalText() {
  const title = getElement("modalTitle");
  const submitButton = getElement("authSubmitBtn");
  const toggleButton = getElement("toggleAuthMode");

  if (title) {
    title.textContent =
      authMode === "login"
        ? "Login to B Pharm Pathshala"
        : "Create Your Account";
  }

  if (submitButton) {
    submitButton.textContent =
      authMode === "login" ? "Login" : "Sign Up";
  }

  if (toggleButton) {
    toggleButton.textContent =
      authMode === "login"
        ? "Don't have an account? Sign Up"
        : "Already have an account? Login";
  }
}

async function handleAuthSubmit(event) {
  event.preventDefault();

  if (!supabaseClient) {
    showMessage(
      "authMessage",
      "Supabase configuration missing है।",
      "error"
    );
    return;
  }

  const email = getElement("authEmail")?.value.trim();
  const password = getElement("authPassword")?.value;
  const submitButton = getElement("authSubmitBtn");

  if (!email || !password) {
    showMessage(
      "authMessage",
      "Email और password दोनों भरें।",
      "error"
    );
    return;
  }

  if (password.length < 6) {
    showMessage(
      "authMessage",
      "Password कम से कम 6 characters का होना चाहिए।",
      "error"
    );
    return;
  }

  setButtonLoading(submitButton, true);

  try {
    if (authMode === "signup") {
      const { data, error } =
        await supabaseClient.auth.signUp({
          email,
          password
        });

      if (error) throw error;

      if (data.session) {
        showMessage(
          "authMessage",
          "Account बन गया! आप login हो गए हैं।",
          "success"
        );
        closeAuthModal();
      } else {
        showMessage(
          "authMessage",
          "Account बनाने के लिए email confirmation link देखें।",
          "success"
        );
      }
    } else {
      const { error } =
        await supabaseClient.auth.signInWithPassword({
          email,
          password
        });

      if (error) throw error;

      showMessage(
        "authMessage",
        "Login successful!",
        "success"
      );

      closeAuthModal();
    }
  } catch (error) {
    console.error("Authentication error:", error);

    showMessage(
      "authMessage",
      error.message || "Authentication failed. फिर कोशिश करें।",
      "error"
    );
  } finally {
    setButtonLoading(submitButton, false);
  }
}

async function setupLogout() {
  const logoutButton = getElement("logoutBtn");

  if (!logoutButton) return;

  logoutButton.addEventListener("click", async () => {
    if (!supabaseClient) return;

    const { error } = await supabaseClient.auth.signOut();

    if (error) {
      console.error("Logout error:", error.message);
      alert("Logout नहीं हो सका। दोबारा कोशिश करें।");
    } else {
      currentUser = null;
      currentProfile = null;
      isAdmin = false;
      updateAuthenticationUI();
      hideAdminDashboard();
    }
  });
}

// ---------------- USER PROFILE & ADMIN ----------------

async function loadUserProfile() {
  if (!currentUser || !supabaseClient) return;

  const { data, error } = await supabaseClient
    .from("profiles")
    .select("id, email, role")
    .eq("id", currentUser.id)
    .maybeSingle();

  if (error) {
    console.error("Profile error:", error.message);
  }

  currentProfile = data ?? null;
  isAdmin = currentProfile?.role === "admin";

  updateAuthenticationUI();

  if (isAdmin) {
    showAdminDashboard();
  } else {
    hideAdminDashboard();
  }
}

function updateAuthenticationUI() {
  const loginButton = getElement("loginBtn");
  const userProfile = getElement("userProfile");
  const emailDisplay = getElement("userEmailDisplay");
  const logoutButton = getElement("logoutBtn");

  if (loginButton) {
    loginButton.style.display = currentUser ? "none" : "inline-flex";
  }

  if (userProfile) {
    userProfile.style.display = currentUser ? "flex" : "none";
  }

  if (emailDisplay) {
    emailDisplay.textContent =
      currentUser?.email || "";
  }

  if (logoutButton) {
    logoutButton.style.display = currentUser ? "inline-flex" : "none";
  }
}

function showAdminDashboard() {
  const dashboard = getElement("adminDashboard");

  if (dashboard && isAdmin) {
    dashboard.style.display = "block";
  }
}

function hideAdminDashboard() {
  const dashboard = getElement("adminDashboard");

  if (dashboard) {
    dashboard.style.display = "none";
  }
}

// ---------------- NOTES: LOAD & DISPLAY ----------------

async function loadNotes() {
  if (!supabaseClient) return;

  const container = getElement("notesContainer");

  if (container) {
    container.innerHTML = "<p>Loading notes...</p>";
  }

  const { data, error } = await supabaseClient
    .from("notes")
    .select("*")
    .eq("is_published", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Load notes error:", error.message);

    if (container) {
      container.innerHTML =
        "<p>Notes load नहीं हो पाए। Supabase tables और policies जाँचें।</p>";
    }

    return;
  }

  allNotes = data || [];

  renderNotes();
  updateNotesCount();
}

function renderNotes() {
  const container = getElement("notesContainer");
  if (!container) return;

  const course = getElement("courseFilter")?.value || "all";
  const semester = getElement("semesterFilter")?.value || "all";
  const searchTerm =
    getElement("noteSearch")?.value.trim().toLowerCase() || "";

  const filteredNotes = allNotes.filter((note) => {
    const matchesCourse =
      course === "all" ||
      String(note.course || "").toLowerCase() === course.toLowerCase();

    const matchesSemester =
      semester === "all" ||
      String(note.semester || "") === String(semester);

    const searchableText = [
      note.title,
      note.course,
      note.semester,
      note.subject,
      note.description
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    const matchesSearch = searchableText.includes(searchTerm);

    return matchesCourse && matchesSemester && matchesSearch;
  });

  if (filteredNotes.length === 0) {
    container.innerHTML =
      "<p class='empty-state'>कोई notes नहीं मिले। Filter बदलकर देखें।</p>";
    return;
  }

  container.innerHTML = filteredNotes
    .map((note) => {
      const title = escapeHTML(note.title || "Untitled Notes");
      const courseName = escapeHTML(note.course || "B.Pharm");
      const semesterName = escapeHTML(note.semester || "");
      const subject = escapeHTML(note.subject || "General");
      const description = escapeHTML(note.description || "");
      const pdfUrl = safeHttpUrl(note.file_url);

      return `
        <article class="note-card">
          <div class="card-content">
            <span class="card-badge">${courseName}</span>
            <h3>${title}</h3>
            <p><strong>Semester:</strong> ${semesterName || "N/A"}</p>
            <p><strong>Subject:</strong> ${subject}</p>
            ${description ? `<p>${description}</p>` : ""}
            <div class="card-actions">
              ${
                pdfUrl
                  ? `<a class="btn btn-primary" href="${escapeHTML(pdfUrl)}"
                       target="_blank" rel="noopener noreferrer">
                       View PDF
                     </a>`
                  : "<span>PDF link unavailable</span>"
              }
            </div>
          </div>
        </article>
      `;
    })
    .join("");
}

function updateNotesCount() {
  const countElement = getElement("notesCount");

  if (countElement) {
    countElement.textContent = allNotes.length;
  }
}

function setupFilters() {
  ["courseFilter", "semesterFilter", "noteSearch"].forEach((id) => {
    const element = getElement(id);

    if (!element) return;

    element.addEventListener("input", renderNotes);
    element.addEventListener("change", renderNotes);
  });
}

// ---------------- PRODUCTS: LOAD & DISPLAY ----------------

async function loadProducts() {
  if (!supabaseClient) return;

  const container = getElement("productContainer");

  if (container) {
    container.innerHTML = "<p>Loading products...</p>";
  }

  const { data, error } = await supabaseClient
    .from("products")
    .select("*")
    .eq("is_published", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Load products error:", error.message);

    if (container) {
      container.innerHTML =
        "<p>Products अभी load नहीं हो पाए।</p>";
    }

    return;
  }

  allProducts = data || [];
  renderProducts();
}

function renderProducts() {
  const container = getElement("productContainer");
  if (!container) return;

  if (allProducts.length === 0) {
    container.innerHTML =
      "<p class='empty-state'>अभी कोई product उपलब्ध नहीं है।</p>";
    return;
  }

  container.innerHTML = allProducts
    .map((product) => {
      const title = escapeHTML(product.title || "Study Product");
      const description = escapeHTML(product.description || "");
      const price = formatPrice(product.price);
      const imageUrl = safeHttpUrl(product.image_url);

      return `
        <article class="product-card">
          ${
            imageUrl
              ? `<img class="product-image"
                     src="${escapeHTML(imageUrl)}"
                     alt="${title}"
                     loading="lazy">`
              : ""
          }
          <div class="card-content">
            <h3>${title}</h3>
            ${description ? `<p>${description}</p>` : ""}
            <p class="product-price">${escapeHTML(price)}</p>
          </div>
        </article>
      `;
    })
    .join("");
}

function safeHttpUrl(value) {
  if (!value) return "";

  try {
    const url = new URL(value, window.location.href);

    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return "";
    }

    return url.href;
  } catch {
    return "";
  }
}

// ---------------- ADMIN FORM SETUP ----------------

function setupAdminForm() {
  const typeSelect = getElement("adminType");

  if (typeSelect) {
    typeSelect.addEventListener("change", updateAdminFormFields);
    updateAdminFormFields();
  }

  const form = getElement("adminForm");

  if (form) {
    form.addEventListener("submit", handleAdminUpload);
  }
}

function updateAdminFormFields() {
  const type = getElement("adminType")?.value || "note";
  const noteFields = getElement("noteFields");
  const priceField = getElement("priceField");
  const fileInput = getElement("adminFile");

  const isNote = type === "note";

  if (noteFields) {
    noteFields.style.display = isNote ? "block" : "none";
  }

  if (priceField) {
    priceField.style.display = isNote ? "none" : "block";
  }

  if (fileInput) {
    fileInput.accept = isNote ? ".pdf,application/pdf" : "image/jpeg,image/png,image/webp";
  }
}

// ---------------- ADMIN: UPLOAD NOTES / PRODUCTS ----------------

async function handleAdminUpload(event) {
  event.preventDefault();

  if (!supabaseClient) {
    showMessage("adminMessage", "Supabase configured नहीं है।", "error");
    return;
  }

  if (!currentUser || !isAdmin) {
    showMessage(
      "adminMessage",
      "Upload करने के लिए admin account से login करें।",
      "error"
    );
    return;
  }

  const type = getElement("adminType")?.value || "note";
  const title = getElement("adminTitle")?.value.trim();
  const file = getElement("adminFile")?.files?.[0];
  const messageId = "adminMessage";
  const submitButton = event.submitter;

  if (!title) {
    showMessage(messageId, "Title भरना ज़रूरी है।", "error");
    return;
  }

  if (!file) {
    showMessage(messageId, "कृपया file चुनें।", "error");
    return;
  }

  if (type === "note" && !isValidPDF(file)) {
    showMessage(
      messageId,
      "Notes के लिए केवल PDF file (अधिकतम 25 MB) चुनें।",
      "error"
    );
    return;
  }

  if (type === "product" && !isValidImage(file)) {
    showMessage(
      messageId,
      "Product के लिए JPG, PNG या WEBP image (अधिकतम 5 MB) चुनें।",
      "error"
    );
    return;
  }

  setButtonLoading(submitButton, true, "Uploading...");

  try {
    const bucket = type === "note" ? NOTES_BUCKET : PRODUCTS_BUCKET;
    const filePath = makeSafeFileName(file.name);

    const { error: uploadError } = await supabaseClient.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type
      });

    if (uploadError) throw uploadError;

    const {
      data: { publicUrl }
    } = supabaseClient.storage.from(bucket).getPublicUrl(filePath);

    if (!publicUrl) {
      throw new Error("File URL नहीं मिल पाया। Storage bucket जाँचें।");
    }

    if (type === "note") {
      await saveNoteRecord(publicUrl);
      await loadNotes();
    } else {
      await saveProductRecord(publicUrl);
      await loadProducts();
    }

    const form = getElement("adminForm");

    if (form) {
      form.reset();
    }

    updateAdminFormFields();

    showMessage(
      messageId,
      type === "note"
        ? "Notes PDF सफलतापूर्वक upload हो गई।"
        : "Product image सफलतापूर्वक upload हो गई।",
      "success"
    );
  } catch (error) {
    console.error("Admin upload error:", error);

    showMessage(
      messageId,
      error.message || "Upload असफल रहा। Supabase policies और bucket जाँचें।",
      "error"
    );
  } finally {
    setButtonLoading(submitButton, false);
  }
}

async function saveNoteRecord(fileUrl) {
  const title = getElement("adminTitle")?.value.trim();
  const course = getElement("adminCourse")?.value || "B.Pharm";
  const semester = getElement("adminSemester")?.value || "";
  const subject = getElement("adminSubject")?.value.trim() || "";
  const description = "";

  const { error } = await supabaseClient
    .from("notes")
    .insert({
      title,
      course,
      semester,
      subject,
      description,
      file_url: fileUrl,
      is_published: true,
      created_by: currentUser.id
    });

  if (error) throw error;
}

async function saveProductRecord(imageUrl) {
  const title = getElement("adminTitle")?.value.trim();
  const description = "";
  const price = Number(getElement("adminPrice")?.value || 0);

  if (!Number.isFinite(price) || price < 0) {
    throw new Error("Product price सही भरें।");
  }

  const { error } = await supabaseClient
    .from("products")
    .insert({
      title,
      description,
      price,
      image_url: imageUrl,
      is_published: true,
      created_by: currentUser.id
    });

  if (error) throw error;
}
document.addEventListener("DOMContentLoaded", () => {
    const closeBtn = document.querySelector(
        "#authModal .close-btn, #authModal .close, #authModal .modal-close"
    );

    if (closeBtn) {
        closeBtn.addEventListener("click", closeAuthModal);
    }

    const modal = document.getElementById("authModal");

    if (modal) {
        modal.addEventListener("click", (event) => {
            if (event.target === modal) {
                closeAuthModal();
            }
        });
    }
});
// ---------------- END OF APP.JS ----------------

