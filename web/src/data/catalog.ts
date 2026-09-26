/**
 * Catálogo e configuração da loja: produtos, grupos, subgrupos, formas de
 * pagamento, impressoras e terminais. Cada gravação altera só o item
 * editado (nunca o "estado inteiro" como no sistema antigo).
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import {
  fromGroup,
  fromPaymentMethod,
  fromPrinter,
  fromProduct,
  fromSubgroup,
  fromTerminal,
  toGroup,
  toPaymentMethod,
  toPrinter,
  toProduct,
  toSubgroup,
  toTerminal,
  type Insert,
  type Row,
} from "@/data/catalog-mappers"
import { useStoreId } from "@/lib/auth"
import { supabase } from "@/lib/supabase"

export { newId, toGroup, toPaymentMethod, toPrinter, toProduct, toSubgroup, toTerminal } from "@/data/catalog-mappers"

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
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await supabase().rpc("create_printer_bridge", { p_store_id: storeId, p_name: name })
      if (error) throw error
      return data as { id: string; api_key: string; store_id: string }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["printer_bridges", storeId] }),
  })
}

export type PrinterBridge = {
  id: string
  name: string
  keyPrefix: string
  active: boolean
  lastSeenAt: string | null
  createdAt: string
}

/** Chaves de ponte da loja (só admin enxerga; a chave em si nunca sai do banco). */
export function usePrinterBridges(enabled = true) {
  const storeId = useStoreId()
  return useQuery({
    queryKey: ["printer_bridges", storeId],
    enabled,
    refetchInterval: enabled ? 15_000 : false,
    queryFn: async (): Promise<PrinterBridge[]> => {
      const { data, error } = await supabase()
        .from("printer_bridges")
        .select("id, name, key_prefix, active, last_seen_at, created_at")
        .eq("store_id", storeId)
        .order("created_at", { ascending: false })
      if (error) throw error
      return data.map((b) => ({
        id: b.id,
        name: b.name,
        keyPrefix: b.key_prefix,
        active: b.active,
        lastSeenAt: b.last_seen_at,
        createdAt: b.created_at,
      }))
    },
  })
}

/** Revoga uma chave: a ponte que a usa para de receber a fila na hora. */
export function useRevokePrinterBridge() {
  const storeId = useStoreId()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (bridgeId: string) => {
      const { error } = await supabase().rpc("revoke_printer_bridge", { p_store_id: storeId, p_bridge_id: bridgeId })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["printer_bridges", storeId] }),
  })
}
