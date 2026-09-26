import { PlusIcon, ShieldCheckIcon } from "lucide-react"
import { toast } from "sonner"

import { useConfirm } from "@/components/app/confirm-dialog"
import { PageHeader } from "@/components/app/page-header"
import { Button } from "@/components/ui/button"
import { TableRow } from "@/components/ui/table"
import { useRemoveRecords } from "@/data/records"
import { errorMessage } from "@/lib/errors"

import { CargoDialog } from "../features/config/cargo-dialog"
import { enabledModulesCount, useCargos, type Cargo } from "../features/config/cargos"
import { Cell, ConfigTable, EmptyRow, LoadError, LoadingRows, RowActions } from "../features/config/ui"
import { useEditor } from "../features/config/use-editor"

const COLUMNS = [{ label: "Nome do Cargo" }, { label: "Nível de Acesso" }, { label: "", className: "w-[100px]" }]

/** Cadastros › Colaboradores › Cargos e Permissões. */
export default function CargosPage() {
  const cargos = useCargos()
  const remove = useRemoveRecords("cargos")
  const confirm = useConfirm()
  const editor = useEditor<Cargo>()
  const items = cargos.data?.items ?? []

  async function onRemove(cargo: Cargo) {
    if (!(await confirm("Remover este cargo permanentemente?", { destructive: true, confirmLabel: "Remover" }))) return
    try {
      await remove.mutateAsync(cargo.id)
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Cargos e Permissões"
        subtitle="Defina os perfis de acesso e permissões dos módulos do sistema."
        actions={
          <Button onClick={() => editor.openEditor(null)}>
            <PlusIcon data-icon="inline-start" />
            Novo Cargo
          </Button>
        }
      />

      {cargos.isError ? <LoadError error={cargos.error} /> : null}

      <ConfigTable columns={COLUMNS}>
        {cargos.isPending ? (
          <LoadingRows colSpan={3} />
        ) : items.length === 0 ? (
          <EmptyRow colSpan={3} title="Nenhum cargo cadastrado." icon={ShieldCheckIcon} />
        ) : (
          items.map((c) => (
            <TableRow key={String(c.id)}>
              <Cell className="font-extrabold text-primary">{(c.nome ?? "").toUpperCase()}</Cell>
              <Cell className="font-bold">{enabledModulesCount(c)} módulo(s) habilitado(s)</Cell>
              <Cell>
                <RowActions onEdit={() => editor.openEditor(c)} onDelete={() => void onRemove(c)} />
              </Cell>
            </TableRow>
          ))
        )}
      </ConfigTable>

      <CargoDialog key={editor.key} open={editor.open} onOpenChange={editor.setOpen} cargo={editor.item} />
    </div>
  )
}
