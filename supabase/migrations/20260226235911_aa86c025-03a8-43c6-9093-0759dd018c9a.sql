
-- =============================================
-- FIX 1: delivery_details - Remove overly permissive public policies
-- =============================================

-- Drop the permissive public SELECT policy
DROP POLICY IF EXISTS "Public can view own delivery" ON public.delivery_details;

-- Drop the permissive public INSERT policy  
DROP POLICY IF EXISTS "Public can create delivery orders" ON public.delivery_details;

-- Replace with authenticated-only policies for delivery customers
-- Customers can view delivery details for orders they created
CREATE POLICY "Authenticated users can view own delivery details"
ON public.delivery_details
FOR SELECT
TO authenticated
USING (
  order_id IN (
    SELECT id FROM public.orders WHERE user_id = auth.uid()
  )
  OR is_staff(auth.uid())
);

-- Authenticated users can create delivery details for their own orders
CREATE POLICY "Authenticated users can create delivery details"
ON public.delivery_details
FOR INSERT
TO authenticated
WITH CHECK (
  order_id IN (
    SELECT id FROM public.orders WHERE user_id = auth.uid()
  )
  OR is_staff(auth.uid())
);

-- =============================================
-- FIX 2: orders - Remove overly permissive public policies
-- =============================================

-- Drop permissive public SELECT for delivery orders
DROP POLICY IF EXISTS "Public can view delivery orders" ON public.orders;

-- Drop permissive public INSERT for delivery orders
DROP POLICY IF EXISTS "Public can create delivery orders" ON public.orders;

-- Replace: authenticated users can view their own orders
CREATE POLICY "Authenticated users can view own orders"
ON public.orders
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Replace: authenticated users can create delivery orders (linked to their user_id)
CREATE POLICY "Authenticated users can create delivery orders"
ON public.orders
FOR INSERT
TO authenticated
WITH CHECK (channel = 'delivery'::order_channel AND auth.uid() = user_id);

-- =============================================
-- FIX 3: order_items - Remove overly permissive public policies
-- =============================================

-- Drop permissive public SELECT
DROP POLICY IF EXISTS "Public can view delivery order items" ON public.order_items;

-- Drop permissive public INSERT (anyone could insert fake items!)
DROP POLICY IF EXISTS "Public can create delivery order items" ON public.order_items;

-- Replace: authenticated users can view items of their own orders
CREATE POLICY "Authenticated users can view own order items"
ON public.order_items
FOR SELECT
TO authenticated
USING (
  order_id IN (
    SELECT id FROM public.orders WHERE user_id = auth.uid()
  )
  OR is_staff(auth.uid())
);

-- Replace: authenticated users can insert items for their own orders
CREATE POLICY "Authenticated users can create own order items"
ON public.order_items
FOR INSERT
TO authenticated
WITH CHECK (
  order_id IN (
    SELECT id FROM public.orders WHERE user_id = auth.uid()
  )
  OR is_staff(auth.uid())
);
