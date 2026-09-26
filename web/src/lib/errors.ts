/** Mensagem amigável (pt-BR) para erros do Supabase, da API ou de rede. */
export function errorMessage(error: unknown, fallback = "Não foi possível concluir a operação."): string {
  if (!error) return fallback
  if (typeof error === "string") return error
  const e = error as { message?: string; code?: string; details?: string; name?: string }
  if (e.name === "AbortError") return "O servidor demorou para responder. Tente novamente."
  if (e.message && /Failed to fetch|NetworkError|Load failed|fetch failed/i.test(e.message)) {
    return "Sem conexão com o servidor."
  }
  if (e.code === "42501") return e.message && !/permission denied/i.test(e.message) ? e.message : "Sem permissão para esta ação."
  if (e.code === "23505") return "Já existe um registro com esses dados."
  if (e.code === "23503") return "Este registro está em uso por outro cadastro."
  if (e.code === "PGRST301" || e.code === "PGRST303") return "Sessão expirada. Faça login novamente."
  return e.message || fallback
}

/** true quando o erro é de rede (vale a pena tentar de novo mais tarde). */
export function isNetworkError(error: unknown): boolean {
  if (!error) return false
  const e = error as { message?: string; name?: string; status?: number; code?: string }
  if (e.name === "AbortError" || e.name === "TypeError") return true
  if (typeof e.status === "number" && (e.status === 0 || e.status >= 500)) return true
  return Boolean(e.message && /Failed to fetch|NetworkError|Load failed|fetch failed|timeout/i.test(e.message))
}

/** true quando o servidor recusou a sessão (token vencido/inválido): renovar e tentar de novo. */
export function isSessionError(error: unknown): boolean {
  if (!error) return false
  const e = error as { code?: string; status?: number; message?: string }
  return e.code === "PGRST301" || e.code === "PGRST303" || e.status === 401 || /JWT expired/i.test(e.message ?? "")
}
