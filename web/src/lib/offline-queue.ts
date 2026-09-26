/**
 * Fila offline do PDV (IndexedDB). Guarda operações idempotentes (venda,
 * abertura/fechamento de caixa, sangria) quando a rede falha e reenvia na
 * ordem em que aconteceram.
 *
 * Diferenças para a fila antiga (localStorage):
 *  - cada operação tem ID próprio: reenviar nunca duplica no servidor;
 *  - só uma aba por vez esvazia a fila (Web Locks), sem corrida;
 *  - itens novos gravados durante o envio não se perdem;
 *  - erro de regra de negócio (ex.: permissão) não fica tentando para
 *    sempre: vai para "falhas", visível no PDV.
 */
import { createStore, del, entries, set } from "idb-keyval"

export type QueueOp = "open_cash_session" | "register_sale" | "add_cash_movement" | "close_cash_session"

export type QueueItem = {
  key: string
  op: QueueOp
  args: Record<string, unknown>
  createdAt: number
  attempts: number
  lastError?: string
  failed?: boolean
}

const store = createStore("velofast-offline", "queue")
const EVENT = "velofast-queue-changed"
let seq = 0

function emit() {
  window.dispatchEvent(new CustomEvent(EVENT))
}

export function onQueueChange(listener: () => void) {
  window.addEventListener(EVENT, listener)
  return () => window.removeEventListener(EVENT, listener)
}

export async function enqueue(op: QueueOp, args: Record<string, unknown>) {
  const createdAt = Date.now()
  const key = `${String(createdAt).padStart(15, "0")}-${String(seq++).padStart(6, "0")}-${crypto.randomUUID().slice(0, 8)}`
  const item: QueueItem = { key, op, args, createdAt, attempts: 0 }
  await set(key, item, store)
  emit()
  return item
}

export async function listQueue(): Promise<QueueItem[]> {
  const all = await entries<string, QueueItem>(store)
  return all.map(([, v]) => v).sort((a, b) => a.key.localeCompare(b.key))
}

export async function pendingCount(): Promise<{ pending: number; failed: number }> {
  const items = await listQueue()
  return { pending: items.filter((i) => !i.failed).length, failed: items.filter((i) => i.failed).length }
}

export async function removeItem(key: string) {
  await del(key, store)
  emit()
}

export type RunResult = "done" | "retry" | "fail"

/**
 * Esvazia a fila em ordem. `run` devolve "done" (remove), "retry" (para e
 * tenta depois — sem rede) ou "fail" (marca como falha e segue).
 */
export async function flushQueue(run: (item: QueueItem) => Promise<{ result: RunResult; error?: string }>) {
  const work = async () => {
    const items = await listQueue()
    let sent = 0
    for (const item of items) {
      if (item.failed) continue
      const { result, error } = await run(item)
      if (result === "done") {
        await del(item.key, store)
        sent++
      } else if (result === "fail") {
        await set(item.key, { ...item, attempts: item.attempts + 1, failed: true, lastError: error }, store)
      } else {
        await set(item.key, { ...item, attempts: item.attempts + 1, lastError: error }, store)
        break
      }
    }
    emit()
    return sent
  }
  if ("locks" in navigator && navigator.locks) {
    return navigator.locks.request("velofast-queue-flush", { ifAvailable: true }, async (lock) => (lock ? work() : 0))
  }
  return work()
}
