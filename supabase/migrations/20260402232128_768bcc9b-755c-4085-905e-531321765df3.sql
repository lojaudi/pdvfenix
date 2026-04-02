
CREATE OR REPLACE FUNCTION public.sync_delivery_status_to_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.delivery_status = 'entregue' AND (OLD.delivery_status IS DISTINCT FROM 'entregue') THEN
    UPDATE public.orders SET status = 'entregue' WHERE id = NEW.order_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_delivery_status_to_order
  AFTER UPDATE OF delivery_status ON public.delivery_details
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_delivery_status_to_order();
