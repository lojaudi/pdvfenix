
-- Add waiter_id to tables so we can track which waiter owns the table
ALTER TABLE public.tables ADD COLUMN waiter_id uuid REFERENCES auth.users(id) DEFAULT NULL;

-- When table is freed, waiter_id should also be cleared (handled in app code)
