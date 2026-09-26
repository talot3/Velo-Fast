import { createClient, type SupabaseClient } from "@supabase/supabase-js"

import { env } from "./env.js"

let admin: SupabaseClient | null = null

/** Cliente com a service role: só existe no servidor (funções /api). */
export function adminClient(): SupabaseClient {
  admin ??= createClient(env.supabaseUrl, env.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  return admin
}

/** Cliente público, usado para trocar o link mágico por uma sessão. */
export function publicClient(): SupabaseClient {
  return createClient(env.supabaseUrl, env.publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
}
