import type { QueryClient } from "@tanstack/react-query"

/**
 * Chaves "tp_" que NÃO são cache: o tema escolhido e o terminal (caixa)
 * vinculado a este dispositivo pelo link do PDV (?tid=...).
 */
const KEEP = new Set(["tp_theme_mode", "tp_tid"])

function isLocalCacheKey(key: string): boolean {
  return key.startsWith("velofast_pdv_catalog_") || (key.startsWith("tp_") && !KEEP.has(key))
}

/**
 * "Limpar Cache e Zerar Relatórios": apaga só os caches locais — catálogo
 * offline do PDV, dados antigos "tp_*" do sistema anterior e o cache de
 * consultas em memória. Sessões (logins) e a fila offline nunca são tocadas.
 * Devolve as chaves removidas.
 */
export function clearLocalCaches(queryClient: QueryClient): string[] {
  const removed: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && isLocalCacheKey(key)) removed.push(key)
  }
  for (const key of removed) localStorage.removeItem(key)
  queryClient.clear()
  return removed
}
