import { useState } from "react";
import { BookOpen, Monitor, ShoppingCart, Users, Truck, BarChart3, Settings, ChefHat, CreditCard, Map, Bike, Eye, Zap, MessageSquare, Palette, Grid3X3, Package, ArrowLeft, ChevronRight, ChevronDown } from "lucide-react";

type Section = {
  id: string;
  title: string;
  icon: typeof BookOpen;
  content: React.ReactNode;
};

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 mb-6">
      <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-4">{title}</h3>
      {children}
    </div>
  );
}

function Step({ number, title, description }: { number: number; title: string; description: string }) {
  return (
    <div className="flex gap-4 mb-4">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-orange-500 text-white flex items-center justify-center text-sm font-bold">
        {number}
      </div>
      <div>
        <p className="font-semibold text-zinc-900 dark:text-zinc-100">{title}</p>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">{description}</p>
      </div>
    </div>
  );
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-xl p-4 mb-4">
      <p className="text-sm text-orange-800 dark:text-orange-300">💡 <strong>Dica:</strong> {children}</p>
    </div>
  );
}

function Warning({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-4">
      <p className="text-sm text-red-800 dark:text-red-300">⚠️ <strong>Atenção:</strong> {children}</p>
    </div>
  );
}

function RoleTag({ role }: { role: string }) {
  const colors: Record<string, string> = {
    Admin: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
    Atendente: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    Garçom: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
    Caixa: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
    Entregador: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
    Público: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${colors[role] || colors.Público}`}>
      {role}
    </span>
  );
}

const sections: Section[] = [
  {
    id: "visao-geral",
    title: "Visão Geral",
    icon: BookOpen,
    content: (
      <>
        <SectionCard title="O que é o PDV Fênix?">
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
            O PDV Fênix é um sistema completo de ponto de venda (PDV) para restaurantes, lanchonetes e similares.
            Ele permite gerenciar pedidos, mesas, entregas, cardápio online, motoristas e financeiro — tudo em uma única plataforma.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { icon: ShoppingCart, label: "PDV Completo" },
              { icon: ChefHat, label: "Gestão de Mesas" },
              { icon: Truck, label: "Delivery" },
              { icon: BarChart3, label: "Relatórios" },
              { icon: Eye, label: "Menu Público" },
              { icon: Bike, label: "Portal Entregador" },
              { icon: Settings, label: "Config. Completa" },
              { icon: CreditCard, label: "Caixa Financeiro" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2 p-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl">
                <Icon className="w-4 h-4 text-orange-500" />
                <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">{label}</span>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Perfis de Acesso">
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
            O sistema possui controle de acesso baseado em perfis (RBAC). Cada usuário pode ter um ou mais perfis:
          </p>
          <div className="space-y-3">
            {[
              { role: "Admin", desc: "Acesso total ao sistema. Gerencia produtos, categorias, usuários, configurações, relatórios, mesas, entregas e caixa." },
              { role: "Atendente", desc: "Opera o PDV em todos os canais (balcão, garçom, delivery). Visualiza pedidos ativos." },
              { role: "Garçom", desc: "Opera o PDV apenas no canal de mesas. Ideal para garçons que atendem clientes nas mesas." },
              { role: "Caixa", desc: "Acessa o módulo de fechamento financeiro e relatórios de vendas." },
              { role: "Entregador", desc: "Acessa o portal do entregador para aceitar e gerenciar entregas." },
            ].map(({ role, desc }) => (
              <div key={role} className="flex gap-3 items-start">
                <RoleTag role={role} />
                <p className="text-sm text-zinc-600 dark:text-zinc-400">{desc}</p>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Rotas do Sistema">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-700">
                  <th className="text-left py-2 text-zinc-500 dark:text-zinc-400 font-medium">Rota</th>
                  <th className="text-left py-2 text-zinc-500 dark:text-zinc-400 font-medium">Módulo</th>
                  <th className="text-left py-2 text-zinc-500 dark:text-zinc-400 font-medium">Acesso</th>
                </tr>
              </thead>
              <tbody className="text-zinc-700 dark:text-zinc-300">
                {[
                  ["/", "PDV Principal", "Staff autenticado"],
                  ["/orders", "Pedidos Ativos", "Staff autenticado"],
                  ["/tables", "Mesas", "Staff autenticado"],
                  ["/cashier", "Caixa", "Staff autenticado"],
                  ["/deliveries", "Entregas", "Staff autenticado"],
                  ["/admin", "Painel Admin", "Admin apenas"],
                  ["/reports", "Relatórios", "Staff autenticado"],
                  ["/menu", "Cardápio Público", "Público"],
                  ["/rastreio", "Rastreio de Entrega", "Público"],
                  ["/driver", "Portal do Entregador", "Entregador"],
                  ["/manual", "Manual do Sistema", "Público"],
                ].map(([rota, modulo, acesso]) => (
                  <tr key={rota} className="border-b border-zinc-100 dark:border-zinc-800">
                    <td className="py-2 font-mono text-xs text-orange-600 dark:text-orange-400">{rota}</td>
                    <td className="py-2">{modulo}</td>
                    <td className="py-2"><RoleTag role={acesso.includes("Público") ? "Público" : acesso.includes("Admin") ? "Admin" : "Atendente"} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      </>
    ),
  },
  {
    id: "pdv",
    title: "PDV (Ponto de Venda)",
    icon: ShoppingCart,
    content: (
      <>
        <SectionCard title="Como usar o PDV">
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
            O PDV é a tela principal do sistema, onde os pedidos são registrados. Ele funciona em 3 canais:
          </p>
          <div className="grid gap-3 mb-6">
            {[
              { canal: "🏪 Balcão", desc: "Clientes que pedem e pagam na hora. O pagamento é registrado imediatamente." },
              { canal: "🍽️ Garçom", desc: "Pedidos de mesa. O consumo é acumulado e fechado no módulo de caixa." },
              { canal: "🛵 Delivery", desc: "Pedidos para entrega. Inclui endereço, telefone, zona de entrega e taxa." },
            ].map(({ canal, desc }) => (
              <div key={canal} className="p-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl">
                <p className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">{canal}</p>
                <p className="text-xs text-zinc-600 dark:text-zinc-400">{desc}</p>
              </div>
            ))}
          </div>

          <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-3">Passo a passo — Pedido no Balcão</h4>
          <Step number={1} title="Selecione o canal Balcão" description="No topo do PDV, clique no botão 'Balcão' para selecionar o canal." />
          <Step number={2} title="Escolha os produtos" description="Navegue pelas categorias e clique nos produtos para adicionar ao carrinho." />
          <Step number={3} title="Revise o carrinho" description="No painel lateral direito, confira os itens, quantidades e valores." />
          <Step number={4} title="Finalize o pedido" description="Clique em 'Finalizar Pedido', escolha o método de pagamento e confirme." />
          <Tip>No canal Balcão, o pedido já é registrado como 'pago' automaticamente.</Tip>

          <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-3 mt-6">Passo a passo — Pedido de Mesa (Garçom)</h4>
          <Step number={1} title="Selecione o canal Garçom" description="Clique em 'Garçom' no seletor de canais." />
          <Step number={2} title="Selecione a mesa" description="Escolha o número da mesa no seletor que aparecerá." />
          <Step number={3} title="Adicione produtos" description="Selecione os itens do pedido normalmente." />
          <Step number={4} title="Envie para a cozinha" description="Clique em 'Enviar Pedido'. O status será 'aberto' (pagamento pendente)." />
          <Tip>O garçom pode adicionar mais itens à mesma mesa a qualquer momento. O acúmulo é automático.</Tip>
          <Warning>O fechamento financeiro da mesa é feito no módulo de Caixa, não no PDV.</Warning>

          <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-3 mt-6">Passo a passo — Pedido Delivery</h4>
          <Step number={1} title="Selecione o canal Delivery" description="Clique em 'Delivery' no seletor de canais." />
          <Step number={2} title="Preencha os dados do cliente" description="Informe nome, telefone, endereço e zona de entrega." />
          <Step number={3} title="Adicione produtos" description="Monte o pedido com os itens desejados." />
          <Step number={4} title="Finalize" description="A taxa de entrega é calculada automaticamente pela zona selecionada." />
        </SectionCard>
      </>
    ),
  },
  {
    id: "mesas",
    title: "Mesas",
    icon: ChefHat,
    content: (
      <>
        <SectionCard title="Gestão de Mesas">
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
            O módulo de mesas permite visualizar o status de todas as mesas do restaurante em tempo real.
          </p>
          <div className="grid gap-3 mb-6">
            {[
              { status: "🟢 Livre", desc: "Mesa disponível para novos clientes." },
              { status: "🔴 Ocupada", desc: "Mesa com pedido em andamento." },
              { status: "🟡 Aguardando Pagamento", desc: "Mesa com consumo finalizado, esperando fechamento no caixa." },
            ].map(({ status, desc }) => (
              <div key={status} className="p-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl">
                <p className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">{status}</p>
                <p className="text-xs text-zinc-600 dark:text-zinc-400">{desc}</p>
              </div>
            ))}
          </div>
          <Step number={1} title="Acesse /tables" description="Navegue até o módulo de mesas pelo menu." />
          <Step number={2} title="Visualize o mapa" description="Veja todas as mesas com seus status e consumo atual." />
          <Step number={3} title="Clique em uma mesa" description="Veja os detalhes do pedido, itens consumidos e valor total." />
          <Tip>As mesas são atualizadas em tempo real. Se outro garçom adicionar itens, você verá instantaneamente.</Tip>
        </SectionCard>
      </>
    ),
  },
  {
    id: "caixa",
    title: "Caixa",
    icon: CreditCard,
    content: (
      <>
        <SectionCard title="Módulo de Caixa">
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
            O módulo de caixa é responsável pelo fechamento financeiro de pedidos, especialmente de mesas.
          </p>
          <Step number={1} title="Acesse /cashier" description="Navegue até o módulo de caixa." />
          <Step number={2} title="Selecione o pedido" description="Escolha o pedido ou mesa que deseja fechar." />
          <Step number={3} title="Escolha o método de pagamento" description="Selecione entre Dinheiro, Crédito, Débito, PIX ou PIX Máquina." />
          <Step number={4} title="Confirme o pagamento" description="O pedido será marcado como 'pago' e a mesa liberada automaticamente." />
          <Tip>O caixa pode visualizar o resumo de todas as vendas do dia nos Relatórios.</Tip>
        </SectionCard>

        <SectionCard title="Métodos de Pagamento">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {["💵 Dinheiro", "💳 Crédito", "💳 Débito", "📱 PIX", "📱 PIX Máquina"].map((m) => (
              <div key={m} className="text-center p-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl text-sm font-medium text-zinc-700 dark:text-zinc-300">
                {m}
              </div>
            ))}
          </div>
        </SectionCard>
      </>
    ),
  },
  {
    id: "entregas",
    title: "Entregas",
    icon: Truck,
    content: (
      <>
        <SectionCard title="Fluxo de Entregas">
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
            O sistema de entregas gerencia todo o ciclo de vida de um pedido delivery.
          </p>
          <div className="flex flex-wrap gap-2 mb-6">
            {["⏳ Aguardando", "✅ Aceito", "🛵 Saiu para Entrega", "📦 Entregue", "❌ Cancelado"].map((s) => (
              <span key={s} className="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full text-xs font-medium text-zinc-700 dark:text-zinc-300">
                {s}
              </span>
            ))}
          </div>

          <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-3">Para o Staff</h4>
          <Step number={1} title="Crie o pedido delivery" description="No PDV, selecione o canal Delivery e preencha os dados." />
          <Step number={2} title="Acompanhe em /deliveries" description="Veja todos os pedidos delivery em andamento." />
          <Step number={3} title="Atribua motorista (opcional)" description="Atribua manualmente um motorista ou aguarde o aceite automático." />

          <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-3 mt-6">Para o Entregador</h4>
          <Step number={1} title="Acesse /driver" description="Faça login com a conta de entregador criada pelo admin." />
          <Step number={2} title="Veja pedidos disponíveis" description="Pedidos 'prontos' sem motorista aparecerão automaticamente." />
          <Step number={3} title="Aceite a entrega" description="Clique para aceitar — primeiro a chegar leva!" />
          <Step number={4} title="Atualize o status" description="Marque como 'saiu para entrega' e depois 'entregue'." />
        </SectionCard>

        <SectionCard title="Zonas de Entrega">
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
            As zonas de entrega definem as áreas atendidas e suas taxas. São configuradas pelo administrador em Admin → Zonas.
          </p>
          <div className="grid grid-cols-2 gap-2">
            {["💰 Taxa Fixa", "📍 Por Bairro", "🗺️ Por Região", "📏 Por KM"].map((t) => (
              <div key={t} className="p-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl text-sm text-center text-zinc-700 dark:text-zinc-300 font-medium">
                {t}
              </div>
            ))}
          </div>
        </SectionCard>
      </>
    ),
  },
  {
    id: "menu-publico",
    title: "Menu Público",
    icon: Eye,
    content: (
      <>
        <SectionCard title="Cardápio Online">
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
            O cardápio online está disponível em <code className="bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded text-orange-600 dark:text-orange-400">/menu</code> e pode ser acessado por qualquer pessoa sem login.
          </p>
          <Step number={1} title="Compartilhe o link" description="Envie o link do /menu para seus clientes via WhatsApp, redes sociais, etc." />
          <Step number={2} title="Clientes navegam" description="Eles podem ver produtos, categorias, preços e imagens." />
          <Step number={3} title="Identidade visual" description="O menu reflete o nome, logo e cores configurados no Admin." />
          <Tip>O link do menu pode ser transformado em QR Code para mesas ou materiais impressos.</Tip>
        </SectionCard>
      </>
    ),
  },
  {
    id: "admin",
    title: "Painel Admin",
    icon: Settings,
    content: (
      <>
        <SectionCard title="Módulos Administrativos">
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
            O painel admin (<code className="bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded text-orange-600 dark:text-orange-400">/admin</code>) é acessível apenas por usuários com perfil Admin.
          </p>
          <div className="space-y-4">
            {[
              { icon: Package, tab: "Produtos", desc: "Cadastrar, editar, excluir e gerenciar estoque de produtos. Upload de imagem e busca automática." },
              { icon: Grid3X3, tab: "Categorias", desc: "Criar e organizar categorias com ícones e ordem de exibição." },
              { icon: Users, tab: "Usuários", desc: "Visualizar todos os usuários e atribuir/remover perfis de acesso (Admin, Atendente, Garçom, Caixa)." },
              { icon: Map, tab: "Zonas de Entrega", desc: "Criar zonas com tipo de taxa (fixa, bairro, região, km) e valor." },
              { icon: Bike, tab: "Entregadores", desc: "Cadastrar motoristas e gerar suas contas de acesso ao portal." },
              { icon: MessageSquare, tab: "WhatsApp", desc: "Configurar integração com WhatsApp para notificações automáticas." },
              { icon: Settings, tab: "Configurações", desc: "Nome, logo, WhatsApp, horários e mensagem de boas-vindas." },
              { icon: Palette, tab: "Visual", desc: "Personalizar cores, tipografia e aparência do sistema com pré-visualização em tempo real." },
              { icon: Zap, tab: "Neon Board", desc: "Gerenciar o painel luminoso digital do cardápio." },
            ].map(({ icon: Icon, tab, desc }) => (
              <div key={tab} className="flex gap-3 items-start p-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl">
                <Icon className="w-5 h-5 text-orange-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">{tab}</p>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Como cadastrar um produto">
          <Step number={1} title="Acesse Admin → Produtos" description="Navegue até o painel admin e clique na aba Produtos." />
          <Step number={2} title="Clique em 'Novo Produto'" description="Preencha nome, preço, categoria e quantidade em estoque." />
          <Step number={3} title="Adicione uma imagem" description="Faça upload de uma imagem ou use a busca automática." />
          <Step number={4} title="Salve" description="O produto estará disponível imediatamente no PDV e no menu público." />
        </SectionCard>

        <SectionCard title="Como atribuir perfis de acesso">
          <Step number={1} title="Acesse Admin → Usuários" description="Veja a lista de todos os usuários cadastrados." />
          <Step number={2} title="Clique no perfil desejado" description="Cada botão de perfil (Admin, Atendente, Garçom) funciona como toggle." />
          <Step number={3} title="Confirmação visual" description="Perfis ativos ficam destacados com um ✓." />
          <Warning>Remover o perfil Admin de si mesmo pode impedir seu acesso ao painel.</Warning>
        </SectionCard>
      </>
    ),
  },
  {
    id: "relatorios",
    title: "Relatórios",
    icon: BarChart3,
    content: (
      <>
        <SectionCard title="Relatórios de Vendas">
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
            O módulo de relatórios (<code className="bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded text-orange-600 dark:text-orange-400">/reports</code>) oferece visão completa das vendas.
          </p>
          <div className="grid gap-3">
            {[
              "📊 Gráfico de vendas diárias",
              "📈 Distribuição por canal (Balcão / Garçom / Delivery)",
              "💳 Métodos de pagamento utilizados",
              "💰 Receita total e ticket médio",
            ].map((item) => (
              <div key={item} className="p-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl text-sm text-zinc-700 dark:text-zinc-300">
                {item}
              </div>
            ))}
          </div>
        </SectionCard>
      </>
    ),
  },
];

export default function ManualPage() {
  const [activeSection, setActiveSection] = useState("visao-geral");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const current = sections.find((s) => s.id === activeSection) || sections[0];

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Manual do Sistema</h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">PDV Fênix — Guia Completo</p>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="md:hidden p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800"
          >
            {sidebarOpen ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto flex">
        {/* Sidebar */}
        <aside className={`w-64 flex-shrink-0 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 min-h-[calc(100vh-57px)] sticky top-[57px] ${sidebarOpen ? "block" : "hidden md:block"}`}>
          <nav className="p-4 space-y-1">
            {sections.map((section) => {
              const Icon = section.icon;
              const isActive = activeSection === section.id;
              return (
                <button
                  key={section.id}
                  onClick={() => { setActiveSection(section.id); setSidebarOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? "bg-orange-50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400"
                      : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {section.title}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Content */}
        <main className="flex-1 p-6 md:p-10 max-w-3xl">
          <div className="flex items-center gap-3 mb-6">
            <current.icon className="w-6 h-6 text-orange-500" />
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{current.title}</h2>
          </div>
          {current.content}
        </main>
      </div>
    </div>
  );
}
