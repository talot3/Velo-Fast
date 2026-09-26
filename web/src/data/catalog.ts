/**
 * Catálogo e configuração da loja: produtos, grupos, subgrupos, formas de
 * pagamento, impressoras e terminais. Cada gravação altera só o item
 * editado (nunca o "estado inteiro" como no sistema antigo).
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import type { Database, Json } from "@/data/database.types"
import type { Group, PaymentMethod, PricingData, Printer, Product, Subgroup, Terminal } from "@/data/types"
import { useStoreId } from "@/lib/auth"
import { supabase } from "@/lib/supabase"

type Tables = Database["public"]["Tables"]
type Row<T extends keyof Tables> = Tables[T]["Row"]
type Insert<T extends keyof Tables> = Tables[T]["Insert"]

export const newId = () => crypto.randomUUID()

// ─── Conversões linha ⇄ domínio ─────────────────────────────────────
export function toProduct(r: Row<"products">): Product {
  return {
    id: r.id,
    code: r.code ?? "",
    name: r.name,
    order: r.sort_order,
    cost: r.cost === null ? null : Number(r.cost),
    price: Number(r.price),
    stock: r.stock === null ? null : Number(r.stock),
    subgroupId: r.subgroup_id,
    printerId: r.printer_id,
    useNameOnPrint: r.use_name_on_print,
    description: r.description ?? "",
    icon: r.icon ?? "package",
    unit: r.unit ?? "UNID",
    active: r.active,
    pricing: (r.pricing as PricingData | null) ?? null,
    createdAt: r.created_at,
  }
}

function fromProduct(storeId: string, p: Product): Insert<"products"> {
  return {
    store_id: storeId,
    id: p.id,
    code: p.code || null,
    name: p.name,
    sort_order: p.order || 0,
    cost: p.cost,
    price: p.price,
    stock: p.stock,
    subgroup_id: p.subgroupId,
    printer_id: p.printerId,
    use_name_on_print: p.useNameOnPrint,
    description: p.description || null,
    icon: p.icon || "package",
    unit: p.unit || "UNID",
    active: p.active,
    pricing: (p.pricing as unknown as Json) ?? null,
  }
}

export function toGroup(r: Row<"product_groups">): Group {
  return { id: r.id, name: r.name, order: r.sort_order, createdAt: r.created_at }
}

function fromGroup(storeId: string, g: Group): Insert<"product_groups"> {
  return { store_id: storeId, id: g.id, name: g.name, sort_order: g.order || 0 }
}

export function toSubgroup(r: Row<"product_subgroups">): Subgroup {
  return {
    id: r.id,
    groupId: r.group_id,
    name: r.name,
    buttonColor: r.button_color,
    textColor: r.text_color,
    order: r.sort_order,
    createdAt: r.created_at,
  }
}

function fromSubgroup(storeId: string, s: Subgroup): Insert<"product_subgroups"> {
  return {
    store_id: storeId,
    id: s.id,
    group_id: s.groupId,
    name: s.name,
    button_color: s.buttonColor,
    text_color: s.textColor,
    sort_order: s.order || 0,
  }
}

export function toPaymentMethod(r: Row<"payment_methods">): PaymentMethod {
  return {
    id: r.id,
    code: r.code ?? "",
    order: r.sort_order,
    name: r.name,
    buttonColor: r.button_color,
    textColor: r.text_color,
    active: r.active,
    createdAt: r.created_at,
  }
}

function fromPaymentMethod(storeId: string, m: PaymentMethod): Insert<"payment_methods"> {
  return {
    store_id: storeId,
    id: m.id,
    code: m.code || null,
    sort_order: m.order || 0,
    name: m.name,
    button_color: m.buttonColor,
    text_color: m.textColor,
    active: m.active,
  }
}

export function toPrinter(r: Row<"printers">): Printer {
  return {
    id: r.id,
    name: r.name,
    model: r.model,
    useWindowsPrinter: r.use_windows_printer,
    systemName: r.system_name,
    ip: r.ip,
    port: r.port,
    paperWidth: r.paper_width,
    activeCut: r.active_cut,
    linesBefore: r.lines_before,
    linesAfter: r.lines_after,
    alignSpacing: r.align_spacing,
    blackBackground: r.black_background,
    printServer: r.print_server,
    order: r.sort_order,
    createdAt: r.created_at,
  }
}

function fromPrinter(storeId: string, p: Printer): Insert<"printers"> {
  return {
    store_id: storeId,
    id: p.id,
    name: p.name,
    model: p.model,
    use_windows_printer: p.useWindowsPrinter,
    system_name: p.useWindowsPrinter ? p.systemName || null : null,
    ip: p.useWindowsPrinter ? null : p.ip || null,
    port: p.port || 9100,
    paper_width: p.paperWidth || 48,
    active_cut: p.activeCut,
    lines_before: p.linesBefore,
    lines_after: p.linesAfter,
    align_spacing: p.alignSpacing,
    black_background: p.useWindowsPrinter ? false : p.blackBackground,
    print_server: p.useWindowsPrinter ? false : p.printServer,
    sort_order: p.order || 0,
  }
}

export function toTerminal(r: Row<"terminals">): Terminal {
  return {
    id: r.id,
    cashNumber: r.cash_number,
    name: r.name,
    layout: r.layout as Terminal["layout"],
    font: r.font,
    fontSize: r.font_size as Terminal["fontSize"],
    printerId: r.printer_id,
    active: r.active,
    order: r.sort_order,
    createdAt: r.created_at,
  }
}

function fromTerminal(storeId: string, t: Terminal): Insert<"terminals"> {
  return {
    store_id: storeId,
    id: t.id,
    cash_number: t.cashNumber,
    name: t.name,
    layout: t.layout,
    font: t.font,
    font_size: t.fontSize,
    printer_id: t.printerId,
    active: t.active,
    sort_order: t.order || 0,
  }
}

// ─── Fábrica de hooks por tabela ────────────────────────────────────
type CatalogTable = "products" | "product_groups" | "product_subgroups" | "payment_methods" | "printers" | "terminals"

// A tipagem do supabase-js não acompanha um nome de tabela genérico; aqui
// os tipos de domínio (toDomain/fromDomain) garantem o formato.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type UntypedQuery = any
function tableQuery(table: CatalogTable): UntypedQuery {
  return (supabase() as unknown as { from: (t: string) => UntypedQuery }).from(table)
}

function entity<T extends { id: string }, K extends CatalogTable>(
  table: K,
  toDomain: (r: Row<K>) => T,
  fromDomain: (storeId: string, v: T) => Insert<K>
) {
  const key = (storeId: string) => [table, storeId] as const

  async function fetchAll(storeId: string): Promise<T[]> {
    const { data, error } = await tableQuery(table)
      .select("*")
      .eq("store_id", storeId)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
    if (error) throw error
    return (data as Row<K>[]).map(toDomain)
  }

  function useList() {
    const storeId = useStoreId()
    return useQuery({ queryKey: key(storeId), queryFn: () => fetchAll(storeId) })
  }

  /** Cria ou atualiza um ou vários itens (upsert por loja + id). */
  function useSave() {
    const storeId = useStoreId()
    const qc = useQueryClient()
    return useMutation({
      mutationFn: async (items: T | T[]) => {
        const list = Array.isArray(items) ? items : [items]
        if (list.length === 0) return [] as T[]
        const rows = list.map((v) => fromDomain(storeId, v))
        const { data, error } = await tableQuery(table)
          .upsert(rows, { onConflict: "store_id,id", defaultToNull: false })
          .select("*")
        if (error) throw error
        return (data as Row<K>[]).map(toDomain)
      },
      onSuccess: () => qc.invalidateQueries({ queryKey: key(storeId) }),
    })
  }

  function useRemove() {
    const storeId = useStoreId()
    const qc = useQueryClient()
    return useMutation({
      mutationFn: async (ids: string | string[]) => {
        const list = Array.isArray(ids) ? ids : [ids]
        const { error } = await tableQuery(table).delete().eq("store_id", storeId).in("id", list)
        if (error) throw error
      },
      onSuccess: () => qc.invalidateQueries({ queryKey: key(storeId) }),
    })
  }

  return { key, fetchAll, useList, useSave, useRemove }
}

export const products = entity("products", toProduct, fromProduct)
export const groups = entity("product_groups", toGroup, fromGroup)
export const subgroups = entity("product_subgroups", toSubgroup, fromSubgroup)
export const paymentMethods = entity("payment_methods", toPaymentMethod, fromPaymentMethod)
export const printers = entity("printers", toPrinter, fromPrinter)
export const terminals = entity("terminals", toTerminal, fromTerminal)

export const useProducts = products.useList
export const useSaveProducts = products.useSave
export const useRemoveProducts = products.useRemove
export const useGroups = groups.useList
export const useSaveGroups = groups.useSave
export const useRemoveGroups = groups.useRemove
export const useSubgroups = subgroups.useList
export const useSaveSubgroups = subgroups.useSave
export const useRemoveSubgroups = subgroups.useRemove
export const usePaymentMethods = paymentMethods.useList
export const useSavePaymentMethods = paymentMethods.useSave
export const useRemovePaymentMethods = paymentMethods.useRemove
export const usePrinters = printers.useList
export const useSavePrinters = printers.useSave
export const useRemovePrinters = printers.useRemove
export const useTerminals = terminals.useList
export const useSaveTerminals = terminals.useSave
export const useRemoveTerminals = terminals.useRemove

/** Envia um teste para a impressora (fila da ponte local). */
export function usePrintTest() {
  const storeId = useStoreId()
  return useMutation({
    mutationFn: async (printerId: string) => {
      const { data, error } = await supabase().rpc("print_test", { p_store_id: storeId, p_printer_id: printerId })
      if (error) throw error
      return data as { queued: boolean; printer_name: string }
    },
  })
}

/** Gera a chave de uma nova ponte de impressão (mostrada uma única vez). */
export function useCreatePrinterBridge() {
  const storeId = useStoreId()
  return useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await supabase().rpc("create_printer_bridge", { p_store_id: storeId, p_name: name })
      if (error) throw error
      return data as { id: string; api_key: string; store_id: string }
    },
  })
}
