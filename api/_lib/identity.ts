import { createHash } from "node:crypto"

/**
 * E-mail técnico do usuário no Supabase Auth. Ninguém digita isso: o login
 * é por loja + usuário + senha/PIN, validado por /api/auth/login. O hash
 * aceita qualquer nome de usuário (espaços, acentos) e é único por loja.
 */
export function authEmail(storeId: string | null, username: string): string {
  const key = `${storeId ?? "*"}:${username.trim().toLowerCase()}`
  const local = createHash("sha256").update(key).digest("hex").slice(0, 40)
  return `u${local}@users.velofast.app`
}

export function normalizeUsername(username: string): string {
  return username.trim().replace(/\s+/g, " ")
}
