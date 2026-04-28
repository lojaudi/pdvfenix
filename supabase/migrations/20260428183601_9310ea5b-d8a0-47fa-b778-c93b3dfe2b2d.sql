-- 1) Corrigir trigger para nunca deixar estoque negativo
CREATE OR REPLACE FUNCTION public.deduct_stock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  new_qty integer;
BEGIN
  SELECT GREATEST(stock_qty - NEW.quantity, 0) INTO new_qty
  FROM public.products WHERE id = NEW.product_id;

  UPDATE public.products
  SET stock_qty = new_qty,
      in_stock = (new_qty > 0)
  WHERE id = NEW.product_id;
  RETURN NEW;
END;
$function$;

-- 2) Normalizar dados atuais: zerar negativos e marcar como indisponível
UPDATE public.products
SET stock_qty = 0,
    in_stock = false
WHERE stock_qty <= 0;