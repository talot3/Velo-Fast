// Criação de usuários direto com a service role (scripts de implantação,
// importação e testes). No app, usuários são criados por /api/users.
import { createHash, randomUUID } from "node:crypto"
import bcrypt from "bcryptjs"
import { createClient } from "@supabase/supabase-js"

export function authEmail(storeId, username) {
  const key = `${storeId ?? "*"}:${username.trim().toLowerCase()}`
  return `u${createHash("sha256").update(key).digest("hex").slice(0, 40)}@users.velofast.app`
}

export function adminClient(url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY) {
  if (!url || !key) throw new Error("Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.")
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

/**
 * Cria (ou atualiza) um usuário do app. `passwordHash` permite importar o
 * hash bcrypt do sistema antigo sem conhecer a senha.
 */
export async function upsertAppUser(admin, { storeId, username, role, password, passwordHash, displayName = null, active = true, extra = {} }) {
  const name = username.trim().replace(/\s+/g, " ")
  const email = authEmail(storeId, name)
  const hash = passwordHash ?? (await bcrypt.hash(password, 10))

  let userId
  // Mesmo critério do índice único (sem diferenciar maiúsculas).
  const pattern = name.replace(/[\\%_]/g, (c) => `\\${c}`)
  let query = admin.from("profiles").select("user_id").ilike("username", pattern)
  query = storeId === null ? query.is("store_id", null) : query.eq("store_id", storeId)
  const { data: existing, error: findError } = await query.maybeSingle()
  if (findError) throw findError

  if (existing) {
    userId = existing.user_id
    const { error } = await admin.from("profiles").update({ role, active, display_name: displayName, extra }).eq("user_id", userId)
    if (error) throw error
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
      password: randomUUID() + randomUUID(),
      app_metadata: { store_id: storeId, role },
    })
    if (error) throw error
    userId = data.user.id
    const { error: pErr } = await admin.from("profiles").insert({ user_id: userId, store_id: storeId, username: name, role, active, display_name: displayName, extra })
    if (pErr) throw pErr
  }
  const { error: hErr } = await admin.rpc("auth_set_password_hash", { p_user_id: userId, p_password_hash: hash })
  if (hErr) throw hErr
  return userId
}
