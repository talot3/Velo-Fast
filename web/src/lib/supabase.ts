import { GoTrueClient } from "@supabase/auth-js"
import { PostgrestClient } from "@supabase/postgrest-js"

import type { Database } from "@/data/database.types"
import { env } from "@/lib/env"

export type AppName = "pdv" | "portal" | "gelic"

/** Chave onde cada app guarda a própria sessão no navegador. */
export function storageKeyFor(app: AppName): string {
  return `velofast-${app}-auth`
}

/** Sessão guardada no navegador (sem passar pelo auth-js, que pode estar renovando). */
export function readStoredSession(storageKey: string | null): { accessToken: string; userId: string } | null {
  if (!storageKey) return null
  try {
    const raw = localStorage.getItem(storageKey)
    const s = raw ? (JSON.parse(raw) as { access_token?: string; user?: { id?: string } }) : null
    return s?.access_token && s.user?.id ? { accessToken: s.access_token, userId: s.user.id } : null
  } catch {
    return null
  }
}

/** Sem rede nenhuma: não adianta tentar (nem esperar a renovação da sessão). */
export function isOffline(): boolean {
  return typeof navigator !== "undefined" && navigator.onLine === false
}

/**
 * Modo offline do app (ligado pelo AuthProvider quando abre sem conseguir
 * falar com o servidor): as chamadas não esperam a renovação da sessão, que
 * sem rede leva ~30 s — usam o token guardado e falham rápido.
 */
let offlineMode = false
export function setOfflineMode(value: boolean) {
  offlineMode = value
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
  /** Chave da sessão no navegador (null = só em memória). */
  readonly storageKey: string | null

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
        // Sem rede, falha na hora: com o token vencido, o auth-js tentaria
        // renovar a sessão por ~30 s antes de cada chamada (o PDV travaria).
        if (isOffline()) throw new TypeError("Failed to fetch")
        const session = offlineMode
          ? undefined
          : await Promise.race([
              auth.getSession().then(({ data }) => data.session),
              new Promise<undefined>((resolve) => setTimeout(resolve, 8000)),
            ])
        const token = session?.access_token ?? readStoredSession(storageKey)?.accessToken ?? key
        const headers = new Headers(init?.headers)
        if (!headers.has("apikey")) headers.set("apikey", key)
        if (!headers.has("Authorization")) headers.set("Authorization", `Bearer ${token}`)
        return fetch(input, { ...init, headers })
      },
    })
    this.auth = auth
    this.storageKey = storageKey
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
