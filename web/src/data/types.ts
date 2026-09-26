/**
 * Tipos de domínio usados pelas telas. Os nomes dos campos seguem o sistema
 * anterior (subgroupId, buttonColor, useNameOnPrint...) para facilitar a
 * migração; a conversão para as colunas do banco fica em data/*.ts.
 */
import type { Json } from "@/data/database.types"

export type Product = {
  id: string
  code: string
  name: string
  /** Campo "Ordem" do cadastro (o PDV exibe na ordem de cadastro). */
  order: number
  cost: number | null
  price: number
  /** null = sem controle de estoque ("Sem contr."). */
  stock: number | null
  subgroupId: string | null
  printerId: string | null
  useNameOnPrint: boolean
  description: string
  /** Nome do ícone lucide (beer, cup-soda, coffee...). */
  icon: string
  unit: string
  active: boolean
  /** Ficha técnica do módulo de precificação (agora salva por produto). */
  pricing: PricingData | null
  createdAt?: string
}

export type PricingData = {
  metodo: "markup" | "custo-meta"
  insumos: { id: number; desc: string; qtd: number; unid: string; custoUnit: number }[]
  maoDeObra: number
  cgf: number
  pctDespesas: number
  pctImpostos: number
  pctLucroDesejado: number
  precoMercado: number
}

export type Group = {
  id: string
  name: string
  order: number
  createdAt?: string
}

export type Subgroup = {
  id: string
  groupId: string | null
  name: string
  buttonColor: string | null
  textColor: string | null
  order: number
  createdAt?: string
}

export type PaymentMethod = {
  id: string
  code: string
  order: number
  name: string
  buttonColor: string | null
  textColor: string | null
  active: boolean
  createdAt?: string
}

export type Printer = {
  id: string
  name: string
  model: string | null
  useWindowsPrinter: boolean
  systemName: string | null
  ip: string | null
  port: number
  paperWidth: number
  activeCut: boolean
  linesBefore: number
  linesAfter: number
  alignSpacing: number
  blackBackground: boolean
  printServer: boolean
  order: number
  createdAt?: string
}

export type TerminalLayout = "horizontal" | "vertical"
export type TerminalFontSize = "small" | "medium" | "large" | "xlarge"

export type Terminal = {
  /** "CX" + número do caixa (mantido ao editar, como no sistema antigo). */
  id: string
  cashNumber: number | null
  name: string
  layout: TerminalLayout
  font: string
  fontSize: TerminalFontSize
  printerId: string | null
  active: boolean
  order: number
  createdAt?: string
}

export type TicketConfig = {
  titleTicket?: string
  titleFicha?: string
}

export type Version = {
  id: number | string
  version: string
  /** ISO 8601 */
  date: string
  description: string
}

export type StoreSettings = {
  ticketConfig: TicketConfig
  currentVersion: string
  versions: Version[]
}

export type SaleKind = "sale" | "refund"

/** Unidade vendida (ficha) com dados da venda, para listas do PDV. */
export type RecentItem = {
  id: string
  sale_id: string
  line_no: number
  product_id: string | null
  product_name: string
  unit_price: number
  status: "active" | "cancelled"
  print_count: number
  printer_id: string | null
  payment_label: string
  operator_name: string
  terminal_id: string | null
  sold_at: string
  kind: SaleKind
}

export type CashSession = {
  id: string
  store_id: string
  terminal_id: string
  operator_id: string | null
  operator_name: string
  opened_at: string
  opening_amount: number
  status: "open" | "closed"
  closed_at: string | null
  closed_by_name: string | null
  closing: CashSummary | null
}

export type CashMovement = {
  id: string
  store_id: string
  session_id: string | null
  terminal_id: string
  kind: "sangria" | "suprimento"
  amount: number
  reason: string | null
  operator_name: string
  occurred_at: string
}

export type CashSummary = {
  session?: CashSession
  total_vendas: number
  qtd_transacoes: number
  by_method: { method: string; total: number; is_cash: boolean }[]
  by_label: { label: string; total: number; qty: number }[]
  movements: CashMovement[]
  total_sangrias: number
  total_suprimentos: number
  dinheiro_vendas: number
  dinheiro_em_caixa: number
}

export type StoreInfo = {
  id: string
  name: string
  cnpj: string | null
  phone: string | null
  active: boolean
  expireDate: string | null
  terminalsAllowed: number
  activeTerminals: number
  bridge: { online: boolean; lastSeenAt: string | null; name: string } | null
}

export type AppUser = {
  userId: string
  storeId: string | null
  username: string
  displayName: string | null
  role: "operador" | "supervisor" | "admin" | "master"
  active: boolean
  extra: Record<string, Json | undefined>
}
