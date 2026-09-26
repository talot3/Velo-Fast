import { createClient, type SupabaseClient } from "@supabase/supabase-js"

import { apiPost } from "@/lib/api"
import { env } from "@/lib/env"
import { setStoreId } from "@/lib/store-context"

/** Mesma chave que o portal usa para guardar a sessão (initSupabase("portal")). */
const PORTAL_STORAGE_KEY = "velofast-portal-auth"

type HandoffResponse = {
  session: { access_token: string; refresh_token: string }
}

let portalAuth: SupabaseClient | null = null

/**
 * Cliente temporário só para gravar a sessão na chave do portal. Sem renovação
 * automática: quem cuida da sessão depois é o próprio portal. Criado uma vez
 * para não abrir dois clientes na mesma chave se o master tentar de novo.
 */
function portalAuthClient(): SupabaseClient {
  portalAuth ??= createClient(env.supabaseUrl, env.supabaseKey, {
    auth: {
      storageKey: PORTAL_STORAGE_KEY,
      persistSession: true,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })
  return portalAuth
}

/**
 * "Entrar" / "Ir ao Portal": pede ao servidor uma sessão nova do master só
 * para o portal (gelic e portal não disputam o mesmo token), grava essa sessão
 * onde o portal lê, escolhe a loja neste dispositivo e abre o portal.
 */
export async function openStorePortal(storeId: string): Promise<void> {
  const { session } = await apiPost<HandoffResponse>("auth/handoff", {})
  const { error } = await portalAuthClient().auth.setSession({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
  })
  if (error) throw error
  setStoreId(storeId)
  window.location.href = `/portal/?store=${encodeURIComponent(storeId)}`
}
