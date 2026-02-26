
-- Drop the restrictive SELECT policy and recreate as permissive
DROP POLICY IF EXISTS "Authenticated can view products" ON public.products;

CREATE POLICY "Anyone can view products"
ON public.products
FOR SELECT
USING (true);
