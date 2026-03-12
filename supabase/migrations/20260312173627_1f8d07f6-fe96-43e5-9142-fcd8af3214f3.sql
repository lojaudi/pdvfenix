
-- Create cash_sessions table
CREATE TABLE public.cash_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opened_by uuid NOT NULL,
  closed_by uuid,
  opening_amount numeric NOT NULL DEFAULT 0,
  closing_amount numeric,
  expected_amount numeric,
  notes text,
  opened_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cash_sessions ENABLE ROW LEVEL SECURITY;

-- Staff can view all sessions
CREATE POLICY "Staff can view cash sessions"
ON public.cash_sessions FOR SELECT
TO authenticated
USING (is_staff(auth.uid()));

-- Admin and cashier can open sessions (INSERT)
CREATE POLICY "Admin and cashier can open sessions"
ON public.cash_sessions FOR INSERT
TO authenticated
WITH CHECK (is_admin(auth.uid()) OR is_cashier(auth.uid()));

-- Admin and cashier can close sessions (UPDATE)
CREATE POLICY "Admin and cashier can close sessions"
ON public.cash_sessions FOR UPDATE
TO authenticated
USING (is_admin(auth.uid()) OR is_cashier(auth.uid()));
