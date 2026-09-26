import bcrypt from "bcryptjs"

import { HttpError, readBody, route } from "./_lib/http.js"
import { authEmail, normalizeUsername } from "./_lib/identity.js"
import { assertCanManageStore, requireCaller, ROLE_LEVEL, type Caller, type Role } from "./_lib/session.js"
import { adminClient } from "./_lib/supabase.js"

type CreateBody = {
  action: "create"
  storeId: string | null
  username: string
  password: string
  role: Role
  displayName?: string | null
  extra?: Record<string, unknown>
}

type UpdateBody = {
  action: "update"
  userId: string
  username?: string
  role?: Role
  displayName?: string | null
  active?: boolean
  extra?: Record<string, unknown>
}

type PasswordBody = { action: "set-password"; userId: string; password: string }

type Body = CreateBody | UpdateBody | PasswordBody

const ROLES: Role[] = ["operador", "supervisor", "admin", "master"]

function assertPassword(password: string | undefined) {
  if (!password || password.length < 4) throw new HttpError(400, "A senha/PIN precisa ter pelo menos 4 caracteres.")
  if (password.length > 72) throw new HttpError(400, "Senha longa demais (máximo 72 caracteres).")
}

function assertRole(caller: Caller, role: Role | undefined): asserts role is Role {
  if (!role || !ROLES.includes(role)) throw new HttpError(400, "Papel inválido.")
  if (ROLE_LEVEL[role] > ROLE_LEVEL[caller.role]) throw new HttpError(403, "Você não pode dar um papel acima do seu.")
}

async function loadProfile(userId: string) {
  const { data } = await adminClient()
    .from("profiles")
    .select("user_id, store_id, username, display_name, role, active, extra")
    .eq("user_id", userId)
    .maybeSingle()
  if (!data) throw new HttpError(404, "Usuário não encontrado.")
  return data
}

function uniqueViolation(error: { code?: string } | null) {
  return error?.code === "23505"
}

export default route(["POST"], async (req) => {
  const caller = await requireCaller(req)
  const body = readBody<Body>(req)
  const admin = adminClient()

  if (body.action === "create") {
    const username = normalizeUsername(body.username ?? "")
    if (!username) throw new HttpError(400, "Informe o nome de usuário.")
    assertPassword(body.password)
    assertRole(caller, body.role)
    const storeId = body.role === "master" ? null : body.storeId
    if (body.role !== "master") {
      if (!storeId) throw new HttpError(400, "Loja não informada.")
      assertCanManageStore(caller, storeId)
    } else if (caller.role !== "master") {
      throw new HttpError(403, "Só o master cria outro master.")
    }

    const { data: created, error } = await admin.auth.admin.createUser({
      email: authEmail(storeId, username),
      email_confirm: true,
      password: crypto.randomUUID() + crypto.randomUUID(),
      app_metadata: { store_id: storeId, role: body.role },
    })
    if (error) {
      if (/already/i.test(error.message)) throw new HttpError(409, "Já existe um usuário com esse nome nesta loja.")
      throw error
    }

    const userId = created.user.id
    const { error: profileError } = await admin.from("profiles").insert({
      user_id: userId,
      store_id: storeId,
      username,
      display_name: body.displayName ?? null,
      role: body.role,
      extra: body.extra ?? {},
    })
    if (profileError) {
      await admin.auth.admin.deleteUser(userId)
      if (uniqueViolation(profileError)) throw new HttpError(409, "Já existe um usuário com esse nome nesta loja.")
      throw profileError
    }

    const { error: hashError } = await admin.rpc("auth_set_password_hash", {
      p_user_id: userId,
      p_password_hash: await bcrypt.hash(body.password, 10),
    })
    if (hashError) throw hashError

    return { user: await loadProfile(userId) }
  }

  if (body.action === "update") {
    const target = await loadProfile(body.userId)
    if (target.role === "master" && caller.role !== "master") throw new HttpError(403, "Permissão insuficiente.")
    if (target.store_id) assertCanManageStore(caller, target.store_id)
    if (body.role !== undefined) assertRole(caller, body.role)
    if (body.role !== undefined && (body.role === "master") !== (target.role === "master")) {
      throw new HttpError(400, "Não é possível trocar entre papel master e papel de loja.")
    }
    if (target.user_id === caller.userId && body.active === false) {
      throw new HttpError(400, "Você não pode desativar o próprio usuário.")
    }
    // Como na desativação: ninguém rebaixa a si mesmo (a loja ficaria sem
    // quem administre os usuários).
    if (target.user_id === caller.userId && body.role !== undefined && ROLE_LEVEL[body.role] < ROLE_LEVEL[target.role as Role]) {
      throw new HttpError(400, "Você não pode reduzir o próprio nível de acesso.")
    }

    const patch: Record<string, unknown> = {}
    if (body.displayName !== undefined) patch.display_name = body.displayName
    if (body.role !== undefined) patch.role = body.role
    if (body.active !== undefined) patch.active = body.active
    if (body.extra !== undefined) patch.extra = body.extra

    if (body.username !== undefined) {
      const username = normalizeUsername(body.username)
      if (!username) throw new HttpError(400, "Informe o nome de usuário.")
      if (username.toLowerCase() !== target.username.toLowerCase()) {
        const { error } = await admin.auth.admin.updateUserById(target.user_id, {
          email: authEmail(target.store_id, username),
          email_confirm: true,
        })
        if (error) {
          if (/already/i.test(error.message)) throw new HttpError(409, "Já existe um usuário com esse nome nesta loja.")
          throw error
        }
      }
      patch.username = username
    }

    if (Object.keys(patch).length > 0) {
      const { error } = await admin.from("profiles").update(patch).eq("user_id", target.user_id)
      if (uniqueViolation(error)) throw new HttpError(409, "Já existe um usuário com esse nome nesta loja.")
      if (error) throw error
    }
    return { user: await loadProfile(target.user_id) }
  }

  if (body.action === "set-password") {
    assertPassword(body.password)
    const target = await loadProfile(body.userId)
    if (target.user_id !== caller.userId) {
      if (target.role === "master" && caller.role !== "master") throw new HttpError(403, "Permissão insuficiente.")
      if (target.store_id) assertCanManageStore(caller, target.store_id)
    }
    const { error } = await admin.rpc("auth_set_password_hash", {
      p_user_id: target.user_id,
      p_password_hash: await bcrypt.hash(body.password, 10),
    })
    if (error) throw error
    return { ok: true }
  }

  throw new HttpError(400, "Ação inválida.")
})
