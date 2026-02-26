
-- Fix orders: make public delivery insert PERMISSIVE
DROP POLICY IF EXISTS "Public can create delivery orders" ON public.orders;
CREATE POLICY "Public can create delivery orders"
  ON public.orders FOR INSERT
  WITH CHECK (channel = 'delivery'::order_channel);

DROP POLICY IF EXISTS "Public can view delivery orders" ON public.orders;
CREATE POLICY "Public can view delivery orders"
  ON public.orders FOR SELECT
  USING (channel = 'delivery'::order_channel);

-- Fix order_items: make public insert PERMISSIVE
DROP POLICY IF EXISTS "Public can create delivery order items" ON public.order_items;
CREATE POLICY "Public can create delivery order items"
  ON public.order_items FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Public can view delivery order items" ON public.order_items;
CREATE POLICY "Public can view delivery order items"
  ON public.order_items FOR SELECT
  USING (true);

-- Fix delivery_details: make public insert PERMISSIVE
DROP POLICY IF EXISTS "Public can create delivery orders" ON public.delivery_details;
CREATE POLICY "Public can create delivery orders"
  ON public.delivery_details FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Public can view own delivery" ON public.delivery_details;
CREATE POLICY "Public can view own delivery"
  ON public.delivery_details FOR SELECT
  USING (true);
