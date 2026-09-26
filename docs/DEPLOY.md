# Publicação do VELO FAST v2 (Supabase + Vercel)

Roteiro para colocar a v2 no ar e virar as lojas da v1 sem perder dados.
Tempo estimado: 1–2 h de preparação (sem afetar a v1) + ~30 min de virada
com a loja fechada.

```
Navegador (PDV, portal, gelic) ──► Supabase (banco, RLS, RPCs, sessões)   região São Paulo
        │                              ▲
        └──► Vercel /api (login,       │  service role / chave secreta
             usuários, handoff) ───────┘  região gru1 (São Paulo)
Ponte de impressão (PC da loja) ──► Supabase (fila de impressão)
```

- **Vercel**: publica os três apps (`/pdv/`, `/portal/`, `/gelic/`) e 3 funções (`/api/auth/login`,
  `/api/auth/handoff`, `/api/users`).
- **Supabase**: todo o resto. O navegador fala direto com o banco; o RLS garante que cada loja só
  enxerga os próprios dados.

---

## 0. Decisão: projeto Supabase novo ou o mesmo da v1?

| | **A. Projeto novo (recomendado)** | B. Mesmo projeto da v1 |
|---|---|---|
| v1 durante os testes | continua funcionando, intocada | **para no momento da migração** |
| Testar com dados reais antes | sim (importa quantas vezes quiser) | não |
| Voltar atrás | 1 clique na Vercel (Instant Rollback) | trabalhoso |
| Custo | um projeto a mais (o antigo pode ser pausado depois) | nenhum extra |

Na opção B, a migração `20260926115900_legacy_quarantine.sql` move as tabelas da v1
(`system_data`, `app_users`, `app_settings` e as versões antigas de `stores`, `printer_bridges`,
`print_jobs`) para o schema `legacy` — nada é apagado, mas a v1 deixa de encontrá-las. Só faça
B **dentro da janela de virada** (passo 7), com a loja fechada.

> Planos: no plano gratuito o Supabase **pausa projetos sem uso por 7 dias** e não tem backup
> diário; para um PDV em produção use o plano Pro. Na Vercel, o plano Hobby é para uso
> não comercial — para as lojas, use o Pro.

---

## 1. Criar o projeto Supabase (opção A)

1. Supabase → **New project** → região **South America (São Paulo)** (a mesma região das funções
   da Vercel, `gru1`). Guarde a senha do banco.
2. **Project Settings → API Keys** e anote:
   - **Project URL** (`https://<ref>.supabase.co`)
   - **Publishable key** (`sb_publishable_…`) — pública, vai para o navegador
   - **Secret key** (`sb_secret_…`) — crie uma se não houver. **Nunca** vai para o navegador.
     Use a chave nova `sb_secret_…`, não a `service_role` antiga: só a nova permite repassar o IP
     de quem faz login (passo 3).

## 2. Aplicar o schema

Numa máquina com o repositório e Node 20+:

```bash
npm ci
npx supabase login
npx supabase link --project-ref <ref>      # pede a senha do banco
npx supabase db push                       # aplica supabase/migrations/* em ordem
npx supabase migration list                # local e remoto devem bater
```

- **Não** rode `supabase config push`: o `supabase/config.toml` é só do ambiente local (URLs
  `127.0.0.1`).
- Depois do push, confira **Advisors → Security** no painel: não deve haver tabela sem RLS no
  schema `public`.

## 3. Configurar o Auth (obrigatório)

No painel do projeto, **Authentication**:

| Onde | O quê | Por quê |
|---|---|---|
| Sign In / Providers → *Allow new users to sign up* | **Desligado** | Usuários só são criados pelo portal (`/api/users`) e pelos scripts. |
| Sign In / Providers → **Email** | **Desligado** | O login do VELO não usa o provedor de e-mail. Desligado, ninguém consegue pedir link de acesso (`/otp`) nem tentar senha por e-mail. Login, renovação de sessão, "Entrar no portal" do master e logout foram testados com ele desligado. |
| Rate Limits → **IP Address Forwarding** | **Ligado** | Todo login passa pelo servidor da Vercel; com isso o limite do Supabase conta o IP de cada loja, e não o do servidor. |
| Rate Limits → *Token verifications* | **600** por hora | Folga para trocas de turno (cada login é uma verificação). |
| URL Configuration → *Site URL* | o domínio de produção | Não é usado para e-mails (nenhum é enviado), mas evita avisos. |

O mesmo pela Management API (token em supabase.com/dashboard/account/tokens):

```bash
curl -X PATCH "https://api.supabase.com/v1/projects/<ref>/config/auth" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" -H "Content-Type: application/json" \
  -d '{"disable_signup": true, "external_email_enabled": false,
       "security_sb_forwarded_for_enabled": true, "rate_limit_verify": 600,
       "site_url": "https://SEU-DOMINIO"}'
```

## 4. Criar o usuário master (painel gelic)

```bash
export SUPABASE_URL=https://<ref>.supabase.co
export SUPABASE_SERVICE_ROLE_KEY=sb_secret_...
node scripts/create-master.mjs <usuario> '<senha com 8+ caracteres>'
```

Se este comando falhar ao criar o usuário, pare aqui e verifique o passo 3 — o login de todos os
usuários depende do mesmo mecanismo.

## 5. Importar os dados da v1 (ensaio — pode repetir)

Com as mesmas variáveis do passo 4 (projeto **novo**):

```bash
# Opção A: lê direto do projeto antigo (só leitura)
node scripts/import-legacy.mjs --source supabase \
  --source-url https://<ref-antigo>.supabase.co --source-key <service_role do antigo> --dry-run
node scripts/import-legacy.mjs --source supabase \
  --source-url https://<ref-antigo>.supabase.co --source-key <service_role do antigo>

# Opção B (mesmo projeto, só na janela de virada, depois do db push):
node scripts/import-legacy.mjs --source same-db
```

`--store <código>` limita a uma loja (repetível). Rodar de novo **não duplica nada** (IDs estáveis
+ upsert) — é assim que a virada traz as vendas feitas depois do ensaio.

**O que vem:** lojas (nome, CNPJ, licença, limite de terminais), usuários **com as mesmas senhas**,
produtos (preço, estoque, precificação), grupos, subgrupos, formas de pagamento, impressoras,
terminais, configuração do ticket, controle de versões, plano de contas, centros de custo, contas
financeiras, lançamentos, cargos, DRE, compliance, skills, borderôs conciliados e todo o histórico
de vendas.

**O que não vem:** fila de impressão e chaves da ponte (gere novas), sessões abertas (todos entram
de novo com o mesmo usuário e senha), dados que a v1 guardava só no navegador de cada aparelho.

Leia os **Avisos** no fim da saída (ex.: nome de impressora do Windows com caracteres inválidos,
usuário duplicado) e ajuste pelo portal.

## 6. Vercel

Use o **mesmo projeto da Vercel da v1** (mesmo domínio): cada aparelho continua lembrando sua loja
(`?store=`) e terminal (`?tid=`), e a maquininha PagSeguro não precisa trocar de endereço.

1. **Settings → Build and Deployment**: *Framework Preset* = **Other** (o `vercel.json` define
   `npm run build` e a pasta `dist`); Node.js 20 ou 22.
2. **Settings → Environment Variables** (Production **e** Preview):

   | Variável | Valor | Observação |
   |---|---|---|
   | `VITE_SUPABASE_URL` | `https://<ref>.supabase.co` | vai para o navegador |
   | `VITE_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_…` | vai para o navegador |
   | `VITE_DEFAULT_STORE_ID` | código da loja | opcional: copie o `DEFAULT_STORE_ID` da v1, se existia (loja usada por aparelhos abertos sem `?store=`) |
   | `SUPABASE_URL` | `https://<ref>.supabase.co` | só servidor |
   | `SUPABASE_SERVICE_ROLE_KEY` | `sb_secret_…` | só servidor — marque **Sensitive** |

   Variáveis da v1 que deixam de ser usadas: `AUTH_JWT_SECRET`, `DEFAULT_STORE_ID`. Remova depois
   da virada (mudar variáveis não afeta deploys já publicados).
3. Cada push no branch da v2 gera um **Preview** com essas variáveis. Teste nele (passo 7) antes
   de tocar em produção.

## 7. Testes no Preview (antes da virada)

- **Portal** (`/portal/?store=<código>`): login do admin; abrir todas as telas do menu; cadastrar,
  editar e excluir um produto de teste; relatório de vendas do último mês com o **mesmo total**
  que a v1 mostra.
- **PDV** (`/pdv/?store=<código>&tid=CX001`): login do caixa; abrir caixa; venda em dinheiro com
  troco; venda no cartão; sangria; reimpressão; estorno com senha de supervisor; fechamento.
  Sem internet (modo avião): a venda fica na fila e sobe sozinha quando a rede volta.
- **Gelic** (`/gelic/`): login do master; lista de lojas; "Entrar no portal" de uma loja.
- **Ponte**: portal → **Ajustes → Impressoras → Ponte de Impressão** → gerar chave → num PC da loja,
  `bridge/.env` com os três valores mostrados → `node velo-bridge.js` → "Imprimir teste".
  (Detalhes em `bridge/README-bridge.md`.)

Apague os registros de teste depois.

## 8. Virada (loja fechada, ~30 min)

1. Na v1: feche os caixas (fechamento) e pare a ponte antiga.
2. (Opção B apenas) `npx supabase db push` agora — a v1 para aqui.
3. Rode o importador de novo (passo 5, sem `--dry-run`) para trazer as últimas vendas.
4. Publique a v2 em produção: faça o merge do branch da v2 no branch de produção (ou
   **Promote to Production** do preview testado). A URL continua a mesma.
5. Em cada aparelho: abra o sistema e entre com o mesmo usuário e senha. O PDV passa a funcionar
   também sem internet (fica salvo no aparelho após a primeira abertura).
6. Instale a ponte nova (passo 7, "Ponte") em cada loja com impressora de rede.
7. Faça uma venda real de conferência e confira a impressão e o relatório.

**Voltar atrás (opção A):** Vercel → Deployments → último deploy da v1 → **Instant Rollback**.
A v1 volta a usar o projeto antigo, intacto (vendas feitas na v2 nesse meio-tempo teriam de ser
relançadas).

## 9. Depois da virada

- Acompanhe: Vercel → **Logs** (funções `/api`) e Supabase → **Logs** e **Advisors** (segurança e
  desempenho).
- Backup: portal → **Sistema → Backup de Dados** (exporta os dados da loja) e, no plano Pro, os backups diários do
  Supabase.
- Após 1–2 semanas estável: pause o projeto antigo (opção A) ou, com backup feito,
  `drop schema legacy cascade` (opção B).

---

## Referência rápida

| Onde | Variável / ajuste |
|---|---|
| Vercel | `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_DEFAULT_STORE_ID` (opcional), `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (`sb_secret_…`) |
| Supabase Auth | cadastro desligado, provedor Email desligado, IP Address Forwarding ligado, verificações 600/h |
| Ponte (`bridge/.env`) | `VELO_SUPABASE_URL`, `VELO_SUPABASE_KEY` (publishable), `VELO_BRIDGE_KEY` (gerada no portal) |
| Scripts locais | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` |
