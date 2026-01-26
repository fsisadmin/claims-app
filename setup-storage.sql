-- Create storage bucket for client logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('client-logos', 'client-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload logos for their organization
CREATE POLICY "Users can upload logos for their organization"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'client-logos' AND
  (storage.foldername(name))[1] = (
    SELECT organization_id::text
    FROM user_profiles
    WHERE id = auth.uid()
  )
);

-- Allow authenticated users to view logos from their organization
CREATE POLICY "Users can view logos from their organization"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'client-logos' AND
  (storage.foldername(name))[1] = (
    SELECT organization_id::text
    FROM user_profiles
    WHERE id = auth.uid()
  )
);

-- Allow public access to all logos (since bucket is public)
CREATE POLICY "Public can view all logos"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'client-logos');

-- Allow users to delete logos for their organization
CREATE POLICY "Users can delete logos for their organization"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'client-logos' AND
  (storage.foldername(name))[1] = (
    SELECT organization_id::text
    FROM user_profiles
    WHERE id = auth.uid()
  )
);
