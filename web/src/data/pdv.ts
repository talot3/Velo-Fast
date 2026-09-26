/**
 * Dados e regras do PDV (caixa). Tudo passa por RPCs idempotentes no
 * Supabase; sem rede, vendas e movimentos de caixa vão para a fila offline
 * e são reenviados sozinhos.
 */
import type { Database } from "@/data/database.types"
import { toGroup, toPaymentMethod, toPrinter, toProduct, toSubgroup, toTerminal } from "@/data/catalog-mappers"
import type {
  CashMovement,
  CashSession,
  CashSummary,
  Group,
  PaymentMethod,
  Printer,
  Product,
  RecentItem,
  Subgroup,
  Terminal,
  TicketConfig,
  Version,
} from "@/data/types"
import { isNetworkError, isSessionError } from "@/lib/errors"
import { enqueue, flushQueue, pendingCount, type QueueItem, type RunResult } from "@/lib/offline-queue"
import { supabase, type Supabase } from "@/lib/supabase"

type Tables = Database["public"]["Tables"]

const TIMEOUT_MS = 10_000

export type PdvCatalog = {
  storeName: string | null
  ticketConfig: TicketConfig
  currentVersion: string
  versions: Version[]
  products: Product[]
  groups: Group[]
  subgroups: Subgroup[]
  paymentMethods: PaymentMethod[]
  printers: Printer[]
  terminals: Terminal[]
  cashSession: CashSession | null
  /** true quando veio do cache local (sem conexão). */
  offline: boolean
}

// Por loja E terminal: o bootstrap traz o caixa aberto deste terminal.
const cacheKey = (storeId: string, terminalId: string) => `velofast_pdv_catalog_${storeId}_${terminalId}`

type BootstrapRaw = {
  store: { id: string; name: string } | null
  settings: { ticket_config?: TicketConfig; current_version?: string; versions?: Version[] }
  products: Tables["products"]["Row"][]
  groups: Tables["product_groups"]["Row"][]
  subgroups: Tables["product_subgroups"]["Row"][]
  payment_methods: Tables["payment_methods"]["Row"][]
  printers: Tables["printers"]["Row"][]
  terminals: Tables["terminals"]["Row"][]
  cash_session: CashSession | null
}

function mapBootstrap(raw: BootstrapRaw, offline: boolean): PdvCatalog {
  return {
    storeName: raw.store?.name ?? null,
    ticketConfig: raw.settings?.ticket_config ?? {},
    currentVersion: raw.settings?.current_version ?? "1.0.0",
    versions: raw.settings?.versions ?? [],
    products: raw.products.map(toProduct),
    groups: raw.groups.map(toGroup),
    subgroups: raw.subgroups.map(toSubgroup),
    paymentMethods: raw.payment_methods.map(toPaymentMethod),
    printers: raw.printers.map(toPrinter),
    terminals: raw.terminals.map(toTerminal),
    cashSession: raw.cash_session,
    offline,
  }
}

/**
 * Carrega tudo que o caixa precisa em UMA chamada. Guarda uma cópia local
 * para abrir sem internet. Erro do servidor nunca apaga o cache.
 */
export async function loadPdv(storeId: string, terminalId: string): Promise<PdvCatalog> {
  try {
    const { data, error } = await supabase()
      .rpc("pdv_bootstrap", { p_store_id: storeId, p_terminal_id: terminalId })
      .abortSignal(AbortSignal.timeout(TIMEOUT_MS))
    if (error) throw error
    const raw = data as unknown as BootstrapRaw
    try {
      localStorage.setItem(cacheKey(storeId, terminalId), JSON.stringify(raw))
    } catch {
      // armazenamento cheio: segue sem cache
    }
    return mapBootstrap(raw, false)
  } catch (error) {
    const cached = localStorage.getItem(cacheKey(storeId, terminalId))
    if (cached && isNetworkError(error)) return mapBootstrap(JSON.parse(cached) as BootstrapRaw, true)
    throw error
  }
}

// ─── Operações idempotentes (com fila offline) ──────────────────────
export type SaleInput = {
  id: string
  store_id: string
  kind?: "sale" | "refund"
  terminal_id: string
  terminal_name?: string | null
  operator_name?: string
  cash_session_id?: string | null
  sold_at: string
  items: { id: string; product_id: string | null; product_name: string; unit_price: number; printer_id: string | null }[]
  payments: { method_id: string | null; method_name: string; amount: number }[]
}

export type SaleResult = {
  sale_id: string
  status: "created" | "duplicate"
  total?: number
  price_mismatch?: unknown
}

async function callRpc(client: Supabase, fn: string, args: Record<string, unknown>) {
  const { data, error } = await client
    .rpc(fn as never, args as never)
    .abortSignal(AbortSignal.timeout(TIMEOUT_MS))
  if (error) throw error
  return data
}

function queueArgs(op: QueueItem["op"], args: Record<string, unknown>) {
  return { op, args }
}

/**
 * Tenta enviar agora; sem rede, guarda na fila e devolve "queued".
 * Erros de regra (ex.: pagamento insuficiente) são lançados.
 */
async function sendOrQueue<T>(op: QueueItem["op"], fn: string, args: Record<string, unknown>): Promise<{ queued: true } | { queued: false; data: T }> {
  // Mantém a ordem: com operações anteriores na fila, envia elas primeiro;
  // se ainda restar algo (sem rede), esta entra atrás delas.
  if ((await pendingCount()).pending > 0) {
    await syncOfflineQueue()
    if ((await pendingCount()).pending > 0) {
      const { op: o, args: a } = queueArgs(op, args)
      await enqueue(o, a)
      return { queued: true }
    }
  }
  try {
    const data = (await callRpc(supabase(), fn, args)) as T
    return { queued: false, data }
  } catch (error) {
    // Sem rede, ou sessão vencida bem na volta da rede: guarda na fila, que
    // reenvia depois de renovar o token (a operação é idempotente).
    if (!isNetworkError(error) && !isSessionError(error)) throw error
    const { op: o, args: a } = queueArgs(op, args)
    await enqueue(o, a)
    return { queued: true }
  }
}

export function registerSale(sale: SaleInput) {
  return sendOrQueue<SaleResult>("register_sale", "register_sale", { p_sale: sale })
}

export function openCashSession(input: { storeId: string; sessionId: string; terminalId: string; openingAmount: number; openedAt: string }) {
  return sendOrQueue<{ session: CashSession; status: "created" | "already_open" | "duplicate" }>("open_cash_session", "open_cash_session", {
    p_store_id: input.storeId,
    p_session_id: input.sessionId,
    p_terminal_id: input.terminalId,
    p_opening_amount: input.openingAmount,
    p_opened_at: input.openedAt,
  })
}

export function addCashMovement(input: {
  storeId: string
  id: string
  terminalId: string
  kind: "sangria" | "suprimento"
  amount: number
  reason: string
  occurredAt: string
}) {
  return sendOrQueue<{ movement: CashMovement; status: string }>("add_cash_movement", "add_cash_movement", {
    p_store_id: input.storeId,
    p_movement: {
      id: input.id,
      terminal_id: input.terminalId,
      kind: input.kind,
      amount: input.amount,
      reason: input.reason,
      occurred_at: input.occurredAt,
    },
  })
}

export function closeCashSession(storeId: string, sessionId: string) {
  return sendOrQueue<{ status: "closed" | "already_closed"; summary: CashSummary }>("close_cash_session", "close_cash_session", {
    p_store_id: storeId,
    p_session_id: sessionId,
  })
}

const OP_TO_FN: Record<QueueItem["op"], string> = {
  open_cash_session: "open_cash_session",
  register_sale: "register_sale",
  add_cash_movement: "add_cash_movement",
  close_cash_session: "close_cash_session",
}

/**
 * Reenvia a fila offline (uma aba por vez). Devolve quantos itens foram
 * enviados. `wait`: se já houver um envio em andamento, espera ele terminar
 * (necessário antes de imprimir/consultar o que acabou de ser vendido).
 */
export function syncOfflineQueue(options: { wait?: boolean } = {}) {
  return flushQueue(async (item) => {
    try {
      await callRpc(supabase(), OP_TO_FN[item.op], item.args)
      return { result: "done" as RunResult }
    } catch (error) {
      // Sem rede ou sessão vencida (volta da rede antes de renovar o token):
      // tenta de novo depois — nunca marca a operação como falha por isso.
      if (isNetworkError(error) || isSessionError(error)) {
        return { result: "retry" as RunResult, error: String((error as Error).message ?? error) }
      }
      return { result: "fail" as RunResult, error: (error as Error).message ?? String(error) }
    }
  }, options)
}

// ─── Consultas e ações que exigem rede ──────────────────────────────
export async function cashSummary(storeId: string, sessionId: string): Promise<CashSummary> {
  await syncOfflineQueue({ wait: true })
  return (await callRpc(supabase(), "cash_session_summary", { p_store_id: storeId, p_session_id: sessionId })) as CashSummary
}

export async function recentItems(storeId: string, terminalId: string, limit = 50): Promise<RecentItem[]> {
  return (await callRpc(supabase(), "pdv_recent_items", { p_store_id: storeId, p_terminal_id: terminalId, p_limit: limit })) as RecentItem[]
}

export type PrintResult = { jobs: number; printers: string[]; unprinted: string[] }

/** Envia fichas para a fila de impressão (ponte local). Precisa de rede. */
export async function printSaleItems(storeId: string, itemIds: string[], reprint = false): Promise<PrintResult> {
  await syncOfflineQueue({ wait: true })
  return (await callRpc(supabase(), "print_sale_items", { p_store_id: storeId, p_item_ids: itemIds, p_reprint: reprint })) as PrintResult
}

export async function printCashMovement(storeId: string, movementId: string) {
  await syncOfflineQueue({ wait: true })
  return (await callRpc(supabase(), "print_cash_movement", { p_store_id: storeId, p_movement_id: movementId })) as {
    queued: boolean
    printer_name: string | null
  }
}

export async function printCashClosing(storeId: string, sessionId: string) {
  await syncOfflineQueue({ wait: true })
  return (await callRpc(supabase(), "print_cash_closing", { p_store_id: storeId, p_session_id: sessionId })) as {
    queued: boolean
    printer_name: string | null
  }
}

/** Cancela fichas com a sessão do supervisor que autorizou. */
export async function cancelSaleItems(supervisor: Supabase, storeId: string, itemIds: string[], reason?: string) {
  return (await callRpc(supervisor, "cancel_sale_items", { p_store_id: storeId, p_item_ids: itemIds, p_reason: reason ?? null })) as {
    cancelled: number
  }
}

/** Estorno em dinheiro com a sessão do supervisor que autorizou (online). */
export async function registerRefund(supervisor: Supabase, sale: SaleInput) {
  return (await callRpc(supervisor, "register_sale", { p_sale: { ...sale, kind: "refund" } })) as SaleResult
}
