
-- Allow anonymous users to create delivery orders
CREATE POLICY "Anon can create delivery orders"
ON public.orders
FOR INSERT
WITH CHECK (channel = 'delivery' AND user_id IS NULL);

-- Allow anonymous users to insert order items for delivery orders
CREATE POLICY "Anon can insert delivery order items"
ON public.order_items
FOR INSERT
WITH CHECK (order_id IN (
  SELECT id FROM orders WHERE channel = 'delivery' AND user_id IS NULL
));

-- Allow anonymous users to insert delivery details for delivery orders
CREATE POLICY "Anon can insert delivery details"
ON public.delivery_details
FOR INSERT
WITH CHECK (order_id IN (
  SELECT id FROM orders WHERE channel = 'delivery' AND user_id IS NULL
));

-- Allow anonymous to view their delivery details by order_id (for tracking page)
CREATE POLICY "Anon can view delivery details by order_id"
ON public.delivery_details
FOR SELECT
USING (true);
