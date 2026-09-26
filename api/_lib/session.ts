import type { VercelRequest } from "@vercel/node"

import { bearerToken, HttpError } from "./http.js"
import { adminClient } from "./supabase.js"

export type Role = "operador" | "supervisor" | "admin" | "master"

export const ROLE_LEVEL: Record<Role, number> = { operador: 1, supervisor: 2, admin: 3, master: 4 }

export type Caller = {
  userId: string
  username: string
  role: Role
  storeId: string | null
}

/** Valida o token Supabase do chamador e carrega o perfil ativo. */
export async function requireCaller(req: VercelRequest): Promise<Caller> {
  const admin = adminClient()
  const { data, error } = await admin.auth.getUser(bearerToken(req))
  if (error || !data.user) throw new HttpError(401, "Sessão expirada. Faça login novamente.")

  const { data: profile } = await admin
    .from("profiles")
    .select("user_id, username, role, store_id, active")
    .eq("user_id", data.user.id)
    .maybeSingle()
  if (!profile || !profile.active) throw new HttpError(403, "Usuário desativado.")

  return { userId: profile.user_id, username: profile.username, role: profile.role, storeId: profile.store_id }
}

/** Master pode tudo; admin só na própria loja. */
export function assertCanManageStore(caller: Caller, storeId: string, minRole: Role = "admin") {
  if (caller.role === "master") return
  if (caller.storeId === storeId && ROLE_LEVEL[caller.role] >= ROLE_LEVEL[minRole]) return
  throw new HttpError(403, "Permissão insuficiente para esta ação.")
}
