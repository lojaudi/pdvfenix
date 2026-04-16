import { supabase } from "@/integrations/supabase/client";
import type { DbProduct } from "@/hooks/useProducts";

type OrderChannel = "balcao" | "garcom" | "delivery";
type PaymentMethod = "dinheiro" | "credito" | "debito" | "pix" | "pix_maquina" | null;

interface CartItem {
  product: DbProduct;
  quantity: number;
  variationName?: string;
  variationPrice?: number;
  notes?: string;
}

export async function createOrder(
  items: CartItem[],
  channel: OrderChannel,
  paymentMethod: PaymentMethod,
  userId: string,
  tableNumber?: number,
  customerName?: string
) {
  const total = items.reduce((sum, i) => sum + (i.variationPrice ?? i.product.price) * i.quantity, 0);

  // Create order
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      user_id: userId,
      channel,
      table_number: tableNumber || null,
      customer_name: customerName || null,
      status: "aberto" as const,
      payment_method: paymentMethod,
      total,
    })
    .select()
    .single();

  if (orderError) throw orderError;

  // Create order items
  const orderItems = items.map((item) => ({
    order_id: order.id,
    product_id: item.product.id,
    product_name: item.variationName
      ? `${item.product.name} (${item.variationName})`
      : item.product.name,
    quantity: item.quantity,
    unit_price: item.variationPrice ?? item.product.price,
    notes: item.notes || null,
  }));

  const { error: itemsError } = await supabase
    .from("order_items")
    .insert(orderItems);

  if (itemsError) throw itemsError;

  // If garçom channel, link order and assign waiter.
  // IMPORTANT: only flip table to "ocupada" if it's currently "livre".
  // If the table is already "aguardando_pagamento" (bill requested), keep that
  // status and immediately mark this new order as "entregue" so it shows up in
  // the cashier panel as part of the open bill — the table only closes when
  // the waiter explicitly requests the bill, never automatically.
  if (channel === "garcom" && tableNumber) {
    const { data: tableRow } = await supabase
      .from("tables")
      .select("status")
      .eq("number", tableNumber)
      .maybeSingle();

    const billAlreadyRequested = tableRow?.status === "aguardando_pagamento";

    const tableUpdate: any = {
      current_order_id: order.id,
      waiter_id: userId,
    };
    if (!billAlreadyRequested) {
      tableUpdate.status = "ocupada";
    }

    await supabase
      .from("tables")
      .update(tableUpdate)
      .eq("number", tableNumber);

    if (billAlreadyRequested) {
      await supabase
        .from("orders")
        .update({ status: "entregue" as const })
        .eq("id", order.id);
    }
  }

  // Balcão orders are paid immediately; garçom/delivery go through the kitchen flow
  if (channel === "balcao") {
    await supabase
      .from("orders")
      .update({ status: "pago" as const })
      .eq("id", order.id);
  }

  return order;
}
