import { useMemo, useRef, useState } from "react"
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon, SearchIcon, XIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { Pagination, PaginationContent, PaginationItem } from "@/components/ui/pagination"
import { useMasterStores } from "@/data/master"
import type { StoreInfo } from "@/data/types"
import { useAuth } from "@/lib/auth"
import { errorMessage } from "@/lib/errors"
import { cn } from "@/lib/utils"

import { CONNECTION_ERROR, isConnectionFailure, useStoreActions } from "./store-actions"
import { EditStoreDialog, NewStoreDialog } from "./store-dialogs"
import { DEFAULT_PAGE_SIZE, filterStores, PAGE_SIZES, paginate } from "./stores"
import { StoresTable } from "./stores-table"

const PAGE_BTN = "size-7 border text-[12.5px] font-bold"
const PAGE_BTN_IDLE = "border-border bg-card text-muted-foreground hover:border-primary hover:bg-card hover:text-primary"

/** Tela "Licenciamento e Filiais": busca, tabela de lojas e paginação. */
export function StoresPanel() {
  const stores = useMasterStores()
  const { storeId: currentStoreId } = useAuth()
  const actions = useStoreActions()
  const searchRef = useRef<HTMLInputElement>(null)

  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState<number>(DEFAULT_PAGE_SIZE)
  // "key" muda a cada abertura para o formulário começar limpo.
  const [newDialog, setNewDialog] = useState({ open: false, key: 0 })
  const [editDialog, setEditDialog] = useState<{ open: boolean; key: number; store: StoreInfo | null }>({
    open: false,
    key: 0,
    store: null,
  })

  // O mesmo filtro vale para a lista e para a paginação.
  const filtered = useMemo(() => filterStores(stores.data ?? [], search), [stores.data, search])
  const slice = paginate(filtered, page, perPage)

  function changeSearch(value: string) {
    setSearch(value)
    setPage(1)
  }

  function clearSearch() {
    changeSearch("")
    searchRef.current?.focus()
  }

  const offline = isConnectionFailure(stores.error)
  const loadError =
    !stores.data && stores.error
      ? {
          title: offline ? CONNECTION_ERROR.load : "Erro no servidor ao carregar as lojas.",
          description: offline ? undefined : errorMessage(stores.error),
          onRetry: () => void stores.refetch(),
        }
      : null

  return (
    <>
      <Card className="gap-5 rounded-lg py-6">
        <CardHeader className="sr-only">
          <CardTitle>Lojas licenciadas</CardTitle>
          <CardDescription>Clientes e filiais com licença, vencimento, limite de terminais e ponte de impressão.</CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-6">
          {/* Toolbar: busca + novo cliente */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <InputGroup className="max-w-[400px] flex-1 basis-64">
              <InputGroupAddon>
                <SearchIcon />
              </InputGroupAddon>
              <InputGroupInput
                ref={searchRef}
                id="stores-search"
                aria-label="Buscar lojas"
                autoComplete="off"
                placeholder="Buscar por CNPJ, Razão Social ou Código..."
                value={search}
                onChange={(e) => changeSearch(e.target.value)}
              />
              {search ? (
                <InputGroupAddon align="inline-end">
                  <InputGroupButton size="icon-xs" aria-label="Limpar busca" onClick={clearSearch}>
                    <XIcon />
                  </InputGroupButton>
                </InputGroupAddon>
              ) : null}
            </InputGroup>
            <Button className="font-bold" onClick={() => setNewDialog((d) => ({ open: true, key: d.key + 1 }))}>
              <PlusIcon data-icon="inline-start" />
              Novo Cliente / Loja
            </Button>
          </div>

          <StoresTable
            stores={slice.items}
            loading={stores.isPending || (!stores.data && stores.isFetching)}
            loadError={loadError}
            search={search}
            onClearSearch={clearSearch}
            currentStoreId={currentStoreId}
            onToggle={(store) => void actions.toggleLicense(store)}
            onEnter={(store) => void actions.enterStore(store)}
            onEdit={(store) => setEditDialog((d) => ({ open: true, key: d.key + 1, store }))}
            isBusy={actions.isBusy}
          />
        </CardContent>

        {/* Rodapé: contagem, itens por página e páginas */}
        <CardFooter className="flex-wrap justify-between gap-4">
          <p className="text-[13px] text-muted-foreground">
            Exibindo <strong>{slice.from}</strong> a <strong>{slice.to}</strong> de <strong>{slice.total}</strong> lojas
            registradas
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <label htmlFor="stores-per-page" className="text-xs text-muted-foreground">
                Exibir:
              </label>
              <NativeSelect
                id="stores-per-page"
                size="sm"
                className="w-[70px] text-xs"
                value={perPage}
                onChange={(e) => {
                  setPerPage(Number(e.target.value) || DEFAULT_PAGE_SIZE)
                  setPage(1)
                }}
              >
                {PAGE_SIZES.map((size) => (
                  <NativeSelectOption key={size} value={size}>
                    {size}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>
            <Pagination className="mx-0 w-auto" aria-label="Paginação das lojas">
              <PaginationContent className="flex-wrap">
                <PaginationItem>
                  <Button
                    size="icon-sm"
                    aria-label="Página anterior"
                    disabled={slice.page <= 1}
                    onClick={() => setPage(slice.page - 1)}
                    className={cn(PAGE_BTN, PAGE_BTN_IDLE, "disabled:opacity-40")}
                  >
                    <ChevronLeftIcon />
                  </Button>
                </PaginationItem>
                {Array.from({ length: slice.totalPages }, (_, i) => i + 1).map((n) => (
                  <PaginationItem key={n}>
                    <Button
                      size="icon-sm"
                      aria-label={`Página ${n}`}
                      aria-current={n === slice.page ? "page" : undefined}
                      onClick={() => setPage(n)}
                      className={cn(PAGE_BTN, n === slice.page ? "border-primary" : PAGE_BTN_IDLE)}
                    >
                      {n}
                    </Button>
                  </PaginationItem>
                ))}
                <PaginationItem>
                  <Button
                    size="icon-sm"
                    aria-label="Próxima página"
                    disabled={slice.page >= slice.totalPages}
                    onClick={() => setPage(slice.page + 1)}
                    className={cn(PAGE_BTN, PAGE_BTN_IDLE, "disabled:opacity-40")}
                  >
                    <ChevronRightIcon />
                  </Button>
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        </CardFooter>
      </Card>

      <NewStoreDialog
        key={`new-${newDialog.key}`}
        open={newDialog.open}
        onOpenChange={(open) => setNewDialog((d) => ({ ...d, open }))}
      />
      {editDialog.store ? (
        <EditStoreDialog
          key={`edit-${editDialog.key}`}
          store={editDialog.store}
          open={editDialog.open}
          onOpenChange={(open) => setEditDialog((d) => ({ ...d, open }))}
        />
      ) : null}
    </>
  )
}
