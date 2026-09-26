import { useState } from "react"
import { CheckIcon, ChevronDownIcon, StoreIcon } from "lucide-react"

import { EmptyState } from "@/components/app/empty-state"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Item, ItemActions, ItemContent, ItemDescription, ItemTitle } from "@/components/ui/item"
import { useMasterStores } from "@/data/master"
import { useStoreName } from "@/data/settings"
import { useAuth } from "@/lib/auth"
import { formatCNPJ } from "@/lib/format"
import { useQueryClient } from "@tanstack/react-query"

/** Botão da loja no topo. O master troca de loja; os demais só veem a sua. */
export function StoreSwitcher() {
  const { profile, storeId, selectStore } = useAuth()
  const isMaster = profile?.role === "master"
  const [open, setOpen] = useState(false)
  const name = useStoreName()
  const stores = useMasterStores(isMaster && open)
  const qc = useQueryClient()

  const active = (stores.data ?? []).filter((s) => s.active)

  return (
    <>
      <Button variant="outline" size="sm" className="max-w-56" onClick={() => setOpen(true)}>
        <StoreIcon data-icon="inline-start" />
        <span className="truncate">{name.isLoading ? "Carregando Loja..." : (name.data ?? "Loja Única")}</span>
        <ChevronDownIcon data-icon="inline-end" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Selecionar Filial</DialogTitle>
            <DialogDescription>Escolha a loja que deseja administrar.</DialogDescription>
          </DialogHeader>
          <div className="flex max-h-[60vh] flex-col gap-2 overflow-y-auto">
            {!isMaster ? (
              <Item variant="outline">
                <ItemContent>
                  <ItemTitle>{name.data ?? profile?.storeName}</ItemTitle>
                  <ItemDescription>Código {storeId}</ItemDescription>
                </ItemContent>
                <ItemActions>
                  <Badge variant="secondary">
                    <CheckIcon />
                    Ativa
                  </Badge>
                </ItemActions>
              </Item>
            ) : active.length === 0 && !stores.isLoading ? (
              <EmptyState title="Nenhuma loja adicional liberada no GELIC." />
            ) : (
              active.map((s) => (
                <Item key={s.id} variant="outline" asChild>
                  <button
                    type="button"
                    onClick={() => {
                      selectStore(s.id)
                      void qc.invalidateQueries()
                      setOpen(false)
                    }}
                  >
                    <ItemContent>
                      <ItemTitle>
                        {s.name} <Badge variant="outline">{s.id}</Badge>
                      </ItemTitle>
                      <ItemDescription>{formatCNPJ(s.cnpj)}</ItemDescription>
                    </ItemContent>
                    {s.id === storeId ? (
                      <ItemActions>
                        <Badge variant="secondary">
                          <CheckIcon />
                          Ativa
                        </Badge>
                      </ItemActions>
                    ) : null}
                  </button>
                </Item>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
