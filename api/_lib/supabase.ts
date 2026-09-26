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

/**
 * Troca o link mágico por uma sessão do usuário. O Supabase limita essas
 * verificações por IP; como todo login passa pelo servidor, repassamos o IP
 * de quem está entrando (Sb-Forwarded-For, aceito só com a chave secreta)
 * para cada loja ter a sua cota, em vez de todas dividirem a do servidor.
 */
export function sessionClient(clientIp: string | null): SupabaseClient {
  return createClient(env.supabaseUrl, env.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    ...(clientIp ? { global: { headers: { "sb-forwarded-for": clientIp } } } : {}),
  })
}
