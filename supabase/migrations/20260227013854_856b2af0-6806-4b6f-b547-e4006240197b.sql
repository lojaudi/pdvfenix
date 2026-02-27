
-- Allow anon users to read app_settings (public menu needs store config)
CREATE POLICY "Anon can view settings"
ON public.app_settings
FOR SELECT
TO anon
USING (true);

-- Allow anon users to read delivery_zones (public menu needs delivery fees)
CREATE POLICY "Anon can view delivery zones"
ON public.delivery_zones
FOR SELECT
TO anon
USING (true);
