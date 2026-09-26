import { useState } from "react"
import { toast } from "sonner"

import { CrudDialog } from "@/components/app/crud-dialog"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import type { AppUser } from "@/data/types"
import { useCreateUser, useSetUserPassword, useUpdateUser } from "@/data/users"
import { ApiError } from "@/lib/api"
import { errorMessage } from "@/lib/errors"

import type { Cargo } from "./cargos"

export type StoreRole = "operador" | "supervisor" | "admin"

/** "Nível de Acesso (Sistema)": papel do login no PDV/portal. */
export const ROLE_OPTIONS: { value: StoreRole; label: string }[] = [
  { value: "operador", label: "Operador" },
  { value: "supervisor", label: "Supervisor" },
  { value: "admin", label: "Administrador" },
]

const FALLBACK_CARGOS = [
  { value: "1", label: "ADMINISTRADOR" },
  { value: "2", label: "OPERADOR DE CAIXA" },
]

export function roleLabel(role: string): string {
  return ROLE_OPTIONS.find((r) => r.value === role)?.label ?? (role === "master" ? "Master" : role)
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** null = novo usuário. */
  user: AppUser | null
  users: AppUser[]
  cargos: Cargo[]
  /** A API recusou (403): só administradores gerenciam usuários. */
  onForbidden: () => void
}

type FieldKey = "username" | "cargo" | "role" | "password" | "confirm"

/** Formulário "Novo Usuário" / "Editar Usuário". */
export function UserDialog({ open, onOpenChange, user, users, cargos, onForbidden }: Props) {
  const create = useCreateUser()
  const update = useUpdateUser()
  const setPassword = useSetUserPassword()

  const [username, setUsername] = useState(user?.username ?? "")
  const [cargoId, setCargoId] = useState(user ? String(user.extra?.cargoId ?? "") : "")
  const [role, setRole] = useState<StoreRole | "">(user && user.role !== "master" ? user.role : "")
  const [password, setPasswordValue] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [ativo, setAtivo] = useState(user ? user.active : true)
  const [invalid, setInvalid] = useState<FieldKey | null>(null)
  const [busy, setBusy] = useState(false)

  // Sem cargos carregados, o antigo oferecia ADMINISTRADOR (1) e OPERADOR DE CAIXA (2).
  const cargoOptions =
    cargos.length > 0
      ? cargos.map((c) => ({ value: String(c.id), label: (c.nome ?? "").toUpperCase() }))
      : FALLBACK_CARGOS
  // Cargo que não existe mais aparece como "— Selecione o Cargo —".
  const selectedCargo = cargoOptions.some((o) => o.value === cargoId) ? cargoId : ""

  function fail(field: FieldKey, message: string) {
    setInvalid(field)
    toast.error(message)
  }

  async function submit() {
    const name = username.trim().toUpperCase()
    if (!name) return fail("username", "O nome de usuário é obrigatório.")
    if (!selectedCargo) return fail("cargo", "Por favor, selecione um cargo para definir as permissões.")
    if (!role) return fail("role", "Por favor, selecione o nível de acesso ao sistema.")
    if (!user && !password) return fail("password", "Para novos usuários, a senha é obrigatória.")
    // Mesma regra da API: checada antes, para não gravar o resto e falhar só na senha.
    if (password && password.length < 4) return fail("password", "A senha/PIN precisa ter pelo menos 4 caracteres.")
    if (password.length > 72) return fail("password", "Senha longa demais (máximo 72 caracteres).")
    if (password && password !== confirmPassword) return fail("confirm", "As senhas não coincidem.")
    const exists = users.some((u) => u.username.toLowerCase() === name.toLowerCase() && u.userId !== user?.userId)
    if (exists) return fail("username", "Já existe um usuário com esse nome.")

    const cargoValue = /^\d+$/.test(selectedCargo) ? Number(selectedCargo) : selectedCargo
    setBusy(true)
    try {
      if (user) {
        await update.mutateAsync({
          userId: user.userId,
          username: name,
          role,
          active: ativo,
          extra: { ...user.extra, cargoId: cargoValue },
        })
        if (password) await setPassword.mutateAsync({ userId: user.userId, password })
      } else {
        const created = (await create.mutateAsync({ username: name, password, role, extra: { cargoId: cargoValue } })) as {
          user?: { user_id?: string }
        }
        const newId = created?.user?.user_id
        if (!ativo && newId) await update.mutateAsync({ userId: newId, active: false })
      }
      onOpenChange(false)
    } catch (e) {
      if (e instanceof ApiError && e.status === 403) onForbidden()
      toast.error(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  const clear = (field: FieldKey) => {
    if (invalid === field) setInvalid(null)
  }

  return (
    <CrudDialog
      open={open}
      onOpenChange={onOpenChange}
      title={user ? "Editar Usuário" : "Novo Usuário"}
      submitLabel="Gravar Registro"
      onSubmit={submit}
      submitting={busy}
    >
      <FieldGroup className="grid gap-4 md:grid-cols-2">
        <Field data-invalid={invalid === "username" || undefined}>
          <FieldLabel htmlFor="frm-usr-name">Nome de Usuário (Acesso Caixa)</FieldLabel>
          <Input
            id="frm-usr-name"
            value={username}
            placeholder="Ex: MARIA"
            autoComplete="off"
            aria-invalid={invalid === "username" || undefined}
            onChange={(e) => {
              setUsername(e.target.value)
              clear("username")
            }}
          />
        </Field>
        <Field data-invalid={invalid === "cargo" || undefined}>
          <FieldLabel htmlFor="frm-usr-cargo">Cargo / Perfil de Acesso</FieldLabel>
          <NativeSelect
            id="frm-usr-cargo"
            value={selectedCargo}
            aria-invalid={invalid === "cargo" || undefined}
            onChange={(e) => {
              setCargoId(e.target.value)
              clear("cargo")
            }}
          >
            <NativeSelectOption value="">— Selecione o Cargo —</NativeSelectOption>
            {cargoOptions.map((o) => (
              <NativeSelectOption key={o.value} value={o.value}>
                {o.label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
        <Field data-invalid={invalid === "role" || undefined} className="md:col-span-2">
          <FieldLabel htmlFor="frm-usr-role">Nível de Acesso (Sistema)</FieldLabel>
          <NativeSelect
            id="frm-usr-role"
            value={role}
            aria-invalid={invalid === "role" || undefined}
            onChange={(e) => {
              setRole(e.target.value as StoreRole | "")
              clear("role")
            }}
          >
            <NativeSelectOption value="">— Selecione o Nível —</NativeSelectOption>
            {ROLE_OPTIONS.map((r) => (
              <NativeSelectOption key={r.value} value={r.value}>
                {r.label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
        <Field data-invalid={invalid === "password" || undefined}>
          <FieldLabel htmlFor="frm-usr-pass">Senha de Acesso</FieldLabel>
          <Input
            id="frm-usr-pass"
            type="password"
            value={password}
            autoComplete="new-password"
            placeholder={user ? "Deixe em branco para manter a atual" : "Digite a senha"}
            aria-invalid={invalid === "password" || undefined}
            onChange={(e) => {
              setPasswordValue(e.target.value)
              clear("password")
            }}
          />
        </Field>
        <Field data-invalid={invalid === "confirm" || undefined}>
          <FieldLabel htmlFor="frm-usr-pass-confirm">Confirmar Senha</FieldLabel>
          <Input
            id="frm-usr-pass-confirm"
            type="password"
            value={confirmPassword}
            autoComplete="new-password"
            placeholder="Repita a senha"
            aria-invalid={invalid === "confirm" || undefined}
            onChange={(e) => {
              setConfirmPassword(e.target.value)
              clear("confirm")
            }}
          />
        </Field>
        <Field className="md:col-span-2">
          <FieldLabel htmlFor="frm-usr-ativo">Status do Colaborador</FieldLabel>
          <NativeSelect id="frm-usr-ativo" value={ativo ? "1" : "0"} onChange={(e) => setAtivo(e.target.value === "1")}>
            <NativeSelectOption value="1">ATIVO — HABILITADO PARA TRABALHAR</NativeSelectOption>
            <NativeSelectOption value="0">INATIVO — ACESSO BLOQUEADO</NativeSelectOption>
          </NativeSelect>
        </Field>
      </FieldGroup>
    </CrudDialog>
  )
}
