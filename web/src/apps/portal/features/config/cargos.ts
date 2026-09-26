/**
 * Cargos e permissões (coleção "cargos" em store_records). Mesmo formato do
 * sistema antigo: { id, nome (MAIÚSCULO), permissoes: { chave: boolean } }.
 */
import { useRecords } from "@/data/records"

export const CARGO_PERM_KEYS = [
  "cadastros",
  "produtos",
  "financeiro",
  "estoque",
  "relatorios",
  "vendas",
  "vendas_cartoes",
  "configuracoes",
] as const

export type CargoPermKey = (typeof CARGO_PERM_KEYS)[number]

export type Cargo = {
  id: number | string
  nome: string
  permissoes: Partial<Record<CargoPermKey, boolean>>
}

function permissions(value: boolean): Record<CargoPermKey, boolean> {
  return Object.fromEntries(CARGO_PERM_KEYS.map((k) => [k, value])) as Record<CargoPermKey, boolean>
}

/** Os dois cargos padrão do sistema antigo (mostrados enquanto a coleção está vazia). */
export const CARGO_SEED: Cargo[] = [
  { id: 1, nome: "ADMINISTRADOR", permissoes: permissions(true) },
  { id: 2, nome: "OPERADOR DE CAIXA", permissoes: { ...permissions(false), vendas: true } },
]

/** Permissões de um cargo novo: só "vendas". */
export function newCargoPermissions(): Record<CargoPermKey, boolean> {
  return { ...permissions(false), vendas: true }
}

/**
 * Módulos exibidos no formulário, agrupados por "Modulo: ...". O antigo não
 * tinha a caixa de "estoque" (sempre gravava false); agora ela existe.
 */
export const CARGO_MODULES: { key: CargoPermKey; label: string; modulo: string }[] = [
  { key: "cadastros", label: "CLIENTES E CADASTROS DE BASE", modulo: "CADASTROS" },
  { key: "produtos", label: "CATÁLOGO DE PRODUTOS E PREÇOS", modulo: "CADASTROS" },
  { key: "financeiro", label: "FINANCEIRO (CONTAS, FLUXOS E BANCO)", modulo: "CADASTROS" },
  { key: "estoque", label: "CONTROLE DE ESTOQUE E INVENTÁRIO", modulo: "ESTOQUE" },
  { key: "configuracoes", label: "CONFIGURAÇÕES DA LOJA E TERMINAIS", modulo: "CONFIGURAÇÕES LOJA" },
  { key: "relatorios", label: "RELATÓRIOS ANALÍTICOS DE GESTÃO", modulo: "RELATÓRIOS" },
  { key: "vendas", label: "REALIZAR VENDAS NO PDV / OPERAÇÃO", modulo: "VENDAS" },
  { key: "vendas_cartoes", label: "CONCILIAÇÃO E CARTÕES DE VENDAS", modulo: "VENDAS CARTOES" },
]

/** Módulos agrupados na ordem em que aparecem. */
export function groupedCargoModules() {
  const groups = new Map<string, typeof CARGO_MODULES>()
  for (const m of CARGO_MODULES) {
    const list = groups.get(m.modulo) ?? []
    list.push(m)
    groups.set(m.modulo, list)
  }
  return [...groups.entries()]
}

export function enabledModulesCount(cargo: Cargo): number {
  return Object.values(cargo.permissoes ?? {}).filter(Boolean).length
}

export function useCargos() {
  return useRecords<Cargo>("cargos", CARGO_SEED)
}
