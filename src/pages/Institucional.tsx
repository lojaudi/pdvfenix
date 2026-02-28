import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ShoppingCart, Users, Truck, ChefHat, BarChart3, Settings,
  Smartphone, Globe, Bell, CreditCard, MapPin, MessageSquare,
  Shield, Zap, Monitor, Utensils
} from "lucide-react";

const modules = [
  {
    icon: ShoppingCart,
    title: "PDV Completo",
    desc: "Ponto de venda multicanal (Balcão, Garçom, Delivery) com interface touch-friendly e busca inteligente de produtos.",
  },
  {
    icon: Utensils,
    title: "Gestão de Mesas",
    desc: "Controle visual em tempo real do status das mesas com abertura/fechamento de comandas e transferência de pedidos.",
  },
  {
    icon: Truck,
    title: "Delivery Integrado",
    desc: "Módulo completo com zonas de entrega, taxas configuráveis, atribuição de entregadores e rastreio de pedidos.",
  },
  {
    icon: Globe,
    title: "Cardápio Digital",
    desc: "Menu público responsivo com categorias, imagens e checkout via WhatsApp — sem necessidade de app.",
  },
  {
    icon: ChefHat,
    title: "Painel da Cozinha",
    desc: "Pedidos em tempo real com notificação sonora, status de preparo e controle de fila.",
  },
  {
    icon: CreditCard,
    title: "Caixa & Pagamentos",
    desc: "Fechamento de caixa com múltiplas formas de pagamento: Dinheiro, Crédito, Débito, PIX e PIX na máquina.",
  },
  {
    icon: Users,
    title: "Gestão de Usuários",
    desc: "Controle de acesso por perfis: Administrador, Atendente, Garçom e Caixa com permissões granulares.",
  },
  {
    icon: BarChart3,
    title: "Relatórios & Analytics",
    desc: "Dashboards com faturamento, ticket médio, produtos mais vendidos e exportação em PDF.",
  },
  {
    icon: Smartphone,
    title: "App do Entregador",
    desc: "Interface mobile dedicada com navegação GPS, aceite de entregas e atualização de status em tempo real.",
  },
  {
    icon: MessageSquare,
    title: "Integração WhatsApp",
    desc: "Recebimento de pedidos via WhatsApp com Evolution API e notificações automáticas ao cliente.",
  },
  {
    icon: Bell,
    title: "Notificações em Tempo Real",
    desc: "WebSockets para atualização instantânea de pedidos, mesas e entregas em todos os dispositivos.",
  },
  {
    icon: Settings,
    title: "Personalização Total",
    desc: "Cores, logo, nome do estabelecimento e quadro de avisos (Neon Board) configuráveis pelo admin.",
  },
];

const techStack = [
  "React 18", "TypeScript", "Tailwind CSS", "Vite",
  "Lovable Cloud", "PostgreSQL", "Edge Functions",
  "Realtime WebSockets", "RLS (Row Level Security)",
];

const plans = [
  {
    name: "Básico",
    price: "R$ 149",
    period: "/mês",
    features: ["PDV Completo", "Gestão de Mesas", "Painel da Cozinha", "Caixa & Pagamentos", "Relatórios Básicos", "Até 2 usuários"],
    highlight: false,
  },
  {
    name: "Profissional",
    price: "R$ 249",
    period: "/mês",
    features: ["Tudo do Básico", "Delivery Integrado", "Cardápio Digital", "App do Entregador", "Relatórios Avançados", "Até 10 usuários"],
    highlight: true,
  },
  {
    name: "Enterprise",
    price: "R$ 349",
    period: "/mês",
    features: ["Tudo do Profissional", "Integração WhatsApp", "Personalização Total", "Suporte Prioritário", "Usuários ilimitados", "API de integração"],
    highlight: false,
  },
];

export default function Institucional() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Hero */}
      <section className="relative overflow-hidden bg-primary/5 py-20 px-4">
        <div className="mx-auto max-w-4xl text-center">
          <Badge variant="secondary" className="mb-4 text-sm">Sistema de Gestão para Food Service</Badge>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
            PDV <span className="text-primary">Fênix</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            Plataforma completa para restaurantes, lanchonetes e deliveries. 
            Do pedido ao pagamento, tudo em um só lugar — em tempo real.
          </p>
        </div>
      </section>

      {/* Módulos */}
      <section className="py-16 px-4">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-10">Módulos & Funcionalidades</h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {modules.map((m) => (
              <Card key={m.title} className="hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center gap-3 pb-2">
                  <div className="rounded-lg bg-primary/10 p-2">
                    <m.icon className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-base">{m.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{m.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <Separator />

      {/* Tech */}
      <section className="py-16 px-4">
        <div className="mx-auto max-w-4xl text-center">
          <div className="flex items-center justify-center gap-2 mb-6">
            <Shield className="h-5 w-5 text-primary" />
            <h2 className="text-2xl font-bold">Tecnologia & Segurança</h2>
          </div>
          <p className="text-muted-foreground mb-6">
            Construído com as tecnologias mais modernas do mercado, hospedagem em nuvem
            com escalabilidade automática e segurança a nível de linha (RLS) em todas as tabelas.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {techStack.map((t) => (
              <Badge key={t} variant="outline" className="text-sm">{t}</Badge>
            ))}
          </div>
        </div>
      </section>

      <Separator />

      {/* Preços */}
      <section className="py-16 px-4">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-3">Planos de Assinatura</h2>
          <p className="text-center text-muted-foreground mb-10">Valores de referência para aluguel mensal (SaaS)</p>
          <div className="grid gap-6 md:grid-cols-3">
            {plans.map((p) => (
              <Card key={p.name} className={p.highlight ? "border-primary shadow-lg ring-2 ring-primary/20" : ""}>
                <CardHeader className="text-center pb-2">
                  {p.highlight && <Badge className="mx-auto mb-2 bg-primary text-primary-foreground">Mais Popular</Badge>}
                  <CardTitle className="text-xl">{p.name}</CardTitle>
                  <div className="mt-2">
                    <span className="text-3xl font-extrabold">{p.price}</span>
                    <span className="text-muted-foreground text-sm">{p.period}</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {p.features.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-sm">
                        <Zap className="h-3.5 w-3.5 text-primary shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <Separator />

      {/* Venda */}
      <section className="py-16 px-4">
        <div className="mx-auto max-w-3xl text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Monitor className="h-5 w-5 text-primary" />
            <h2 className="text-2xl font-bold">Licença Única (Compra)</h2>
          </div>
          <p className="text-muted-foreground mb-6">
            Adquira a licença completa do sistema com código-fonte e implantação.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader className="text-center pb-2">
                <CardTitle className="text-lg">Licença Padrão</CardTitle>
                <p className="text-2xl font-extrabold mt-1">R$ 3.500 <span className="text-sm font-normal text-muted-foreground">– R$ 6.000</span></p>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Código-fonte + instalação + 30 dias de suporte técnico.
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="text-center pb-2">
                <CardTitle className="text-lg">Licença Premium</CardTitle>
                <p className="text-2xl font-extrabold mt-1">R$ 8.000 <span className="text-sm font-normal text-muted-foreground">– R$ 12.000</span></p>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Código-fonte + hospedagem 1 ano + treinamento + suporte estendido + customizações.
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 px-4 text-center text-sm text-muted-foreground">
        <p>PDV Fênix © {new Date().getFullYear()} — Sistema de Gestão para Food Service</p>
      </footer>
    </div>
  );
}
