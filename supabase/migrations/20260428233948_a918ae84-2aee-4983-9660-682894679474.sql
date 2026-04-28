INSERT INTO public.app_settings (key, value, updated_at)
VALUES 
  ('paper_width_58_margin_top', '0', now()),
  ('paper_width_58_margin_left', '0', now()),
  ('paper_width_58_offset_x', '0', now()),
  ('paper_width_58_offset_y', '0', now()),
  ('paper_width_80_margin_top', '0', now()),
  ('paper_width_80_margin_left', '0', now()),
  ('paper_width_80_offset_x', '0', now()),
  ('paper_width_80_offset_y', '0', now())
ON CONFLICT (key) DO NOTHING;
