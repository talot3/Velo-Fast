import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import type { StoreInfo } from "@/data/types"
import { supabase } from "@/lib/supabase"

const key = ["master_stores"] as const

export function useMasterStores(enabled = true) {
  return useQuery({
    queryKey: key,
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase().rpc("master_list_stores")
      if (error) throw error
      return (data ?? []) as unknown as StoreInfo[]
    },
    refetchInterval: 15_000,
  })
}

export function useCreateStore() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { name: string; cnpj: string; phone?: string; terminalsAllowed?: number; expireDate?: string }) => {
      const { data, error } = await supabase().rpc("master_create_store", {
        p_name: input.name,
        p_cnpj: input.cnpj,
        p_phone: input.phone ?? undefined,
        p_terminals_allowed: input.terminalsAllowed ?? 5,
        p_expire_date: input.expireDate ?? undefined,
      })
      if (error) throw error
      return data as unknown as StoreInfo
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  })
}

export function useUpdateStore() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { storeId: string; active?: boolean; expireDate?: string; terminalsAllowed?: number }) => {
      const { data, error } = await supabase().rpc("master_update_store", {
        p_store_id: input.storeId,
        p_active: input.active ?? undefined,
        p_expire_date: input.expireDate ?? undefined,
        p_terminals_allowed: input.terminalsAllowed ?? undefined,
      })
      if (error) throw error
      return data as unknown as StoreInfo
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  })
}
