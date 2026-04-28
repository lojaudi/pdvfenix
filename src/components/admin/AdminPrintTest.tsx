import { useState, useRef } from "react";
import { Printer, Layout, Monitor } from "lucide-react";
import { ReceiptPrint, ReceiptData, triggerPrint } from "../pos/ReceiptPrint";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const MOCK_DATA: ReceiptData = {
  orderId: "TEST-12345",
  channel: "balcao",
  tableNumber: 15,
  customerName: "Cliente de Teste",
  waiterName: "Garçom de Teste",
  items: [
    { product_name: "X-Burger Especial", quantity: 2, unit_price: 25.90 },
    { product_name: "Batata Frita G", quantity: 1, unit_price: 18.00 },
    { product_name: "Coca-Cola 350ml", quantity: 2, unit_price: 6.50 },
    { product_name: "Suco Natural Laranja", quantity: 1, unit_price: 12.00 },
  ],
  total: 94.80,
  paymentMethod: "pix",
  createdAt: new Date().toISOString(),
  paidAt: new Date().toISOString(),
};

export function AdminPrintTest() {
  const [testPaperWidth, setTestPaperWidth] = useState<"58" | "80">("80");
  const printRef = useRef<HTMLDivElement>(null);

  const { data: settings } = useQuery({
    queryKey: ["receipt-settings-test"],
    queryFn: async () => {
      const { data } = await supabase
        .from("app_settings")
        .select("key, value")
        .in("key", ["receipt_header", "receipt_footer", "restaurant_name"]);
      const map: Record<string, string> = {};
      (data || []).forEach((s) => { map[s.key] = s.value; });
      return map;
    },
  });

  const handlePrint = (width: "58" | "80") => {
    setTestPaperWidth(width);
    triggerPrint();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-bold text-foreground mb-1">Teste de Comanda</h2>
        <p className="text-xs text-muted-foreground">Imprima modelos de teste para verificar o alinhamento e tamanho do papel.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Layout className="w-4 h-4 text-primary" /> Opções de Impressão
          </h3>
          
          <p className="text-xs text-muted-foreground">
            Selecione o modelo desejado para disparar uma impressão de teste. 
            Certifique-se que sua impressora térmica está conectada e configurada no sistema operacional.
          </p>

          <div className="flex flex-col gap-3">
            <button
              onClick={() => handlePrint("80")}
              className="flex items-center justify-between p-4 rounded-xl border border-border bg-background hover:border-primary/50 hover:bg-primary/5 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                  <Printer className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <div className="text-sm font-bold">Imprimir 80mm</div>
                  <div className="text-[10px] text-muted-foreground">Padrão de impressoras grandes</div>
                </div>
              </div>
              <div className="px-2 py-1 rounded bg-secondary text-[10px] font-bold">PDF / Térmica</div>
            </button>

            <button
              onClick={() => handlePrint("58")}
              className="flex items-center justify-between p-4 rounded-xl border border-border bg-background hover:border-primary/50 hover:bg-primary/5 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                  <Printer className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <div className="text-sm font-bold">Imprimir 58mm</div>
                  <div className="text-[10px] text-muted-foreground">Padrão de impressoras compactas</div>
                </div>
              </div>
              <div className="px-2 py-1 rounded bg-secondary text-[10px] font-bold">Bluetooth / Portátil</div>
            </button>
          </div>

          <div className="p-4 rounded-lg bg-secondary/30 border border-border">
            <h4 className="text-xs font-bold mb-2 flex items-center gap-1.5">
              <Monitor className="w-3.5 h-3.5" /> Dica de Configuração
            </h4>
            <p className="text-[10px] leading-relaxed text-muted-foreground">
              Se a impressão sair cortada ou com margens grandes, verifique se nas configurações da janela de impressão do seu navegador as <strong>"Margens"</strong> estão definidas como <strong>"Nenhuma"</strong> e a <strong>"Escala"</strong> como <strong>"Padrão"</strong> ou <strong>"100%"</strong>.
            </p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-5 overflow-hidden">
          <h3 className="text-sm font-semibold mb-4">Pré-visualização (Mesmo Layout da Impressão)</h3>
          <div className="bg-secondary/20 p-4 rounded-lg overflow-x-auto">
            <ReceiptPrint
              data={MOCK_DATA}
              headerText={settings?.receipt_header}
              footerText={settings?.receipt_footer}
              paperWidth={testPaperWidth}
              isPreview={true}
            />
          </div>
          <p className="text-[10px] text-muted-foreground mt-4 text-center italic">
            * O conteúdo acima é uma representação fiel do que será enviado para a impressora.
          </p>
        </div>
      </div>

      {/* Hidden print component */}
      <ReceiptPrint
        ref={printRef}
        data={MOCK_DATA}
        paperWidth={testPaperWidth}
        headerText={settings?.receipt_header}
        footerText={settings?.receipt_footer}
      />
    </div>
  );
}
