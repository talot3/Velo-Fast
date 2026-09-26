import { useState } from "react"
import { FolderIcon } from "lucide-react"
import { toast } from "sonner"

import { CrudDialog } from "@/components/app/crud-dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { newNumericId, useSaveRecords } from "@/data/records"
import { errorMessage } from "@/lib/errors"

import {
  CARGO_PERM_KEYS,
  groupedCargoModules,
  newCargoPermissions,
  type Cargo,
  type CargoPermKey,
} from "./cargos"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** null = novo cargo. */
  cargo: Cargo | null
}

/** Formulário "Novo Cargo e Acessos" / "Editar Registro de Cargo". */
export function CargoDialog({ open, onOpenChange, cargo }: Props) {
  const save = useSaveRecords<Cargo>("cargos")
  const [nome, setNome] = useState(cargo?.nome ?? "")
  const [perms, setPerms] = useState<Record<CargoPermKey, boolean>>(() =>
    cargo
      ? (Object.fromEntries(CARGO_PERM_KEYS.map((k) => [k, Boolean(cargo.permissoes?.[k])])) as Record<CargoPermKey, boolean>)
      : newCargoPermissions()
  )
  const [invalid, setInvalid] = useState(false)

  async function submit() {
    const name = nome.trim().toUpperCase()
    if (!name) {
      setInvalid(true)
      toast.error("O nome do cargo é obrigatório.")
      return
    }
    const permissoes = Object.fromEntries(CARGO_PERM_KEYS.map((k) => [k, Boolean(perms[k])])) as Record<CargoPermKey, boolean>
    try {
      await save.mutateAsync({ id: cargo?.id ?? newNumericId(), nome: name, permissoes })
      onOpenChange(false)
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }

  return (
    <CrudDialog
      open={open}
      onOpenChange={onOpenChange}
      title={cargo ? "Editar Registro de Cargo" : "Novo Cargo e Acessos"}
      submitLabel="Gravar Registro"
      onSubmit={submit}
      submitting={save.isPending}
    >
      <FieldGroup className="gap-5">
        <Field data-invalid={invalid || undefined}>
          <FieldLabel htmlFor="cargo-nome">Nome do Cargo</FieldLabel>
          <Input
            id="cargo-nome"
            value={nome}
            placeholder="Ex: OPERADOR DE CAIXA, GERENTE"
            className="uppercase placeholder:normal-case"
            aria-invalid={invalid || undefined}
            onChange={(e) => {
              setNome(e.target.value)
              setInvalid(false)
            }}
          />
        </Field>

        <div className="flex flex-col gap-3">
          <h4 className="border-b-2 border-accent pb-1.5 text-[13px] font-black tracking-wide text-muted-foreground uppercase">
            Acessos e Permissões de Módulo
          </h4>
          <div className="flex max-h-[300px] flex-col gap-3 overflow-y-auto pr-1">
            {groupedCargoModules().map(([modulo, items]) => (
              <div key={modulo} className="shrink-0 overflow-hidden rounded-md border">
                <div className="flex items-center gap-2 border-b bg-muted px-2.5 py-2.5 text-[11px] font-extrabold uppercase">
                  <FolderIcon className="size-3.5" />
                  Modulo: {modulo}
                </div>
                {items.map((item) => (
                  <Field
                    key={item.key}
                    orientation="horizontal"
                    className="border-b bg-card px-4 py-2 last:border-b-0"
                  >
                    <FieldLabel htmlFor={`perm-${item.key}`} className="text-xs font-bold text-muted-foreground">
                      {item.label}
                    </FieldLabel>
                    <Checkbox
                      id={`perm-${item.key}`}
                      checked={Boolean(perms[item.key])}
                      onCheckedChange={(v) => setPerms((p) => ({ ...p, [item.key]: v === true }))}
                    />
                  </Field>
                ))}
              </div>
            ))}
          </div>
        </div>
      </FieldGroup>
    </CrudDialog>
  )
}
