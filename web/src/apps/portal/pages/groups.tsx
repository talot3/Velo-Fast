import { useMemo, useState } from "react"
import { PenLineIcon, PlusIcon, Trash2Icon, TriangleAlertIcon } from "lucide-react"
import { toast } from "sonner"

import { useConfirm } from "@/components/app/confirm-dialog"
import { EmptyState } from "@/components/app/empty-state"
import { PageHeader } from "@/components/app/page-header"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useGroups, useRemoveGroups } from "@/data/catalog"
import type { Group } from "@/data/types"
import { errorMessage } from "@/lib/errors"

import { GroupDialog } from "../features/catalogo/group-dialog"
import { sortGroups } from "../features/catalogo/lib"

const TH = "text-[11px] font-bold tracking-wide text-muted-foreground uppercase"

/** Grupos de Produtos — antigo renderGroups. */
export default function Page() {
  const groupsQ = useGroups()
  const remove = useRemoveGroups()
  const confirm = useConfirm()
  const groups = useMemo(() => sortGroups(groupsQ.data ?? []), [groupsQ.data])
  const [editor, setEditor] = useState<{ open: boolean; group: Group | null; key: number }>({ open: false, group: null, key: 0 })
  const openGroup = (group: Group | null) => setEditor((e) => ({ open: true, group, key: e.key + 1 }))

  async function removeGroup(group: Group) {
    if (!(await confirm("Remover este grupo? Os subgrupos vinculados podem ser afetados.", { destructive: true, confirmLabel: "Remover" }))) return
    try {
      await remove.mutateAsync(group.id)
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Grupos de Produtos"
        actions={
          <Button onClick={() => openGroup(null)}>
            <PlusIcon data-icon="inline-start" />
            Novo Grupo
          </Button>
        }
      />

      {groupsQ.error ? (
        <Alert variant="destructive">
          <TriangleAlertIcon />
          <AlertTitle>Não foi possível carregar os grupos.</AlertTitle>
          <AlertDescription>{errorMessage(groupsQ.error)}</AlertDescription>
        </Alert>
      ) : null}

      <Card className="gap-0 overflow-hidden py-0">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className={TH}>Ordem</TableHead>
                <TableHead className={TH}>Nome do Grupo</TableHead>
                <TableHead className="w-24">
                  <span className="sr-only">Ações</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groupsQ.isLoading ? (
                Array.from({ length: 3 }, (_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={3}>
                      <Skeleton className="h-7 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : groups.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={3} className="whitespace-normal">
                    <EmptyState title="Nenhum grupo cadastrado." />
                  </TableCell>
                </TableRow>
              ) : (
                groups.map((g) => (
                  <TableRow key={g.id}>
                    <TableCell className="h-12 font-bold tabular-nums">{g.order}</TableCell>
                    <TableCell className="font-extrabold whitespace-normal text-primary">{g.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon-sm" className="text-primary" aria-label={`Editar ${g.name}`} onClick={() => openGroup(g)}>
                          <PenLineIcon />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                          aria-label={`Remover ${g.name}`}
                          onClick={() => void removeGroup(g)}
                        >
                          <Trash2Icon />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {editor.key > 0 ? (
        <GroupDialog
          key={editor.key}
          open={editor.open}
          onOpenChange={(open) => setEditor((e) => ({ ...e, open }))}
          group={editor.group}
        />
      ) : null}
    </div>
  )
}
