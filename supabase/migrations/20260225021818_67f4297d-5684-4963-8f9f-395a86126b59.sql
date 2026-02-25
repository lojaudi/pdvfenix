
-- Create table status enum
CREATE TYPE public.table_status AS ENUM ('livre', 'ocupada', 'aguardando_pagamento');

-- Create tables (mesas) table
CREATE TABLE public.tables (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  number INTEGER NOT NULL UNIQUE,
  status public.table_status NOT NULL DEFAULT 'livre',
  capacity INTEGER NOT NULL DEFAULT 4,
  current_order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tables ENABLE ROW LEVEL SECURITY;

-- Staff can view tables
CREATE POLICY "Staff can view tables" ON public.tables FOR SELECT USING (is_staff(auth.uid()));

-- Staff can update tables
CREATE POLICY "Staff can update tables" ON public.tables FOR UPDATE USING (is_staff(auth.uid()));

-- Admins can insert tables
CREATE POLICY "Admins can insert tables" ON public.tables FOR INSERT WITH CHECK (is_admin(auth.uid()));

-- Admins can delete tables
CREATE POLICY "Admins can delete tables" ON public.tables FOR DELETE USING (is_admin(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_tables_updated_at
BEFORE UPDATE ON public.tables
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.tables;

-- Seed default tables (1-10)
INSERT INTO public.tables (number) VALUES (1),(2),(3),(4),(5),(6),(7),(8),(9),(10);
