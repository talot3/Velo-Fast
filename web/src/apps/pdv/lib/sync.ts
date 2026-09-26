import { syncOfflineQueue } from "@/data/pdv"
import { pendingCount } from "@/lib/offline-queue"

/** Envia a fila agora (ignora erros: a fila guarda o que não foi). */
export function syncNow() {
  if (!navigator.onLine) return Promise.resolve(0)
  return syncOfflineQueue().catch(() => 0)
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Envia a fila e espera ela esvaziar. O envio é exclusivo (um por vez, entre
 * abas): se outro envio estiver em andamento, espera ele terminar em vez de
 * desistir. Devolve false se ainda sobrou algo (sem rede / tempo esgotado).
 */
export async function flushPending(maxWaitMs = 6000) {
  if (!navigator.onLine) return false
  const until = Date.now() + maxWaitMs
  for (;;) {
    await syncNow()
    const { pending } = await pendingCount().catch(() => ({ pending: 0 }))
    if (!pending) return true
    if (!navigator.onLine || Date.now() > until) return false
    await sleep(400)
  }
}
