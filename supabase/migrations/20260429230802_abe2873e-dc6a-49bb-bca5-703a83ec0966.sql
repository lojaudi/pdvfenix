-- Drop existing policies
DROP POLICY IF EXISTS "Admins can view reprint logs" ON public.reprint_logs;
DROP POLICY IF EXISTS "Admins can insert reprint logs" ON public.reprint_logs;

-- Re-create policies with 'caixa' support
CREATE POLICY "Admins and cashiers can view reprint logs"
ON public.reprint_logs
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid() AND role IN ('admin', 'caixa')
    )
);

CREATE POLICY "Admins and cashiers can insert reprint logs"
ON public.reprint_logs
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid() AND role IN ('admin', 'caixa')
    )
);