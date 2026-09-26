/**
 * Utilitários do pacote Catálogo (produtos, grupos, subgrupos, inventário).
 */
import type { Group, Printer, Product, Subgroup } from "@/data/types"
import { parseMoneyBR } from "@/lib/format"

/** Cores padrão do botão do subgrupo no PDV (sistema antigo). */
export const DEFAULT_SUBGROUP_BG = "#f97316"
export const DEFAULT_SUBGROUP_TEXT = "#ffffff"

export type CatalogLookup = {
  groupById: Map<string, Group>
  subgroupById: Map<string, Subgroup>
  printerById: Map<string, Printer>
}

export function buildLookup(groups: Group[], subgroups: Subgroup[], printers: Printer[]): CatalogLookup {
  return {
    groupById: new Map(groups.map((g) => [g.id, g])),
    subgroupById: new Map(subgroups.map((s) => [s.id, s])),
    printerById: new Map(printers.map((p) => [p.id, p])),
  }
}

/** Subgrupo e grupo de um produto (grupo vem do subgrupo, como no antigo). */
export function productPlacement(product: Product, lookup: CatalogLookup) {
  const subgroup = product.subgroupId ? lookup.subgroupById.get(product.subgroupId) ?? null : null
  const group = subgroup?.groupId ? lookup.groupById.get(subgroup.groupId) ?? null : null
  const printer = product.printerId ? lookup.printerById.get(product.printerId) ?? null : null
  return { subgroup, group, printer }
}

/** Grupos na ordem de exibição (campo "Ordem"). */
export function sortGroups(groups: Group[]): Group[] {
  return groups.slice().sort((a, b) => (a.order || 0) - (b.order || 0))
}

/** Valor de dinheiro para um campo editável: 9 → "9,00"; 0 ou vazio → "". */
export function moneyInput(value: number | null | undefined): string {
  if (!value) return ""
  return value.toFixed(2).replace(".", ",")
}

/** Número para um campo editável no padrão brasileiro: 2.5 → "2,5". */
export function numberInput(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return ""
  return String(value).replace(".", ",")
}

/** Número exibido em pt-BR (estoque): 1500 → "1.500"; 2.5 → "2,5". */
export function formatQty(value: number): string {
  return value.toLocaleString("pt-BR", { maximumFractionDigits: 3 })
}

/** Dinheiro digitado ("150,50", "1.234,56", "12.5"); vazio ou inválido → 0. */
export function moneyOrZero(input: string | number | null | undefined): number {
  const n = parseMoneyBR(input)
  return Number.isFinite(n) ? n : 0
}

/** parseInt(...) || 0 do sistema antigo (Ordem, Estoque). */
export function intOrZero(input: string | number | null | undefined): number {
  const n = parseInt(String(input ?? ""), 10)
  return Number.isFinite(n) ? n : 0
}

/** Pluralização do contador da barra de seleção ("1 selecionado", "2 selecionados"). */
export function selectedLabel(n: number): string {
  return `${n} selecionado${n === 1 ? "" : "s"}`
}
