/**
 * Relatórios calculados no banco (RPCs report_*). As datas são dias
 * "YYYY-MM-DD" no fuso de São Paulo (use lib/format: todayBR, presetRange).
 */
import { useQuery } from "@tanstack/react-query"

import type { CashMovement, CashSession } from "@/data/types"
import { useStoreId } from "@/lib/auth"
import { supabase } from "@/lib/supabase"
import { addDays } from "@/lib/format"

export type DateRange = { from: string; to: string }

export type SalesByProduct = {
  total: number
  units: number
  records: number
  distinct_products: number
  rows: { product_id: string | null; product_name: string; qty: number; total: number; methods: Record<string, number> }[]
}

export type SalesByTerminal = {
  total: number
  tickets: number
  terminals: number
  rows: { terminal_id: string; terminal_name: string | null; units: number; total: number; methods: Record<string, number> }[]
}

export type CashClosingReport = {
  rows: {
    terminal_id: string
    total_vendas: number
    dinheiro: number
    cartoes: number
    suprimento: number
    sangrias: number
    saldo_gaveta: number
  }[]
  total_gaveta: number
  total_cartoes: number
  faturamento: number
}

export type Dashboard = {
  faturamento_bruto: number
  valor_cancelado: number
  faturamento_liquido: number
  tickets_validos: number
  tickets_cancelados: number
  ticket_medio: number
  top_products: { name: string; total: number }[]
  by_payment: { name: string; total: number }[]
  by_terminal: { name: string; total: number }[]
  by_subgroup: { name: string; total: number }[]
}

function rpcQuery<T>(name: string, args: Record<string, unknown>) {
  return async () => {
    const { data, error } = await supabase().rpc(name as never, args as never)
    if (error) throw error
    return data as T
  }
}

export function useSalesByProduct(range: DateRange) {
  const storeId = useStoreId()
  return useQuery({
    queryKey: ["report_sales_by_product", storeId, range.from, range.to],
    queryFn: rpcQuery<SalesByProduct>("report_sales_by_product", { p_store_id: storeId, p_from: range.from, p_to: range.to }),
  })
}

export function useSalesByTerminal(range: DateRange) {
  const storeId = useStoreId()
  return useQuery({
    queryKey: ["report_sales_by_terminal", storeId, range.from, range.to],
    queryFn: rpcQuery<SalesByTerminal>("report_sales_by_terminal", { p_store_id: storeId, p_from: range.from, p_to: range.to }),
  })
}

export function useCashClosingReport(range: DateRange) {
  const storeId = useStoreId()
  return useQuery({
    queryKey: ["report_cash_closing", storeId, range.from, range.to],
    queryFn: rpcQuery<CashClosingReport>("report_cash_closing", { p_store_id: storeId, p_from: range.from, p_to: range.to }),
  })
}

/** Dashboard de todo o período (sem range) ou de um intervalo. */
export function useDashboard(range?: DateRange) {
  const storeId = useStoreId()
  return useQuery({
    queryKey: ["report_dashboard", storeId, range?.from ?? null, range?.to ?? null],
    queryFn: rpcQuery<Dashboard>("report_dashboard", {
      p_store_id: storeId,
      p_from: range?.from ?? null,
      p_to: range?.to ?? null,
    }),
  })
}

/** Início do dia (SP) como ISO, para filtrar colunas timestamptz. */
function startOfDayIso(day: string) {
  return new Date(`${day}T00:00:00-03:00`).toISOString()
}

/** Sangrias/suprimentos do período (vindas do banco, de todos os caixas). */
export function useCashMovements(range: DateRange, kind: "sangria" | "suprimento" = "sangria") {
  const storeId = useStoreId()
  return useQuery({
    queryKey: ["cash_movements", storeId, kind, range.from, range.to],
    queryFn: async () => {
      const { data, error } = await supabase()
        .from("cash_movements")
        .select("*")
        .eq("store_id", storeId)
        .eq("kind", kind)
        .gte("occurred_at", startOfDayIso(range.from))
        .lt("occurred_at", startOfDayIso(addDays(range.to, 1)))
        .order("occurred_at", { ascending: false })
      if (error) throw error
      return data as unknown as CashMovement[]
    },
  })
}

/** Caixas (sessões) abertos no período — base dos borderôs de conciliação. */
export function useCashSessions(range?: DateRange) {
  const storeId = useStoreId()
  return useQuery({
    queryKey: ["cash_sessions", storeId, range?.from ?? null, range?.to ?? null],
    queryFn: async () => {
      let q = supabase().from("cash_sessions").select("*").eq("store_id", storeId)
      if (range) {
        q = q.gte("opened_at", startOfDayIso(range.from)).lt("opened_at", startOfDayIso(addDays(range.to, 1)))
      }
      const { data, error } = await q.order("opened_at", { ascending: false })
      if (error) throw error
      return data as unknown as CashSession[]
    },
  })
}

/** Quantidade de fichas vendidas (itens; a v1 contava um registro por unidade) — tela de Backup. */
export function useSalesCount() {
  const storeId = useStoreId()
  return useQuery({
    queryKey: ["sales_count", storeId],
    queryFn: async () => {
      const { count, error } = await supabase()
        .from("sale_items")
        .select("id", { count: "exact", head: true })
        .eq("store_id", storeId)
      if (error) throw error
      return count ?? 0
    },
  })
}

/** Exporta todos os dados da loja (backup .json). */
export async function exportStoreData(storeId: string) {
  const { data, error } = await supabase().rpc("export_store_data", { p_store_id: storeId })
  if (error) throw error
  return data
}
