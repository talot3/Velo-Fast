import type { VercelRequest, VercelResponse } from "@vercel/node"

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message)
  }
}

type Handler = (req: VercelRequest, res: VercelResponse) => Promise<unknown>

/** Envelope comum: método permitido, JSON, sem cache, erros padronizados. */
export function route(methods: string[], fn: Handler) {
  return async (req: VercelRequest, res: VercelResponse) => {
    res.setHeader("Cache-Control", "no-store")
    if (!methods.includes(req.method ?? "")) {
      res.setHeader("Allow", methods.join(", "))
      return res.status(405).json({ error: "Método não permitido." })
    }
    try {
      const result = await fn(req, res)
      if (!res.headersSent) res.status(200).json(result ?? { ok: true })
    } catch (e) {
      const status = e instanceof HttpError ? e.status : 500
      if (status >= 500) console.error(`[api] ${req.url}`, e)
      if (!res.headersSent) {
        res.status(status).json({
          error: status >= 500 ? "Erro inesperado no servidor. Tente novamente." : (e as Error).message,
        })
      }
    }
  }
}

export function readBody<T>(req: VercelRequest): T {
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body || "{}") as T
    } catch {
      throw new HttpError(400, "JSON inválido.")
    }
  }
  return (req.body ?? {}) as T
}

export function bearerToken(req: VercelRequest): string {
  const header = req.headers.authorization ?? ""
  if (!header.startsWith("Bearer ")) throw new HttpError(401, "Sessão expirada. Faça login novamente.")
  return header.slice("Bearer ".length)
}
