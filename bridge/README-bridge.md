# Ponte de impressão local — VELO FAST v2

Programa pequeno (sem dependências) que roda num computador da loja, na
**mesma rede das impressoras** de bar/cozinha. Ele busca a fila de impressão
na nuvem (Supabase) e imprime localmente — a nuvem não alcança impressoras
de rede local.

## Requisitos
- Um computador ligado o dia todo na rede das impressoras (Windows, Linux ou
  Raspberry Pi).
- [Node.js](https://nodejs.org) 18 ou mais recente.

## 1. Gerar a chave da ponte
No portal: **Ajustes → Impressoras → Ponte de Impressão** (usuário admin).
A chave aparece **uma única vez** junto com o conteúdo do arquivo `.env`.
Guarde-a. Se perder, gere outra.

## 2. Instalar no computador da loja
1. Copie a pasta `bridge/` inteira (`velo-bridge.js`, `package.json`, `.env.example`).
2. Crie o arquivo `.env` (copie `.env.example`) e preencha:
   ```
   VELO_SUPABASE_URL=https://SEU-PROJETO.supabase.co
   VELO_SUPABASE_KEY=sb_publishable_...
   VELO_BRIDGE_KEY=vfb_...
   ```
3. Rode: `node velo-bridge.js` — deve aparecer `🖨️  Ponte VELO FAST iniciada`.

## 3. Deixar rodando sempre
**Windows:** Agendador de Tarefas rodando `node C:\caminho\velo-bridge.js` ao
iniciar, ou `npm install -g pm2`, `pm2 start velo-bridge.js`, `pm2 save`.
**Linux/Raspberry Pi:** serviço `systemd` ou `pm2`.

## Impressoras do Windows
No cadastro da impressora (modo Windows), informe o **nome do compartilhamento**
(ex.: `EPSON-BAR`) ou o caminho de rede (`\\COMPUTADOR\EPSON-BAR`). A impressora
precisa estar **compartilhada** no Windows. A ponte grava os bytes direto no
compartilhamento — nenhum comando de sistema é executado.

## Como saber se está funcionando
Cada impressão aparece no terminal como
`✅ #42 (ficha) impresso em "COZINHA - ELGIN I9".` Falhas ficam registradas na
fila (status `failed`, com o motivo) e o painel master mostra a ponte como
**Online** quando ela consulta a fila nos últimos 30 segundos.

## O que mudou em relação à v1
- Fala direto com o Supabase (não chama a Vercel a cada consulta).
- Cada trabalho é reservado antes de imprimir: não sai em dobro, mesmo com
  duas pontes ou impressora lenta; se a ponte cair no meio, o trabalho volta
  para a fila (até 3 tentativas).
- Horário impresso no fuso de São Paulo; fechamento sem "R$ NaN".
- As chaves da v1 não valem mais: gere uma nova no portal.
