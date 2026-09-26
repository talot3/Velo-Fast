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
import { useGroups, useRemoveSubgroups, useSubgroups } from "@/data/catalog"
import type { Subgroup } from "@/data/types"
import { errorMessage } from "@/lib/errors"

import { DEFAULT_SUBGROUP_BG, DEFAULT_SUBGROUP_TEXT } from "../features/catalogo/lib"
import { SubgroupDialog } from "../features/catalogo/subgroup-dialog"

const TH = "text-[11px] font-bold tracking-wide text-muted-foreground uppercase"

/** Subgrupos e Cores — antigo renderSubgroups. */
export default function Page() {
  const subgroupsQ = useSubgroups()
  const groupsQ = useGroups()
  const remove = useRemoveSubgroups()
  const confirm = useConfirm()
  const subgroups = subgroupsQ.data ?? []
  const groups = useMemo(() => groupsQ.data ?? [], [groupsQ.data])
  const groupName = (id: string | null) => groups.find((g) => g.id === id)?.name ?? "N/A"
  const loading = subgroupsQ.isLoading || groupsQ.isLoading
  const loadError = subgroupsQ.error ?? groupsQ.error

  const [editor, setEditor] = useState<{ open: boolean; subgroup: Subgroup | null; key: number }>({
    open: false,
    subgroup: null,
    key: 0,
  })

  function openSubgroup(subgroup: Subgroup | null) {
    if (groups.length === 0) {
      toast.warning("Crie um grupo primeiro antes de cadastrar subgrupos.")
      return
    }
    setEditor((e) => ({ open: true, subgroup, key: e.key + 1 }))
  }

  async function removeSubgroup(subgroup: Subgroup) {
    if (!(await confirm("Remover este subgrupo?", { destructive: true, confirmLabel: "Remover" }))) return
    try {
      await remove.mutateAsync(subgroup.id)
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Subgrupos e Cores"
        actions={
          <Button onClick={() => openSubgroup(null)} disabled={loading}>
            <PlusIcon data-icon="inline-start" />
            Novo Subgrupo
          </Button>
        }
      />

      {loadError ? (
        <Alert variant="destructive">
          <TriangleAlertIcon />
          <AlertTitle>Não foi possível carregar os subgrupos.</AlertTitle>
          <AlertDescription>{errorMessage(loadError)}</AlertDescription>
        </Alert>
      ) : null}

      <Card className="gap-0 overflow-hidden py-0">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className={TH}>Grupo</TableHead>
                <TableHead className={TH}>Subgrupo</TableHead>
                <TableHead className={TH}>Aparência (Botão PDV)</TableHead>
                <TableHead className="w-24">
                  <span className="sr-only">Ações</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 4 }, (_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={4}>
                      <Skeleton className="h-9 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : subgroups.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={4} className="whitespace-normal">
                    <EmptyState title="Nenhum subgrupo cadastrado." />
                  </TableCell>
                </TableRow>
              ) : (
                subgroups.map((sg) => (
                  <TableRow key={sg.id}>
                    <TableCell className="font-bold whitespace-normal">{groupName(sg.groupId)}</TableCell>
                    <TableCell className="font-extrabold whitespace-normal">{sg.name}</TableCell>
                    <TableCell className="whitespace-normal">
                      <button
                        type="button"
                        onClick={() => openSubgroup(sg)}
                        className="inline-flex max-w-full items-center justify-center rounded-lg px-4 py-2 text-[13px] font-bold shadow-sm transition-transform outline-none hover:-translate-y-px focus-visible:ring-[3px] focus-visible:ring-ring/50"
                        style={{ background: sg.buttonColor || DEFAULT_SUBGROUP_BG, color: sg.textColor || DEFAULT_SUBGROUP_TEXT }}
                      >
                        {sg.name}
                      </button>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon-sm" className="text-primary" aria-label={`Editar ${sg.name}`} onClick={() => openSubgroup(sg)}>
                          <PenLineIcon />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                          aria-label={`Remover ${sg.name}`}
                          onClick={() => void removeSubgroup(sg)}
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
        <SubgroupDialog
          key={editor.key}
          open={editor.open}
          onOpenChange={(open) => setEditor((e) => ({ ...e, open }))}
          subgroup={editor.subgroup}
          groups={groups}
        />
      ) : null}
    </div>
  )
}
