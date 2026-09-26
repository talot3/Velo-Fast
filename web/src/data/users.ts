import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import type { AppUser } from "@/data/types"
import { apiPost } from "@/lib/api"
import { useStoreId } from "@/lib/auth"
import { supabase } from "@/lib/supabase"

const key = (storeId: string) => ["profiles", storeId] as const

/** Usuários da loja (admin vê todos; supervisor vê só o próprio). */
export function useStoreUsers() {
  const storeId = useStoreId()
  return useQuery({
    queryKey: key(storeId),
    queryFn: async (): Promise<AppUser[]> => {
      const { data, error } = await supabase()
        .from("profiles")
        .select("user_id, store_id, username, display_name, role, active, extra")
        .eq("store_id", storeId)
        .order("created_at", { ascending: true })
      if (error) throw error
      return data.map((r) => ({
        userId: r.user_id,
        storeId: r.store_id,
        username: r.username,
        displayName: r.display_name,
        role: r.role as AppUser["role"],
        active: r.active,
        extra: (r.extra ?? {}) as AppUser["extra"],
      }))
    },
  })
}

type CreateInput = {
  username: string
  password: string
  role: "operador" | "supervisor" | "admin"
  displayName?: string | null
  extra?: Record<string, unknown>
}

type UpdateInput = {
  userId: string
  username?: string
  role?: "operador" | "supervisor" | "admin"
  displayName?: string | null
  active?: boolean
  extra?: Record<string, unknown>
}

export function useCreateUser() {
  const storeId = useStoreId()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateInput) => apiPost("users", { action: "create", storeId, ...input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: key(storeId) }),
  })
}

export function useUpdateUser() {
  const storeId = useStoreId()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: UpdateInput) => apiPost("users", { action: "update", ...input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: key(storeId) }),
  })
}

export function useSetUserPassword() {
  return useMutation({
    mutationFn: (input: { userId: string; password: string }) => apiPost("users", { action: "set-password", ...input }),
  })
}
