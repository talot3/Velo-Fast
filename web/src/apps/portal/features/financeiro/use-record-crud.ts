import { toast } from "sonner"

import { useConfirm } from "@/components/app/confirm-dialog"
import { useRecords, useRemoveRecords, useSaveRecords, type RecordCollection } from "@/data/records"
import { errorMessage } from "@/lib/errors"

import type { RecordId } from "./types"

/**
 * Lista + gravação + exclusão (com a mesma confirmação do sistema antigo)
 * de uma coleção de registros. Erros de gravação aparecem num aviso — o
 * sistema antigo nunca avisava quando a gravação falhava.
 */
export function useRecordCrud<T extends { id: RecordId }>(collection: RecordCollection) {
  const query = useRecords<T>(collection)
  const save = useSaveRecords<T>(collection)
  const remove = useRemoveRecords(collection)
  const confirm = useConfirm()

  async function saveItem(item: T): Promise<boolean> {
    try {
      await save.mutateAsync(item)
      return true
    } catch (e) {
      toast.error(errorMessage(e))
      return false
    }
  }

  async function removeItem(id: RecordId, message: string): Promise<boolean> {
    if (!(await confirm(message, { destructive: true }))) return false
    try {
      await remove.mutateAsync(id)
      return true
    } catch (e) {
      toast.error(errorMessage(e))
      return false
    }
  }

  return {
    query,
    items: query.data?.items ?? [],
    saveItem,
    removeItem,
    saving: save.isPending,
    removing: remove.isPending,
  }
}
