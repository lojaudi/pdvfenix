import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Wifi, WifiOff, QrCode, Send, RefreshCw, Check, MessageSquare } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const CONFIG_KEYS = ["evolution_api_url", "evolution_api_key", "evolution_instance_name"];

export function AdminWhatsApp() {
  const queryClient = useQueryClient();
  const [url, setUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [instanceName, setInstanceName] = useState("");
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<string>("unknown");
  const [testPhone, setTestPhone] = useState("");
  const [testMessage, setTestMessage] = useState("Teste de integração WhatsApp 🚀");

  // Load saved config
  const { data: config, isLoading } = useQuery({
    queryKey: ["whatsapp-config"],
    queryFn: async () => {
      const { data } = await supabase
        .from("app_settings")
        .select("key, value")
        .in("key", CONFIG_KEYS);
      const map: Record<string, string> = {};
      (data || []).forEach((r) => { map[r.key] = r.value; });
      return map;
    },
  });

  useEffect(() => {
    if (config) {
      setUrl(config.evolution_api_url || "");
      setApiKey(config.evolution_api_key || "");
      setInstanceName(config.evolution_instance_name || "");
    }
  }, [config]);

  // Save config
  const saveMutation = useMutation({
    mutationFn: async () => {
      const entries = [
        { key: "evolution_api_url", value: url.trim() },
        { key: "evolution_api_key", value: apiKey.trim() },
        { key: "evolution_instance_name", value: instanceName.trim() },
      ];
      for (const entry of entries) {
        await supabase.from("app_settings").upsert(entry, { onConflict: "key" });
      }
    },
    onSuccess: () => {
      toast.success("Configurações salvas!");
      queryClient.invalidateQueries({ queryKey: ["whatsapp-config"] });
    },
    onError: () => toast.error("Erro ao salvar"),
  });

  // Call edge function
  const callEvolution = async (action: string, params: any = {}) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Não autenticado");

    const res = await supabase.functions.invoke("evolution-api", {
      body: { action, ...params },
    });

    if (res.error) throw new Error(res.error.message);
    return res.data;
  };

  // Create instance & get QR
  const createInstanceMutation = useMutation({
    mutationFn: async () => {
      const result = await callEvolution("create-instance", { instanceName });
      return result;
    },
    onSuccess: (data) => {
      if (data?.qrcode?.base64) {
        setQrCode(data.qrcode.base64);
        toast.success("QR Code gerado! Escaneie com o WhatsApp.");
      } else if (data?.instance) {
        toast.success("Instância criada!");
        checkStatus();
      } else {
        toast.info("Resposta recebida. Verifique o status.");
      }
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Get QR code
  const getQrMutation = useMutation({
    mutationFn: () => callEvolution("get-qrcode", { instanceName }),
    onSuccess: (data) => {
      if (data?.base64) {
        setQrCode(data.base64);
      } else if (data?.qrcode?.base64) {
        setQrCode(data.qrcode.base64);
      } else {
        toast.info("Nenhum QR disponível. A instância pode já estar conectada.");
        checkStatus();
      }
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Check status
  const checkStatus = async () => {
    try {
      const result = await callEvolution("instance-status", { instanceName });
      const state = result?.instance?.state || result?.state || "unknown";
      setConnectionStatus(state);
      if (state === "open") {
        setQrCode(null);
        toast.success("WhatsApp conectado!");
      }
    } catch (err: any) {
      setConnectionStatus("error");
      toast.error(err.message);
    }
  };

  // Send test message
  const sendTestMutation = useMutation({
    mutationFn: () =>
      callEvolution("send-message", {
        phone: testPhone,
        message: testMessage,
        instanceName,
      }),
    onSuccess: () => toast.success("Mensagem enviada!"),
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </div>
    );
  }

  const isConnected = connectionStatus === "open";
  const isConfigured = url && apiKey && instanceName;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-foreground">WhatsApp (Evolution API)</h2>
        <p className="text-sm text-muted-foreground">
          Configure a integração para enviar notificações automáticas aos entregadores
        </p>
      </div>

      {/* Connection Config */}
      <Card>
        <CardContent className="p-5 space-y-4">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-primary" />
            Configuração da API
          </h3>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">URL da Evolution API</label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://sua-evolution-api.com"
                className="w-full px-3 py-2.5 rounded-lg bg-secondary border border-border text-foreground text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">Global API Key</label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Sua chave de API"
                className="w-full px-3 py-2.5 rounded-lg bg-secondary border border-border text-foreground text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">Nome da Instância</label>
              <input
                type="text"
                value={instanceName}
                onChange={(e) => setInstanceName(e.target.value)}
                placeholder="minha-instancia"
                className="w-full px-3 py-2.5 rounded-lg bg-secondary border border-border text-foreground text-sm"
              />
            </div>
            <button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || !url || !apiKey || !instanceName}
              className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Salvar Configurações
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Instance Management */}
      {isConfigured && (
        <Card>
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <QrCode className="w-4 h-4 text-primary" />
                Conexão WhatsApp
              </h3>
              <Badge
                variant="outline"
                className={cn(
                  "text-xs",
                  isConnected ? "text-green-500 border-green-500/30" : "text-yellow-500 border-yellow-500/30"
                )}
              >
                {isConnected ? (
                  <><Wifi className="w-3 h-3 mr-1" /> Conectado</>
                ) : (
                  <><WifiOff className="w-3 h-3 mr-1" /> {connectionStatus === "unknown" ? "Desconhecido" : connectionStatus}</>
                )}
              </Badge>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => createInstanceMutation.mutate()}
                disabled={createInstanceMutation.isPending}
                className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {createInstanceMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <QrCode className="w-4 h-4" />
                )}
                Criar Instância / Gerar QR
              </button>
              <button
                onClick={checkStatus}
                className="py-2.5 px-4 rounded-lg bg-secondary text-foreground text-sm font-semibold flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Status
              </button>
            </div>

            {!isConnected && (
              <button
                onClick={() => getQrMutation.mutate()}
                disabled={getQrMutation.isPending}
                className="w-full py-2 rounded-lg bg-secondary text-foreground text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {getQrMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                Atualizar QR Code
              </button>
            )}

            {/* QR Code Display */}
            {qrCode && !isConnected && (
              <div className="flex flex-col items-center gap-3 py-4">
                <p className="text-xs text-muted-foreground text-center">
                  Escaneie o QR Code com o WhatsApp do celular
                </p>
                <div className="bg-white p-4 rounded-xl">
                  <img
                    src={qrCode.startsWith("data:") ? qrCode : `data:image/png;base64,${qrCode}`}
                    alt="QR Code WhatsApp"
                    className="w-64 h-64"
                  />
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Após escanear, clique em "Status" para verificar a conexão
                </p>
              </div>
            )}

            {isConnected && (
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 text-center">
                <Wifi className="w-6 h-6 text-green-500 mx-auto mb-1" />
                <p className="text-sm font-semibold text-green-500">WhatsApp Conectado!</p>
                <p className="text-xs text-muted-foreground">Notificações serão enviadas automaticamente</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Test Message */}
      {isConfigured && (
        <Card>
          <CardContent className="p-5 space-y-4">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Send className="w-4 h-4 text-primary" />
              Testar Envio
            </h3>
            <div className="space-y-3">
              <input
                type="tel"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                placeholder="5511999999999"
                className="w-full px-3 py-2.5 rounded-lg bg-secondary border border-border text-foreground text-sm"
              />
              <textarea
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
                rows={3}
                className="w-full px-3 py-2.5 rounded-lg bg-secondary border border-border text-foreground text-sm resize-none"
              />
              <button
                onClick={() => sendTestMutation.mutate()}
                disabled={sendTestMutation.isPending || !testPhone}
                className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {sendTestMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Enviar Mensagem de Teste
              </button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
