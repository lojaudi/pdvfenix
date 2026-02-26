-- Permitir que entregadores vejam suas próprias entregas
DROP POLICY IF EXISTS "Drivers can view own deliveries" ON public.delivery_details;

CREATE POLICY "Drivers can view own deliveries"
ON public.delivery_details
FOR SELECT
TO authenticated
USING (driver_id IN (SELECT id FROM public.delivery_drivers WHERE user_id = auth.uid()));

-- Permitir que entregadores atualizem status das suas entregas
DROP POLICY IF EXISTS "Drivers can update own deliveries" ON public.delivery_details;

CREATE POLICY "Drivers can update own deliveries"
ON public.delivery_details
FOR UPDATE
TO authenticated
USING (driver_id IN (SELECT id FROM public.delivery_drivers WHERE user_id = auth.uid()));