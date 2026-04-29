-- Create reprint_logs table
CREATE TABLE public.reprint_logs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.reprint_logs ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins can view reprint logs"
ON public.reprint_logs
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid() AND role = 'admin'
    )
);

CREATE POLICY "Admins can insert reprint logs"
ON public.reprint_logs
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid() AND role = 'admin'
    )
);

-- Index for performance
CREATE INDEX idx_reprint_logs_order_id ON public.reprint_logs(order_id);
CREATE INDEX idx_reprint_logs_created_at ON public.reprint_logs(created_at);