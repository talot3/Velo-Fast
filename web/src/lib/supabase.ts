import { GoTrueClient } from "@supabase/auth-js"
import { PostgrestClient } from "@supabase/postgrest-js"

import type { Database } from "@/data/database.types"
import { env } from "@/lib/env"

export type AppName = "pdv" | "portal" | "gelic"

/** Chave onde cada app guarda a própria sessão no navegador. */
export function storageKeyFor(app: AppName): string {
  return `velofast-${app}-auth`
}

/**
 * Cliente Supabase enxuto: só o que o VELO usa — sessão (`auth`) e banco
 * (`from`/`rpc`). O supabase-js completo embute também realtime, storage e
 * functions (~60 KB a mais para baixar e interpretar em cada app, o que pesa
 * nas maquininhas). A montagem é a mesma do createClient do supabase-js:
 * mesmos cabeçalhos e o token da sessão em cada chamada ao banco.
 */
export class Supabase extends PostgrestClient<Database> {
  readonly auth: GoTrueClient

  /**
   * `storageKey` null = sessão só em memória (sem gravar nem renovar).
   * `autoRefreshToken: false` = grava a sessão, mas deixa a renovação para o
   * app dono dela (ex.: o gelic entregando a sessão ao portal).
   */
  constructor(storageKey: string | null, options: { autoRefreshToken?: boolean } = {}) {
    const key = env.supabaseKey
    const base = env.supabaseUrl.replace(/\/+$/, "")
    const auth = new GoTrueClient({
      url: `${base}/auth/v1`,
      headers: { Authorization: `Bearer ${key}`, apikey: key },
      storageKey: storageKey ?? undefined,
      persistSession: storageKey !== null,
      autoRefreshToken: storageKey !== null && options.autoRefreshToken !== false,
      detectSessionInUrl: false,
    })
    super(`${base}/rest/v1`, {
      fetch: async (input, init) => {
        const { data } = await auth.getSession()
        const headers = new Headers(init?.headers)
        if (!headers.has("apikey")) headers.set("apikey", key)
        if (!headers.has("Authorization")) headers.set("Authorization", `Bearer ${data.session?.access_token ?? key}`)
        return fetch(input, { ...init, headers })
      },
    })
    this.auth = auth
  }
}

let client: Supabase | null = null
let currentApp: AppName | null = null

/**
 * Cliente Supabase do app. Cada app guarda a sessão numa chave própria:
 * entrar no portal não derruba o caixa aberto no mesmo navegador.
 */
export function initSupabase(app: AppName): Supabase {
  if (client && currentApp === app) return client
  currentApp = app
  client = new Supabase(storageKeyFor(app))
  return client
}

export function supabase(): Supabase {
  if (!client) throw new Error("Supabase não inicializado (chame initSupabase no main.tsx).")
  return client
}

/** Cliente temporário para uma sessão elevada (supervisor autorizando). */
export function createEphemeralClient(): Supabase {
  return new Supabase(null)
}
