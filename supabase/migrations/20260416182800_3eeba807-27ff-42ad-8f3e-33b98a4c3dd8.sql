UPDATE public.orders
SET status = 'entregue'
WHERE status IN ('aberto', 'preparando', 'pronto')
  AND table_number IN (
    SELECT number FROM public.tables WHERE status = 'aguardando_pagamento'
  );