import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import type { Json } from "@/data/database.types"
import type { StoreSettings, TicketConfig, Version } from "@/data/types"
import { useStoreId } from "@/lib/auth"
import { supabase } from "@/lib/supabase"

export const DEFAULT_TICKET: Required<TicketConfig> = { titleTicket: "TICKET 1-A-1", titleFicha: "ficha" }

const key = (storeId: string) => ["store_settings", storeId] as const

export async function fetchStoreSettings(storeId: string): Promise<StoreSettings> {
  const { data, error } = await supabase().from("store_settings").select("*").eq("store_id", storeId).maybeSingle()
  if (error) throw error
  return {
    ticketConfig: ((data?.ticket_config as TicketConfig | null) ?? {}) as TicketConfig,
    currentVersion: data?.current_version ?? "1.0.0",
    versions: ((data?.versions as Version[] | null) ?? []) as Version[],
  }
}

export function useStoreSettings() {
  const storeId = useStoreId()
  return useQuery({ queryKey: key(storeId), queryFn: () => fetchStoreSettings(storeId) })
}

/** Grava só os campos informados (ticket, versão atual, histórico). */
export function useSaveStoreSettings() {
  const storeId = useStoreId()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (patch: Partial<StoreSettings>) => {
      const row: Record<string, unknown> = { store_id: storeId }
      if (patch.ticketConfig !== undefined) row.ticket_config = patch.ticketConfig as unknown as Json
      if (patch.currentVersion !== undefined) row.current_version = patch.currentVersion
      if (patch.versions !== undefined) row.versions = patch.versions as unknown as Json
      const { error } = await supabase()
        .from("store_settings")
        .upsert(row as never, { onConflict: "store_id", defaultToNull: false })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key(storeId) }),
  })
}

/** Nome da loja em uso (cabeçalho). */
export function useStoreName() {
  const storeId = useStoreId()
  return useQuery({
    queryKey: ["store_name", storeId],
    queryFn: async () => {
      const { data, error } = await supabase().from("stores").select("name").eq("id", storeId).maybeSingle()
      if (error) throw error
      return data?.name ?? null
    },
    staleTime: 5 * 60_000,
  })
}
