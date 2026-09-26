import { useState } from "react"
import { toast } from "sonner"

import { useConfirm } from "@/components/app/confirm-dialog"
import { CrudDialog } from "@/components/app/crud-dialog"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { newNumericId } from "@/data/records"
import { useSaveStoreSettings } from "@/data/settings"
import type { Version } from "@/data/types"
import { errorMessage } from "@/lib/errors"

import { nextPatchVersion, saoPauloDateTimeInput, saoPauloInputToIso } from "./versions"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentVersion: string
  /** Histórico exibido (inclui a versão inicial quando a loja ainda não tem). */
  versions: Version[]
}

type FieldKey = "version" | "description"

/** Formulário "Gerar Nova Versão". */
export function VersionDialog({ open, onOpenChange, currentVersion, versions }: Props) {
  const save = useSaveStoreSettings()
  const confirm = useConfirm()
  const [version, setVersion] = useState(() => nextPatchVersion(currentVersion))
  const [date, setDate] = useState(() => saoPauloDateTimeInput())
  const [description, setDescription] = useState("")
  const [invalid, setInvalid] = useState<FieldKey | null>(null)

  async function submit() {
    const ver = version.trim()
    const desc = description.trim()
    if (!ver) {
      setInvalid("version")
      toast.error("O número da versão é obrigatório.")
      return
    }
    if (!desc) {
      setInvalid("description")
      toast.error("Por favor, insira as notas da versão/changelog.")
      return
    }
    const exists = versions.some((v) => v.version === ver)
    if (exists && !(await confirm(`A versão ${ver} já está registrada. Deseja substituí-la?`, { confirmLabel: "Substituir" }))) {
      return
    }
    const entry: Version = {
      id: newNumericId(),
      version: ver,
      date: saoPauloInputToIso(date) ?? new Date().toISOString(),
      description: desc,
    }
    try {
      await save.mutateAsync({
        versions: [...versions.filter((v) => v.version !== ver), entry],
        currentVersion: ver,
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
      title="Gerar Nova Versão"
      submitLabel="Gerar e Registrar Versão"
      onSubmit={submit}
      submitting={save.isPending}
    >
      <FieldGroup className="grid gap-4 md:grid-cols-12">
        <Field className="md:col-span-4" data-invalid={invalid === "version" || undefined}>
          <FieldLabel htmlFor="frm-ver-num">Número da Versão</FieldLabel>
          <Input
            id="frm-ver-num"
            value={version}
            placeholder="Ex: 1.1.0"
            aria-invalid={invalid === "version" || undefined}
            onChange={(e) => {
              setVersion(e.target.value)
              if (invalid === "version") setInvalid(null)
            }}
          />
          <FieldDescription className="text-xs">Utilize o padrão SemVer (ex: 1.0.1 ou 2.0.0).</FieldDescription>
        </Field>
        <Field className="md:col-span-8">
          <FieldLabel htmlFor="frm-ver-date">Data de Lançamento</FieldLabel>
          <Input id="frm-ver-date" type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field className="md:col-span-12" data-invalid={invalid === "description" || undefined}>
          <FieldLabel htmlFor="frm-ver-desc">Notas da Versão / Histórico de Mudanças (Changelog)</FieldLabel>
          <Textarea
            id="frm-ver-desc"
            value={description}
            className="min-h-[140px] resize-y"
            placeholder={
              "Descreva o que foi alterado nesta atualização...\n- Ex: Adicionado fechamento de caixa detalhado.\n- Ex: Corrigido bug de impressão USB."
            }
            aria-invalid={invalid === "description" || undefined}
            onChange={(e) => {
              setDescription(e.target.value)
              if (invalid === "description") setInvalid(null)
            }}
          />
        </Field>
      </FieldGroup>
    </CrudDialog>
  )
}
