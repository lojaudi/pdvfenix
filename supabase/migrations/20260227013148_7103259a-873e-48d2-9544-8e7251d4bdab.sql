
-- Restrict delivery_zones: replace public SELECT with authenticated-only
DROP POLICY IF EXISTS "Staff can view delivery zones" ON public.delivery_zones;

CREATE POLICY "Authenticated users can view delivery zones"
ON public.delivery_zones
FOR SELECT
TO authenticated
USING (true);

-- Restrict app_settings: replace public SELECT with authenticated-only
DROP POLICY IF EXISTS "Anyone can view settings" ON public.app_settings;

CREATE POLICY "Authenticated users can view settings"
ON public.app_settings
FOR SELECT
TO authenticated
USING (true);
