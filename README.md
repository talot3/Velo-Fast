# VELO FAST — PDV (versão Vercel + Supabase)

Backend do PDV migrado de um servidor Node.js local (SQLite em disco) para
funções serverless na Vercel usando Supabase como banco de dados.

## Estrutura

```
├── index.html          # página inicial
├── pdv/                # PWA do caixa (frente de loja)
├── portal/             # PWA do painel administrativo
├── gelic/              # painel master de licenças/multi-lojas
├── api/                # funções serverless (Vercel)
│   ├── data.js
│   ├── save.js
│   ├── push-sales.js
│   ├── cancel-sale.js
│   ├── print.js
│   ├── print-test.js
│   └── master/
│       ├── stores.js
│       ├── dashboard.js
│       ├── select-store.js
│       ├── create-store.js
│       └── toggle-license.js
└── lib/                # código compartilhado pelas funções (Supabase, estado, impressão)
```

## Variáveis de ambiente

Configure em **Vercel → Project → Settings → Environment Variables**
(veja `.env.example`):

| Variável | Onde encontrar |
|---|---|
| `SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API → `service_role` secret |
| `DEFAULT_STORE_ID` | opcional, padrão `DEMO` |

O projeto Supabase já criado para este app: `velo-fast` (`sa-east-1`).

## Deploy

1. Suba este repositório para o GitHub (veja passo a passo abaixo).
2. Importe o repositório na Vercel (vercel.com → Add New Project).
3. Configure as variáveis de ambiente acima.
4. Deploy. As rotas ficam disponíveis em:
   - `/` — página inicial
   - `/pdv` — terminal de vendas
   - `/portal` — painel administrativo
   - `/gelic` — controle de licenças (multi-lojas)

## Multi-lojas

O frontend pode indicar a loja via cabeçalho `X-Store-Id` ou `?store=ID` na URL.
Sem isso, todas as chamadas usam a loja padrão (`DEMO`, configurável por
`DEFAULT_STORE_ID`). O painel `gelic` gerencia a lista de lojas e a loja
"atual" fica salva na tabela `app_settings` do Supabase.

## Limitações importantes desta migração

**Impressão (`/api/print`, `/api/print-test`)**
Funciona apenas com impressoras de rede (IP) alcançáveis pela internet.
Impressoras em rede local (LAN, ex. `192.168.x.x`) **não são alcançáveis**
por uma função da Vercel. Para imprimir em uma impressora de balcão real,
você precisa de uma ponte local — por exemplo, adaptar o `velosync/` (que já
existe no projeto original) para consultar a Supabase/API periodicamente e
imprimir na rede do estabelecimento, ou rodar uma pequena aplicação local que
faça esse papel.

**Impressora via driver do Windows (`useWindowsPrinter`)**
Não é suportado na nuvem — a função retorna erro 501 explicando isso. Precisa
rodar localmente (como o `server.js` original fazia via PowerShell).

**Bot de WhatsApp (`BANCO_ZERADO/`)**
Não foi portado. Um bot com `whatsapp-web.js` precisa de um processo Node
sempre ativo com um Chromium headless — incompatível com funções serverless.
Se for necessário, isso deve continuar rodando em um servidor/VM separado,
integrado com a API via `SUPABASE_URL`/chave anônima ou um endpoint dedicado.

**App Flutter (`APK/`) e sincronizador (`velosync/`)**
Não fazem parte deste deploy web. Continuam existindo no projeto original;
se quiser, dá pra apontá-los para a nova API na Vercel depois.

**Endpoints "mock" removidos**
`/api/mock-cloud/*` e `/api/sync/*` do servidor original eram simulações de
nuvem/sincronização — como agora a Supabase já é a nuvem real, esses mocks
não foram portados.

## Segurança

- Row Level Security (RLS) está ativado em todas as tabelas do Supabase.
  Só a `service_role key` (usada exclusivamente pelas funções `/api`, nunca
  pelo navegador) consegue ler ou escrever os dados.
- Nenhum dado real de clientes (nomes, CNPJ, telefone), backup, sessão de
  WhatsApp ou binário do projeto original foi incluído neste repositório —
  veja `.gitignore`.
