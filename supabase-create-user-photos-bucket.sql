-- ============================================================================
-- Supabase Storage: Create User Photos Bucket
-- ============================================================================
-- This SQL creates the user-photos storage bucket for profile photos
--
-- IMPORTANT: Run this in your Supabase SQL Editor
-- Dashboard → SQL Editor → New Query → Paste and Run
-- ============================================================================

-- Create the user-photos bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'user-photos',
  'user-photos',
  true,  -- Make bucket public so photos are accessible
  52428800,  -- 50MB file size limit (in bytes)
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
ON CONFLICT (id) DO UPDATE
SET
  public = true,
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

-- ============================================================================
-- Storage Policies for User Photos
-- ============================================================================

-- Allow anyone to upload photos to their own folder
CREATE POLICY "Allow users to upload their own photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'user-photos'
);

-- Allow anyone to read photos (since bucket is public)
CREATE POLICY "Allow public read access to photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'user-photos');

-- Allow users to update their own photos
CREATE POLICY "Allow users to update their own photos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'user-photos')
WITH CHECK (bucket_id = 'user-photos');

-- Allow users to delete their own photos
CREATE POLICY "Allow users to delete their own photos"
ON storage.objects FOR DELETE
USING (bucket_id = 'user-photos');

-- ============================================================================
-- Verification
-- ============================================================================

-- Verify the bucket was created
SELECT * FROM storage.buckets WHERE id = 'user-photos';

-- Verify the policies were created
SELECT * FROM pg_policies WHERE tablename = 'objects' AND policyname LIKE '%photo%';

-- ============================================================================
-- NOTES
-- ============================================================================
-- After running this script:
-- 1. The user-photos bucket will be created and configured
-- 2. Public access is enabled so profile photos are visible to everyone
-- 3. File size limit is 50MB to support HD photos
-- 4. Accepted formats: JPEG, PNG, WebP, HEIC, HEIF
-- 5. Anyone can upload, read, update, or delete photos (adjust policies as needed)
--
-- OPTIONAL: If you want to restrict uploads to authenticated users only:
-- DROP POLICY "Allow users to upload their own photos" ON storage.objects;
-- CREATE POLICY "Authenticated users can upload photos"
-- ON storage.objects FOR INSERT
-- WITH CHECK (
--   bucket_id = 'user-photos' AND
--   auth.role() = 'authenticated'
-- );
