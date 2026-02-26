-- Permitir que o entregador autenticado visualize o próprio cadastro
DROP POLICY IF EXISTS "Drivers can view own profile" ON public.delivery_drivers;

CREATE POLICY "Drivers can view own profile"
ON public.delivery_drivers
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);