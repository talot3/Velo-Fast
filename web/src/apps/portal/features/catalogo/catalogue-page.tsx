import { Fragment, useMemo, useRef, useState, type DragEvent } from "react"
import {
  ArrowUpIcon,
  EyeIcon,
  EyeOffIcon,
  FileSpreadsheetIcon,
  FilterIcon,
  FolderInputIcon,
  PackageIcon,
  PlusIcon,
  RotateCcwIcon,
  SearchIcon,
  TableIcon,
  Trash2Icon,
  TriangleAlertIcon,
  UploadIcon,
  XIcon,
} from "lucide-react"
import { toast } from "sonner"

import { useConfirm } from "@/components/app/confirm-dialog"
import { EmptyState } from "@/components/app/empty-state"
import { PageHeader } from "@/components/app/page-header"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Toggle } from "@/components/ui/toggle"
import {
  useGroups,
  usePrinters,
  useProducts,
  useRemoveProducts,
  useSaveProducts,
  useSubgroups,
} from "@/data/catalog"
import type { Group, Product } from "@/data/types"
import { errorMessage } from "@/lib/errors"
import { formatBRL } from "@/lib/format"
import { cn } from "@/lib/utils"

import { BulkGroupDialog } from "./bulk-group-dialog"
import { downloadProductTemplate } from "./excel"
import {
  ALL_COLUMNS,
  UNIT_OPTIONS,
  matchesFilters,
  useGridFilters,
  useGridPrefs,
  type ColumnId,
  type GridFilters,
} from "./grid-state"
import { buildLookup, formatQty, productPlacement, selectedLabel, sortGroups, type CatalogLookup } from "./lib"
import { ProductDialog } from "./product-dialog"
import { useProductImport } from "./use-product-import"

type Column = (typeof ALL_COLUMNS)[number]

/** Catálogo de Itens — antigo renderCatalogue (Grid de Dados VELO). */
export function CataloguePage() {
  const productsQ = useProducts()
  const groupsQ = useGroups()
  const subgroupsQ = useSubgroups()
  const printersQ = usePrinters()
  const saveProducts = useSaveProducts()
  const removeProducts = useRemoveProducts()
  const confirm = useConfirm()

  const products = useMemo(() => productsQ.data ?? [], [productsQ.data])
  const groups = useMemo(() => groupsQ.data ?? [], [groupsQ.data])
  const subgroups = useMemo(() => subgroupsQ.data ?? [], [subgroupsQ.data])
  const printers = useMemo(() => printersQ.data ?? [], [printersQ.data])
  const loading = productsQ.isLoading || groupsQ.isLoading || subgroupsQ.isLoading || printersQ.isLoading
  const loadError = productsQ.error ?? groupsQ.error ?? subgroupsQ.error ?? printersQ.error

  const lookup = useMemo(() => buildLookup(groups, subgroups, printers), [groups, subgroups, printers])
  const grid = useGridPrefs()
  const { filters, setFilter, clearFilters } = useGridFilters()

  const rows = useMemo(
    () =>
      products
        .filter((p) => matchesFilters(p, lookup, filters))
        .sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
    [products, lookup, filters]
  )

  // ─── Seleção em lote ───────────────────────────────────────────────
  const [selected, setSelected] = useState<Set<string>>(() => new Set())
  const productIds = useMemo(() => new Set(products.map((p) => p.id)), [products])
  const selectedIds = [...selected].filter((id) => productIds.has(id))
  const allRowsSelected = rows.length > 0 && rows.every((r) => selected.has(r.id))
  const headerChecked = allRowsSelected ? true : selectedIds.length > 0 ? "indeterminate" : false

  const toggleRow = (id: string, checked: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  const toggleAllRows = (checked: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev)
      for (const r of rows) {
        if (checked) next.add(r.id)
        else next.delete(r.id)
      }
      return next
    })
  const clearSelection = () => setSelected(new Set())

  // ─── Cadastro ──────────────────────────────────────────────────────
  const [editor, setEditor] = useState<{ open: boolean; product: Product | null; key: number }>({
    open: false,
    product: null,
    key: 0,
  })
  const openProduct = (product: Product | null) => setEditor((e) => ({ open: true, product, key: e.key + 1 }))

  async function removeProduct(product: Product) {
    if (!(await confirm("Remover este item do catálogo?", { destructive: true, confirmLabel: "Remover" }))) return
    try {
      await removeProducts.mutateAsync(product.id)
      toggleRow(product.id, false)
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }

  async function bulkDelete() {
    const ids = selectedIds
    if (ids.length === 0) return
    const ok = await confirm(`Excluir ${ids.length} produto(s) selecionado(s)? Esta ação não pode ser desfeita.`, {
      destructive: true,
      confirmLabel: "Excluir",
    })
    if (!ok) return
    try {
      await removeProducts.mutateAsync(ids)
      clearSelection()
      toast.success(`${ids.length} produto(s) excluído(s).`)
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }

  const [bulkGroup, setBulkGroup] = useState({ open: false, key: 0 })
  async function applyBulkGroup(subgroupId: string) {
    const ids = new Set(selectedIds)
    const changed = products.filter((p) => ids.has(p.id)).map((p) => ({ ...p, subgroupId }))
    try {
      await saveProducts.mutateAsync(changed)
      setBulkGroup((b) => ({ ...b, open: false }))
      clearSelection()
      toast.success(`${changed.length} produto(s) movido(s).`)
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }

  // ─── Planilha ──────────────────────────────────────────────────────
  const fileInput = useRef<HTMLInputElement>(null)
  const catalog = loading ? null : { products, groups, subgroups, printers }
  const { importFile, importing } = useProductImport(catalog)
  const [downloading, setDownloading] = useState(false)

  async function downloadTemplate() {
    setDownloading(true)
    try {
      await downloadProductTemplate()
    } catch (e) {
      toast.error(errorMessage(e, "Não foi possível gerar o modelo da planilha."))
    } finally {
      setDownloading(false)
    }
  }

  // ─── Arrastar colunas ──────────────────────────────────────────────
  const [dragCol, setDragCol] = useState<ColumnId | null>(null)
  const [overCol, setOverCol] = useState<ColumnId | null>(null)
  const [zoneActive, setZoneActive] = useState(false)
  const endDrag = () => {
    setDragCol(null)
    setOverCol(null)
    setZoneActive(false)
  }
  /** Coluna sendo arrastada (ignora textos/arquivos arrastados de fora da grid). */
  const draggedId = (e: DragEvent): ColumnId | null => {
    const id = e.dataTransfer.getData("text/plain") || dragCol
    return ALL_COLUMNS.some((c) => c.id === id) ? (id as ColumnId) : null
  }

  const drag: HeaderDrag = {
    dragCol,
    overCol,
    onDragStart(e, id) {
      e.dataTransfer.effectAllowed = "move"
      e.dataTransfer.setData("text/plain", id)
      setDragCol(id)
    },
    onDragOver(e, id) {
      e.preventDefault()
      if (dragCol && dragCol !== id && overCol !== id) setOverCol(id)
    },
    onDragLeave(e, id) {
      if (e.currentTarget.contains(e.relatedTarget as Node | null)) return
      if (overCol === id) setOverCol(null)
    },
    onDrop(e, id) {
      e.preventDefault()
      const from = draggedId(e)
      if (from && from !== id) grid.moveColumn(from, id)
      endDrag()
    },
    onDragEnd: endDrag,
  }

  const colSpan = grid.visibleColumns.length + 2
  const sortedGroups = useMemo(() => sortGroups(groups), [groups])

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Catálogo de Itens"
        subtitle="Gerencie seus produtos com a avançada Grid de Dados VELO."
        actions={
          <>
            <Button variant="outline" onClick={() => void downloadTemplate()} disabled={downloading}>
              {downloading ? <Spinner data-icon="inline-start" /> : <FileSpreadsheetIcon data-icon="inline-start" className="text-success" />}
              Ver Modelo Excel
            </Button>
            <Button variant="outline" onClick={() => fileInput.current?.click()} disabled={importing || loading}>
              {importing ? <Spinner data-icon="inline-start" /> : <UploadIcon data-icon="inline-start" />}
              Importar Planilha
            </Button>
            <input
              ref={fileInput}
              id="import-excel-file"
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                // Limpa o campo para permitir reimportar o mesmo arquivo.
                e.target.value = ""
                if (file) void importFile(file)
              }}
            />
            <Button onClick={() => openProduct(null)} disabled={loading}>
              <PlusIcon data-icon="inline-start" />
              Adicionar Item
            </Button>
          </>
        }
      />

      {/* Colunas: pílulas + restaurar + zona de remoção */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-extrabold tracking-wide text-muted-foreground uppercase">Colunas:</span>
        {ALL_COLUMNS.map((c) => {
          const visible = grid.isVisible(c.id)
          return (
            <Toggle
              key={c.id}
              size="sm"
              variant="outline"
              pressed={visible}
              onPressedChange={() => grid.toggleColumn(c.id)}
              className="h-7 rounded-full px-3 text-[11px] font-semibold text-muted-foreground data-[state=on]:border-primary/50 data-[state=on]:bg-primary/15 data-[state=on]:text-foreground"
            >
              {visible ? <EyeIcon /> : <EyeOffIcon />}
              {c.label}
            </Toggle>
          )
        })}
        {grid.canRestore ? (
          <Button size="xs" variant="outline" className="h-7 rounded-full border-primary px-3 text-[11px] font-semibold text-primary" onClick={grid.restoreColumns}>
            <RotateCcwIcon data-icon="inline-start" />
            Restaurar
          </Button>
        ) : null}
        <div
          id="col-remove-zone"
          data-active={zoneActive || undefined}
          onDragOver={(e) => {
            e.preventDefault()
            if (!zoneActive) setZoneActive(true)
          }}
          onDragLeave={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setZoneActive(false)
          }}
          onDrop={(e) => {
            e.preventDefault()
            const id = draggedId(e)
            if (id) grid.hideColumn(id)
            endDrag()
          }}
          className="inline-flex h-7 items-center gap-1.5 rounded-md border-2 border-dashed px-3.5 text-[11px] font-semibold text-muted-foreground transition-colors select-none data-[active]:border-destructive data-[active]:bg-destructive/10 data-[active]:text-destructive"
        >
          <Trash2Icon className="size-3" />
          Arraste aqui para remover
        </div>
      </div>

      {loadError ? (
        <Alert variant="destructive">
          <TriangleAlertIcon />
          <AlertTitle>Não foi possível carregar o catálogo.</AlertTitle>
          <AlertDescription>{errorMessage(loadError)}</AlertDescription>
        </Alert>
      ) : null}

      {/* Grid */}
      <Card className="gap-0 overflow-hidden py-0">
        <CardHeader className="flex min-h-12 flex-wrap items-center justify-between gap-3 border-b bg-muted px-4 py-2 [.border-b]:pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <TableIcon className="size-4 text-muted-foreground" />
            Produtos
          </CardTitle>
          {selectedIds.length > 0 ? (
            <div id="bulk-actions-bar" role="toolbar" aria-label="Ações em lote" className="flex flex-wrap items-center gap-2">
              <span id="bulk-actions-count" className="text-xs font-bold">
                {selectedLabel(selectedIds.length)}
              </span>
              <Button size="xs" variant="outline" onClick={() => setBulkGroup((b) => ({ open: true, key: b.key + 1 }))}>
                <FolderInputIcon data-icon="inline-start" />
                Mudar Grupo
              </Button>
              <Button size="xs" variant="destructive" onClick={() => void bulkDelete()} disabled={removeProducts.isPending}>
                <Trash2Icon data-icon="inline-start" />
                Excluir
              </Button>
              <Button size="xs" variant="ghost" onClick={clearSelection}>
                Cancelar
              </Button>
            </div>
          ) : null}
        </CardHeader>
        <CardContent className="p-0">
          {/* Painel de agrupamento (decorativo, como no antigo) */}
          <div className="flex items-center gap-2 border-b bg-muted/40 px-3 py-1.5">
            {["Grupo", "Subgrupo"].map((label) => (
              <Badge key={label} variant="outline" className="rounded-sm bg-card font-medium">
                {label}
                <ArrowUpIcon />
                <FilterIcon />
              </Badge>
            ))}
          </div>

          <Table className="text-xs">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-10 border-r text-center">
                  <Checkbox
                    id="select-all-products"
                    aria-label="Selecionar todos"
                    checked={headerChecked}
                    onCheckedChange={(v) => toggleAllRows(v === true)}
                    className="data-[state=indeterminate]:border-primary data-[state=indeterminate]:bg-primary/40"
                  />
                </TableHead>
                {grid.visibleColumns.map((col) => (
                  <HeaderCell key={col.id} col={col} drag={drag} onHide={grid.hideColumn} />
                ))}
                <TableHead className="w-16 text-center text-xs font-semibold">Ações</TableHead>
              </TableRow>
              <TableRow className="hover:bg-transparent">
                <TableCell className="border-r" />
                {grid.visibleColumns.map((col) => (
                  <TableCell key={col.id} className="border-r px-1.5 py-1">
                    <FilterCell col={col} filters={filters} groups={sortedGroups} onChange={setFilter} />
                  </TableCell>
                ))}
                <TableCell />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }, (_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={colSpan}>
                      <Skeleton className="h-6 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : rows.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={colSpan} className="whitespace-normal">
                    {products.length > 0 ? (
                      <EmptyState
                        icon={SearchIcon}
                        title="Nenhum produto encontrado"
                        description="Nenhum produto corresponde aos filtros aplicados."
                        action={
                          <Button variant="outline" size="sm" onClick={clearFilters}>
                            Limpar filtros
                          </Button>
                        }
                      />
                    ) : (
                      <EmptyState
                        icon={PackageIcon}
                        title="Nenhum produto cadastrado ainda"
                        description='Clique em "Adicionar Item" para cadastrar o primeiro produto.'
                      />
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((product) => (
                  <ProductRow
                    key={product.id}
                    product={product}
                    columns={grid.visibleColumns}
                    lookup={lookup}
                    selected={selected.has(product.id)}
                    onSelect={(checked) => toggleRow(product.id, checked)}
                    onEdit={() => openProduct(product)}
                    onRemove={() => void removeProduct(product)}
                  />
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {editor.key > 0 ? (
        <ProductDialog
          key={editor.key}
          open={editor.open}
          onOpenChange={(open) => setEditor((e) => ({ ...e, open }))}
          product={editor.product}
          groups={groups}
          subgroups={subgroups}
          printers={printers}
        />
      ) : null}

      {bulkGroup.key > 0 ? (
        <BulkGroupDialog
          key={bulkGroup.key}
          open={bulkGroup.open}
          onOpenChange={(open) => setBulkGroup((b) => ({ ...b, open }))}
          count={selectedIds.length}
          groups={groups}
          subgroups={subgroups}
          applying={saveProducts.isPending}
          onApply={(id) => void applyBulkGroup(id)}
        />
      ) : null}
    </div>
  )
}

// ─── Cabeçalho arrastável ──────────────────────────────────────────

type HeaderDrag = {
  dragCol: ColumnId | null
  overCol: ColumnId | null
  onDragStart: (e: DragEvent, id: ColumnId) => void
  onDragOver: (e: DragEvent, id: ColumnId) => void
  onDragLeave: (e: DragEvent, id: ColumnId) => void
  onDrop: (e: DragEvent, id: ColumnId) => void
  onDragEnd: () => void
}

function HeaderCell({ col, drag, onHide }: { col: Column; drag: HeaderDrag; onHide: (id: ColumnId) => void }) {
  return (
    <TableHead
      draggable
      data-col-id={col.id}
      onDragStart={(e) => drag.onDragStart(e, col.id)}
      onDragOver={(e) => drag.onDragOver(e, col.id)}
      onDragLeave={(e) => drag.onDragLeave(e, col.id)}
      onDrop={(e) => drag.onDrop(e, col.id)}
      onDragEnd={drag.onDragEnd}
      className={cn(
        "group/th relative cursor-grab border-r text-xs font-semibold select-none active:cursor-grabbing",
        drag.dragCol === col.id && "bg-accent opacity-40",
        drag.overCol === col.id && "border-x-2 border-x-primary bg-primary/10"
      )}
    >
      <div className="flex items-center justify-between gap-2 pr-3">
        <span>{col.label}</span>
        <FilterIcon className="size-3 text-muted-foreground" />
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        title="Ocultar Coluna"
        aria-label={`Ocultar Coluna ${col.label}`}
        draggable={false}
        className="absolute top-0.5 right-0.5 size-4 rounded-sm text-muted-foreground opacity-0 group-hover/th:opacity-100 hover:text-destructive focus-visible:opacity-100"
        onClick={(e) => {
          e.stopPropagation()
          onHide(col.id)
        }}
      >
        <XIcon />
      </Button>
    </TableHead>
  )
}

// ─── Linha de filtros ──────────────────────────────────────────────

function FilterCell({
  col,
  filters,
  groups,
  onChange,
}: {
  col: Column
  filters: GridFilters
  groups: Group[]
  onChange: (id: ColumnId, value: string) => void
}) {
  if (col.id === "group" || col.id === "unit") {
    const options = col.id === "group" ? groups.map((g) => ({ value: g.id, label: g.name })) : UNIT_OPTIONS.map((u) => ({ value: u, label: u }))
    return (
      <Select value={filters[col.id] || "ALL"} onValueChange={(v) => onChange(col.id, v)}>
        <SelectTrigger size="sm" className="h-7 w-full min-w-20 px-2 text-xs" aria-label={`Filtrar ${col.label}`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectItem value="ALL">(Todos)</SelectItem>
            {options.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    )
  }
  return (
    <InputGroup className="h-7 min-w-24">
      <InputGroupAddon className="pl-2">
        <SearchIcon />
      </InputGroupAddon>
      <InputGroupInput
        className="h-7 text-xs"
        placeholder="Filtrar..."
        aria-label={`Filtrar ${col.label}`}
        value={filters[col.id]}
        onChange={(e) => onChange(col.id, e.target.value)}
      />
    </InputGroup>
  )
}

// ─── Linha de produto ──────────────────────────────────────────────

function ProductRow({
  product,
  columns,
  lookup,
  selected,
  onSelect,
  onEdit,
  onRemove,
}: {
  product: Product
  columns: Column[]
  lookup: CatalogLookup
  selected: boolean
  onSelect: (checked: boolean) => void
  onEdit: () => void
  onRemove: () => void
}) {
  const { group, subgroup, printer } = productPlacement(product, lookup)
  const stockLow = product.stock !== null && product.stock <= 10

  const cell = (id: ColumnId) => {
    switch (id) {
      case "group":
        return <TableCell className="font-bold whitespace-normal text-foreground/80">{group ? group.name.toUpperCase() : "-"}</TableCell>
      case "subgroup":
        return (
          <TableCell className="min-w-32 font-semibold whitespace-normal text-muted-foreground">
            {subgroup ? subgroup.name.toUpperCase() : "-"}
          </TableCell>
        )
      case "name":
        return <TableCell className="min-w-36 font-bold whitespace-normal">{product.name}</TableCell>
      case "code":
        return <TableCell className="font-mono font-bold text-muted-foreground">{product.code || "-"}</TableCell>
      case "price":
        return <TableCell className="font-extrabold tabular-nums">{formatBRL(product.price)}</TableCell>
      case "unit":
        return <TableCell className="font-bold text-foreground/80">{product.unit || "UNID"}</TableCell>
      case "stock":
        return (
          <TableCell className={cn("font-bold tabular-nums", stockLow ? "text-destructive" : "text-foreground/80")}>
            {product.stock === null ? "Sem contr." : formatQty(product.stock)}
          </TableCell>
        )
      case "printer":
        return (
          <TableCell className="whitespace-normal">
            <Badge variant="outline" className="rounded-sm bg-muted/60 text-[10px] font-bold whitespace-normal">
              {printer?.name ?? "N/A"}
            </Badge>
          </TableCell>
        )
    }
  }

  return (
    <TableRow
      data-state={selected ? "selected" : undefined}
      tabIndex={0}
      className="cursor-pointer even:bg-muted/30 focus-visible:bg-muted/60 focus-visible:outline-none"
      onClick={onEdit}
      onKeyDown={(e) => {
        if (e.key === "Enter" && e.target === e.currentTarget) onEdit()
      }}
    >
      <TableCell className="border-r text-center" onClick={(e) => e.stopPropagation()}>
        <Checkbox aria-label={`Selecionar ${product.name}`} checked={selected} onCheckedChange={(v) => onSelect(v === true)} />
      </TableCell>
      {columns.map((col) => (
        <Fragment key={col.id}>{cell(col.id)}</Fragment>
      ))}
      <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={`Remover ${product.name}`}
          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={onRemove}
        >
          <Trash2Icon />
        </Button>
      </TableCell>
    </TableRow>
  )
}
