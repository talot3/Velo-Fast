/**
 * Registros do módulo Financeiro — mesmos campos do sistema antigo
 * (portal/app.js, inventário A.2). Ficam em store_records, uma coleção por
 * tipo; os ids novos são numéricos (newNumericId), como o Date.now() antigo.
 */
import type { RecordCollection } from "@/data/records"

export const COLLECTIONS = {
  planoContas: "plano_contas",
  centrosCusto: "centros_custo",
  contasFinanceiras: "contas_financeiras",
  lancamentos: "lancamentos",
  borderos: "borderos",
} as const satisfies Record<string, RecordCollection>

export type RecordId = number | string

export const PLANO_TIPOS = ["Receita", "Despesa", "Ativo", "Passivo", "Patrimônio"] as const
export type PlanoTipo = (typeof PLANO_TIPOS)[number]
export const PLANO_NATUREZAS = ["Analítica", "Sintética"] as const

export type PlanoConta = {
  id: RecordId
  codigo: string
  descricao: string
  tipo: PlanoTipo
  natureza: (typeof PLANO_NATUREZAS)[number]
  lancamento: boolean
}

export const CENTRO_TIPOS = ["Misto", "Receita", "Despesa"] as const

export type CentroCusto = {
  id: RecordId
  codigo: string
  descricao: string
  responsavel: string
  tipo: (typeof CENTRO_TIPOS)[number]
  ativo: boolean
}

export const CONTA_TIPOS = ["Caixa", "Banco", "Carteira", "Poupança", "Investimento"] as const

export type ContaFinanceira = {
  id: RecordId
  codigo: string
  descricao: string
  tipo: (typeof CONTA_TIPOS)[number]
  banco: string
  agencia: string
  conta: string
  saldoInicial: number
  ativa: boolean
}

export type LancamentoTipo = "Receita" | "Despesa"
export const LANCAMENTO_STATUS = ["Pago", "Pendente", "Cancelado"] as const
export type LancamentoStatus = (typeof LANCAMENTO_STATUS)[number]

export type Lancamento = {
  id: RecordId
  /** "YYYY-MM-DD" */
  data: string
  tipo: LancamentoTipo
  descricao: string
  valor: number
  status: LancamentoStatus
  /** Ids guardados como texto (valor do select), como no sistema antigo. */
  planoContaId: string | null
  centroCustoId: string | null
  contaFinanceiraId: string | null
  obs: string
}

/** Configuração de uma coluna (forma de pagamento) do conciliador. */
export type MetodoConfig = {
  planoId: string
  /** "YYYY-MM-DD" */
  depositoDt: string
  contaId: string
  percentualTaxa: number
  fornecedorId: string
  planoTaxaId: string
  conciliado: boolean
}

export type BorderoStatus = "Pendente" | "Conciliado"

/**
 * Borderô (fechamento de caixa conferido no portal). Mesmo formato do
 * sistema antigo; `source` diz de onde veio:
 * - "session": conferência de uma sessão de caixa real (id = id da sessão);
 * - "manual": lançado no portal ("Lançar Fechamento (Borderô)");
 * - outro/ausente: importado do sistema antigo.
 */
export type BorderoRecord = {
  id: RecordId
  source?: "session" | "manual" | "legacy"
  /** "YYYY-MM-DD" */
  data: string
  terminal: string
  operador: string
  suprimento: number
  vendasReais: number
  declarado: Record<string, number>
  vendasPorMetodo: Record<string, number>
  configMetodos: Record<string, MetodoConfig>
  status: BorderoStatus
  observacao: string
}
