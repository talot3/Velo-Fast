import { createClient, type SupabaseClient } from "@supabase/supabase-js"

import type { Database } from "@/data/database.types"
import { env } from "@/lib/env"

export type AppName = "pdv" | "portal" | "gelic"
export type Supabase = SupabaseClient<Database>

let client: Supabase | null = null
let currentApp: AppName | null = null

/**
 * Cliente Supabase do app. Cada app guarda a sessão numa chave própria:
 * entrar no portal não derruba o caixa aberto no mesmo navegador.
 */
export function initSupabase(app: AppName): Supabase {
  if (client && currentApp === app) return client
  currentApp = app
  client = createClient<Database>(env.supabaseUrl, env.supabaseKey, {
    auth: {
      storageKey: `velofast-${app}-auth`,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  })
  return client
}

export function supabase(): Supabase {
  if (!client) throw new Error("Supabase não inicializado (chame initSupabase no main.tsx).")
  return client
}

/** Cliente temporário para uma sessão elevada (supervisor autorizando). */
export function createEphemeralClient(): Supabase {
  return createClient<Database>(env.supabaseUrl, env.supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
}
