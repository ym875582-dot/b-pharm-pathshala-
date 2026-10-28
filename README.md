
# 📚 B Pharm Pathshala

### Your Learning Partner for Pharmacy Education

**B Pharm Pathshala** is an educational platform designed to help B.Pharm and D.Pharm students access study notes, semester-wise learning materials, important questions, and pharmacy-related resources.

🌐 **Website:** Add your GitHub Pages URL here  
📖 **Courses:** B.Pharm and D.Pharm  
📱 **Design:** Mobile-friendly and responsive

---

## ✨ Features

- 📚 Semester-wise pharmacy study notes
- 🎓 B.Pharm and D.Pharm study resources
- 🔍 Search notes by title or subject
- 🧪 Course and semester filters
- 📄 PDF notes viewing
- 🔐 User registration and login
- 👨‍💻 Admin dashboard for uploading study materials
- 🖼️ Product image and listing support
- 📱 Responsive design for mobile, tablet, and desktop
- ☁️ Supabase database and file storage
- 🚀 GitHub Pages hosting support

---

## 📂 Project Structure

```text
B-Pharm-Pathshala/
│
├── index.html
├── style.css
├── app.js
├── supabase-schema.sql
└── README.md
```

### File Description

| File | Purpose |
|---|---|
| `index.html` | Website structure and page content |
| `style.css` | Website design and responsive layout |
| `app.js` | Login, notes, products, and admin upload logic |
| `supabase-schema.sql` | Database tables, security policies, and storage setup |
| `README.md` | Project documentation |

---

## 🛠️ Technologies Used

- HTML5
- CSS3
- JavaScript
- Supabase Authentication
- Supabase PostgreSQL Database
- Supabase Storage
- GitHub Pages

---

## 🚀 Getting Started

### Step 1: Create a GitHub Repository

1. Log in to your GitHub account.
2. Create a new repository.
3. You can name it `B-Pharm-Pathshala`.
4. Upload the project files to the repository's root folder.

### Step 2: Set Up Supabase

1. Open [Supabase](https://supabase.com/).
2. Create a new project.
3. Open the SQL Editor in your project dashboard.
4. Copy the contents of `supabase-schema.sql`.
5. Run the SQL script after reviewing it.

Make sure the required database tables and storage buckets are created successfully.

### Step 3: Configure Supabase in `app.js`

Open `app.js` and find these lines:

```javascript
const SUPABASE_URL = "YOUR_SUPABASE_PROJECT_URL";
const SUPABASE_ANON_KEY = "YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY";
```

Replace the placeholder values with your own Supabase project URL and publishable key, or legacy anon key.

**Security:** Never put your Supabase `service_role` key or any secret key in frontend JavaScript.

### Step 4: Add Supabase JavaScript Library

Make sure the following script tags appear near the end of `index.html`, before the closing `</body>` tag:

```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="app.js"></script>
```

The Supabase library must load before `app.js`.

### Step 5: Configure Authentication URLs

In Supabase, open the Authentication URL configuration settings.

Set your deployed GitHub Pages address as the site URL and add the relevant local and deployed URLs to the allowed redirect URLs.

Example format:

```text
https://YOUR-GITHUB-USERNAME.github.io/B-Pharm-Pathshala/
```

Replace `YOUR-GITHUB-USERNAME` with your GitHub username and adjust the repository name if needed.

### Step 6: Enable GitHub Pages

1. Open your GitHub repository.
2. Go to **Settings**.
3. Select **Pages**.
4. Under Build and deployment, select **Deploy from a branch**.
5. Select branch `main`.
6. Select folder `/(root)`.
7. Click **Save**.

Wait for GitHub Pages to publish the website. Open the URL displayed in the Pages settings.

---

## 🗃️ Database and Storage

The starter project expects the following Supabase resources:

### Database tables

- `profiles` — user profile and role information
- `notes` — study notes and PDF links
- `products` — product listings and image links

### Storage buckets

- `notes-pdf` — PDF study notes
- `product-images` — product images

The SQL schema must define the required columns and Row Level Security (RLS) policies.

**Important:** Public storage URLs can be accessed by anyone who has the URL. Do not upload confidential documents or paid PDFs that must remain private to a restricted bucket.

---

## 👨‍💻 Admin Setup

New users should have the normal student role by default.

To grant admin access:

1. Create an account on your website.
2. Open Supabase Dashboard.
3. Go to Authentication → Users.
4. Find your account and copy its user UUID.
5. Open SQL Editor.
6. Run the following query, replacing the placeholder with your own UUID:

```sql
UPDATE public.profiles
SET role = 'admin'
WHERE id = 'YOUR-AUTH-USER-UUID';
```

Use this only for an account you control. Never give admin access to an untrusted user.

The admin dashboard is intended for uploading notes and product images. Additional features such as editing, deleting, payments, and private paid-PDF access may require further development.

---

## 📖 Educational Content

The platform is intended to organize resources for:

- B.Pharm semester-wise subjects
- D.Pharm study materials
- Important examination questions
- Pharmacy notes and reference materials
- Practical and assignment resources

Students should also consult their university syllabus, prescribed textbooks, and official academic notices.

---

## 🔒 Security Notes

- Never expose service-role or secret keys in client-side code.
- Keep Row Level Security enabled on database tables.
- Restrict database insert, update, and delete permissions to authorized users.
- Restrict file uploads to verified admins.
- Validate uploaded file types and file sizes.
- Do not rely only on hiding the admin dashboard in JavaScript; enforce permissions in Supabase policies.
- Do not store passwords directly in your database.
- Do not use public storage for confidential or paid content that requires access control.

---

## 🧰 Troubleshooting

### Website opens but the design is missing

- Confirm that `style.css` exists in the repository root.
- Check that `index.html` contains:

```html
<link rel="stylesheet" href="style.css">
```

### Login or signup is not working

- Check the Supabase project URL and publishable/anon key.
- Check Supabase Authentication settings.
- Check the browser console for error messages.
- Confirm the configured site URL and redirect URLs.

### Notes are not loading

- Confirm that the `notes` table exists.
- Check the column names used in `app.js`.
- Check Row Level Security policies.
- Confirm that the notes are published.

### File upload is failing

- Confirm that the `notes-pdf` and `product-images` buckets exist.
- Check storage permissions and admin role.
- Verify the file type and size limits.
- Check the browser console and Supabase logs.

---

## 🗺️ Future Improvements

Possible future additions include:

- Admin edit and delete controls
- Better subject-wise organization
- Download tracking
- Private PDF access for paid resources
- Payment gateway integration
- Student dashboard
- Important question collections
- Improved accessibility and search
- User profile management

---

## 👨‍🏫 Project Maintainer

**Yash Sir**  
**Project:** B Pharm Pathshala

A learning resource project for pharmacy students.

---

## 📜 Disclaimer

B Pharm Pathshala is an educational project. Students should verify syllabus details, examination schedules, and academic requirements with their university or relevant official authority.

Use of third-party study materials must comply with the applicable copyright and licensing terms.

---

## ⭐ Support the Project

If you find this project useful, you can star the repository on GitHub and share it with other pharmacy students.

**Learn • Practice • Progress**
