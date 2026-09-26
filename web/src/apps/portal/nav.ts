/**
 * Menu lateral do portal — mesma ordem, rótulos, ícones e ids de página do
 * sistema anterior (portal/index.html:296-572).
 */
import {
  AlertOctagonIcon,
  ArrowDownCircleIcon,
  AwardIcon,
  BarChart2Icon,
  BookOpenIcon,
  BoxIcon,
  Building2Icon,
  CalendarIcon,
  CheckSquareIcon,
  ClipboardListIcon,
  CreditCardIcon,
  CrosshairIcon,
  DatabaseIcon,
  FileSpreadsheetIcon,
  FileTextIcon,
  GitBranchIcon,
  LandmarkIcon,
  LayersIcon,
  LineChartIcon,
  ListTreeIcon,
  LockIcon,
  MegaphoneIcon,
  MonitorIcon,
  NetworkIcon,
  PackageIcon,
  PaletteIcon,
  PieChartIcon,
  PlayCircleIcon,
  PrinterIcon,
  ReceiptIcon,
  ScaleIcon,
  SettingsIcon,
  ShieldCheckIcon,
  ShoppingBagIcon,
  TrendingDownIcon,
  TrendingUpIcon,
  UserIcon,
  Users2Icon,
  UsersIcon,
  WalletIcon,
  type LucideIcon,
} from "lucide-react"

export type PageId =
  | "home"
  | "dashboard"
  | "swot"
  | "actionPlan"
  | "users"
  | "cargos"
  | "planoConta"
  | "centroCusto"
  | "contaFinanceira"
  | "paymentMethods"
  | "products"
  | "groups"
  | "subgroups"
  | "inventory"
  | "conciliacaoCaixa"
  | "receitas"
  | "despesas"
  | "reportSalesByProduct"
  | "reportSalesByTerminal"
  | "reportSangrias"
  | "reportFechamento"
  | "reportSalesByPeriod"
  | "reportDrePersonalizada"
  | "reportFluxoCaixa"
  | "reportPontoEquilibrio"
  | "reportDreGerencial"
  | "reportBalancoPatrimonial"
  | "compliance"
  | "skills"
  | "terminals"
  | "printers"
  | "ticketConfig"
  | "backup"
  | "version-control"

export type NavLeaf = { kind: "page"; page: PageId; label: string; icon: LucideIcon }
export type NavGroup = { kind: "group"; id: string; label: string; icon: LucideIcon; children: NavNode[] }
export type NavLabel = { kind: "label"; label: string }
export type NavNode = NavLeaf | NavGroup | NavLabel

const page = (p: PageId, label: string, icon: LucideIcon): NavLeaf => ({ kind: "page", page: p, label, icon })
const group = (id: string, label: string, icon: LucideIcon, children: NavNode[]): NavGroup => ({ kind: "group", id, label, icon, children })

export const NAV: NavNode[] = [
  page("home", "Iniciar", PlayCircleIcon),
  page("dashboard", "Dashboard", PieChartIcon),
  group("marketing-menu", "Marketing e Estratégia", MegaphoneIcon, [
    page("swot", "Matriz SWOT Dinâmica", CrosshairIcon),
    page("actionPlan", "Plano de Ação", CheckSquareIcon),
  ]),
  group("cadastros-menu", "Cadastros", UsersIcon, [
    group("colaboradores-cad-menu", "Colaboradores", Users2Icon, [
      page("users", "Usuários", UserIcon),
      page("cargos", "Cargos e Permissões", ShieldCheckIcon),
    ]),
    group("financeiro-cad-menu", "Financeiro", LandmarkIcon, [
      page("planoConta", "Plano de Contas", ListTreeIcon),
      page("centroCusto", "Cent. de Custos", Building2Icon),
      page("contaFinanceira", "Contas Financeiras", WalletIcon),
      page("paymentMethods", "Formas de Pgto", CreditCardIcon),
    ]),
  ]),
  group("catalogo-menu", "Catálogo", LayersIcon, [
    page("products", "Produtos", PackageIcon),
    page("groups", "Grupos", NetworkIcon),
    page("subgroups", "Subgrupos", PaletteIcon),
  ]),
  group("estoque-menu", "Estoque", BoxIcon, [page("inventory", "Inventário", ClipboardListIcon)]),
  group("fin-menu", "Financeiro", LandmarkIcon, [
    page("conciliacaoCaixa", "Conciliação de Caixa", ScaleIcon),
    page("receitas", "Receitas", TrendingUpIcon),
    page("despesas", "Despesas", TrendingDownIcon),
  ]),
  group("relatorios-menu", "Relatórios", BarChart2Icon, [
    group("relatorios-vendas-menu", "Vendas", ShoppingBagIcon, [
      page("reportSalesByProduct", "Vendas por Produto", LineChartIcon),
      page("reportSalesByTerminal", "Vendas por Caixa", MonitorIcon),
      page("reportSangrias", "Sangrias (Retiradas)", ArrowDownCircleIcon),
      page("reportFechamento", "Fechamento de Caixa", LockIcon),
      page("reportSalesByPeriod", "Vendas por Período", CalendarIcon),
    ]),
    group("relatorios-financeiro-menu", "Financeiro", LandmarkIcon, [
      page("reportDrePersonalizada", "DRE Personalizada", FileTextIcon),
      page("reportFluxoCaixa", "Fluxo de Caixa", TrendingUpIcon),
      page("reportPontoEquilibrio", "Ponto de Equilíbrio", ScaleIcon),
      page("reportDreGerencial", "DRE Gerencial", FileSpreadsheetIcon),
      page("reportBalancoPatrimonial", "Balanço Patrimonial", BookOpenIcon),
    ]),
  ]),
  group("rh-menu", "RH", ShieldCheckIcon, [
    page("compliance", "Compliance", AlertOctagonIcon),
    page("skills", "Gestão de Skills", AwardIcon),
  ]),
  { kind: "label", label: "GESTÃO" },
  group("ajustes-menu", "Ajustes", SettingsIcon, [
    page("terminals", "Terminais de Caixa", MonitorIcon),
    page("printers", "Impressoras", PrinterIcon),
    page("ticketConfig", "Configuração do Ticket", ReceiptIcon),
  ]),
  group("menu-sistema", "Sistema", SettingsIcon, [
    page("backup", "Backup de Dados", DatabaseIcon),
    page("version-control", "Controle de Versão", GitBranchIcon),
  ]),
]

/** Título do cabeçalho de cada página. */
export const PAGE_TITLES: Record<PageId, string> = {
  home: "Início",
  dashboard: "Visão Geral",
  swot: "Matriz SWOT Dinâmica",
  actionPlan: "Plano de Ação",
  users: "Usuários",
  cargos: "Cargos e Permissões de Acesso",
  planoConta: "Plano de Contas",
  centroCusto: "Centros de Custos",
  contaFinanceira: "Contas Financeiras",
  paymentMethods: "Formas de Pagamento",
  products: "Catálogo de Itens",
  groups: "Grupos de Produtos",
  subgroups: "Subgrupos e Cores",
  inventory: "Inventário de Estoque",
  conciliacaoCaixa: "Conciliação de Caixa",
  receitas: "Gestão de Receitas",
  despesas: "Gestão de Despesas",
  reportSalesByProduct: "Relatório de Vendas por Produto",
  reportSalesByTerminal: "Relatório de Vendas por Caixa",
  reportSangrias: "Relatório de Sangrias (Retiradas)",
  reportFechamento: "Relatório de Fechamento de Caixa",
  reportSalesByPeriod: "Relatório de Vendas por Período",
  reportDrePersonalizada: "Relatórios / Dem. Resl.(DRE)",
  reportFluxoCaixa: "Relatórios / Fluxo de Caixa",
  reportPontoEquilibrio: "Relatórios / Ponto de Equilíbrio",
  reportDreGerencial: "Relatórios / DRE Gerencial",
  reportBalancoPatrimonial: "Relatórios / Balanço Patrimonial",
  compliance: "Compliance & Integridade (IBGC / Decreto 11.129/22)",
  skills: "Gestão de Competências & Talentos (Big Five / Capacidades Dinâmicas)",
  terminals: "Terminais de Caixa",
  printers: "Configurações de Impressoras",
  ticketConfig: "Configuração do Ticket",
  backup: "Gestão de Dados e Backup",
  "version-control": "Controle de Versão",
}

/** Entradas da paleta de comandos (Ctrl/⌘+K). */
export const COMMAND_PAGES: { page: PageId; label: string }[] = [
  { page: "home", label: "Iniciar" },
  { page: "dashboard", label: "Dashboard" },
  { page: "swot", label: "Matriz SWOT Dinâmica" },
  { page: "actionPlan", label: "Plano de Ação" },
  { page: "users", label: "Usuários" },
  { page: "cargos", label: "Cargos e Permissões" },
  { page: "planoConta", label: "Plano de Contas" },
  { page: "centroCusto", label: "Centros de Custos" },
  { page: "contaFinanceira", label: "Contas Financeiras" },
  { page: "paymentMethods", label: "Formas de Pagamento" },
  { page: "products", label: "Produtos / Catálogo" },
  { page: "groups", label: "Grupos" },
  { page: "subgroups", label: "Subgrupos" },
  { page: "inventory", label: "Inventário" },
  { page: "conciliacaoCaixa", label: "Conciliação de Caixa" },
  { page: "receitas", label: "Receitas" },
  { page: "despesas", label: "Despesas" },
  { page: "reportSalesByProduct", label: "Relatório: Vendas por Produto" },
  { page: "reportSalesByTerminal", label: "Relatório: Vendas por Caixa" },
  { page: "reportSangrias", label: "Relatório: Sangrias" },
  { page: "reportFechamento", label: "Relatório: Fechamento de Caixa" },
  { page: "reportSalesByPeriod", label: "Relatório: Vendas por Período" },
  { page: "reportDrePersonalizada", label: "DRE Personalizada" },
  { page: "reportFluxoCaixa", label: "Fluxo de Caixa" },
  { page: "reportPontoEquilibrio", label: "Ponto de Equilíbrio" },
  { page: "reportDreGerencial", label: "DRE Gerencial" },
  { page: "reportBalancoPatrimonial", label: "Balanço Patrimonial" },
  { page: "compliance", label: "Compliance" },
  { page: "skills", label: "Gestão de Skills" },
  { page: "terminals", label: "Terminais de Caixa" },
  { page: "printers", label: "Impressoras" },
  { page: "ticketConfig", label: "Configuração do Ticket" },
  { page: "backup", label: "Backup de Dados" },
  { page: "version-control", label: "Controle de Versão" },
]

export const PAGE_IDS = Object.keys(PAGE_TITLES) as PageId[]

/** Grupos do menu que contêm a página (para abrir o acordeão certo). */
export function ancestorsOf(pageId: PageId, nodes: NavNode[] = NAV, trail: string[] = []): string[] | null {
  for (const node of nodes) {
    if (node.kind === "page" && node.page === pageId) return trail
    if (node.kind === "group") {
      const found = ancestorsOf(pageId, node.children, [...trail, node.id])
      if (found) return found
    }
  }
  return null
}
