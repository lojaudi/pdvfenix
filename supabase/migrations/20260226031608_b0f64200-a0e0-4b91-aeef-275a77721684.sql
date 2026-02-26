
-- Create storage bucket for restaurant assets
INSERT INTO storage.buckets (id, name, public) VALUES ('restaurant-assets', 'restaurant-assets', true);

-- Allow anyone to view files
CREATE POLICY "Public can view restaurant assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'restaurant-assets');

-- Only admins can upload/update/delete
CREATE POLICY "Admins can upload restaurant assets"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'restaurant-assets' AND public.is_admin(auth.uid()));

CREATE POLICY "Admins can update restaurant assets"
ON storage.objects FOR UPDATE
USING (bucket_id = 'restaurant-assets' AND public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete restaurant assets"
ON storage.objects FOR DELETE
USING (bucket_id = 'restaurant-assets' AND public.is_admin(auth.uid()));
