/**
 * Estado da Grid do Catálogo (antigo window.catalogueGridState):
 * - colunas ocultas e ordem das colunas: preferência de interface, lembrada
 *   neste navegador (localStorage);
 * - filtros por coluna: mantidos durante a sessão (voltar à página mantém os
 *   filtros, como antes), zerados ao recarregar.
 */
import { useCallback, useEffect, useState } from "react"

import type { Product } from "@/data/types"
import { formatBRL, formatDecimal } from "@/lib/format"

import { productPlacement, type CatalogLookup } from "./lib"

export type ColumnId = "group" | "subgroup" | "name" | "code" | "price" | "unit" | "stock" | "printer"

/** Todas as colunas, na ordem das pílulas "Colunas:". */
export const ALL_COLUMNS: { id: ColumnId; label: string }[] = [
  { id: "group", label: "Grupo" },
  { id: "subgroup", label: "Subgrupo" },
  { id: "name", label: "Nome / Produto" },
  { id: "code", label: "Código" },
  { id: "price", label: "Preço" },
  { id: "unit", label: "Unidade" },
  { id: "stock", label: "Estoque" },
  { id: "printer", label: "Rota" },
]

export const DEFAULT_COLUMN_ORDER: ColumnId[] = ALL_COLUMNS.map((c) => c.id)

const COLUMN_IDS = new Set<string>(DEFAULT_COLUMN_ORDER)

export const UNIT_OPTIONS = ["UNID", "KG", "LITRO"] as const

export type GridPrefs = { hiddenColumns: ColumnId[]; columnOrder: ColumnId[] }

const PREFS_KEY = "velofast_catalogue_grid"

function sanitizePrefs(raw: unknown): GridPrefs {
  const value = (raw ?? {}) as Partial<Record<keyof GridPrefs, unknown>>
  const ids = (list: unknown) =>
    Array.isArray(list) ? list.filter((id): id is ColumnId => typeof id === "string" && COLUMN_IDS.has(id)) : []
  const hiddenColumns = [...new Set(ids(value.hiddenColumns))]
  const order = [...new Set(ids(value.columnOrder))]
  // Coluna nova (ou ausente no que foi salvo) entra no fim.
  for (const id of DEFAULT_COLUMN_ORDER) if (!order.includes(id)) order.push(id)
  return { hiddenColumns, columnOrder: order }
}

function loadPrefs(): GridPrefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY)
    return sanitizePrefs(raw ? JSON.parse(raw) : null)
  } catch {
    return sanitizePrefs(null)
  }
}

function isDefaultOrder(order: ColumnId[]) {
  return order.every((id, i) => id === DEFAULT_COLUMN_ORDER[i])
}

/** Colunas visíveis/ordem da grid, lembradas no navegador. */
export function useGridPrefs() {
  const [prefs, setPrefs] = useState<GridPrefs>(loadPrefs)

  useEffect(() => {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(prefs))
    } catch {
      // Sem armazenamento (modo privado etc.): a preferência vale só nesta visita.
    }
  }, [prefs])

  /** Mostra/oculta (olho nas pílulas e ✕ no cabeçalho). */
  const toggleColumn = useCallback((id: ColumnId) => {
    setPrefs((p) => ({
      ...p,
      hiddenColumns: p.hiddenColumns.includes(id) ? p.hiddenColumns.filter((c) => c !== id) : [...p.hiddenColumns, id],
    }))
  }, [])

  /** Solta o cabeçalho na zona "Arraste aqui para remover". */
  const hideColumn = useCallback((id: ColumnId) => {
    setPrefs((p) => (p.hiddenColumns.includes(id) ? p : { ...p, hiddenColumns: [...p.hiddenColumns, id] }))
  }, [])

  /** Arrastar um cabeçalho sobre outro (mesma regra do antigo: tira e insere na posição do alvo). */
  const moveColumn = useCallback((from: ColumnId, to: ColumnId) => {
    if (from === to) return
    setPrefs((p) => {
      const order = [...p.columnOrder]
      const fromIdx = order.indexOf(from)
      const toIdx = order.indexOf(to)
      if (fromIdx === -1 || toIdx === -1) return p
      order.splice(fromIdx, 1)
      order.splice(toIdx, 0, from)
      return { ...p, columnOrder: order }
    })
  }, [])

  /** "Restaurar": mostra todas e volta à ordem original. */
  const restoreColumns = useCallback(() => {
    setPrefs({ hiddenColumns: [], columnOrder: [...DEFAULT_COLUMN_ORDER] })
  }, [])

  const visibleColumns = prefs.columnOrder
    .filter((id) => !prefs.hiddenColumns.includes(id))
    .map((id) => ALL_COLUMNS.find((c) => c.id === id)!)

  return {
    prefs,
    visibleColumns,
    isVisible: (id: ColumnId) => !prefs.hiddenColumns.includes(id),
    /** Há algo a restaurar (colunas ocultas ou ordem alterada). */
    canRestore: prefs.hiddenColumns.length > 0 || !isDefaultOrder(prefs.columnOrder),
    toggleColumn,
    hideColumn,
    moveColumn,
    restoreColumns,
  }
}

// ─── Filtros por coluna ─────────────────────────────────────────────

export type GridFilters = Record<ColumnId, string>

/** "ALL" = (Todos) nos seletores de Grupo e Unidade. */
export const DEFAULT_FILTERS: GridFilters = {
  group: "ALL",
  subgroup: "",
  name: "",
  code: "",
  price: "",
  unit: "ALL",
  stock: "",
  printer: "",
}

let sessionFilters: GridFilters = { ...DEFAULT_FILTERS }

/** Filtros da grid, mantidos enquanto o portal estiver aberto. */
export function useGridFilters() {
  const [filters, setFilters] = useState<GridFilters>(() => sessionFilters)
  useEffect(() => {
    sessionFilters = filters
  }, [filters])
  const setFilter = useCallback((id: ColumnId, value: string) => setFilters((f) => ({ ...f, [id]: value })), [])
  const clearFilters = useCallback(() => setFilters({ ...DEFAULT_FILTERS }), [])
  return { filters, setFilter, clearFilters }
}

const up = (s: string) => s.toUpperCase()

/** Mesmas regras de filtro do sistema antigo (texto contém, sem diferenciar maiúsculas). */
export function matchesFilters(product: Product, lookup: CatalogLookup, f: GridFilters): boolean {
  const { subgroup, group, printer } = productPlacement(product, lookup)
  const has = (value: string, needle: string) => up(value).includes(up(needle.trim()))

  if (f.group && f.group !== "ALL" && group?.id !== f.group) return false
  if (f.subgroup && !(subgroup && has(subgroup.name, f.subgroup))) return false
  if (f.name && !has(product.name, f.name)) return false
  if (f.code && !has(product.code || "", f.code)) return false
  if (f.price) {
    const needle = f.price.trim().replace(/\s+/g, " ")
    const variants = [String(product.price), product.price.toFixed(2), formatDecimal(product.price), formatBRL(product.price)]
    if (!variants.some((v) => v.replace(/\s+/g, " ").includes(needle))) return false
  }
  if (f.printer && !has(printer?.name ?? "", f.printer)) return false
  if (f.stock && !has(product.stock === null ? "Sem contr." : String(product.stock), f.stock)) return false
  if (f.unit && f.unit !== "ALL" && up(product.unit || "UNID") !== up(f.unit)) return false
  return true
}
