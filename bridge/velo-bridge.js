#!/usr/bin/env node
/**
 * VELO FAST — Ponte de impressão local (v2)
 * ─────────────────────────────────────────
 * Roda num computador da loja, na mesma rede das impressoras. Busca a fila
 * de impressão no Supabase e imprime via TCP (impressora de rede) ou na
 * impressora compartilhada do Windows.
 *
 * Diferenças para a v1:
 *  - fala direto com o Supabase (sem passar pela Vercel a cada consulta);
 *  - cada trabalho é "reservado" antes de imprimir: nunca sai duplicado,
 *    mesmo com duas pontes ou impressora lenta;
 *  - o nome da impressora do Windows nunca passa por um shell (sem risco de
 *    executar comandos);
 *  - horário impresso no fuso de São Paulo.
 *
 * Uso: copie esta pasta, crie o .env (veja .env.example) e rode
 *   node velo-bridge.js
 */
const net = require("net")
const fs = require("fs")
const path = require("path")

// ─── Configuração ──────────────────────────────────────────────
function loadEnv() {
  const config = { VELO_SUPABASE_URL: "", VELO_SUPABASE_KEY: "", VELO_BRIDGE_KEY: "", POLL_INTERVAL_MS: "2000" }
  const envPath = path.join(__dirname, ".env")
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, "utf-8").split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/)
      if (m) config[m[1]] = m[2].replace(/^["']|["']$/g, "")
    }
  }
  for (const key of Object.keys(config)) if (process.env[key]) config[key] = process.env[key]
  return config
}

const config = loadEnv()
const POLL_INTERVAL_MS = Math.max(500, parseInt(config.POLL_INTERVAL_MS, 10) || 2000)
const RPC_BASE = `${config.VELO_SUPABASE_URL.replace(/\/+$/, "")}/rest/v1/rpc`
const TIME_ZONE = "America/Sao_Paulo"

function log(msg) {
  console.log(`[${new Date().toLocaleString("pt-BR", { timeZone: TIME_ZONE })}] ${msg}`)
}

// ─── ESC/POS (mesmo layout da v1) ──────────────────────────────
const ESC = "\x1b"
const GS = "\x1d"
const LF = "\n"
const INIT = ESC + "@"
const CENTER = ESC + "a\x01"
const LEFT = ESC + "a\x00"
const BOLD_ON = ESC + "E\x01"
const BOLD_OFF = ESC + "E\x00"
const NORM = GS + "!\x00"
const SIZE_2X2 = GS + "!\x11"
const CUT = GS + "V\x01"

const int = (v, d) => {
  const n = parseInt(v, 10)
  return Number.isFinite(n) ? n : d
}
const money = (v) => `R$ ${Number(v || 0).toFixed(2).replace(".", ",")}`
const when = (iso) => new Date(iso || Date.now()).toLocaleString("pt-BR", { timeZone: TIME_ZONE })
const upper = (v, d) => String(v == null || v === "" ? d : v).toUpperCase()

function printerSettings(printer) {
  return {
    cols: Math.max(16, int(printer.paper_width, 48)),
    linesBefore: Math.max(0, int(printer.lines_before, 4)),
    linesAfter: Math.max(0, int(printer.lines_after, 0)),
    alignSpacing: Math.max(0, int(printer.align_spacing, 2)),
    activeCut: printer.active_cut !== false,
  }
}

/** Fichas de venda (e teste de impressora). */
function buildFichas(data) {
  const p = printerSettings(data.printer || {})
  const ticket = data.ticket || {}
  const titleTicket = ticket.titleTicket ?? "TICKET 1-A-1"
  const titleFicha = ticket.titleFicha ?? "ficha"
  const border = "=".repeat(p.cols)
  const sep = "-".repeat(p.cols)
  let out = INIT
  ;(data.fichas || []).forEach((f, idx) => {
    if (idx > 0 && p.alignSpacing > 0) out += LF.repeat(p.alignSpacing)
    const refund = Boolean(f.refund)
    out += CENTER
    out += NORM + (refund ? "*".repeat(p.cols) : border) + LF
    out += SIZE_2X2 + BOLD_ON + (refund ? "ESTORNO" : titleFicha) + BOLD_OFF + LF
    out += NORM
    out += `${titleTicket}  -  ${upper(f.terminal_id, "PDV")}` + LF
    out += `#${String(idx + 1).padStart(2, "0")}  -  ${when(f.sold_at)}` + LF
    out += sep + LF
    out += SIZE_2X2 + BOLD_ON + (f.product_name || "PRODUTO") + BOLD_OFF + LF
    out += NORM
    if (refund) out += `VALOR ESTORNADO: ${money(Math.abs(f.unit_price))}` + LF
    out += `OP: ${upper(f.operator, "N/A")}  |  ${upper(f.payment_label, "")}` + LF
    out += (refund ? "*".repeat(p.cols) : border) + LF
    if (p.linesBefore > 0) out += LF.repeat(p.linesBefore)
    if (p.activeCut) out += CUT
    if (p.linesAfter > 0) out += LF.repeat(p.linesAfter)
    out += LEFT
  })
  return out
}

/** Comprovante de sangria. */
function buildSangria(data) {
  const p = printerSettings(data.printer || {})
  const m = data.movement || {}
  const border = "=".repeat(p.cols)
  let out = INIT + CENTER
  out += border + LF
  out += BOLD_ON + "COMPROVANTE DE SANGRIA" + BOLD_OFF + LF
  out += border + LF
  out += LEFT
  out += `Data: ${when(m.occurred_at)}` + LF
  out += `Operador: ${upper(m.operator_name, "-")}` + LF
  out += `Terminal: ${upper(m.terminal_id, "-")}` + LF
  out += `Motivo: ${m.reason || "-"}` + LF
  out += CENTER + BOLD_ON + `VALOR: ${money(m.amount)}` + BOLD_OFF + LF
  out += border + LF
  out += LF + LF + CUT
  return out
}

/** Relatório de fechamento de caixa. */
function buildFechamento(data) {
  const p = printerSettings(data.printer || {})
  const s = data.session || {}
  const sum = data.summary || {}
  const border = "=".repeat(p.cols)
  const dash = "-".repeat(p.cols)
  let out = INIT + CENTER
  out += border + LF
  out += BOLD_ON + "FECHAMENTO DE CAIXA" + BOLD_OFF + LF
  out += border + LF
  out += LEFT
  out += `Terminal: ${upper(s.terminal_id, "-")}` + LF
  out += `Operador: ${upper(s.operator_name, "-")}` + LF
  out += `Abertura: ${s.opened_at ? when(s.opened_at) : "-"}` + LF
  out += `Fechamento: ${when(s.closed_at || Date.now())}` + LF
  out += dash + LF
  out += `Suprimento inicial: ${money(s.opening_amount)}` + LF
  out += `Total de vendas: ${money(sum.total_vendas)}` + LF
  out += `Total de sangrias: ${money(sum.total_sangrias)}` + LF
  out += BOLD_ON + `Dinheiro em caixa: ${money(sum.dinheiro_em_caixa)}` + BOLD_OFF + LF
  out += dash + LF
  const methods = Array.isArray(sum.by_method) ? sum.by_method : []
  if (methods.length) {
    out += BOLD_ON + "Por forma de pagamento:" + BOLD_OFF + LF
    for (const m of methods) out += `  ${m.method}: ${money(m.total)}` + LF
    out += dash + LF
  }
  out += `Transações: ${sum.qtd_transacoes || 0}` + LF
  out += border + LF
  out += LF + LF + CUT
  return out
}

function render(job) {
  if (job.kind === "ficha" || job.kind === "teste") return buildFichas(job.data)
  if (job.kind === "sangria") return buildSangria(job.data)
  if (job.kind === "fechamento") return buildFechamento(job.data)
  throw new Error(`Tipo de impressão desconhecido: ${job.kind}`)
}

// ─── Envio para a impressora ───────────────────────────────────
function printNetwork(ip, port, buf) {
  return new Promise((resolve, reject) => {
    const client = new net.Socket()
    let done = false
    const finish = (err) => {
      if (done) return
      done = true
      client.destroy()
      err ? reject(err) : resolve()
    }
    client.setTimeout(8000)
    client.once("timeout", () => finish(new Error("Tempo esgotado ao falar com a impressora")))
    client.once("error", (err) => finish(err))
    client.connect(port || 9100, ip, () => client.end(buf, () => finish()))
  })
}

// Somente letras, números, espaço e . _ - ( ) \ $ — igual à validação do banco.
const SHARE_RE = /^[A-Za-z0-9 ._()\\$-]{1,128}$/

/**
 * Impressora do Windows: grava os bytes RAW direto no compartilhamento
 * (\\COMPUTADOR\IMPRESSORA ou nome compartilhado local), sem shell.
 */
async function printWindowsShare(systemName, buf) {
  if (process.platform !== "win32") throw new Error("Impressão via Windows só funciona com a ponte rodando no Windows.")
  if (!SHARE_RE.test(systemName)) throw new Error("Nome da impressora do Windows inválido.")
  const target = systemName.startsWith("\\\\") ? systemName : `\\\\localhost\\${systemName}`
  await fs.promises.writeFile(target, buf)
}

async function sendToPrinter(printer, buf) {
  if (printer.use_windows_printer) {
    if (!printer.system_name) throw new Error('Configure o "Nome Exato da Impressora" (modo Windows).')
    return printWindowsShare(printer.system_name, buf)
  }
  if (!printer.ip) throw new Error("Impressora sem IP configurado.")
  return printNetwork(printer.ip, printer.port, buf)
}

// ─── Fila no Supabase ──────────────────────────────────────────
async function rpc(fn, body) {
  const res = await fetch(`${RPC_BASE}/${fn}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: config.VELO_SUPABASE_KEY,
      Authorization: `Bearer ${config.VELO_SUPABASE_KEY}`,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  })
  const text = await res.text()
  if (!res.ok) {
    let message = text
    try {
      message = JSON.parse(text).message || text
    } catch {}
    throw new Error(`HTTP ${res.status}: ${message}`)
  }
  return text ? JSON.parse(text) : null
}

async function tick() {
  const jobs = await rpc("bridge_claim_jobs", { p_key: config.VELO_BRIDGE_KEY, p_limit: 20 })
  if (!Array.isArray(jobs) || jobs.length === 0) return 0
  log(`${jobs.length} impressão(ões) na fila.`)
  for (const job of jobs) {
    const printer = (job.data && job.data.printer) || {}
    try {
      const buf = Buffer.from(render(job), "latin1")
      await sendToPrinter(printer, buf)
      await rpc("bridge_ack_job", { p_key: config.VELO_BRIDGE_KEY, p_job_id: job.id, p_ok: true })
      log(`✅ #${job.id} (${job.kind}) impresso em "${printer.name || "impressora"}".`)
    } catch (err) {
      await rpc("bridge_ack_job", { p_key: config.VELO_BRIDGE_KEY, p_job_id: job.id, p_ok: false, p_error: String(err.message || err) }).catch(() => {})
      log(`❌ #${job.id} (${job.kind}) falhou em "${printer.name || "impressora"}": ${err.message || err}`)
    }
  }
  return jobs.length
}

// Um ciclo por vez (a v1 usava setInterval e podia imprimir em dobro).
async function main() {
  if (!config.VELO_SUPABASE_URL || !config.VELO_SUPABASE_KEY || !config.VELO_BRIDGE_KEY) {
    console.error("❌ Configure VELO_SUPABASE_URL, VELO_SUPABASE_KEY e VELO_BRIDGE_KEY no arquivo .env (veja .env.example).")
    process.exit(1)
  }
  log(`🖨️  Ponte VELO FAST iniciada — consultando a fila a cada ${POLL_INTERVAL_MS / 1000}s.`)
  let failures = 0
  for (;;) {
    try {
      const n = await tick()
      if (failures > 0) log("🔌 Conexão restabelecida.")
      failures = 0
      if (n > 0) continue // havia trabalho: consulta de novo em seguida
    } catch (err) {
      failures++
      if (failures === 1 || failures % 30 === 0) log(`⚠️  Erro ao consultar a fila: ${err.message || err}`)
    }
    await new Promise((r) => setTimeout(r, failures > 0 ? Math.min(30000, POLL_INTERVAL_MS * 2 ** Math.min(failures, 4)) : POLL_INTERVAL_MS))
  }
}

if (require.main === module) main()

module.exports = { render, buildFichas, buildSangria, buildFechamento, tick }
