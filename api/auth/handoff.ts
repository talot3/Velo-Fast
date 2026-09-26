import { clientIp, HttpError, route } from "../_lib/http.js"
import { requireCaller } from "../_lib/session.js"
import { adminClient, sessionClient } from "../_lib/supabase.js"

/**
 * "Entrar" do painel master (gelic) no portal de uma loja: cria uma sessão
 * NOVA para o mesmo usuário master, só para o portal. Assim gelic e portal
 * não disputam o mesmo token de renovação (o Supabase derrubaria os dois).
 */
export default route(["POST"], async (req) => {
  const caller = await requireCaller(req)
  if (caller.role !== "master") throw new HttpError(403, "Apenas o painel master pode fazer isso.")

  const admin = adminClient()
  const { data: user, error: userError } = await admin.auth.admin.getUserById(caller.userId)
  if (userError || !user.user?.email) throw userError ?? new Error("Usuário master sem e-mail técnico.")

  const { data: link, error: linkError } = await admin.auth.admin.generateLink({ type: "magiclink", email: user.user.email })
  if (linkError || !link.properties?.hashed_token) throw linkError ?? new Error("Falha ao gerar sessão.")

  const { data: auth, error: otpError } = await sessionClient(clientIp(req)).auth.verifyOtp({
    token_hash: link.properties.hashed_token,
    type: "magiclink",
  })
  if (otpError || !auth.session) throw otpError ?? new Error("Falha ao abrir sessão.")

  const { access_token, refresh_token, expires_at, expires_in, token_type } = auth.session
  return { session: { access_token, refresh_token, expires_at, expires_in, token_type } }
})
