import { forwardRef } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

interface ReceiptItem {
  product_name: string;
  quantity: number;
  unit_price: number;
}

export interface ReceiptData {
  orderId: string;
  channel: string;
  tableNumber: number | null;
  customerName: string | null;
  waiterName: string | null;
  items: ReceiptItem[];
  total: number;
  paymentMethod: string | null;
  createdAt: string;
  paidAt?: string;
  deliveryAddress?: string;
  customerPhone?: string;
  deliveryFee?: number;
  changeFor?: number;
  changeAmount?: number;
  deliveryNotes?: string;
}

export function useReceiptSettings() {
  return useQuery({
    queryKey: ["receipt-settings"],
    queryFn: async () => {
      const { data } = await supabase
        .from("app_settings")
        .select("key, value")
        .in("key", ["receipt_header", "receipt_footer", "restaurant_name"]);
      const map: Record<string, string> = {};
      (data || []).forEach((s) => { map[s.key] = s.value; });
      return map;
    },
    staleTime: 60_000,
  });
}

const channelLabels: Record<string, string> = {
  balcao: "Balcão",
  garcom: "Garçom",
  delivery: "Delivery",
};

const paymentLabels: Record<string, string> = {
  dinheiro: "Dinheiro",
  credito: "Cartão de Crédito",
  debito: "Cartão de Débito",
  pix: "PIX",
};

/**
 * Receipt component optimised for 80mm thermal printers.
 * Rendered off-screen; call window.print() while it's mounted.
 */
export const ReceiptPrint = forwardRef<HTMLDivElement, { data: ReceiptData; headerText?: string; footerText?: string }>(
  ({ data, headerText, footerText }, ref) => {
    const now = data.paidAt ? new Date(data.paidAt) : new Date();

    const headerLines = headerText || "PDV FÊNIX";
    const footerLines = footerText || "Obrigado pela preferência!\nPDV Fênix • Sistema de Gestão";

    return (
      <div ref={ref} className="receipt-print-area">
        <style>{`
          @media print {
            body * { visibility: hidden !important; }
            .receipt-print-area,
            .receipt-print-area * { visibility: visible !important; }
            .receipt-print-area {
              position: fixed !important;
              left: 0 !important;
              top: 0 !important;
              width: 80mm !important;
              padding: 4mm !important;
              font-family: 'Courier New', monospace !important;
              font-size: 12px !important;
              color: #000 !important;
              background: #fff !important;
            }
          }
          @media screen {
            .receipt-print-area { display: none; }
          }
        `}</style>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 8 }}>
          {headerLines.split("\n").map((line, i) => (
            <div key={i} style={{ fontSize: i === 0 ? 16 : 10, fontWeight: i === 0 ? "bold" : "normal" }}>
              {line}
            </div>
          ))}
          <div style={{ fontSize: 10 }}>
            {format(now, "dd/MM/yyyy HH:mm", { locale: ptBR })}
          </div>
        </div>

        <div style={{ borderTop: "1px dashed #000", margin: "4px 0" }} />

        {/* Order info */}
        <div style={{ fontSize: 11, marginBottom: 4 }}>
          <div><strong>Pedido:</strong> #{data.orderId.slice(0, 8).toUpperCase()}</div>
          <div><strong>Canal:</strong> {channelLabels[data.channel] || data.channel}</div>
          {data.tableNumber && <div><strong>Mesa:</strong> {data.tableNumber}</div>}
          {data.waiterName && <div><strong>Garçom:</strong> {data.waiterName}</div>}
          {data.customerName && <div><strong>Cliente:</strong> {data.customerName}</div>}
          {data.deliveryAddress && <div><strong>Endereço:</strong> {data.deliveryAddress}</div>}
          {data.customerPhone && <div><strong>Telefone:</strong> {data.customerPhone}</div>}
        </div>

        <div style={{ borderTop: "1px dashed #000", margin: "4px 0" }} />

        {/* Items */}
        <table style={{ width: "100%", fontSize: 11, borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", paddingBottom: 2 }}>Item</th>
              <th style={{ textAlign: "center", paddingBottom: 2 }}>Qtd</th>
              <th style={{ textAlign: "right", paddingBottom: 2 }}>Valor</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item, i) => (
              <tr key={i}>
                <td style={{ paddingTop: 1, paddingBottom: 1 }}>{item.product_name}</td>
                <td style={{ textAlign: "center" }}>{item.quantity}</td>
                <td style={{ textAlign: "right" }}>
                  {formatCurrency(item.quantity * item.unit_price)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ borderTop: "1px dashed #000", margin: "4px 0" }} />

        {/* Total */}
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, fontWeight: "bold" }}>
          <span>TOTAL</span>
          <span>{formatCurrency(data.total)}</span>
        </div>

        {/* Payment method */}
        {data.paymentMethod && (
          <div style={{ fontSize: 11, marginTop: 4 }}>
            <strong>Pagamento:</strong> {paymentLabels[data.paymentMethod] || data.paymentMethod}
          </div>
        )}

        {/* Change info */}
        {data.changeFor != null && data.changeFor > 0 && (
          <div style={{ fontSize: 11, marginTop: 2 }}>
            <strong>Troco para:</strong> {formatCurrency(data.changeFor)}
          </div>
        )}
        {data.changeAmount != null && data.changeAmount > 0 && (
          <div style={{ fontSize: 13, fontWeight: "bold", marginTop: 2 }}>
            TROCO: {formatCurrency(data.changeAmount)}
          </div>
        )}

        {/* Delivery notes */}
        {data.deliveryNotes && (
          <div style={{ fontSize: 11, marginTop: 4 }}>
            <strong>Obs:</strong> {data.deliveryNotes}
          </div>
        )}

        <div style={{ borderTop: "1px dashed #000", margin: "8px 0" }} />

        {/* Footer */}
        <div style={{ textAlign: "center", fontSize: 10 }}>
          {footerLines.split("\n").map((line, i) => (
            <div key={i} style={{ marginTop: i > 0 ? 2 : 0 }}>{line}</div>
          ))}
        </div>
      </div>
    );
  }
);

ReceiptPrint.displayName = "ReceiptPrint";

/** Triggers print dialog for the receipt */
export function triggerPrint() {
  // Small delay to ensure the receipt DOM is rendered
  setTimeout(() => window.print(), 300);
}
