import { CableIcon, PrinterIcon } from "lucide-react"
import { toast } from "sonner"

import { useConfirm } from "@/components/app/confirm-dialog"
import { PageHeader } from "@/components/app/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { TableRow } from "@/components/ui/table"
import { usePrinters, useRemovePrinters, useTerminals } from "@/data/catalog"
import type { Printer } from "@/data/types"
import { hasRole, useAuth } from "@/lib/auth"
import { errorMessage } from "@/lib/errors"

import { PrinterBridgeDialog } from "../features/config/bridge-dialog"
import { PrinterDialog } from "../features/config/printer-dialog"
import { Cell, ConfigTable, EmptyRow, LoadError, LoadingRows, RowActions } from "../features/config/ui"
import { useEditor } from "../features/config/use-editor"
import { usePrinterTest } from "../features/config/use-printer-test"

const COLUMNS = [
  { label: "Nome" },
  { label: "Modelo" },
  { label: "IP / Conexão" },
  { label: "Porta TCP" },
  { label: "Caixas Vinculados" },
  { label: "Configurações" },
  { label: "", className: "w-[130px]" },
]

/** Gestão › Ajustes › Impressoras. */
export default function PrintersPage() {
  const { profile } = useAuth()
  const printers = usePrinters()
  const terminals = useTerminals()
  const remove = useRemovePrinters()
  const confirm = useConfirm()
  const editor = useEditor<Printer>()
  const bridge = useEditor<null>()
  const printTest = usePrinterTest()
  const isAdmin = hasRole(profile?.role, "admin")

  const list = printers.data ?? []
  const terminalList = terminals.data ?? []

  async function onRemove(p: Printer) {
    if (!(await confirm("Remover esta impressora? Os produtos vinculados a ela ficarão sem destino.", { destructive: true, confirmLabel: "Remover" }))) {
      return
    }
    try {
      await remove.mutateAsync(p.id)
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Impressoras"
        actions={
          <>
            {isAdmin ? (
              <Button variant="outline" onClick={() => bridge.openEditor(null)}>
                <CableIcon data-icon="inline-start" />
                Ponte de Impressão
              </Button>
            ) : null}
            <Button onClick={() => editor.openEditor(null)}>+ Nova Impressora</Button>
          </>
        }
      />

      {printers.isError ? <LoadError error={printers.error} /> : null}

      <ConfigTable columns={COLUMNS}>
        {printers.isPending ? (
          <LoadingRows colSpan={7} />
        ) : list.length === 0 ? (
          <EmptyRow colSpan={7} title="Nenhuma impressora configurada." icon={PrinterIcon} />
        ) : (
          list.map((pr) => {
            const linked = terminalList.filter((t) => String(t.printerId) === String(pr.id))
            const testing = printTest.testingId === pr.id
            return (
              <TableRow key={pr.id}>
                <Cell className="font-extrabold">{pr.name}</Cell>
                <Cell>
                  <Badge variant="secondary" className="rounded-md font-bold">
                    {pr.model || "N/D"}
                  </Badge>
                </Cell>
                <Cell className="font-mono text-[13px] font-bold text-primary">
                  {pr.useWindowsPrinter ? "Windows Printer" : pr.ip || "-"}
                </Cell>
                <Cell className="font-bold">{pr.useWindowsPrinter ? "-" : pr.port || 9100}</Cell>
                <Cell>
                  <div className="flex flex-wrap gap-1">
                    {linked.length > 0 ? (
                      linked.map((t) => (
                        <Badge key={t.id} className="rounded-md font-bold">
                          Cx {t.cashNumber ?? ""}
                        </Badge>
                      ))
                    ) : (
                      <Badge variant="secondary" className="rounded-md text-muted-foreground">
                        Nenhum
                      </Badge>
                    )}
                  </div>
                </Cell>
                <Cell>
                  <div className="flex flex-wrap gap-1.5">
                    {pr.activeCut ? <Badge className="rounded-md bg-success/15 font-bold text-success">Corte</Badge> : null}
                    {pr.blackBackground ? (
                      <Badge className="rounded-md border-border bg-black font-bold text-white">Fundo Preto</Badge>
                    ) : null}
                    {pr.printServer ? <Badge className="rounded-md bg-chart-3/15 font-bold text-chart-3">Print Server</Badge> : null}
                    {pr.useWindowsPrinter ? <Badge className="rounded-md bg-warning/15 font-bold text-warning">Windows</Badge> : null}
                  </div>
                </Cell>
                <Cell>
                  <RowActions onEdit={() => editor.openEditor(pr)} onDelete={() => void onRemove(pr)}>
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      title="Testar Impressão"
                      className="border border-primary text-primary hover:text-primary"
                      disabled={testing}
                      onClick={() => void printTest.run(pr.id)}
                    >
                      {testing ? <Spinner data-icon="inline-start" /> : <PrinterIcon data-icon="inline-start" />}
                      Testar
                    </Button>
                  </RowActions>
                </Cell>
              </TableRow>
            )
          })
        )}
      </ConfigTable>

      <PrinterDialog
        key={`printer-${editor.key}`}
        open={editor.open}
        onOpenChange={editor.setOpen}
        printer={editor.item}
        onTest={(id) => void printTest.run(id)}
        testing={editor.item ? printTest.testingId === editor.item.id : false}
      />
      {isAdmin ? <PrinterBridgeDialog key={`bridge-${bridge.key}`} open={bridge.open} onOpenChange={bridge.setOpen} /> : null}
    </div>
  )
}
