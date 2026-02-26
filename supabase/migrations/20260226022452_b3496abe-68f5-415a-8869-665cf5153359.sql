
-- Key-value settings table for restaurant configuration
CREATE TABLE public.app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Everyone can read settings (needed by public menu)
CREATE POLICY "Anyone can view settings"
  ON public.app_settings FOR SELECT
  USING (true);

-- Only admins can modify
CREATE POLICY "Admins can insert settings"
  ON public.app_settings FOR INSERT
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can update settings"
  ON public.app_settings FOR UPDATE
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can delete settings"
  ON public.app_settings FOR DELETE
  USING (is_admin(auth.uid()));

-- Seed default WhatsApp number
INSERT INTO public.app_settings (key, value) VALUES ('whatsapp_number', '');
