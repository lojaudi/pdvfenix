-- Drop the policies causing infinite recursion
DROP POLICY IF EXISTS "Drivers can view delivery orders" ON public.orders;
DROP POLICY IF EXISTS "Drivers can view delivery order items" ON public.order_items;
DROP POLICY IF EXISTS "Anon can view delivery order items" ON public.order_items;

-- Create security definer functions to break recursion
CREATE OR REPLACE FUNCTION public.get_delivery_order_ids_for_driver(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT dd.order_id FROM delivery_details dd
  WHERE (dd.delivery_status = 'aguardando' AND dd.driver_id IS NULL)
  UNION
  SELECT dd.order_id FROM delivery_details dd
  JOIN delivery_drivers drv ON dd.driver_id = drv.id
  WHERE drv.user_id = _user_id
$$;

CREATE OR REPLACE FUNCTION public.get_anon_delivery_order_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM orders WHERE channel = 'delivery' AND user_id IS NULL
$$;

-- Recreate policies using security definer functions (no recursion)
CREATE POLICY "Drivers can view delivery orders"
ON public.orders
FOR SELECT
USING (id IN (SELECT public.get_delivery_order_ids_for_driver(auth.uid())));

CREATE POLICY "Drivers can view delivery order items"
ON public.order_items
FOR SELECT
USING (order_id IN (SELECT public.get_delivery_order_ids_for_driver(auth.uid())));

CREATE POLICY "Anon can view delivery order items"
ON public.order_items
FOR SELECT
USING (order_id IN (SELECT public.get_anon_delivery_order_ids()));