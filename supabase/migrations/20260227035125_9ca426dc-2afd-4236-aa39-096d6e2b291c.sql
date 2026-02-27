-- Fix: allow deleting drivers by setting driver_id to NULL on related delivery_details
ALTER TABLE public.delivery_details
  DROP CONSTRAINT delivery_details_driver_id_fkey;

ALTER TABLE public.delivery_details
  ADD CONSTRAINT delivery_details_driver_id_fkey
  FOREIGN KEY (driver_id) REFERENCES public.delivery_drivers(id) ON DELETE SET NULL;