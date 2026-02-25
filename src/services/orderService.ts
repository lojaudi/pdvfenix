import { supabase } from "@/integrations/supabase/client";
import type { DbProduct } from "@/hooks/useProducts";

type OrderChannel = "balcao" | "garcom" | "delivery";
type PaymentMethod = "dinheiro" | "credito" | "debito" | "pix" | null;

interface CartItem {
  product: DbProduct;
  quantity: number;
}

export async function createOrder(
  items: CartItem[],
  channel: OrderChannel,
  paymentMethod: PaymentMethod,
  userId: string,
  tableNumber?: number,
  customerName?: string
) {
  const total = items.reduce((sum, i) => sum + i.product.price * i.quantity, 0);

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
    product_name: item.product.name,
    quantity: item.quantity,
    unit_price: item.product.price,
  }));

  const { error: itemsError } = await supabase
    .from("order_items")
    .insert(orderItems);

  if (itemsError) throw itemsError;

  // If garçom channel, mark table as occupied and link order
  if (channel === "garcom" && tableNumber) {
    await supabase
      .from("tables")
      .update({ status: "ocupada" as any, current_order_id: order.id })
      .eq("number", tableNumber);
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
