CREATE POLICY "Admins can delete profiles"
ON public.profiles
FOR DELETE
TO public
USING (is_admin(auth.uid()));