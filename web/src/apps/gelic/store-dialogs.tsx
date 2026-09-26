import { useRef, useState } from "react"
import { toast } from "sonner"

import { CrudDialog } from "@/components/app/crud-dialog"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { useCreateStore, useUpdateStore } from "@/data/master"
import type { StoreInfo } from "@/data/types"
import { addDays, todayBR } from "@/lib/format"

import { CONNECTION_ERROR, notifyFailure } from "./store-actions"

const MSG_EXPIRE = "Por favor, informe a data de vencimento da licença."
const MSG_NAME = "Por favor, digite uma Razão Social válida (mínimo 3 caracteres)."
const MSG_CNPJ = "Por favor, informe um CNPJ válido com 14 dígitos numéricos."

/** Limite digitado; vazio ou inválido vale 5, como no sistema anterior. */
function parseTerminals(value: string): number {
  return Number.parseInt(value, 10) || 5
}

type DialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type NewField = "name" | "cnpj" | "expire"

/** "Novo Cliente / Loja": cadastra a loja com o próximo código numérico. */
export function NewStoreDialog({ open, onOpenChange }: DialogProps) {
  const create = useCreateStore()
  const [name, setName] = useState("")
  const [cnpj, setCnpj] = useState("")
  const [phone, setPhone] = useState("")
  const [terminals, setTerminals] = useState("5")
  // Vencimento padrão: hoje (São Paulo) + 1 ano.
  const [expire, setExpire] = useState(() => addDays(todayBR(), 365))
  const [error, setError] = useState<{ field: NewField; message: string } | null>(null)
  const refs = {
    name: useRef<HTMLInputElement>(null),
    cnpj: useRef<HTMLInputElement>(null),
    expire: useRef<HTMLInputElement>(null),
  }

  function fail(field: NewField, message: string) {
    setError({ field, message })
    refs[field].current?.focus()
  }

  async function submit() {
    // Mesma ordem de validação do sistema anterior.
    if (!expire) return fail("expire", MSG_EXPIRE)
    const cleanName = name.trim()
    if (cleanName.length < 3) return fail("name", MSG_NAME)
    const cleanCnpj = cnpj.replace(/\D/g, "")
    if (cleanCnpj.length !== 14) return fail("cnpj", MSG_CNPJ)
    setError(null)
    try {
      const store = await create.mutateAsync({
        name: cleanName,
        cnpj: cleanCnpj,
        phone: phone.trim(),
        terminalsAllowed: parseTerminals(terminals),
        expireDate: expire,
      })
      toast.success(`Cliente "${store.name}" cadastrado com sucesso!`)
      onOpenChange(false)
    } catch (err) {
      notifyFailure(err, "O servidor retornou um erro ao criar o cliente.", CONNECTION_ERROR.create)
    }
  }

  const invalid = (field: NewField) => (error?.field === field ? true : undefined)
  const clearError = (field: NewField) => {
    if (error?.field === field) setError(null)
  }

  return (
    <CrudDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Cadastrar Novo Cliente / Filial"
      size="md"
      onSubmit={submit}
      submitting={create.isPending}
    >
      <FieldGroup className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
        <Field className="sm:col-span-2" data-invalid={invalid("name")}>
          <FieldLabel htmlFor="store-form-name">Razão Social / Filial *</FieldLabel>
          <Input
            ref={refs.name}
            id="store-form-name"
            autoFocus
            autoComplete="off"
            placeholder="EX: RESTAURANTE SABOR DO SUL LTDA"
            value={name}
            aria-invalid={invalid("name")}
            onChange={(e) => {
              setName(e.target.value)
              clearError("name")
            }}
          />
          {error?.field === "name" ? <FieldError>{error.message}</FieldError> : null}
        </Field>
        <Field data-invalid={invalid("cnpj")}>
          <FieldLabel htmlFor="store-form-cnpj">CNPJ (Somente Números) *</FieldLabel>
          <Input
            ref={refs.cnpj}
            id="store-form-cnpj"
            inputMode="numeric"
            autoComplete="off"
            maxLength={14}
            placeholder="EX: 12345678000199"
            value={cnpj}
            aria-invalid={invalid("cnpj")}
            onChange={(e) => {
              setCnpj(e.target.value.replace(/\D/g, ""))
              clearError("cnpj")
            }}
          />
          {error?.field === "cnpj" ? <FieldError>{error.message}</FieldError> : null}
        </Field>
        <Field>
          <FieldLabel htmlFor="store-form-phone">Telefone de Contato</FieldLabel>
          <Input
            id="store-form-phone"
            type="tel"
            autoComplete="off"
            placeholder="EX: (84) 99999-8888"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="store-form-terminals">Limite de PDVs / Terminais</FieldLabel>
          <Input
            id="store-form-terminals"
            type="number"
            inputMode="numeric"
            min={1}
            max={99}
            value={terminals}
            onChange={(e) => setTerminals(e.target.value)}
          />
        </Field>
        <Field data-invalid={invalid("expire")}>
          <FieldLabel htmlFor="store-form-expire">Vencimento da Licença</FieldLabel>
          <Input
            ref={refs.expire}
            id="store-form-expire"
            type="date"
            value={expire}
            aria-invalid={invalid("expire")}
            onChange={(e) => {
              setExpire(e.target.value)
              clearError("expire")
            }}
          />
          {error?.field === "expire" ? <FieldError>{error.message}</FieldError> : null}
        </Field>
      </FieldGroup>
    </CrudDialog>
  )
}

/**
 * Edição da licença: razão social, CNPJ e telefone só leitura; limite de
 * terminais e vencimento editáveis (os dois são gravados).
 */
export function EditStoreDialog({ store, open, onOpenChange }: DialogProps & { store: StoreInfo }) {
  const update = useUpdateStore()
  const [terminals, setTerminals] = useState(() => String(store.terminalsAllowed || 5))
  const [expire, setExpire] = useState(() => store.expireDate ?? "")
  const [error, setError] = useState<string | null>(null)
  const expireRef = useRef<HTMLInputElement>(null)

  async function submit() {
    if (!expire) {
      setError(MSG_EXPIRE)
      expireRef.current?.focus()
      return
    }
    setError(null)
    try {
      await update.mutateAsync({ storeId: store.id, expireDate: expire, terminalsAllowed: parseTerminals(terminals) })
      onOpenChange(false)
    } catch (err) {
      notifyFailure(err, "Erro ao atualizar licença no servidor.", CONNECTION_ERROR.license)
    }
  }

  return (
    <CrudDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Editar Licenciamento - Loja #${store.id}`}
      size="md"
      onSubmit={submit}
      submitting={update.isPending}
    >
      <FieldGroup className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
        <Field className="sm:col-span-2">
          <FieldLabel htmlFor="store-edit-name">Razão Social / Filial</FieldLabel>
          <Input id="store-edit-name" readOnly value={store.name} className="border-border text-muted-foreground" />
        </Field>
        <Field>
          <FieldLabel htmlFor="store-edit-cnpj">CNPJ</FieldLabel>
          <Input id="store-edit-cnpj" readOnly value={store.cnpj || "N/A"} className="border-border text-muted-foreground" />
        </Field>
        <Field>
          <FieldLabel htmlFor="store-edit-phone">Telefone</FieldLabel>
          <Input id="store-edit-phone" readOnly value={store.phone || "N/A"} className="border-border text-muted-foreground" />
        </Field>
        <Field>
          <FieldLabel htmlFor="store-edit-terminals">Limite de PDVs / Terminais *</FieldLabel>
          <Input
            id="store-edit-terminals"
            type="number"
            inputMode="numeric"
            min={1}
            max={99}
            autoFocus
            value={terminals}
            onChange={(e) => setTerminals(e.target.value)}
          />
        </Field>
        <Field data-invalid={error ? true : undefined}>
          <FieldLabel htmlFor="store-edit-expire">Vencimento da Licença *</FieldLabel>
          <Input
            ref={expireRef}
            id="store-edit-expire"
            type="date"
            value={expire}
            aria-invalid={error ? true : undefined}
            onChange={(e) => {
              setExpire(e.target.value)
              setError(null)
            }}
          />
          {error ? <FieldError>{error}</FieldError> : null}
        </Field>
      </FieldGroup>
    </CrudDialog>
  )
}
