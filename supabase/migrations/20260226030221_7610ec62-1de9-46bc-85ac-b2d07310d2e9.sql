
DROP POLICY IF EXISTS "Authenticated can view categories" ON public.categories;

CREATE POLICY "Anyone can view categories"
ON public.categories
FOR SELECT
USING (true);
