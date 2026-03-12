

## Plano: Abertura e Fechamento de Caixa

### Conceito

Criar um controle de turnos de caixa onde o operador **abre o caixa** informando o valor inicial (fundo de troco), e ao final do turno **fecha o caixa** com um resumo financeiro completo — total de vendas por método de pagamento, valor esperado vs. valor declarado, e diferença (sobra/falta).

### 1. Banco de Dados

Nova tabela `cash_sessions`:

```text
cash_sessions
├── id (uuid, PK)
├── opened_by (uuid, ref profiles.user_id)  — quem abriu
├── closed_by (uuid, nullable)              — quem fechou
├── opening_amount (numeric)                — fundo de troco
├── closing_amount (numeric, nullable)      — valor declarado no fechamento
├── expected_amount (numeric, nullable)      — calculado pelo sistema
├── notes (text, nullable)                  — observações
├── opened_at (timestamptz, default now())
├── closed_at (timestamptz, nullable)
└── created_at (timestamptz, default now())
```

**RLS**: Staff pode SELECT; apenas admin e caixa podem INSERT/UPDATE. Ninguém pode DELETE.

### 2. Lógica de Negócio

- **Abrir caixa**: Insere registro com `opening_amount`. Apenas um caixa pode estar aberto por vez (validar no frontend e com query `WHERE closed_at IS NULL`).
- **Fechar caixa**: Calcula automaticamente o `expected_amount` somando:
  - `opening_amount` (fundo de troco)
  - Total de pedidos pagos com **dinheiro** no período (entre `opened_at` e agora)
  - Subtrai pagamentos em cartão/pix (que não entram no caixa físico)
- Exibe resumo por método: dinheiro, crédito, débito, pix.
- O operador informa `closing_amount` (contagem real) e o sistema mostra a diferença.

### 3. Interface (UI)

Integrado na página `/cashier` existente:

- **Banner no topo**: Mostra status do caixa (aberto/fechado) com hora de abertura e operador.
- **Botão "Abrir Caixa"**: Dialog com campo numérico para fundo de troco. Aparece quando não há sessão aberta.
- **Botão "Fechar Caixa"**: Dialog com resumo financeiro:
  - Vendas por método de pagamento (cards)
  - Total esperado no caixa (fundo + dinheiro recebido)
  - Campo para digitar valor contado
  - Diferença (sobra/falta) com cor verde/vermelho
  - Campo de observações
- **Bloqueio**: Quando o caixa está fechado, bloquear recebimento de pagamentos (botão "Receber Pagamento" desabilitado com aviso).

### 4. Histórico

Na página de **Relatórios** (`/reports`) ou como nova aba no Admin, adicionar listagem de sessões de caixa anteriores com:
- Data, operador, valor inicial, valor final, diferença
- Filtro por período

### 5. Arquivos a Criar/Editar

| Arquivo | Ação |
|---|---|
| Migração SQL | Criar tabela `cash_sessions` + RLS |
| `src/hooks/useCashSession.ts` | Hook para abrir/fechar/consultar sessão ativa |
| `src/components/cashier/OpenCashDialog.tsx` | Dialog de abertura |
| `src/components/cashier/CloseCashDialog.tsx` | Dialog de fechamento com resumo |
| `src/components/cashier/CashSessionBanner.tsx` | Banner de status no topo |
| `src/pages/Cashier.tsx` | Integrar banner + bloqueio + dialogs |

### 6. Fluxo Resumido

```text
Caixa fechado → [Abrir Caixa] → Informa fundo → Caixa aberto
                                                      ↓
                              Recebe pagamentos normalmente
                                                      ↓
                    [Fechar Caixa] → Vê resumo → Informa contagem → Salva
```

