import { useMemo, useState } from "react"
import { toast } from "sonner"

import { useConfirm } from "@/components/app/confirm-dialog"
import { useRecords, useRemoveRecords } from "@/data/records"
import { useCashSessions } from "@/data/reports"
import { errorMessage } from "@/lib/errors"

import { BorderoDetail } from "../features/financeiro/conciliacao/bordero-detail"
import { BorderoList } from "../features/financeiro/conciliacao/bordero-list"
import { ManualBorderoDialog } from "../features/financeiro/conciliacao/manual-bordero-dialog"
import { buildBorderoViews, type BorderoView } from "../features/financeiro/conciliacao/model"
import { COLLECTIONS, type BorderoRecord } from "../features/financeiro/types"

export default function ConciliacaoCaixaPage() {
  const sessions = useCashSessions()
  const records = useRecords<BorderoRecord>(COLLECTIONS.borderos)
  const remove = useRemoveRecords(COLLECTIONS.borderos)
  const confirm = useConfirm()
  const [activeKey, setActiveKey] = useState<string | null>(null)
  // A chave nova a cada abertura zera o formulário do borderô manual.
  const [manual, setManual] = useState({ open: false, key: 0 })

  const views = useMemo(
    () => buildBorderoViews(sessions.data ?? [], records.data?.items ?? []),
    [sessions.data, records.data]
  )
  const active = activeKey ? views.find((v) => v.key === activeKey) : undefined

  async function removeView(view: BorderoView) {
    if (!(await confirm("Remover este borderô?", { destructive: true }))) return
    // Sessão de caixa: remove só a conferência gravada (a sessão continua na lista).
    if (!view.record) return
    try {
      await remove.mutateAsync(view.id)
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }

  if (active) return <BorderoDetail key={active.key} view={active} onBack={() => setActiveKey(null)} />

  return (
    <>
      <BorderoList
        views={views}
        isLoading={sessions.isLoading || records.isLoading}
        error={sessions.error ?? records.error}
        onOpen={(v) => setActiveKey(v.key)}
        onRemove={(v) => void removeView(v)}
        onNew={() => setManual((m) => ({ open: true, key: m.key + 1 }))}
      />
      <ManualBorderoDialog key={manual.key} open={manual.open} onOpenChange={(open) => setManual((m) => ({ ...m, open }))} />
    </>
  )
}
