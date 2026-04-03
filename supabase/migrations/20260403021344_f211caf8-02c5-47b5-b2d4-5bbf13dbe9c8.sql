UPDATE public.tables AS t
SET status = 'livre',
    current_order_id = NULL,
    waiter_id = NULL,
    updated_at = now()
WHERE t.status = 'aguardando_pagamento'
  AND NOT EXISTS (
    SELECT 1
    FROM public.orders AS o
    WHERE o.channel = 'garcom'
      AND o.table_number = t.number
      AND o.status IN ('aberto', 'preparando', 'pronto', 'entregue')
  );