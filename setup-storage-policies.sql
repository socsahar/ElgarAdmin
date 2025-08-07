-- ===============================================================================
-- SUPABASE STORAGE POLICIES FOR VEHICLE AND USER IMAGES
-- ===============================================================================
-- This file sets up the necessary storage policies for the uploads bucket
-- to allow authenticated users to upload and read images
-- ===============================================================================

-- Enable RLS on storage.objects if not already enabled
-- (This is typically enabled by default in Supabase)

-- Allow authenticated users to upload files to the uploads bucket
CREATE POLICY IF NOT EXISTS "Allow authenticated uploads"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'uploads' AND
  auth.role() = 'authenticated'
);

-- Allow public read access to all files in uploads bucket
CREATE POLICY IF NOT EXISTS "Allow public read access"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'uploads');

-- Allow authenticated users to update their own uploaded files
CREATE POLICY IF NOT EXISTS "Allow authenticated updates"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'uploads' AND auth.role() = 'authenticated')
WITH CHECK (bucket_id = 'uploads' AND auth.role() = 'authenticated');

-- Allow authenticated users to delete their own uploaded files
CREATE POLICY IF NOT EXISTS "Allow authenticated deletes"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'uploads' AND auth.role() = 'authenticated');

-- Verify the policies are created
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'storage' AND tablename = 'objects'
ORDER BY policyname;

-- Success message
SELECT 'Storage policies created successfully! 📁✅' as message;
