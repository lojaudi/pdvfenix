-- Allow staff to view profiles (needed to show waiter names on orders)
DROP POLICY IF EXISTS "Users can view profiles" ON public.profiles;
CREATE POLICY "Staff can view profiles"
ON public.profiles
FOR SELECT
USING (auth.uid() = user_id OR is_admin(auth.uid()) OR is_staff(auth.uid()));
