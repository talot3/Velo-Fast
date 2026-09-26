import { useState } from "react"
import { toast } from "sonner"

import { CrudDialog } from "@/components/app/crud-dialog"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { newId, useSaveGroups } from "@/data/catalog"
import type { Group } from "@/data/types"
import { errorMessage } from "@/lib/errors"

import { intOrZero } from "./lib"

/** Cadastro de grupo (antigo "Novo Grupo" / "Editar Grupo"). */
export function GroupDialog({
  open,
  onOpenChange,
  group,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  group: Group | null
}) {
  const save = useSaveGroups()
  const [order, setOrder] = useState(String(group?.order ?? 0))
  const [name, setName] = useState(group?.name ?? "")
  const [invalid, setInvalid] = useState(false)

  async function handleSubmit() {
    const upper = name.trim().toUpperCase()
    if (!upper) {
      setInvalid(true)
      toast.error("Nome do grupo é obrigatório.")
      return
    }
    try {
      await save.mutateAsync({ ...group, id: group?.id ?? newId(), name: upper, order: intOrZero(order) })
      onOpenChange(false)
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }

  return (
    <CrudDialog
      open={open}
      onOpenChange={onOpenChange}
      title={group ? "Editar Grupo" : "Novo Grupo"}
      submitLabel="Gravar"
      onSubmit={handleSubmit}
      submitting={save.isPending}
    >
      <FieldGroup>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
          <Field className="md:col-span-4">
            <FieldLabel htmlFor="frm-grp-order">Ordem de Exibição</FieldLabel>
            <Input id="frm-grp-order" type="number" placeholder="Ex: 1" value={order} onChange={(e) => setOrder(e.target.value)} />
          </Field>
          <Field className="md:col-span-8" data-invalid={invalid || undefined}>
            <FieldLabel htmlFor="frm-grp-name">Nome do Grupo</FieldLabel>
            <Input
              id="frm-grp-name"
              placeholder="Ex: ALIMENTOS"
              autoComplete="off"
              aria-invalid={invalid || undefined}
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                setInvalid(false)
              }}
            />
          </Field>
        </div>
      </FieldGroup>
    </CrudDialog>
  )
}
