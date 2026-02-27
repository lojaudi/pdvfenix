import { useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useOrders } from "@/hooks/useOrders";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { format, subDays, startOfDay, endOfDay, isWithinInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line,
} from "recharts";
import {
  ArrowLeft, Loader2, ShieldAlert, TrendingUp, DollarSign,
  ShoppingCart, CreditCard, Calendar, FileDown,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const statusLabels: Record<string, string> = {
  aberto: "Aberto", preparando: "Preparando", pronto: "Pronto",
  entregue: "Entregue", pago: "Pago", cancelado: "Cancelado",
};

const statusColors: Record<string, string> = {
  aberto: "bg-blue-500/20 text-blue-400",
  preparando: "bg-yellow-500/20 text-yellow-400",
  pronto: "bg-green-500/20 text-green-400",
  entregue: "bg-emerald-500/20 text-emerald-400",
  pago: "bg-primary/20 text-primary",
  cancelado: "bg-destructive/20 text-destructive",
};

const channelLabels: Record<string, string> = {
  balcao: "Balcão", garcom: "Garçom", delivery: "Delivery",
};

const CHART_COLORS = [
  "hsl(36, 95%, 55%)", "hsl(142, 60%, 45%)", "hsl(200, 80%, 55%)",
  "hsl(280, 60%, 55%)", "hsl(0, 72%, 50%)",
];

export default function ReportsPage() {
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const { data: orders, isLoading } = useOrders();
  const navigate = useNavigate();
  const reportRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });

  const filteredOrders = useMemo(() => {
    if (!orders) return [];
    return orders.filter((o) =>
      isWithinInterval(new Date(o.created_at), {
        start: startOfDay(dateRange.from),
        end: endOfDay(dateRange.to),
      })
    );
  }, [orders, dateRange]);

  const stats = useMemo(() => {
    const totalRevenue = filteredOrders
      .filter((o) => o.status !== "cancelado")
      .reduce((s, o) => s + o.total, 0);
    const totalOrders = filteredOrders.length;
    const avgTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const paidOrders = filteredOrders.filter((o) => o.status === "pago").length;
    return { totalRevenue, totalOrders, avgTicket, paidOrders };
  }, [filteredOrders]);

  const dailySalesData = useMemo(() => {
    const map = new Map<string, number>();
    filteredOrders
      .filter((o) => o.status !== "cancelado")
      .forEach((o) => {
        const day = format(new Date(o.created_at), "dd/MM");
        map.set(day, (map.get(day) || 0) + o.total);
      });
    return Array.from(map, ([day, total]) => ({ day, total }));
  }, [filteredOrders]);

  const channelData = useMemo(() => {
    const map = new Map<string, number>();
    filteredOrders.forEach((o) => {
      const label = channelLabels[o.channel] || o.channel;
      map.set(label, (map.get(label) || 0) + 1);
    });
    return Array.from(map, ([name, value]) => ({ name, value }));
  }, [filteredOrders]);

  const paymentData = useMemo(() => {
    const map = new Map<string, number>();
    filteredOrders
      .filter((o) => o.payment_method)
      .forEach((o) => {
        const label = (o.payment_method || "").toUpperCase();
        map.set(label, (map.get(label) || 0) + 1);
      });
    return Array.from(map, ([name, value]) => ({ name, value }));
  }, [filteredOrders]);

  if (adminLoading || isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center">
          <ShieldAlert className="w-16 h-16 text-destructive mx-auto mb-4" />
          <h1 className="text-xl font-bold text-foreground mb-2">Acesso Negado</h1>
          <p className="text-muted-foreground mb-4">Você não tem permissão de administrador.</p>
          <button onClick={() => navigate("/")} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold">
            Voltar ao PDV
          </button>
        </div>
      </div>
    );
  }


  const handleExportPDF = async () => {
    if (!reportRef.current) return;
    setExporting(true);
    toast.info("Gerando PDF...");
    try {
      const html2canvas = (await import("html2canvas")).default;
      const { jsPDF } = await import("jspdf");
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#0f1117",
      });
      const pdf = new jsPDF("p", "mm", "a4");
      const imgData = canvas.toDataURL("image/png");
      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      pdf.save(`relatorios_${format(dateRange.from, "dd-MM-yy")}_a_${format(dateRange.to, "dd-MM-yy")}.pdf`);
      toast.success("PDF exportado com sucesso!");
    } catch (err) {
      toast.error("Erro ao exportar PDF");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/")} className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-lg font-bold text-foreground">Relatórios</h1>
              <p className="text-xs text-muted-foreground">Histórico de pedidos e vendas</p>
            </div>
          </div>

          {/* Date range picker */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="gap-2 text-sm"
              onClick={handleExportPDF}
              disabled={exporting}
            >
              {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
              Exportar PDF
            </Button>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="gap-2 text-sm">
                  <Calendar className="w-4 h-4" />
                  {format(dateRange.from, "dd/MM/yy")} – {format(dateRange.to, "dd/MM/yy")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <CalendarComponent
                  mode="range"
                  selected={{ from: dateRange.from, to: dateRange.to }}
                  onSelect={(range) => {
                    if (range?.from) setDateRange({ from: range.from, to: range.to || range.from });
                  }}
                  numberOfMonths={2}
                  locale={ptBR}
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </header>

      <main ref={reportRef} className="max-w-7xl mx-auto p-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Receita Total", value: `R$ ${stats.totalRevenue.toFixed(2)}`, icon: DollarSign, color: "text-primary" },
            { label: "Total de Pedidos", value: stats.totalOrders, icon: ShoppingCart, color: "text-blue-400" },
            { label: "Ticket Médio", value: `R$ ${stats.avgTicket.toFixed(2)}`, icon: TrendingUp, color: "text-emerald-400" },
            { label: "Pedidos Pagos", value: stats.paidOrders, icon: CreditCard, color: "text-green-400" },
          ].map((kpi) => (
            <Card key={kpi.label} className="bg-card border-border">
              <CardContent className="p-4 flex items-center gap-4">
                <div className={cn("w-10 h-10 rounded-xl bg-secondary flex items-center justify-center", kpi.color)}>
                  <kpi.icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{kpi.label}</p>
                  <p className="text-xl font-bold text-foreground">{kpi.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Daily Sales Bar Chart */}
          <Card className="lg:col-span-2 bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-foreground">Vendas Diárias</CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
              {dailySalesData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailySalesData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 14%, 22%)" />
                    <XAxis dataKey="day" tick={{ fill: "hsl(220, 10%, 55%)", fontSize: 12 }} />
                    <YAxis tick={{ fill: "hsl(220, 10%, 55%)", fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "hsl(220, 18%, 14%)", border: "1px solid hsl(220, 14%, 22%)", borderRadius: 8, color: "hsl(40, 20%, 95%)" }}
                      formatter={(v: number) => [`R$ ${v.toFixed(2)}`, "Total"]}
                    />
                    <Bar dataKey="total" fill="hsl(36, 95%, 55%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                  Sem dados no período selecionado
                </div>
              )}
            </CardContent>
          </Card>

          {/* Channel Pie Chart */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-foreground">Pedidos por Canal</CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
              {channelData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={channelData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {channelData.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: "hsl(220, 18%, 14%)", border: "1px solid hsl(220, 14%, 22%)", borderRadius: 8, color: "hsl(40, 20%, 95%)" }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                  Sem dados
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Payment method line chart */}
        {paymentData.length > 0 && (
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-foreground">Formas de Pagamento</CardTitle>
            </CardHeader>
            <CardContent className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={paymentData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 14%, 22%)" />
                  <XAxis type="number" tick={{ fill: "hsl(220, 10%, 55%)", fontSize: 12 }} />
                  <YAxis dataKey="name" type="category" tick={{ fill: "hsl(220, 10%, 55%)", fontSize: 12 }} width={80} />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(220, 18%, 14%)", border: "1px solid hsl(220, 14%, 22%)", borderRadius: 8, color: "hsl(40, 20%, 95%)" }} />
                  <Bar dataKey="value" fill="hsl(142, 60%, 45%)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Orders Table */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-foreground">
              Histórico de Pedidos ({filteredOrders.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Canal</TableHead>
                    <TableHead>Mesa</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Itens</TableHead>
                    <TableHead>Pagamento</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                        Nenhum pedido encontrado no período
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredOrders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="whitespace-nowrap text-xs">
                          {format(new Date(order.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs">
                            {channelLabels[order.channel] || order.channel}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">{order.table_number || "—"}</TableCell>
                        <TableCell className="text-xs max-w-[120px] truncate">{order.customer_name || "—"}</TableCell>
                        <TableCell className="text-xs max-w-[200px] truncate">
                          {order.order_items?.map((i) => `${i.quantity}x ${i.product_name}`).join(", ") || "—"}
                        </TableCell>
                        <TableCell className="text-xs uppercase">{order.payment_method || "—"}</TableCell>
                        <TableCell>
                          <span className={cn("px-2 py-0.5 rounded-md text-xs font-medium", statusColors[order.status] || "")}>
                            {statusLabels[order.status] || order.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm font-semibold">
                          R$ {order.total.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
