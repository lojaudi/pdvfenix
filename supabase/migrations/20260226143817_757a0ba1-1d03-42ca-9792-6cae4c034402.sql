-- Permitir que entregadores vejam entregas pendentes (sem motorista) para poder aceitar
DROP POLICY IF EXISTS "Drivers can view pending deliveries" ON public.delivery_details;

CREATE POLICY "Drivers can view pending deliveries"
ON public.delivery_details
FOR SELECT
TO authenticated
USING (
  delivery_status = 'aguardando' 
  AND driver_id IS NULL 
  AND EXISTS (SELECT 1 FROM public.delivery_drivers WHERE user_id = auth.uid())
);

-- Permitir que entregadores aceitem entregas pendentes (update de driver_id)
DROP POLICY IF EXISTS "Drivers can accept pending deliveries" ON public.delivery_details;

CREATE POLICY "Drivers can accept pending deliveries"
ON public.delivery_details
FOR UPDATE
TO authenticated
USING (
  delivery_status = 'aguardando' 
  AND driver_id IS NULL 
  AND EXISTS (SELECT 1 FROM public.delivery_drivers WHERE user_id = auth.uid())
);