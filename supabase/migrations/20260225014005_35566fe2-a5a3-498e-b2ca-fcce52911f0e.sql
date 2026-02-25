
-- Allow admins to view all profiles (needed for user management)
DROP POLICY "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view profiles" ON public.profiles FOR SELECT TO authenticated USING (
  auth.uid() = user_id OR public.is_admin(auth.uid())
);
