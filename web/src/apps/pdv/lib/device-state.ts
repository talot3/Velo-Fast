/**
 * Estado do caixa guardado NESTE aparelho (não são dados de negócio — as
 * vendas, sangrias e o caixa ficam no Supabase):
 *  - o pedido em andamento, para não perder a venda se a página recarregar
 *    (o antigo guardava em tp_order, só para o mesmo operador);
 *  - o caixa aberto neste terminal, para abrir sem internet;
 *  - a partir de quando o "Limpar histórico" escondeu as listas.
 */
import type { CashSession } from "@/data/types"

import type { OrderLine } from "./types"

const key = (kind: string, storeId: string, terminalId: string) => `velofast_pdv_${kind}:${storeId}:${terminalId}`

function read<T>(k: string): T | null {
  try {
    const raw = localStorage.getItem(k)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function write(k: string, value: unknown) {
  try {
    if (value === null) localStorage.removeItem(k)
    else localStorage.setItem(k, JSON.stringify(value))
  } catch {
    // armazenamento cheio/bloqueado: segue sem a cópia local
  }
}

// ─── Pedido em andamento ────────────────────────────────────────────
type SavedOrder = { operator: string; lines: OrderLine[] }

export function loadOrder(storeId: string, terminalId: string, operator: string): OrderLine[] {
  const saved = read<SavedOrder>(key("order", storeId, terminalId))
  if (!saved || saved.operator !== operator || !Array.isArray(saved.lines)) return []
  return saved.lines.filter((l) => l && typeof l.uid === "string" && Number.isInteger(l.qty) && l.qty > 0)
}

export function saveOrder(storeId: string, terminalId: string, operator: string, lines: OrderLine[]) {
  write(key("order", storeId, terminalId), lines.length ? { operator, lines } : null)
}

export function clearOrder(storeId: string, terminalId: string) {
  write(key("order", storeId, terminalId), null)
}

// ─── Caixa aberto neste terminal ────────────────────────────────────
export type LocalSession = Pick<CashSession, "id" | "terminal_id" | "opened_at" | "opening_amount" | "operator_name">

export function toLocalSession(s: CashSession | LocalSession): LocalSession {
  return {
    id: s.id,
    terminal_id: s.terminal_id,
    opened_at: s.opened_at,
    opening_amount: Number(s.opening_amount) || 0,
    operator_name: s.operator_name,
  }
}

export function loadLocalSession(storeId: string, terminalId: string): LocalSession | null {
  return read<LocalSession>(key("session", storeId, terminalId))
}

export function saveLocalSession(storeId: string, terminalId: string, session: LocalSession | null) {
  write(key("session", storeId, terminalId), session ? toLocalSession(session) : null)
}

// ─── "Limpar histórico" (reimpressão / cancelamento) ────────────────
export function loadHistoryHiddenBefore(storeId: string, terminalId: string): string | null {
  return read<string>(key("history_hidden", storeId, terminalId))
}

export function saveHistoryHiddenBefore(storeId: string, terminalId: string, iso: string) {
  write(key("history_hidden", storeId, terminalId), iso)
}
