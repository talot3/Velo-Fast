import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import type { Group, Subgroup } from "@/data/types"

type BulkGroupDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  count: number
  groups: Group[]
  subgroups: Subgroup[]
  applying: boolean
  onApply: (subgroupId: string) => void
}

/**
 * "Mudar Grupo" da seleção em lote. No sistema antigo o diálogo era montado
 * sem ficar visível (bug); aqui ele abre de verdade.
 */
export function BulkGroupDialog({ open, onOpenChange, count, groups, subgroups, applying, onApply }: BulkGroupDialogProps) {
  const [subgroupId, setSubgroupId] = useState(() => subgroups[0]?.id ?? "")
  const groupName = (id: string | null) => (id ? groups.find((g) => g.id === id)?.name : undefined)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base leading-snug">Mover {count} produto(s) para qual subgrupo?</DialogTitle>
          <DialogDescription className="sr-only">Mudar Grupo</DialogDescription>
        </DialogHeader>
        <Select value={subgroupId} onValueChange={setSubgroupId}>
          <SelectTrigger className="w-full" aria-label="Grupo / Subgrupo">
            <SelectValue placeholder="Grupo / Subgrupo" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {subgroups.map((sg) => {
                const g = groupName(sg.groupId)
                return (
                  <SelectItem key={sg.id} value={sg.id}>
                    {g ? `${g} / ` : ""}
                    {sg.name}
                  </SelectItem>
                )
              })}
            </SelectGroup>
          </SelectContent>
        </Select>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="button" disabled={!subgroupId || applying} onClick={() => onApply(subgroupId)}>
            {applying ? <Spinner data-icon="inline-start" /> : null}
            Aplicar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
