-- Allow drivers to view orders that are linked to deliveries they can see
CREATE POLICY "Drivers can view delivery orders"
ON public.orders
FOR SELECT
USING (
  id IN (
    SELECT order_id FROM public.delivery_details
    WHERE delivery_status = 'aguardando' AND driver_id IS NULL
  )
  OR
  id IN (
    SELECT order_id FROM public.delivery_details dd
    JOIN public.delivery_drivers drv ON dd.driver_id = drv.id
    WHERE drv.user_id = auth.uid()
  )
);

-- Allow drivers to view order items for delivery orders they can see
CREATE POLICY "Drivers can view delivery order items"
ON public.order_items
FOR SELECT
USING (
  order_id IN (
    SELECT order_id FROM public.delivery_details
    WHERE delivery_status = 'aguardando' AND driver_id IS NULL
  )
  OR
  order_id IN (
    SELECT order_id FROM public.delivery_details dd
    JOIN public.delivery_drivers drv ON dd.driver_id = drv.id
    WHERE drv.user_id = auth.uid()
  )
);

-- Also allow anon to view order items for delivery orders (for tracking page)
CREATE POLICY "Anon can view delivery order items"
ON public.order_items
FOR SELECT
USING (
  order_id IN (
    SELECT id FROM public.orders
    WHERE channel = 'delivery' AND user_id IS NULL
  )
);