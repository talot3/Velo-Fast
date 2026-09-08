# Ponte de impressão local — VELO FAST

Este programa roda num computador ligado na **mesma rede Wi-Fi/cabeada**
das suas impressoras de bar/cozinha. Ele busca a fila de impressão da nuvem
a cada poucos segundos e imprime localmente — resolvendo o problema de a
Vercel não conseguir alcançar impressoras numa rede privada.

## Requisitos
- Um computador (pode ser um mini PC, notebook antigo, ou até um Raspberry
  Pi) **ligado o dia inteiro**, na mesma rede das impressoras.
- [Node.js](https://nodejs.org) versão 18 ou mais recente instalado nesse
  computador.

## 1. Gerar a chave da ponte (uma vez, por um admin)

Chame este endpoint (pode usar um app como Postman/Insomnia, ou o `curl`
abaixo), autenticado com um token de admin (faça login em `/api/login`
primeiro para pegar o token):

```bash
curl -X POST https://seu-site.vercel.app/api/master/create-bridge \
  -H "Authorization: Bearer SEU_TOKEN_DE_ADMIN" \
  -H "Content-Type: application/json" \
  -d '{"storeId": "15521", "name": "Ponte Recanto Caipira"}'
```

A resposta traz `apiKey` — **copie e guarde num lugar seguro**. Ela só é
mostrada essa vez; se perder, gere outra (a antiga continua ativa até você
desativá-la no banco).

## 2. Configurar o computador da loja

1. Copie a pasta `bridge/` inteira (com `velo-bridge.js`, `.env.example`)
   para o computador da loja.
2. Renomeie `.env.example` para `.env` e preencha:
   ```
   VELO_URL=https://seu-site.vercel.app
   VELO_BRIDGE_KEY=vfb_a_chave_que_voce_copiou
   ```
3. Abra um terminal nessa pasta e rode:
   ```bash
   node velo-bridge.js
   ```
   Deve aparecer: `🖨️  Ponte VELO FAST iniciada...`

## 3. Deixar rodando sempre (opcional, recomendado)

**Windows** — use o Agendador de Tarefas para rodar
`node caminho\para\velo-bridge.js` ao iniciar o Windows, ou instale o
pacote `pm2` (`npm install -g pm2`, depois `pm2 start velo-bridge.js` e
`pm2 startup`).

**Linux/Raspberry Pi** — crie um serviço `systemd`, ou use `pm2` do mesmo
jeito.

## Como saber se está funcionando

No terminal onde a ponte está rodando, cada impressão aparece como:
```
✅ Job #42 impresso em "IMPRESSORA BAR" (192.168.1.200).
```

Se a impressora estiver desligada ou com IP errado, aparece como falha —
mas o job fica registrado no banco (`print_jobs`, status `failed`) e você
pode ver o motivo lá.

## Uma ponte por loja (ou mais de uma)

Cada chave de ponte pertence a **uma loja só** (`store_id`). Se você tem
várias lojas em redes diferentes, gere uma chave por loja e rode uma
instância da ponte em cada uma (ou várias pastas com `.env` diferentes no
mesmo computador, se por acaso duas lojas compartilharem a mesma rede).
