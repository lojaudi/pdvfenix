
-- Anon needs to SELECT delivery orders to allow subquery in order_items/delivery_details INSERT policies
CREATE POLICY "Anon can view own delivery orders"
ON public.orders
FOR SELECT
USING (channel = 'delivery' AND user_id IS NULL);
