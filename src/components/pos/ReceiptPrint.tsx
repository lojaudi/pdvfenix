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
        .in("key", ["receipt_header", "receipt_footer", "restaurant_name", "paper_width", "receipt_margin_top", "receipt_margin_left", "receipt_offset_x", "receipt_offset_y"]);
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
export const ReceiptPrint = forwardRef<HTMLDivElement, { 
  data: ReceiptData; 
  headerText?: string; 
  footerText?: string; 
  paperWidth?: string; 
  isPreview?: boolean;
  marginTop?: string;
  marginLeft?: string;
  offsetX?: string;
  offsetY?: string;
}>(
  ({ data, headerText, footerText, paperWidth = "80", isPreview = false, marginTop = "0", marginLeft = "0", offsetX = "0", offsetY = "0" }, ref) => {
    const now = data.paidAt ? new Date(data.paidAt) : new Date();

    const headerLines = headerText || "PDV FÊNIX";
    const footerLines = footerText || "Obrigado pela preferência!\nPDV Fênix • Sistema de Gestão";
    const isSmall = paperWidth === "58";
    const width = isSmall ? "58mm" : "80mm";
    const baseFontSize = isSmall ? "10px" : "12px";
    const padding = isSmall ? "1mm" : "3mm";

    return (
      <div ref={ref} className={`receipt-print-area ${isPreview ? "no-print" : ""}`}>
        <div className="receipt-content-wrapper" style={{
          marginTop: `${marginTop}px`,
          marginLeft: `${marginLeft}px`,
          transform: `translate(${offsetX}px, ${offsetY}px)`,
          width: "100%"
        }}>
        <style>{`
          @page {
            size: ${width} auto;
            margin: 0;
          }
          @media print {
            @page {
              size: ${width} auto;
              margin: 0 !important;
            }
            html, body {
              width: ${width} !important;
              margin: 0 !important;
              padding: 0 !important;
              overflow: visible !important;
              background-color: #ffffff !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            /* Hide everything except the root and the print area */
            body > *:not(#root) {
              display: none !important;
            }
            #root {
              display: block !important;
              visibility: hidden !important;
            }
            .receipt-print-area {
              visibility: visible !important;
              display: block !important;
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: ${width} !important;
              padding: ${padding} !important;
              margin: 0 !important;
              box-sizing: border-box !important;
              font-family: 'Courier New', Courier, monospace !important;
              text-align: left !important;
              font-size: ${baseFontSize} !important;
              line-height: 1.2 !important;
              color: #000 !important;
              background: #fff !important;
              box-shadow: none !important;
            }
            .receipt-print-area * {
              visibility: visible !important;
            }
            /* Specifically hide known UI overlays */
            .sonner-toast, [data-radix-portal], header, nav, aside, .no-print {
              display: none !important;
            }
            /* Force table widths */
            .receipt-print-area table {
              width: 100% !important;
              table-layout: fixed !important;
              border-collapse: collapse !important;
            }
          }
          @media screen {
            .receipt-print-area { 
              display: ${isPreview ? "block" : "none"};
              ${isPreview ? `
                width: ${width};
                padding: ${padding};
                background: #fff;
                color: #000;
                font-family: 'Courier New', monospace;
                font-size: ${baseFontSize};
                border: 1px solid #ccc;
                box-shadow: 0 4px 10px rgba(0,0,0,0.1);
                margin: 0 auto;
              ` : ""}
            }
          }
        `}</style>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: isSmall ? 4 : 8, width: "100%" }}>
          {headerLines.split("\n").map((line, i) => (
            <div key={i} style={{ 
              fontSize: i === 0 ? (isSmall ? 13 : 16) : (isSmall ? 9 : 10), 
              fontWeight: i === 0 ? "bold" : "normal",
              textAlign: "center"
            }}>
              {line}
            </div>
          ))}
          <div style={{ fontSize: isSmall ? 10 : 13, fontWeight: "bold", marginTop: 4, letterSpacing: 0.5, textAlign: "center" }}>
            {format(now, "dd/MM/yyyy  HH:mm", { locale: ptBR })}
          </div>
        </div>

        <div style={{ borderTop: "1px dashed #000", margin: "4px 0" }} />

        {/* Channel identification banner */}
        <div style={{ textAlign: "center", margin: isSmall ? "4px 0" : "6px 0", padding: "4px 0", border: "2px solid #000", width: "100%", boxSizing: "border-box" }}>
          <div style={{ fontSize: isSmall ? 13 : 16, fontWeight: "bold", letterSpacing: 1, textAlign: "center" }}>
            {data.channel === "delivery" && "★ DELIVERY ★"}
            {data.channel === "balcao" && "★ BALCÃO ★"}
            {data.channel === "garcom" && `★ MESA ${data.tableNumber || ""} ★`}
          </div>
        </div>

        {/* Order info */}
        <div style={{ fontSize: isSmall ? 9 : 11, marginBottom: 4 }}>
          <div><strong>Pedido:</strong> #{data.orderId.slice(0, 8).toUpperCase()}</div>
          {data.channel === "garcom" && data.tableNumber && (
            <div style={{ fontSize: isSmall ? 12 : 14, fontWeight: "bold" }}>Mesa: {data.tableNumber}</div>
          )}
          {data.waiterName && (
            <div style={{ fontSize: isSmall ? 11 : 14, fontWeight: "bold", marginTop: 4, padding: "3px 0", borderBottom: "1px dashed #000" }}>
              GARÇOM: {data.waiterName.split('@')[0].toUpperCase()}
            </div>
          )}
          {data.customerName && <div><strong>Cliente:</strong> {data.customerName}</div>}
          {data.deliveryAddress && <div><strong>Endereço:</strong> {data.deliveryAddress}</div>}
          {data.customerPhone && <div><strong>Telefone:</strong> {data.customerPhone}</div>}
        </div>

        <div style={{ borderTop: "1px dashed #000", margin: "4px 0" }} />

        {/* Items */}
        <table style={{ width: "100%", fontSize: isSmall ? 9 : 11, borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", paddingBottom: 2, width: "60%" }}>Item</th>
              <th style={{ textAlign: "center", paddingBottom: 2, width: "15%" }}>Qtd</th>
              <th style={{ textAlign: "right", paddingBottom: 2, width: "25%" }}>Valor</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item, i) => (
              <tr key={i}>
                <td style={{ paddingTop: 2, paddingBottom: 2, paddingRight: 4, wordWrap: "break-word", overflowWrap: "break-word" }}>
                  {item.product_name}
                </td>
                <td style={{ textAlign: "center", verticalAlign: "top", paddingTop: 2 }}>{item.quantity}</td>
                <td style={{ textAlign: "right", verticalAlign: "top", paddingTop: 2 }}>
                  {formatCurrency(item.quantity * item.unit_price)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ borderTop: "1px dashed #000", margin: "4px 0" }} />

        {/* Total */}
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: isSmall ? 12 : 14, fontWeight: "bold" }}>
          <span>TOTAL</span>
          <span>{formatCurrency(data.total)}</span>
        </div>

        {/* Payment method */}
        {data.paymentMethod && (
          <div style={{ fontSize: isSmall ? 9 : 11, marginTop: 4 }}>
            <strong>Pagamento:</strong> {paymentLabels[data.paymentMethod] || data.paymentMethod}
          </div>
        )}

        {/* Change info */}
        {data.changeFor != null && data.changeFor > 0 && (
          <div style={{ fontSize: isSmall ? 9 : 11, marginTop: 2 }}>
            <strong>Troco para:</strong> {formatCurrency(data.changeFor)}
          </div>
        )}
        {data.changeAmount != null && data.changeAmount > 0 && (
          <div style={{ fontSize: isSmall ? 11 : 13, fontWeight: "bold", marginTop: 2 }}>
            TROCO: {formatCurrency(data.changeAmount)}
          </div>
        )}

        {/* Delivery notes */}
        {data.deliveryNotes && (
          <div style={{ fontSize: isSmall ? 9 : 11, marginTop: 4 }}>
            <strong>Obs:</strong> {data.deliveryNotes}
          </div>
        )}

        <div style={{ borderTop: "1px dashed #000", margin: "8px 0" }} />

        {/* Footer */}
        <div style={{ textAlign: "center", fontSize: isSmall ? 8 : 10, width: "100%" }}>
          {footerLines.split("\n").map((line, i) => (
            <div key={i} style={{ marginTop: i > 0 ? 2 : 0, textAlign: "center" }}>{line}</div>
          ))}
        </div>
      </div>
    );
  }
);

ReceiptPrint.displayName = "ReceiptPrint";

/** Triggers print dialog for the receipt */
export function triggerPrint() {
  // Increased delay to ensure the receipt DOM is rendered, settings are applied,
  // and fonts/styles are fully loaded before opening the print dialog.
  setTimeout(() => {
    window.print();
  }, 1000);
}
