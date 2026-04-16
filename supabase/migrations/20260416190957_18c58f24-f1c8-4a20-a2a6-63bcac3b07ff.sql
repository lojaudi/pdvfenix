-- Libera mesas órfãs (ocupadas sem garçom atribuído e sem pedidos ativos)
UPDATE public.tables t
SET status = 'livre', current_order_id = NULL, waiter_id = NULL
WHERE t.status <> 'livre'
  AND t.waiter_id IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.table_number = t.number
      AND o.channel = 'garcom'
      AND o.status IN ('aberto', 'preparando', 'pronto', 'entregue')
  );