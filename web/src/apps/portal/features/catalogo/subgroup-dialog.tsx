import { useMemo, useState } from "react"
import { toast } from "sonner"

import { ColorField } from "@/components/app/color-field"
import { CrudDialog } from "@/components/app/crud-dialog"
import { Field, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { newId, useSaveSubgroups } from "@/data/catalog"
import type { Group, Subgroup } from "@/data/types"
import { errorMessage } from "@/lib/errors"

import { DEFAULT_SUBGROUP_BG, DEFAULT_SUBGROUP_TEXT, sortGroups } from "./lib"

/** Cor digitada; vazia (ou só "#") volta ao padrão, como no antigo. */
function colorOr(value: string, fallback: string) {
  const v = value.trim()
  return v && v !== "#" ? v : fallback
}

/** Cadastro de subgrupo com as cores do botão no PDV (antigo "Novo Subgrupo" / "Editar Subgrupo"). */
export function SubgroupDialog({
  open,
  onOpenChange,
  subgroup,
  groups,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  subgroup: Subgroup | null
  groups: Group[]
}) {
  const save = useSaveSubgroups()
  const sortedGroups = useMemo(() => sortGroups(groups), [groups])
  const [groupId, setGroupId] = useState(
    subgroup?.groupId && groups.some((g) => g.id === subgroup.groupId) ? subgroup.groupId : ""
  )
  const [name, setName] = useState(subgroup?.name ?? "")
  const [buttonColor, setButtonColor] = useState(subgroup?.buttonColor || DEFAULT_SUBGROUP_BG)
  const [textColor, setTextColor] = useState(subgroup?.textColor || DEFAULT_SUBGROUP_TEXT)
  const [invalid, setInvalid] = useState<"group" | "name" | null>(null)

  async function handleSubmit() {
    const trimmed = name.trim()
    if (!groupId) {
      setInvalid("group")
      toast.error("Selecione o grupo ao qual o subgrupo pertence.")
      return
    }
    if (!trimmed) {
      setInvalid("name")
      toast.error("Nome do subgrupo é obrigatório.")
      return
    }
    try {
      await save.mutateAsync({
        order: 0,
        ...subgroup,
        id: subgroup?.id ?? newId(),
        groupId,
        name: trimmed,
        buttonColor: colorOr(buttonColor, DEFAULT_SUBGROUP_BG),
        textColor: colorOr(textColor, DEFAULT_SUBGROUP_TEXT),
      })
      onOpenChange(false)
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }

  return (
    <CrudDialog
      open={open}
      onOpenChange={onOpenChange}
      title={subgroup ? "Editar Subgrupo" : "Novo Subgrupo"}
      submitLabel="Gravar"
      onSubmit={handleSubmit}
      submitting={save.isPending}
    >
      <FieldGroup className="gap-5">
        <Field data-invalid={invalid === "group" || undefined}>
          <FieldLabel htmlFor="frm-sg-group">Grupo Pertencente</FieldLabel>
          <Select
            value={groupId}
            onValueChange={(v) => {
              setGroupId(v)
              setInvalid(null)
            }}
          >
            <SelectTrigger id="frm-sg-group" className="w-full" aria-invalid={invalid === "group" || undefined}>
              <SelectValue placeholder="Selecione o Grupo..." />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {sortedGroups.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
        <Field data-invalid={invalid === "name" || undefined}>
          <FieldLabel htmlFor="frm-sg-name">Nome do Subgrupo</FieldLabel>
          <Input
            id="frm-sg-name"
            placeholder="Ex: Hambúrgueres"
            autoComplete="off"
            aria-invalid={invalid === "name" || undefined}
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              setInvalid(null)
            }}
          />
        </Field>

        <FieldSet className="gap-4 border-t border-dashed pt-4">
          <FieldLegend variant="label" className="mb-0 font-extrabold text-muted-foreground">
            Aparência do Botão (Opcional)
          </FieldLegend>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <ColorField id="frm-sg-bg" label="Cor de Fundo" value={buttonColor} onChange={setButtonColor} />
            <ColorField id="frm-sg-txt" label="Cor da Letra" value={textColor} onChange={setTextColor} />
          </div>
        </FieldSet>
      </FieldGroup>
    </CrudDialog>
  )
}
