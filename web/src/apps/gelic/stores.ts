/**
 * Regras da lista de lojas do GELIC (busca, paginação e vencimento), sem
 * React, para a tabela e a paginação usarem exatamente o mesmo filtro.
 */
import type { StoreInfo } from "@/data/types"
import { todayBR } from "@/lib/format"

/** Opções do seletor "Exibir:" (padrão 5, como no sistema anterior). */
export const PAGE_SIZES = [5, 10, 20, 50] as const
export const DEFAULT_PAGE_SIZE = 5

/** Termo que parece número/CNPJ ("12.345.678", "0001-90"): compara só os dígitos. */
const NUMERIC_TERM = /^[\d\s./-]+$/

/**
 * Busca por código, razão social, CNPJ (com ou sem pontuação) ou telefone.
 * Campos vazios (CNPJ/telefone nulos) não quebram a busca.
 */
export function filterStores(stores: readonly StoreInfo[], search: string): StoreInfo[] {
  const term = search.toLowerCase().trim()
  if (!term) return [...stores]
  const digits = NUMERIC_TERM.test(term) ? term.replace(/\D/g, "") : ""
  return stores.filter((store) => {
    const cnpj = (store.cnpj ?? "").toLowerCase()
    return (
      store.id.toLowerCase().includes(term) ||
      (store.name ?? "").toLowerCase().includes(term) ||
      cnpj.includes(term) ||
      (digits !== "" && cnpj.replace(/\D/g, "").includes(digits)) ||
      (store.phone ?? "").toLowerCase().includes(term)
    )
  })
}

export type PageSlice<T> = {
  items: T[]
  total: number
  totalPages: number
  /** Página atual já limitada ao total de páginas. */
  page: number
  /** Posição (1..total) do primeiro item exibido; 0 quando a lista está vazia. */
  from: number
  to: number
}

export function paginate<T>(items: readonly T[], page: number, perPage: number): PageSlice<T> {
  const total = items.length
  const totalPages = Math.max(1, Math.ceil(total / perPage))
  const current = Math.min(Math.max(1, page), totalPages)
  const start = (current - 1) * perPage
  const end = Math.min(start + perPage, total)
  return {
    items: items.slice(start, end),
    total,
    totalPages,
    page: current,
    from: total > 0 ? start + 1 : 0,
    to: end,
  }
}

/** Número do dia de uma data "YYYY-MM-DD" (sem fuso), só para contar dias. */
function dayNumber(isoDate: string): number {
  const [y, m, d] = isoDate.slice(0, 10).split("-").map(Number)
  return Date.UTC(y, m - 1, d) / 86_400_000
}

/**
 * Dias de hoje (São Paulo) até a data; negativo = já passou. Conta aqui porque
 * o daysUntil de lib/format monta "hoje" sem o "- 1" do mês (fica um mês à
 * frente e marcaria como vencidas licenças que vencem nos próximos ~30 dias).
 */
export function daysFromTodayBR(isoDate: string): number {
  return Math.round(dayNumber(isoDate) - dayNumber(todayBR()))
}

export type ExpiryStatus =
  | { kind: "none" }
  | { kind: "expired"; days: number }
  | { kind: "soon"; days: number }
  | { kind: "ok"; days: number }

/**
 * Situação do vencimento pela data de São Paulo. A licença vale até o dia do
 * vencimento (inclusive), a mesma regra do login das lojas; sem data = "N/A".
 */
export function expiryStatus(expireDate: string | null | undefined): ExpiryStatus {
  if (!expireDate) return { kind: "none" }
  const days = daysFromTodayBR(expireDate)
  if (days < 0) return { kind: "expired", days }
  if (days <= 30) return { kind: "soon", days }
  return { kind: "ok", days }
}

export function isExpired(store: Pick<StoreInfo, "expireDate">): boolean {
  return expiryStatus(store.expireDate).kind === "expired"
}

/** Duas letras do avatar da loja ("LO" quando não há nome). */
export function storeInitials(name: string | null | undefined): string {
  return name ? name.substring(0, 2).toUpperCase() : "LO"
}
