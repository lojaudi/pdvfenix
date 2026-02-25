import { forwardRef } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

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
export const ReceiptPrint = forwardRef<HTMLDivElement, { data: ReceiptData }>(
  ({ data }, ref) => {
    const now = data.paidAt ? new Date(data.paidAt) : new Date();

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
          <div style={{ fontSize: 16, fontWeight: "bold" }}>PDV FÊNIX</div>
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

        <div style={{ borderTop: "1px dashed #000", margin: "8px 0" }} />

        {/* Footer */}
        <div style={{ textAlign: "center", fontSize: 10 }}>
          <div>Obrigado pela preferência!</div>
          <div style={{ marginTop: 2 }}>PDV Fênix • Sistema de Gestão</div>
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
