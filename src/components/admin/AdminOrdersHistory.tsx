import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Search, Printer, Calendar, Loader2, Eye, X, Filter } from "lucide-react";
import { toast } from "sonner";
import { ReceiptPrint, triggerPrint, useReceiptSettings, type ReceiptData } from "@/components/pos/ReceiptPrint";

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

const statusLabels: Record<string, string> = {
  aberto: "Aberto",
  preparando: "Preparando",
  pronto: "Pronto",
  pago: "Pago",
  entregue: "Entregue",
  cancelado: "Cancelado",
};

export function AdminOrdersHistory() {
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isReprinting, setIsReprinting] = useState(false);
  
  const { data: settings } = useReceiptSettings();
  const printRef = useRef<HTMLDivElement>(null);

  const { data: orders, isLoading, refetch } = useQuery({
    queryKey: ["orders-history", startDate, endDate, searchTerm],
    queryFn: async () => {
      let query = supabase
        .from("orders")
        .select(`
          *,
          profiles (name),
          order_items (*)
        `)
        .order("created_at", { ascending: false });

      if (startDate) {
        query = query.gte("created_at", `${startDate}T00:00:00`);
      }
      if (endDate) {
        query = query.lte("created_at", `${endDate}T23:59:59`);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Filter by search term on client side for more flexibility (ID, Customer, Product)
      if (!searchTerm) return data;

      const lowerSearch = searchTerm.toLowerCase();
      return data.filter((order: any) => {
        const matchesId = order.id.toLowerCase().includes(lowerSearch);
        const matchesCustomer = order.customer_name?.toLowerCase().includes(lowerSearch);
        const matchesProduct = order.order_items?.some((item: any) => 
          item.product_name.toLowerCase().includes(lowerSearch)
        );
        return matchesId || matchesCustomer || matchesProduct;
      });
    },
  });

  const handleReprint = async (order: any) => {
    setIsReprinting(true);
    try {
      const receiptData: ReceiptData = {
        orderId: order.id,
        channel: order.channel,
        tableNumber: order.table_number,
        customerName: order.customer_name,
        waiterName: order.profiles?.name || null,
        items: order.order_items.map((item: any) => ({
          product_name: item.product_name,
          quantity: item.quantity,
          unit_price: Number(item.unit_price)
        })),
        total: Number(order.total),
        paymentMethod: order.payment_method,
        createdAt: order.created_at,
      };

      setSelectedOrder(receiptData);
      
      // Log reprint
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("reprint_logs").insert({
          order_id: order.id,
          user_id: user.id
        });
      }

      toast.success("Enviando para impressão...");
      triggerPrint();
    } catch (error: any) {
      toast.error("Erro ao imprimir: " + error.message);
    } finally {
      setTimeout(() => setIsReprinting(false), 2000);
    }
  };

  const handlePreview = (order: any) => {
    const receiptData: ReceiptData = {
      orderId: order.id,
      channel: order.channel,
      tableNumber: order.table_number,
      customerName: order.customer_name,
      waiterName: order.profiles?.name || null,
      items: order.order_items.map((item: any) => ({
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price: Number(item.unit_price)
      })),
      total: Number(order.total),
      paymentMethod: order.payment_method,
      createdAt: order.created_at,
    };
    setSelectedOrder(receiptData);
    setIsPreviewing(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground">Reimpressão de Comandas</h2>
          <p className="text-sm text-muted-foreground">Histórico de vendas e relatórios</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 bg-secondary/50 p-1 rounded-lg border border-border">
            <div className="flex items-center gap-1 px-2 border-r border-border">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <input 
                type="date" 
                value={startDate} 
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent border-none text-xs focus:ring-0 text-foreground"
              />
            </div>
            <div className="flex items-center gap-1 px-2">
              <input 
                type="date" 
                value={endDate} 
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent border-none text-xs focus:ring-0 text-foreground"
              />
            </div>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar por ID, cliente ou produto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 w-64"
            />
          </div>
          
          <button 
            onClick={() => refetch()}
            className="p-2 rounded-lg bg-secondary hover:bg-accent transition-colors"
            title="Atualizar lista"
          >
            <Filter className="w-4 h-4 text-foreground" />
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-muted-foreground animate-pulse text-sm">Carregando histórico...</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-secondary/30 border-b border-border">
                <tr>
                  <th className="px-4 py-3 font-semibold text-muted-foreground">Data/Hora</th>
                  <th className="px-4 py-3 font-semibold text-muted-foreground">ID</th>
                  <th className="px-4 py-3 font-semibold text-muted-foreground">Cliente/Mesa</th>
                  <th className="px-4 py-3 font-semibold text-muted-foreground">Itens</th>
                  <th className="px-4 py-3 font-semibold text-muted-foreground">Total</th>
                  <th className="px-4 py-3 font-semibold text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-right font-semibold text-muted-foreground">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {orders?.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                      Nenhuma venda encontrada para o período selecionado.
                    </td>
                  </tr>
                ) : (
                  orders?.map((order) => (
                    <tr key={order.id} className="hover:bg-secondary/10 transition-colors group">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-foreground font-medium">
                          {format(new Date(order.created_at), "dd/MM/yyyy")}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(order.created_at), "HH:mm")}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-mono bg-secondary px-1.5 py-0.5 rounded border border-border">
                          #{order.id.slice(0, 8).toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-foreground">
                          {order.customer_name || (order.table_number ? `Mesa ${order.table_number}` : "Balcão")}
                        </div>
                        <div className="text-xs text-muted-foreground capitalize">
                          {order.channel}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-xs max-w-[200px] truncate" title={order.order_items.map((i: any) => `${i.quantity}x ${i.product_name}`).join(", ")}>
                          {order.order_items.length} item(ns): {order.order_items.map((i: any) => i.product_name).join(", ")}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-bold text-primary whitespace-nowrap">
                        {formatCurrency(Number(order.total))}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                          order.status === "finalizado" ? "bg-success/10 text-success" :
                          order.status === "cancelado" ? "bg-destructive/10 text-destructive" :
                          "bg-primary/10 text-primary"
                        }`}>
                          {statusLabels[order.status] || order.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => handlePreview(order)}
                            className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                            title="Ver detalhes"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleReprint(order)}
                            disabled={isReprinting || order.status === "cancelado"}
                            className="p-2 rounded-lg hover:bg-primary/10 text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title={order.status === "cancelado" ? "Não é possível reimprimir comandas canceladas" : "Reimprimir"}
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de Prévia */}
      {isPreviewing && selectedOrder && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="font-bold flex items-center gap-2">
                <Printer className="w-4 h-4 text-primary" />
                Prévia da Comanda
              </h3>
              <button onClick={() => setIsPreviewing(false)} className="p-2 rounded-lg hover:bg-secondary transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 bg-secondary/20">
              <div className="flex justify-center">
                <ReceiptPrint 
                  data={selectedOrder}
                  isPreview={true}
                  paperWidth={settings?.paper_width}
                  headerText={settings?.receipt_header}
                  footerText={settings?.receipt_footer}
                  marginTop={settings?.receipt_margin_top}
                  marginLeft={settings?.receipt_margin_left}
                  offsetX={settings?.receipt_offset_x}
                  offsetY={settings?.receipt_offset_y}
                  fontHeader={settings?.font_header}
                  fontItems={settings?.font_items}
                  fontFooter={settings?.font_footer}
                  boldItems={settings?.bold_items}
                />
              </div>
            </div>
            
            <div className="p-4 bg-card border-t border-border flex gap-2">
              <button 
                onClick={() => {
                  handleReprint({ 
                    id: selectedOrder.orderId,
                    channel: selectedOrder.channel,
                    table_number: selectedOrder.tableNumber,
                    customer_name: selectedOrder.customerName,
                    total: selectedOrder.total,
                    payment_method: selectedOrder.paymentMethod,
                    created_at: selectedOrder.createdAt,
                    order_items: selectedOrder.items,
                    profiles: { name: selectedOrder.waiterName }
                  });
                }}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/90 transition-all active:scale-95"
              >
                <Printer className="w-4 h-4" /> Confirmar Impressão
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Componente Invisível para Impressão */}
      <div className="hidden">
        {selectedOrder && (
          <ReceiptPrint 
            ref={printRef}
            data={selectedOrder}
            paperWidth={settings?.paper_width}
            headerText={settings?.receipt_header}
            footerText={settings?.receipt_footer}
            marginTop={settings?.receipt_margin_top}
            marginLeft={settings?.receipt_margin_left}
            offsetX={settings?.receipt_offset_x}
            offsetY={settings?.receipt_offset_y}
            fontHeader={settings?.font_header}
            fontItems={settings?.font_items}
            fontFooter={settings?.font_footer}
            boldItems={settings?.bold_items}
          />
        )}
      </div>
    </div>
  );
}
