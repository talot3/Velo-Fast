import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"

import { useRecords, useRemoveRecords, useSaveRecords } from "@/data/records"
import { errorMessage } from "@/lib/errors"

import { DRE_SEED, normalizeDreLines, type DreLine } from "./dre-model"

/**
 * Linhas da DRE (coleção "dre_lines"; exemplos do sistema anterior enquanto
 * estiver vazia). A tela muda na hora e as gravações vão para o banco em
 * fila, uma de cada vez — assim a primeira gravação (que persiste os
 * exemplos) termina antes da próxima começar.
 */
export function useDreLines() {
  const query = useRecords<DreLine>("dre_lines", DRE_SEED)
  const saveMutation = useSaveRecords<DreLine>("dre_lines")
  const removeMutation = useRemoveRecords("dre_lines")

  const [lines, setLines] = useState<DreLine[] | null>(null)
  const pending = useRef(0)
  const failed = useRef(false)
  const queue = useRef<Promise<void>>(Promise.resolve())
  const saveRef = useRef(saveMutation.mutateAsync)
  const removeRef = useRef(removeMutation.mutateAsync)
  const refetchRef = useRef(query.refetch)

  useEffect(() => {
    saveRef.current = saveMutation.mutateAsync
    removeRef.current = removeMutation.mutateAsync
    refetchRef.current = query.refetch
  })

  const data = query.data
  // Enquanto houver gravação na fila, a tela mantém a versão local (mais nova).
  useEffect(() => {
    if (data && pending.current === 0) setLines(normalizeDreLines(data.items))
  }, [data])

  const enqueue = useCallback((op: () => Promise<unknown>) => {
    pending.current += 1
    queue.current = queue.current
      .then(op)
      .then(
        () => undefined,
        (error: unknown) => {
          failed.current = true
          toast.error(errorMessage(error, "Não foi possível salvar as alterações."))
        }
      )
      .finally(() => {
        pending.current -= 1
        if (pending.current > 0 || !failed.current) return
        // Falhou: volta a mostrar o que está gravado no banco.
        failed.current = false
        void refetchRef.current().then((r) => {
          if (r.data && pending.current === 0) setLines(normalizeDreLines(r.data.items))
        })
      })
  }, [])

  /** Troca a lista local e grava as linhas criadas/alteradas. */
  const commit = useCallback(
    (next: DreLine[], changed: DreLine[]) => {
      setLines(next)
      if (changed.length > 0) enqueue(() => saveRef.current(changed))
    },
    [enqueue]
  )

  /** Troca a lista local e exclui as linhas informadas. */
  const commitRemoval = useCallback(
    (next: DreLine[], removedIds: number[]) => {
      setLines(next)
      if (removedIds.length > 0) enqueue(() => removeRef.current(removedIds))
    },
    [enqueue]
  )

  return {
    lines,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    commit,
    commitRemoval,
  }
}
