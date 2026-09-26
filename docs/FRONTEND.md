# Frontend VELO FAST v2 — guia de convenções

React 19 + TypeScript + Vite 8 + Tailwind v4 + **shadcn/ui** (estilo `new-york-v4`, base Radix),
dados no **Supabase** (RLS por loja) e funções na **Vercel** (`/api`).

Regra de ouro da migração: **nada sai do lugar**. Cada tela nova tem as mesmas seções, na mesma
ordem, com os mesmos rótulos, campos, colunas, botões, atalhos e comportamentos da tela antiga
(`legacy/`). Muda o acabamento (componentes shadcn) e corrigem-se os bugs listados nos inventários.

## Estrutura

```
web/                      raiz do Vite (build → dist/)
  index.html              redireciona para /portal/
  pdv/index.html          entrada do caixa     → src/apps/pdv/main.tsx
  portal/index.html       entrada do portal    → src/apps/portal/main.tsx
  gelic/index.html        entrada do master    → src/apps/gelic/main.tsx
  src/
    components/ui/        componentes shadcn (instalados pelo CLI — não edite à mão)
    components/app/       componentes compartilhados do VELO (login, confirmação, CRUD, filtros…)
    data/                 ÚNICA camada que fala com o Supabase (hooks TanStack Query + RPCs)
    lib/                  auth, formatação pt-BR, fila offline, tema, cliente Supabase
    apps/portal/pages/<id>.tsx   uma página do portal por arquivo (carregada sob demanda)
    apps/portal/features/<pacote>/  componentes/lógica de um grupo de páginas
    apps/pdv/             app do caixa
    apps/gelic/           painel master
api/                      funções Vercel (login, usuários, handoff do master)
supabase/migrations/      schema, RLS, RPCs (testados em tests/backend.test.mjs)
legacy/                   sistema antigo (referência; não é publicado)
```

## shadcn/ui — regras obrigatórias

- Use os componentes de `@/components/ui/*`. Faltou algum? Instale pelo CLI (não copie de outro lugar).
  Neste ambiente o registro oficial está bloqueado; use o registro local:
  `REGISTRY_URL=http://127.0.0.1:8765/r npx shadcn@latest add <nome> --yes`
- Cores **semânticas**: `bg-primary`, `text-muted-foreground`, `bg-card`, `text-destructive`,
  `text-success`, `text-warning`… Nunca `bg-blue-500`, nunca `dark:` manual (o tema já troca).
  Cores vindas de dados (cor do botão do subgrupo/forma de pagamento) podem ir em `style`.
- Espaçamento com `flex`/`grid` + `gap-*` (nunca `space-x/space-y`). `size-*` quando largura = altura.
  `truncate` para cortar texto.
- Formulários: `FieldGroup` + `Field` + `FieldLabel` (+ `FieldDescription`/`FieldError`).
  Validação: `data-invalid` no `Field` e `aria-invalid` no controle.
- `Dialog`/`Sheet`/`Drawer`/`AlertDialog` sempre com título (use `className="sr-only"` se oculto).
- Itens sempre dentro do grupo: `SelectItem` em `SelectGroup`, `DropdownMenuItem` em `DropdownMenuGroup`,
  `CommandItem` em `CommandGroup`. `TabsTrigger` dentro de `TabsList`.
- Card completo: `CardHeader`/`CardTitle`/`CardDescription`/`CardContent`/`CardFooter`.
- Ícones em botão: `<Icon data-icon="inline-start" />`, sem classes de tamanho dentro de componentes.
- Botão ocupado: `<Spinner data-icon="inline-start" />` + `disabled` (não existe `isLoading`).
- Use `Badge` (pílulas de status), `Alert` (avisos), `Empty`/`EmptyState` (listas vazias),
  `Skeleton` (carregando), `Separator` (divisórias), `toast()` do `sonner` (mensagens).
- Sem `z-index` manual em sobreposições. `cn()` para classes condicionais.

## Dados (`web/src/data`)

Telas **não** chamam `supabase()` diretamente — usam os hooks:

| arquivo | o que oferece |
|---|---|
| `catalog.ts` | `useProducts/useSaveProducts/useRemoveProducts`, idem para `Groups`, `Subgroups`, `PaymentMethods`, `Printers`, `Terminals`; `usePrintTest`, `useCreatePrinterBridge`. Salvar = upsert de 1 ou vários itens. IDs novos: `newId()` (terminais: `"CX" + número`). |
| `settings.ts` | `useStoreSettings` (ticket, versão atual, histórico), `useSaveStoreSettings(patch)`, `useStoreName`, `DEFAULT_TICKET`. |
| `records.ts` | `useRecords(coleção, seed?)`, `useSaveRecords`, `useRemoveRecords`, `useDocument(chave, padrão)`, `useSaveDocument`, `newNumericId()`. Coleções: `plano_contas, centros_custo, contas_financeiras, lancamentos, borderos, cargos, dre_lines, compliance_*, skills_*`; documentos: `swot, action_plan`. Com `seed`, a tela mostra os exemplos do sistema antigo enquanto a coleção está vazia; a primeira gravação persiste os exemplos junto. |
| `reports.ts` | `useSalesByProduct`, `useSalesByTerminal`, `useCashClosingReport`, `useDashboard`, `useCashMovements` (sangrias), `useCashSessions` (base dos borderôs), `useSalesCount`, `exportStoreData`. Tudo calculado no banco. |
| `users.ts` | `useStoreUsers`, `useCreateUser`, `useUpdateUser`, `useSetUserPassword` (via `/api/users`). |
| `master.ts` | `useMasterStores`, `useCreateStore`, `useUpdateStore`. |
| `pdv.ts` | `loadPdv`, `registerSale` (fila offline), `openCashSession`, `addCashMovement`, `cashSummary`, `closeCashSession`, `printSaleItems`, `printCashMovement`, `printCashClosing`, `recentItems`, `cancelSaleItems` / `registerRefund` (com sessão de supervisor), `syncOfflineQueue`. |

Autorização de supervisor no PDV: `const elevate = useElevate(); const sup = await elevate()` →
`sup.client` (sessão do supervisor) → chame a RPC → `await sup.release()`.

Confirmações: `const confirm = useConfirm(); if (!(await confirm("Remover este item do catálogo?"))) return`.

## Formatação e datas (`web/src/lib/format.ts`)

- Dinheiro: `formatBRL(v)` → "R$ 1.234,56" em todas as telas (o antigo misturava ponto e vírgula).
- Entrada de valores: `parseMoneyBR("150,50")` → 150.5 (o antigo lia 15050).
- Datas de negócio sempre no fuso de São Paulo: `todayBR()`, `toLocalDateString(ts)`, `presetRange()`,
  `formatDateBR("2026-09-26")`, `formatDateTimeBR(iso)`, `daysUntil(date)`.
- Filtros De/Até com atalhos: `<DateRangeFilter>`; relatórios A4: `printReport(spec)` (texto escapado).

## Segurança e desempenho

- Nunca `dangerouslySetInnerHTML`/`innerHTML`/`document.write` com dados. React já escapa.
- Bibliotecas pesadas só sob demanda: `await import("read-excel-file")`, `await import("write-excel-file")`.
  Gráficos: componente `chart` (Recharts) — fica no pedaço da página, que já é carregada sob demanda.
- Nada de `localStorage` para dados de negócio (vendas, sangrias, cadastros): tudo no Supabase.

## Rodando localmente

```bash
npx supabase start                 # banco local (Docker)
npx supabase db reset && node scripts/seed-dev.mjs   # schema + loja DEMO
npm run dev                        # http://127.0.0.1:5173
node --test tests/backend.test.mjs # testes do backend
```

Logins (loja DEMO): `admin`, `sup`, `caixa1` — senha `1234`. Master (gelic): `master` / `master123`.
URLs: `/portal/?store=DEMO`, `/pdv/?store=DEMO&tid=CX1`, `/gelic/`.

## Checklist antes de entregar uma tela

1. `npx tsc -b` sem erros nos seus arquivos; `npx vite build` passa.
2. Captura da tela nova (tema escuro e claro no portal; desktop 1366×768 e celular 400×820 no PDV)
   comparada lado a lado com a captura do sistema antigo — mesmas seções e posições.
3. Fluxos principais testados de verdade contra o Supabase local (criar, editar, excluir, filtrar).
4. Nenhum erro no console do navegador.
