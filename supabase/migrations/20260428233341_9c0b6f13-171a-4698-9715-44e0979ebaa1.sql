INSERT INTO public.app_settings (key, value, updated_at)
VALUES 
  ('receipt_margin_top', '0', now()),
  ('receipt_margin_left', '0', now()),
  ('receipt_offset_x', '0', now()),
  ('receipt_offset_y', '0', now())
ON CONFLICT (key) DO NOTHING;
