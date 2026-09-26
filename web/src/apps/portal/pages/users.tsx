import { useState } from "react"
import { ShieldAlertIcon, UsersIcon } from "lucide-react"
import { toast } from "sonner"

import { useConfirm } from "@/components/app/confirm-dialog"
import { PageHeader } from "@/components/app/page-header"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { TableRow } from "@/components/ui/table"
import type { AppUser } from "@/data/types"
import { useStoreUsers, useUpdateUser } from "@/data/users"
import { ApiError } from "@/lib/api"
import { errorMessage } from "@/lib/errors"

import { useCargos } from "../features/config/cargos"
import { Cell, ConfigTable, EmptyRow, LoadError, LoadingRows, RowActions } from "../features/config/ui"
import { roleLabel, UserDialog } from "../features/config/user-dialog"
import { useEditor } from "../features/config/use-editor"

const COLUMNS = [
  { label: "ID" },
  { label: "Nome de Usuário" },
  { label: "Cargo / Permissão" },
  { label: "Status" },
  { label: "", className: "w-[100px]" },
]

/** Cadastros › Colaboradores › Usuários (logins reais do PDV e do portal). */
export default function UsersPage() {
  const users = useStoreUsers()
  const cargos = useCargos()
  const update = useUpdateUser()
  const confirm = useConfirm()
  const editor = useEditor<AppUser>()
  const [forbidden, setForbidden] = useState(false)

  const list = users.data ?? []
  const cargoList = cargos.data?.items ?? []

  function cargoName(user: AppUser) {
    const cargo = cargoList.find((c) => String(c.id) === String(user.extra?.cargoId ?? ""))
    return cargo ? (cargo.nome ?? "").toUpperCase() : "SEM CARGO"
  }

  async function onRemove(user: AppUser) {
    if (!(await confirm("Remover este usuário? Ele não poderá mais acessar o PDV.", { destructive: true, confirmLabel: "Remover" }))) return
    try {
      // Os logins não são apagados: o usuário é desativado (fica INATIVO).
      await update.mutateAsync({ userId: user.userId, active: false })
    } catch (e) {
      if (e instanceof ApiError && e.status === 403) setForbidden(true)
      toast.error(errorMessage(e))
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Cadastro de Usuários / Operadores"
        actions={<Button onClick={() => editor.openEditor(null)}>+ Novo Usuário</Button>}
      />

      {forbidden ? (
        <Alert>
          <ShieldAlertIcon />
          <AlertTitle>Somente administradores podem gerenciar usuários.</AlertTitle>
          <AlertDescription>Com o seu nível de acesso você vê apenas o seu próprio cadastro.</AlertDescription>
        </Alert>
      ) : null}

      {users.isError ? <LoadError error={users.error} /> : null}

      <ConfigTable columns={COLUMNS}>
        {users.isPending ? (
          <LoadingRows colSpan={5} />
        ) : list.length === 0 ? (
          <EmptyRow colSpan={5} title="Nenhum usuário cadastrado." icon={UsersIcon} />
        ) : (
          list.map((u) => (
            <TableRow key={u.userId}>
              <Cell className="font-mono text-[13px] font-bold text-muted-foreground" title={u.userId}>
                {u.userId.slice(0, 8)}
              </Cell>
              <Cell className="font-extrabold">{u.username}</Cell>
              <Cell>
                <div className="flex flex-col">
                  <span className="font-bold text-primary">{cargoName(u)}</span>
                  <span className="text-xs text-muted-foreground">{roleLabel(u.role)}</span>
                </div>
              </Cell>
              <Cell className={u.active ? "font-extrabold text-success" : "font-extrabold text-destructive"}>
                {u.active ? "ATIVO" : "INATIVO"}
              </Cell>
              <Cell>
                <RowActions onEdit={() => editor.openEditor(u)} onDelete={() => void onRemove(u)} />
              </Cell>
            </TableRow>
          ))
        )}
      </ConfigTable>

      <UserDialog
        key={editor.key}
        open={editor.open}
        onOpenChange={editor.setOpen}
        user={editor.item}
        users={list}
        cargos={cargoList}
        onForbidden={() => setForbidden(true)}
      />
    </div>
  )
}
