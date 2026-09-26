import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"

import { useDocument, useSaveDocument, type DocumentKey } from "@/data/records"
import { errorMessage } from "@/lib/errors"

/** Espera após a última edição antes de gravar (autossalvamento). */
export const AUTOSAVE_DELAY_MS = 800

type Updater<T> = T | ((prev: T) => T)

/**
 * Estado de uma tela inteira guardado em store_documents (SWOT, Plano de
 * Ação) com autossalvamento: cada edição atualiza a tela na hora e é gravada
 * ~800 ms depois da última alteração (e ao sair da página). Enquanto houver
 * edição pendente ou gravação em andamento, o valor do servidor não
 * sobrescreve o que está na tela.
 */
export function useAutosaveDocument<T>(key: DocumentKey, defaults: T, normalize: (value: T) => T) {
  const doc = useDocument<T>(key, defaults)
  const save = useSaveDocument<T>(key)
  const [value, setValue] = useState<T | null>(null)

  const latest = useRef<T | null>(null)
  const dirty = useRef(false)
  const inFlight = useRef(0)
  const queued = useRef(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mutateRef = useRef(save.mutateAsync)
  const normalizeRef = useRef(normalize)

  useEffect(() => {
    mutateRef.current = save.mutateAsync
    normalizeRef.current = normalize
  })

  const data = doc.data
  useEffect(() => {
    if (!data || dirty.current || inFlight.current > 0) return
    const next = normalizeRef.current(data.value)
    latest.current = next
    setValue(next)
  }, [data])

  // Uma gravação por vez: o que for editado durante uma gravação sai logo depois,
  // em uma única gravação com o estado mais novo (nunca chega fora de ordem).
  const flush = useCallback(function run() {
    if (timer.current) {
      clearTimeout(timer.current)
      timer.current = null
    }
    if (!dirty.current || latest.current === null) return
    if (inFlight.current > 0) {
      queued.current = true
      return
    }
    const snapshot = latest.current
    dirty.current = false
    inFlight.current += 1
    mutateRef
      .current(snapshot)
      .catch((error: unknown) => {
        dirty.current = true
        toast.error(errorMessage(error, "Não foi possível salvar as alterações."))
      })
      .finally(() => {
        inFlight.current -= 1
        if (queued.current) {
          queued.current = false
          run()
        }
      })
  }, [])

  const update = useCallback(
    (next: Updater<T>, options?: { immediate?: boolean }) => {
      const prev = latest.current
      if (prev === null) return
      const resolved = typeof next === "function" ? (next as (p: T) => T)(prev) : next
      latest.current = resolved
      setValue(resolved)
      dirty.current = true
      if (timer.current) clearTimeout(timer.current)
      if (options?.immediate) flush()
      else timer.current = setTimeout(flush, AUTOSAVE_DELAY_MS)
    },
    [flush]
  )

  // Grava o que estiver pendente ao sair da página ou esconder a aba.
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush()
    }
    window.addEventListener("pagehide", flush)
    document.addEventListener("visibilitychange", onVisibility)
    return () => {
      window.removeEventListener("pagehide", flush)
      document.removeEventListener("visibilitychange", onVisibility)
      flush()
    }
  }, [flush])

  return { value, update, flush, isLoading: doc.isLoading, error: doc.error, refetch: doc.refetch }
}
