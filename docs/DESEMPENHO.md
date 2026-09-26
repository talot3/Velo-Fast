# Desempenho: v1 × v2

Medições feitas com o build de produção da v2 e os arquivos da v1 (`legacy/`), usando a loja de
demonstração importada do mesmo JSON da v1.

## 1. Dados: o que mais pesava no dia a dia

A v1 guardava **a loja inteira num único JSON** (catálogo + todas as vendas). Cada abertura do PDV ou do
portal baixava esse JSON inteiro, e **cada venda** fazia o servidor ler e regravar o JSON inteiro.
Cada ficha vendida aumenta o JSON em ~224 bytes, então tudo fica mais lento a cada dia:

| Loja com 500 fichas/dia | v1: baixado ao abrir **e** lido/regravado a cada venda | v2: ao abrir o PDV |
|---|---|---|
| após 30 dias | ~3,4 MB | 7 KB |
| após 6 meses | ~19 MB | 7 KB |
| após 1 ano | ~39 MB | 7 KB |

- **Venda na v2:** o caixa envia só a venda (~0,4 KB); o banco grava as linhas e baixa o estoque.
  Não cresce com o histórico.
- **Relatórios na v2:** calculados no banco (só o resultado trafega), em vez de baixar todas as
  vendas para o navegador somar.
- **Vendas perdidas:** na v1, dois caixas vendendo ao mesmo tempo podiam sobrescrever o JSON um do
  outro (ler → alterar → gravar). Na v2 cada venda é um registro próprio, com ID gerado no caixa
  (reenviar nunca duplica).

## 2. Código para abrir cada app (gzip, como a Vercel entrega)

| App | v1 | v2 |
|---|---|---|
| Portal | 612 KB (Excel, gráficos e todos os ícones carregados sempre) | 206 KB (cada tela baixa só o que usa) |
| PDV | 143 KB | 208 KB na 1ª abertura; depois fica no aparelho |
| Gelic | 118 KB | 202 KB |

- v2 guarda o código com versão no nome (`/assets/*-hash.js`, cache de 1 ano): numa atualização, o
  aparelho baixa só os arquivos que mudaram. React (66 KB) e Supabase (27 KB) ficam em arquivos
  próprios, que quase nunca mudam.
- O PDV fica instalado no aparelho (service worker): reabre sem baixar o código e **abre sem internet**.
- Telas pesadas do portal (gráficos do Skills, planilhas do catálogo) só baixam as bibliotecas quando
  são abertas.

## 3. Tempo até a tela de login (4G lento: 150 ms, 1,6 Mbps · CPU 4× mais lenta)

Mediana de 3 medições, com os dois sistemas servidos com gzip e revalidação (ETag/304), como a Vercel e
os CDNs fazem. "Reabertura" = abrir de novo no mesmo aparelho.

| App | 1ª abertura v1 | 1ª abertura v2 | Reabertura v1 | Reabertura v2 |
|---|---|---|---|---|
| Portal | 4,4 s (650 KB) | **2,3 s** (242 KB) | 0,5 s | 0,4 s |
| PDV | 1,8 s (179 KB) | 2,3 s (215 KB) | 0,3 s | 0,3 s |

- **Portal:** abre em metade do tempo na primeira vez.
- **PDV:** a primeira abertura num aparelho novo leva 0,5 s a mais (o React pesa mais que o JavaScript
  puro da v1); nas aberturas do dia a dia os dois empatam. O ganho do PDV vem **depois do login**
  (seção 1): a v1 baixava o histórico inteiro da loja antes de liberar o caixa (MBs que crescem todo
  dia) e a v2 baixa 7 KB — e o PDV da v2 abre também sem internet.

## 4. Sem internet (PDV)

- Abre sem internet: o app fica guardado no aparelho (service worker), com o catálogo em cache.
- Abre sem internet **mesmo com a sessão vencida** (mais de 1 h): entra em modo offline em ~4 s e
  confere licença e usuário no servidor quando a rede volta (testado: vendeu offline e a venda subiu
  sozinha, sem cair para o login).
- Vendas e sangrias sem internet vão para uma fila no IndexedDB, reenviada em ordem e sem duplicar.
- Uma venda recusada pelo servidor ao sincronizar fica visível no cabeçalho ("N falha(s)") com
  "Tentar novamente".
