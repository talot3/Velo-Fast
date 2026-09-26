import { useCallback, useEffect, useRef, useState } from "react"

import { enqueue, listQueue, onQueueChange, removeItem, type QueueItem } from "@/lib/offline-queue"

import { alertNotify } from "../lib/notify"
import { flushPending, syncNow } from "../lib/sync"

const OP_LABEL: Record<QueueItem["op"], string> = {
  register_sale: "Venda",
  open_cash_session: "Abertura de caixa",
  add_cash_movement: "Sangria",
  close_cash_session: "Fechamento de caixa",
}

export const queueOpLabel = (op: QueueItem["op"]) => OP_LABEL[op] ?? op

export type ConnectionState = {
  online: boolean
  pending: number
  failed: number
  failures: QueueItem[]
  /** Reenvia as operações que o servidor recusou (ex.: sessão expirada). */
  retryFailed: () => Promise<void>
}

/**
 * Indicador de conexão do cabeçalho + envio automático da fila offline
 * (ao voltar a rede e a cada 30 s). Operações recusadas pelo servidor
 * (erro de regra) aparecem com aviso e contador, em vez de sumirem.
 */
export function useConnection(): ConnectionState {
  const [online, setOnline] = useState(() => navigator.onLine)
  const [items, setItems] = useState<QueueItem[]>([])
  const seenFailures = useRef<Set<string> | null>(null)

  const refresh = useCallback(async () => {
    const all = await listQueue().catch(() => [] as QueueItem[])
    setItems(all)
    const failed = all.filter((i) => i.failed)
    if (seenFailures.current === null) {
      seenFailures.current = new Set(failed.map((f) => f.key))
      if (failed.length) alertNotify(`⚠️ ${failed.length} operação(ões) recusada(s) na sincronização. Veja no topo da tela.`)
      return
    }
    for (const f of failed) {
      if (seenFailures.current.has(f.key)) continue
      seenFailures.current.add(f.key)
      alertNotify(`⚠️ ${queueOpLabel(f.op)} não sincronizada: ${f.lastError || "recusada pelo servidor"}`)
    }
  }, [])

  useEffect(() => {
    void refresh()
    const offChange = onQueueChange(() => void refresh())
    const onOnline = () => {
      setOnline(true)
      void syncNow().then(refresh)
    }
    const onOffline = () => {
      setOnline(false)
      void refresh()
    }
    window.addEventListener("online", onOnline)
    window.addEventListener("offline", onOffline)
    const tick = setInterval(() => {
      setOnline(navigator.onLine)
      void refresh()
    }, 3000)
    const sync = setInterval(() => void syncNow(), 30_000)
    void syncNow()
    return () => {
      offChange()
      window.removeEventListener("online", onOnline)
      window.removeEventListener("offline", onOffline)
      clearInterval(tick)
      clearInterval(sync)
    }
  }, [refresh])

  const retryFailed = useCallback(async () => {
    const failed = (await listQueue()).filter((i) => i.failed)
    for (const item of failed) {
      await removeItem(item.key)
      await enqueue(item.op, item.args)
    }
    await flushPending()
    await refresh()
  }, [refresh])

  const failures = items.filter((i) => i.failed)
  return { online, pending: items.length - failures.length, failed: failures.length, failures, retryFailed }
}
