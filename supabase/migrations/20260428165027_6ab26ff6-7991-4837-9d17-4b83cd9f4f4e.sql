INSERT INTO public.app_settings (key, value) 
VALUES ('paper_width', '80')
ON CONFLICT (key) DO NOTHING;