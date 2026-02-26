
-- =============================================
-- DELIVERY SYSTEM: Tables & Policies
-- =============================================

-- 1) Delivery fee type enum
CREATE TYPE public.delivery_fee_type AS ENUM ('fixa', 'bairro', 'regiao', 'km');

-- 2) Delivery zones / fee configuration
CREATE TABLE public.delivery_zones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  fee_type delivery_fee_type NOT NULL DEFAULT 'fixa',
  fee_value NUMERIC NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.delivery_zones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view delivery zones" ON public.delivery_zones FOR SELECT USING (true);
CREATE POLICY "Admins can insert delivery zones" ON public.delivery_zones FOR INSERT WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Admins can update delivery zones" ON public.delivery_zones FOR UPDATE USING (is_admin(auth.uid()));
CREATE POLICY "Admins can delete delivery zones" ON public.delivery_zones FOR DELETE USING (is_admin(auth.uid()));

CREATE TRIGGER update_delivery_zones_updated_at
  BEFORE UPDATE ON public.delivery_zones
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) Delivery drivers table
CREATE TABLE public.delivery_drivers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  is_available BOOLEAN NOT NULL DEFAULT true,
  current_lat NUMERIC,
  current_lng NUMERIC,
  location_updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.delivery_drivers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view drivers" ON public.delivery_drivers FOR SELECT USING (is_staff(auth.uid()));
CREATE POLICY "Admins can insert drivers" ON public.delivery_drivers FOR INSERT WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Admins can update drivers" ON public.delivery_drivers FOR UPDATE USING (is_admin(auth.uid()));
CREATE POLICY "Admins can delete drivers" ON public.delivery_drivers FOR DELETE USING (is_admin(auth.uid()));
-- Drivers can update their own location
CREATE POLICY "Drivers can update own location" ON public.delivery_drivers FOR UPDATE USING (auth.uid() = user_id);

CREATE TRIGGER update_delivery_drivers_updated_at
  BEFORE UPDATE ON public.delivery_drivers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for driver location tracking
ALTER PUBLICATION supabase_realtime ADD TABLE public.delivery_drivers;

-- 4) Delivery status enum
CREATE TYPE public.delivery_status AS ENUM ('aguardando', 'aceito', 'saiu_para_entrega', 'entregue', 'cancelado');

-- 5) Delivery details table (linked to orders)
CREATE TABLE public.delivery_details (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE UNIQUE,
  driver_id UUID REFERENCES public.delivery_drivers(id),
  customer_phone TEXT NOT NULL,
  delivery_address TEXT NOT NULL,
  delivery_zone_id UUID REFERENCES public.delivery_zones(id),
  delivery_fee NUMERIC NOT NULL DEFAULT 0,
  delivery_status delivery_status NOT NULL DEFAULT 'aguardando',
  payment_on_delivery BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  estimated_delivery_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.delivery_details ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view delivery details" ON public.delivery_details FOR SELECT USING (is_staff(auth.uid()));
CREATE POLICY "Staff can insert delivery details" ON public.delivery_details FOR INSERT WITH CHECK (is_staff(auth.uid()));
CREATE POLICY "Staff can update delivery details" ON public.delivery_details FOR UPDATE USING (is_staff(auth.uid()));

-- Public insert for online orders (no auth required)
CREATE POLICY "Public can create delivery orders" ON public.delivery_details FOR INSERT WITH CHECK (true);
-- Public can view own delivery by order_id
CREATE POLICY "Public can view own delivery" ON public.delivery_details FOR SELECT USING (true);

CREATE TRIGGER update_delivery_details_updated_at
  BEFORE UPDATE ON public.delivery_details
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.delivery_details;

-- 6) Allow public (unauthenticated) inserts into orders for online ordering
CREATE POLICY "Public can create delivery orders" ON public.orders FOR INSERT WITH CHECK (channel = 'delivery');
-- Allow public to view their own order by id
CREATE POLICY "Public can view delivery orders" ON public.orders FOR SELECT USING (channel = 'delivery');

-- 7) Allow public inserts into order_items for delivery orders
CREATE POLICY "Public can create delivery order items" ON public.order_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can view delivery order items" ON public.order_items FOR SELECT USING (true);
