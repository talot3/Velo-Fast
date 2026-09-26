import { supabase } from "@/lib/supabase"

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message)
  }
}

/** POST para as funções /api (Vercel), com o token da sessão atual. */
export async function apiPost<T>(path: string, body: unknown, accessToken?: string): Promise<T> {
  let token = accessToken
  if (!token) {
    const { data } = await supabase().auth.getSession()
    token = data.session?.access_token
  }
  let res: Response
  try {
    res = await fetch(`/api/${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    })
  } catch {
    throw new ApiError(0, "Sem conexão com o servidor.")
  }
  const data = (await res.json().catch(() => ({}))) as { error?: string }
  if (!res.ok) throw new ApiError(res.status, data.error || "Erro inesperado no servidor.")
  return data as T
}
