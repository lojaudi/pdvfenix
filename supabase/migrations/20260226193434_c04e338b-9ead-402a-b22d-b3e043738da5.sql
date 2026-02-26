-- Add pix_maquina to payment_method enum
ALTER TYPE public.payment_method ADD VALUE IF NOT EXISTS 'pix_maquina';
