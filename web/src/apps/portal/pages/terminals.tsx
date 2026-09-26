import { MonitorIcon } from "lucide-react"
import { toast } from "sonner"

import { useConfirm } from "@/components/app/confirm-dialog"
import { PageHeader } from "@/components/app/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { TableRow } from "@/components/ui/table"
import { usePrinters, useRemoveTerminals, useTerminals } from "@/data/catalog"
import type { Terminal } from "@/data/types"
import { errorMessage } from "@/lib/errors"

import { TerminalDialog } from "../features/config/terminal-dialog"
import { fontLabel, fontSizeLabel, LAYOUT_LABEL } from "../features/config/terminal-options"
import { Cell, ConfigTable, EmptyRow, LoadError, LoadingRows, RowActions } from "../features/config/ui"
import { useEditor } from "../features/config/use-editor"

const COLUMNS = [
  { label: "Caixa Nro" },
  { label: "Identificacao" },
  { label: "Layout" },
  { label: "Fonte / Tamanho" },
  { label: "Impressora Vinculada" },
  { label: "Status" },
  { label: "", className: "w-[100px]" },
]

/** Gestão › Ajustes › Terminais de Caixa. */
export default function TerminalsPage() {
  const terminals = useTerminals()
  const printers = usePrinters()
  const remove = useRemoveTerminals()
  const confirm = useConfirm()
  const editor = useEditor<Terminal>()

  const list = terminals.data ?? []
  const printerList = printers.data ?? []

  async function onRemove(t: Terminal) {
    if (!(await confirm("Remover este terminal?", { destructive: true, confirmLabel: "Remover" }))) return
    try {
      await remove.mutateAsync(t.id)
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Terminais de Caixa" actions={<Button onClick={() => editor.openEditor(null)}>+ Novo Terminal</Button>} />

      {terminals.isError ? <LoadError error={terminals.error} /> : null}

      <ConfigTable columns={COLUMNS}>
        {terminals.isPending ? (
          <LoadingRows colSpan={7} />
        ) : list.length === 0 ? (
          <EmptyRow colSpan={7} title="Nenhum terminal configurado. Adicione o primeiro caixa." icon={MonitorIcon} />
        ) : (
          list.map((t) => {
            const printer = printerList.find((p) => p.id === t.printerId)
            return (
              <TableRow key={t.id}>
                <Cell className="text-[22px] font-black text-primary">Cx {t.cashNumber ?? ""}</Cell>
                <Cell className="font-extrabold">{t.name}</Cell>
                <Cell>
                  <Badge variant="secondary" className="rounded-md font-bold">
                    {LAYOUT_LABEL[t.layout] ?? t.layout}
                  </Badge>
                </Cell>
                <Cell className="font-bold">
                  {fontLabel(t.font)} / {fontSizeLabel(t.fontSize)}
                </Cell>
                <Cell className="font-bold">{printer ? printer.name : "N/A"}</Cell>
                <Cell>
                  {t.active ? (
                    <Badge className="rounded-md bg-success/15 font-bold text-success">Ativo</Badge>
                  ) : (
                    <Badge className="rounded-md bg-destructive/15 font-bold text-destructive">Inativo</Badge>
                  )}
                </Cell>
                <Cell>
                  <RowActions onEdit={() => editor.openEditor(t)} onDelete={() => void onRemove(t)} />
                </Cell>
              </TableRow>
            )
          })
        )}
      </ConfigTable>

      <TerminalDialog
        key={editor.key}
        open={editor.open}
        onOpenChange={editor.setOpen}
        terminal={editor.item}
        terminals={list}
        printers={printerList}
      />
    </div>
  )
}
