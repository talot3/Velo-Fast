import bcrypt from "bcryptjs"

import { HttpError, readBody, route } from "../_lib/http.js"
import { ROLE_LEVEL, type Role } from "../_lib/session.js"
import { adminClient, publicClient } from "../_lib/supabase.js"

type LoginBody = {
  storeId?: string | null
  username?: string
  password?: string
  /** store = PDV/portal; master = gelic; elevate = autorização de supervisor no PDV */
  scope?: "store" | "master" | "elevate"
}

type LookupRow = {
  user_id: string
  email: string
  username: string
  role: Role
  active: boolean
  store_id: string | null
  store_name: string | null
  store_active: boolean | null
  store_expire_date: string | null
  password_hash: string
  failed_attempts: number
  locked_until: string | null
}

// Hash fixo para gastar o mesmo tempo quando o usuário não existe.
const DUMMY_HASH = "$2b$10$.n8LupSqpsYMkyNF.IZmBeT5zZBVMbefCKcsNj.vrr.ZYr/NxbvmW"

function todayInBrazil(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date())
}

function formatDateBr(isoDate: string): string {
  const [y, m, d] = isoDate.split("-")
  return `${d}/${m}/${y}`
}

export default route(["POST"], async (req) => {
  const { storeId, username, password, scope = "store" } = readBody<LoginBody>(req)
  if (!username?.trim() || !password) throw new HttpError(400, "Usuário e senha são obrigatórios.")
  if (scope !== "master" && !storeId?.trim()) {
    throw new HttpError(400, "Loja não informada. Abra o sistema pelo link da sua loja (…?store=CÓDIGO).")
  }

  const admin = adminClient()
  const { data: rows, error } = await admin.rpc("auth_login_lookup", {
    p_store_id: scope === "master" ? null : storeId!.trim(),
    p_username: username,
  })
  if (error) throw error
  const user = (rows as LookupRow[] | null)?.[0]

  if (!user) {
    await bcrypt.compare(password, DUMMY_HASH)
    throw new HttpError(401, "Usuário ou senha inválidos.")
  }
  if (user.locked_until && new Date(user.locked_until) > new Date()) {
    throw new HttpError(429, "Muitas tentativas erradas. Aguarde alguns minutos e tente de novo.")
  }

  const ok = await bcrypt.compare(password, user.password_hash)
  await admin.rpc("auth_login_result", { p_user_id: user.user_id, p_success: ok })
  if (!ok) throw new HttpError(401, "Usuário ou senha inválidos.")

  if (!user.active) throw new HttpError(403, "Usuário desativado. Fale com o administrador.")
  if (scope === "master" && user.role !== "master") {
    throw new HttpError(403, "Este usuário não tem acesso ao painel master.")
  }
  if (scope === "elevate" && ROLE_LEVEL[user.role] < ROLE_LEVEL.supervisor) {
    throw new HttpError(403, "Usuário sem permissão suficiente.")
  }
  if (user.role !== "master") {
    if (!user.store_active) throw new HttpError(403, "Licença da loja bloqueada. Fale com o suporte.")
    if (user.store_expire_date && user.store_expire_date < todayInBrazil()) {
      throw new HttpError(403, `Licença da loja vencida em ${formatDateBr(user.store_expire_date)}. Fale com o suporte.`)
    }
  }

  // Emite uma sessão Supabase para este usuário sem senha do Auth: gera um
  // link mágico no servidor e troca-o imediatamente pela sessão.
  const { data: link, error: linkError } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: user.email,
  })
  if (linkError || !link.properties?.hashed_token) throw linkError ?? new Error("Falha ao gerar sessão.")

  const { data: auth, error: otpError } = await publicClient().auth.verifyOtp({
    token_hash: link.properties.hashed_token,
    type: "magiclink",
  })
  if (otpError || !auth.session) throw otpError ?? new Error("Falha ao abrir sessão.")

  const { access_token, refresh_token, expires_at, expires_in, token_type } = auth.session
  return {
    session: { access_token, refresh_token, expires_at, expires_in, token_type },
    user: {
      id: user.user_id,
      username: user.username,
      role: user.role,
      storeId: user.store_id,
      storeName: user.store_name,
    },
  }
})
