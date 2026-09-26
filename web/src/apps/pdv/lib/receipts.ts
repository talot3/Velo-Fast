/**
 * Textos das prévias (ficha, sangria, fechamento) e os formatos enviados à
 * impressora nativa. Os formatos nativos são os MESMOS do PDV antigo
 * (ver native.ts) — não renomeie campos.
 */
import type { CashMovement, CashSummary, RecentItem } from "@/data/types"
import { formatBRL, formatDateTimeBR, sumMoney, TIME_ZONE } from "@/lib/format"

import type { NativeFechamento, NativeReprint, NativeSaleTicket, NativeSangria } from "../native"
import type { LocalSession } from "./device-state"
import type { OrderLine, TicketTx } from "./types"

// ─── Dinheiro ───────────────────────────────────────────────────────
/** "5000" (centavos digitados) → 50 */
export const centsToValue = (digits: string) => (parseInt(digits || "0", 10) || 0) / 100

export const orderTotal = (lines: OrderLine[]) => sumMoney(lines.map((l) => l.price * l.qty))

export const orderCount = (lines: OrderLine[]) => lines.reduce((s, l) => s + l.qty, 0)

/** Troco só em forma de pagamento "dinheiro"/"cash" (regra antiga e do servidor). */
export const isCashMethod = (name: string) => /dinheiro|cash/i.test(name)

// ─── Datas (sempre no fuso de São Paulo) ────────────────────────────
/** "26/09/2026 13:02:35" */
export function ticketDateTime(iso: string) {
  const d = new Date(iso)
  return (
    d.toLocaleDateString("pt-BR", { timeZone: TIME_ZONE }) +
    " " +
    d.toLocaleTimeString("pt-BR", { timeZone: TIME_ZONE, hour: "2-digit", minute: "2-digit", second: "2-digit" })
  )
}

/** "26/09/26, 13:02" (listas de reimpressão/cancelamento) */
export function shortDateTime(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    timeZone: TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

// ─── Fichas ─────────────────────────────────────────────────────────
/** Nome mostrado para uma ficha vinda do servidor (estorno/crédito marcados como no antigo). */
export function recentItemName(item: RecentItem) {
  if (item.unit_price < 0) return `${item.kind === "refund" ? "[ESTORNO]" : "[DEVOLUÇÃO]"} ${item.product_name}`
  return item.product_name
}

/** Formato 1 (uma ficha por chamada). */
export function nativeSaleTicket(printerId: string, terminalId: string, operator: string, tx: TicketTx): NativeSaleTicket {
  return {
    printerId,
    terminalId,
    operator,
    transactions: [
      {
        id: tx.id,
        productId: tx.productId,
        productName: tx.productName,
        price: tx.price,
        printerId: tx.printerId,
        paymentMethod: tx.paymentMethod,
        terminalId: tx.terminalId,
        operator: tx.operator,
        timestamp: tx.timestamp,
      },
    ],
  }
}

/** Formato 2 (reimpressão, sem printerId). */
export function nativeReprint(item: RecentItem, terminalId: string, operator: string): NativeReprint {
  const tid = item.terminal_id || terminalId
  return {
    terminalId: tid,
    operator: item.operator_name || operator,
    transactions: [{ productName: recentItemName(item), paymentMethod: item.payment_label, terminalId: tid, timestamp: item.sold_at }],
  }
}

// ─── Sangria ────────────────────────────────────────────────────────
export type Sangria = NativeSangria

/** Formato 3. */
export function nativeSangria(s: Sangria): NativeSangria {
  return { id: s.id, valor: s.valor, motivo: s.motivo, operador: s.operador, terminal: s.terminal, timestamp: s.timestamp }
}

export type PaperLine = { text: string; kind?: "rule" | "title" | "bold" | "big" | "total" | "danger" }

const EQ = "═".repeat(32)
const DASH = "─".repeat(32)

export function sangriaPaper(s: Sangria): PaperLine[] {
  return [
    { text: EQ, kind: "rule" },
    { text: "SANGRIA DE CAIXA", kind: "title" },
    { text: DASH },
    { text: `Terminal : ${s.terminal}` },
    { text: `Operador : ${s.operador.toUpperCase()}` },
    { text: `Data/Hora: ${formatDateTimeBR(s.timestamp)}` },
    { text: DASH },
    { text: "Motivo:", kind: "bold" },
    { text: s.motivo },
    { text: DASH },
    { text: `Valor: ${formatBRL(s.valor)}`, kind: "danger" },
    { text: EQ, kind: "rule" },
  ]
}

// ─── Fechamento ─────────────────────────────────────────────────────
const sangriasOf = (movements: CashMovement[]) => movements.filter((m) => m.kind === "sangria")

export function fechamentoPaper(p: {
  terminalId: string
  operator: string
  session: LocalSession
  summary: CashSummary
  closedAt: string
}): PaperLine[] {
  const { summary } = p
  const methods = summary.by_method.map((m) => ({
    text: `${m.method.padEnd(16, " ")}${formatBRL(m.total).padStart(10, " ")}`,
  }))
  const sangrias = sangriasOf(summary.movements)
  return [
    { text: EQ, kind: "rule" },
    { text: " FECHAMENTO DE CAIXA ", kind: "title" },
    { text: EQ, kind: "rule" },
    { text: `Terminal  : ${p.terminalId}` },
    { text: `Operador  : ${p.operator.toUpperCase()}` },
    { text: `Abertura  : ${formatDateTimeBR(p.session.opened_at)}` },
    { text: `Fechamento: ${formatDateTimeBR(p.closedAt)}` },
    { text: DASH },
    { text: "SUPRIMENTO INICIAL", kind: "bold" },
    { text: formatBRL(p.session.opening_amount), kind: "big" },
    { text: DASH },
    { text: `VENDAS POR PAGAMENTO (${summary.qtd_transacoes} transações)`, kind: "bold" },
    ...(methods.length ? methods : [{ text: "Nenhuma venda registrada" }]),
    { text: DASH },
    { text: "Total Bruto:", kind: "bold" },
    { text: formatBRL(summary.total_vendas), kind: "big" },
    { text: DASH },
    { text: "SANGRIAS", kind: "bold" },
    ...(sangrias.length
      ? sangrias.map((m) => ({ text: `${(m.reason || "Sangria de caixa").substring(0, 16).padEnd(16)} ${formatBRL(m.amount)}` }))
      : [{ text: "Nenhuma sangria registrada" }]),
    { text: `Total Sangrias: ${formatBRL(summary.total_sangrias)}` },
    { text: DASH },
    { text: "TOTAL LÍQUIDO EM CAIXA", kind: "bold" },
    { text: ` ${formatBRL(summary.dinheiro_em_caixa)} `, kind: "total" },
    { text: EQ, kind: "rule" },
  ]
}

/** Formato 4 (valores corretos: dinheiro em caixa = só dinheiro). */
export function nativeFechamento(p: {
  terminalId: string
  operator: string
  session: LocalSession
  summary: CashSummary
  closedAt: string
}): NativeFechamento {
  const { summary } = p
  const byMethod: NativeFechamento["byMethod"] = {}
  for (const l of summary.by_label) byMethod[l.label || "N/D"] = { total: Number(l.total) || 0, qty: Number(l.qty) || 0 }
  return {
    terminal: p.terminalId,
    operador: p.operator,
    dtAbertura: formatDateTimeBR(p.session.opened_at),
    dtFechamento: formatDateTimeBR(p.closedAt),
    suprimento: Number(p.session.opening_amount) || 0,
    totalVendas: Number(summary.total_vendas) || 0,
    totalSangrias: Number(summary.total_sangrias) || 0,
    totalLiquido: Number(summary.dinheiro_em_caixa) || 0,
    byMethod,
    sangrias: sangriasOf(summary.movements).map((m) => ({
      id: m.id,
      valor: Number(m.amount) || 0,
      motivo: m.reason || "Sangria de caixa",
      operador: m.operator_name,
      terminal: m.terminal_id,
      timestamp: m.occurred_at,
    })),
    qtdTransacoes: Number(summary.qtd_transacoes) || 0,
  }
}
