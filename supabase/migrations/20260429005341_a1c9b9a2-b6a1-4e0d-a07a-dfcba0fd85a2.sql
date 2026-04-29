-- Inserir chaves de tamanho de fonte para 58mm (defaults aproximados aos atuais)
INSERT INTO public.app_settings (key, value) VALUES 
('paper_width_58_font_header', '12'),
('paper_width_58_font_items', '9'),
('paper_width_58_font_footer', '8')
ON CONFLICT (key) DO NOTHING;

-- Inserir chaves de tamanho de fonte para 80mm (defaults aproximados aos atuais)
INSERT INTO public.app_settings (key, value) VALUES 
('paper_width_80_font_header', '14'),
('paper_width_80_font_items', '11'),
('paper_width_80_font_footer', '10')
ON CONFLICT (key) DO NOTHING;