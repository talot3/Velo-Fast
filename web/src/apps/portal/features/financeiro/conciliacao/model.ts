/**
 * Borderôs da conciliação de caixa.
 *
 * Antes eram inventados a partir das vendas (com uma "quebra" fixa de
 * R$ 15,66). Agora cada sessão de caixa real (cash_sessions) é um borderô;
 * o que o gestor confere (valores digitados, planos, contas, taxas,
 * CONCILIADO) fica em store_records/borderos com o id da sessão. Borderôs
 * lançados à mão ("manual") ou importados do sistema antigo também ficam lá.
 */
import type { CashSession } from "@/data/types"
import { parseMoneyBR, roundMoney, toLocalDateString } from "@/lib/format"

import { sumValues } from "../money"
import type { Option } from "../option-select"
import type { BorderoRecord, BorderoStatus, ContaFinanceira, MetodoConfig, PlanoConta, RecordId } from "../types"

/** Colunas sempre presentes no conciliador (mesma lista do sistema antigo). */
export const METODOS_PADRAO = ["DINHEIRO", "CARTÃO CRÉDITO", "CARTÃO DÉBITO", "PIX"]

export const FORNECEDORES: Option[] = [
  { value: "1", label: "STONE MEIO DE PAGAMENTO" },
  { value: "2", label: "REDE CARD" },
  { value: "3", label: "CIELO S.A." },
  { value: "4", label: "MOTOBOY CARLOS" },
]

const PLANOS_PADRAO: Option[] = [
  { value: "1", label: "VENDAS À VISTA" },
  { value: "2", label: "TAXAS DE CARTAO/PIX" },
]

const CONTAS_PADRAO: Option[] = [
  { value: "1", label: "CONTA CAIXA 00001" },
  { value: "2", label: "BANCO DO BRASIL 5805 13001" },
]

/** Planos de contas cadastrados (descrição em maiúsculas) ou as opções padrão. */
export function planoOptions(planos: PlanoConta[]): Option[] {
  if (planos.length === 0) return PLANOS_PADRAO
  return planos.map((p) => ({ value: String(p.id), label: (p.descricao ?? "").toUpperCase() }))
}

/** Contas financeiras cadastradas (descrição em maiúsculas) ou as opções padrão. */
export function contaOptions(contas: ContaFinanceira[]): Option[] {
  if (contas.length === 0) return CONTAS_PADRAO
  return contas.map((c) => ({ value: String(c.id), label: (c.descricao ?? "").toUpperCase() }))
}

export type BorderoRowStatus = BorderoStatus | "Em aberto"

export type BorderoView = {
  key: string
  id: RecordId
  source: "session" | "manual" | "legacy"
  /** Sessão de caixa de origem (null = borderô manual/importado). */
  session: CashSession | null
  /** Conferência gravada (null = ainda não conferido). */
  record: BorderoRecord | null
  /** "YYYY-MM-DD" (dia da abertura, fuso de São Paulo) */
  data: string
  terminal: string
  operador: string
  suprimento: number
  /** Vendas do sistema por forma de pagamento; null = indisponível. */
  sistema: Record<string, number> | null
  vendasSistema: number | null
  declarado: Record<string, number>
  totalDeclarado: number
  /** Declarado − sistema; null quando o sistema está indisponível. */
  diferenca: number | null
  status: BorderoRowStatus
  sortTime: number
}

function toNumberMap(map: Record<string, unknown> | null | undefined): Record<string, number> {
  const out: Record<string, number> = {}
  for (const [k, v] of Object.entries(map ?? {})) out[k] = Number(v) || 0
  return out
}

/** Vendas por forma de pagamento do fechamento gravado da sessão (null se ainda não há). */
export function sessionSistema(session: CashSession): Record<string, number> | null {
  if (!session.closing) return null
  const out: Record<string, number> = {}
  for (const m of session.closing.by_method ?? []) {
    out[m.method] = roundMoney((out[m.method] ?? 0) + (Number(m.total) || 0))
  }
  return out
}

function finish(v: Omit<BorderoView, "vendasSistema" | "totalDeclarado" | "diferenca">): BorderoView {
  const vendasSistema = v.sistema ? sumValues(v.sistema) : null
  const totalDeclarado = sumValues(v.declarado)
  return {
    ...v,
    vendasSistema,
    totalDeclarado,
    diferenca: vendasSistema === null ? null : roundMoney(totalDeclarado - vendasSistema),
  }
}

/** Monta as linhas da lista: uma por sessão de caixa + borderôs avulsos gravados. */
export function buildBorderoViews(sessions: CashSession[], records: BorderoRecord[]): BorderoView[] {
  const byId = new Map(records.map((r) => [String(r.id), r]))
  const sessionIds = new Set(sessions.map((s) => s.id))
  const views: BorderoView[] = []

  for (const s of sessions) {
    const record = byId.get(s.id) ?? null
    views.push(
      finish({
        key: s.id,
        id: s.id,
        source: "session",
        session: s,
        record,
        data: toLocalDateString(s.opened_at),
        terminal: s.terminal_id,
        operador: s.operator_name,
        suprimento: Number(s.opening_amount) || 0,
        sistema: sessionSistema(s),
        declarado: toNumberMap(record?.declarado),
        status: s.status === "open" ? "Em aberto" : record?.status === "Conciliado" ? "Conciliado" : "Pendente",
        sortTime: Date.parse(s.opened_at) || 0,
      })
    )
  }

  for (const r of records) {
    if (sessionIds.has(String(r.id))) continue
    const source = r.source === "manual" || r.source === "session" ? r.source : "legacy"
    const vendas = toNumberMap(r.vendasPorMetodo)
    views.push(
      finish({
        key: `record:${String(r.id)}`,
        id: r.id,
        source,
        session: null,
        record: r,
        data: r.data ?? "",
        terminal: r.terminal ?? "",
        operador: r.operador ?? "",
        suprimento: Number(r.suprimento) || 0,
        // Borderô manual não tem vendas do sistema; importados trazem as do antigo.
        sistema: source !== "manual" && Object.keys(vendas).length > 0 ? vendas : null,
        declarado: toNumberMap(r.declarado),
        status: r.status === "Conciliado" ? "Conciliado" : "Pendente",
        sortTime: typeof r.id === "number" ? r.id : 0,
      })
    )
  }

  // Mais recentes primeiro (como o antigo, por data); empates pela abertura e terminal.
  return views.sort(
    (a, b) => b.data.localeCompare(a.data) || b.sortTime - a.sortTime || a.terminal.localeCompare(b.terminal)
  )
}

/**
 * Formas de pagamento (colunas) do conciliador: as das vendas do sistema,
 * depois as 4 padrão (como o antigo) e, por fim, outras já conferidas.
 * A ordem não depende da ordem das chaves gravadas (o jsonb as reordena),
 * então as colunas não mudam de lugar depois de gravar.
 */
export function metodoColumns(view: BorderoView): string[] {
  const base = [...Object.keys(view.sistema ?? {}), ...METODOS_PADRAO]
  const known = new Set(base)
  const extras = [...Object.keys(view.declarado), ...Object.keys(view.record?.configMetodos ?? {})]
    .filter((m) => !known.has(m))
    .sort((a, b) => a.localeCompare(b, "pt-BR"))
  return Array.from(new Set([...base, ...extras]))
}

/** Configuração inicial de uma coluna (mesmos padrões do sistema antigo). */
export function defaultConfig(metodo: string, data: string): MetodoConfig {
  return {
    planoId: metodo === "DINHEIRO" ? "1" : "2",
    depositoDt: data,
    contaId: metodo === "DINHEIRO" ? "1" : "2",
    percentualTaxa: metodo.includes("CRÉDITO") ? 2.99 : metodo.includes("DÉBITO") ? 1.5 : 0,
    fornecedorId: metodo.includes("CARTÃO") ? "1" : "4",
    planoTaxaId: "2",
    conciliado: false,
  }
}

/** Percentual digitado ("2,99" / "2.99") → número; vazio/inválido = 0. */
export function parsePercent(text: string): number {
  const n = parseMoneyBR(text)
  return Number.isFinite(n) ? n : 0
}

/** Id de elemento seguro para o nome da forma ("CARTÃO CRÉDITO" → "cartao-credito"). */
export function metodoSlug(metodo: string): string {
  return (
    metodo
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^A-Za-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase() || "forma"
  )
}
