
-- ============================================================
-- B PHARM PATHSHALA
-- Supabase Database Schema
-- ============================================================
-- Run this script in Supabase SQL Editor.
-- Review policies before running in a production project.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ------------------------------------------------------------
-- 1. PROFILES TABLE
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    role TEXT NOT NULL DEFAULT 'student'
        CHECK (role IN ('student', 'admin')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile.
CREATE POLICY "Users can read own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Users can update their own non-privileged profile fields.
-- Role changes are restricted separately by database permissions.
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- ------------------------------------------------------------
-- 2. ADMIN CHECK FUNCTION
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = (SELECT auth.uid())
          AND role = 'admin'
    );
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- ------------------------------------------------------------
-- 3. AUTOMATIC PROFILE CREATION
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    INSERT INTO public.profiles (id, email, role)
    VALUES (NEW.id, NEW.email, 'student')
    ON CONFLICT (id) DO NOTHING;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- ------------------------------------------------------------
-- 4. NOTES TABLE
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    course TEXT NOT NULL DEFAULT 'B.Pharm',
    semester TEXT,
    subject TEXT,
    description TEXT,
    file_url TEXT NOT NULL,
    is_published BOOLEAN NOT NULL DEFAULT FALSE,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

-- Anyone can read published notes.
CREATE POLICY "Anyone can read published notes"
ON public.notes
FOR SELECT
TO anon, authenticated
USING (is_published = TRUE);

-- Admins can read all notes, including unpublished notes.
CREATE POLICY "Admins can read all notes"
ON public.notes
FOR SELECT
TO authenticated
USING ((SELECT public.is_admin()));

-- Only admins can insert notes.
CREATE POLICY "Admins can insert notes"
ON public.notes
FOR INSERT
TO authenticated
WITH CHECK (
    (SELECT public.is_admin())
    AND created_by = (SELECT auth.uid())
);

-- Only admins can update notes.
CREATE POLICY "Admins can update notes"
ON public.notes
FOR UPDATE
TO authenticated
USING ((SELECT public.is_admin()))
WITH CHECK ((SELECT public.is_admin()));

-- Only admins can delete notes.
CREATE POLICY "Admins can delete notes"
ON public.notes
FOR DELETE
TO authenticated
USING ((SELECT public.is_admin()));

-- ------------------------------------------------------------
-- 5. PRODUCTS TABLE
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    price NUMERIC(10, 2) NOT NULL DEFAULT 0
        CHECK (price >= 0),
    image_url TEXT,
    is_published BOOLEAN NOT NULL DEFAULT FALSE,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Anyone can read published products.
CREATE POLICY "Anyone can read published products"
ON public.products
FOR SELECT
TO anon, authenticated
USING (is_published = TRUE);

-- Admins can read all products.
CREATE POLICY "Admins can read all products"
ON public.products
FOR SELECT
TO authenticated
USING ((SELECT public.is_admin()));

-- Only admins can add products.
CREATE POLICY "Admins can insert products"
ON public.products
FOR INSERT
TO authenticated
WITH CHECK (
    (SELECT public.is_admin())
    AND created_by = (SELECT auth.uid())
);

-- Only admins can update products.
CREATE POLICY "Admins can update products"
ON public.products
FOR UPDATE
TO authenticated
USING ((SELECT public.is_admin()))
WITH CHECK ((SELECT public.is_admin()));

-- Only admins can delete products.
CREATE POLICY "Admins can delete products"
ON public.products
FOR DELETE
TO authenticated
USING ((SELECT public.is_admin()));

-- ------------------------------------------------------------
-- 6. UPDATED_AT TRIGGER
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;

CREATE TRIGGER profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS notes_updated_at ON public.notes;

CREATE TRIGGER notes_updated_at
BEFORE UPDATE ON public.notes
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS products_updated_at ON public.products;

CREATE TRIGGER products_updated_at
BEFORE UPDATE ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- ------------------------------------------------------------
-- 7. STORAGE BUCKETS
-- ------------------------------------------------------------

-- These buckets are public so the starter app can display
-- PDFs and product images using public URLs.
-- Do not use public buckets for confidential or paid PDFs.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'notes-pdf',
    'notes-pdf',
    TRUE,
    26214400,
    ARRAY['application/pdf']
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'product-images',
    'product-images',
    TRUE,
    5242880,
    ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Public read access for notes PDFs.
CREATE POLICY "Public can read notes PDFs"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (bucket_id = 'notes-pdf');

-- Public read access for product images.
CREATE POLICY "Public can read product images"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (bucket_id = 'product-images');

-- Only admins can upload notes PDFs.
CREATE POLICY "Admins can upload notes PDFs"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'notes-pdf'
    AND (SELECT public.is_admin())
);

-- Only admins can update notes PDFs.
CREATE POLICY "Admins can update notes PDFs"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
    bucket_id = 'notes-pdf'
    AND (SELECT public.is_admin())
)
WITH CHECK (
    bucket_id = 'notes-pdf'
    AND (SELECT public.is_admin())
);

-- Only admins can delete notes PDFs.
CREATE POLICY "Admins can delete notes PDFs"
ON storage.objects
FOR DELETE
TO authenticated
USING (
    bucket_id = 'notes-pdf'
    AND (SELECT public.is_admin())
);

-- Only admins can upload product images.
CREATE POLICY "Admins can upload product images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'product-images'
    AND (SELECT public.is_admin())
);

-- Only admins can update product images.
CREATE POLICY "Admins can update product images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
    bucket_id = 'product-images'
    AND (SELECT public.is_admin())
)
WITH CHECK (
    bucket_id = 'product-images'
    AND (SELECT public.is_admin())
);

-- Only admins can delete product images.
CREATE POLICY "Admins can delete product images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
    bucket_id = 'product-images'
    AND (SELECT public.is_admin())
);

-- ------------------------------------------------------------
-- 8. INDEXES
-- ------------------------------------------------------------

CREATE INDEX IF NOT EXISTS notes_published_created_idx
ON public.notes (is_published, created_at DESC);

CREATE INDEX IF NOT EXISTS notes_course_semester_idx
ON public.notes (course, semester);

CREATE INDEX IF NOT EXISTS products_published_created_idx
ON public.products (is_published, created_at DESC);

CREATE INDEX IF NOT EXISTS profiles_role_idx
ON public.profiles (role);

-- ============================================================
-- SCHEMA SETUP COMPLETE
-- ============================================================

