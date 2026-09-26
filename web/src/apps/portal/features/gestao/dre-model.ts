/**
 * DRE Personalizada — modelo, exemplos e motor de valores.
 * Mesmas regras do sistema anterior (legacy/portal/app.js:6109-7027).
 */

export type DreLineType = "calculo" | "receitas" | "despesas" | "compras_mercadorias" | "somar" | "formas_pagamento"

export type DrePlanoContasRule = {
  id: number
  /** Nome do plano; termina com " (Com Filhos)" quando "Incluir Filhos?" foi marcado. */
  name: string
  tpData: string
  tpValor: string
  active: boolean
}

export type DreLine = {
  id: number
  parentId: number | null
  /** Prefixo "(+)", "(-)" ou "(=)" vira o selo da linha. */
  description: string
  order: number
  type: DreLineType
  val: number
  percent: number
  expanded: boolean
  bold: boolean
  showPercent: boolean
  planoContasRules?: DrePlanoContasRule[]
  /** Linha base do percentual (Valor linha / Valor linha cálculo * 100). */
  linhaCalculoId?: number | null
}

const rule = (id: number, name: string, tpData: string, tpValor: string): DrePlanoContasRule[] => [
  { id, name, tpData, tpValor, active: true },
]

/** Estrutura de exemplo (CPC 26) com as regras de plano de contas — ids 1001-1016. */
export const DRE_SEED: DreLine[] = [
  { id: 1001, parentId: null, description: "(+) RECEITA BRUTA DE VENDAS", order: 1, type: "somar", val: 0, percent: 100, expanded: true, bold: true, showPercent: true },
  { id: 1002, parentId: 1001, description: "Vendas de Mercadorias (Frente Caixa)", order: 1, type: "receitas", val: 38000, percent: 0, expanded: true, bold: false, showPercent: true, planoContasRules: rule(1, "Vendas de Mercadorias (Frente Caixa)", "Emissão", "Pago/Recebido") },
  { id: 1003, parentId: 1001, description: "Prestação de Serviços Especializados", order: 2, type: "receitas", val: 17450, percent: 0, expanded: true, bold: false, showPercent: true, planoContasRules: rule(2, "Prestação de Serviços Especializados", "Emissão", "Pago/Recebido") },
  { id: 1004, parentId: null, description: "(-) DEDUÇÕES DA RECEITA BRUTA", order: 2, type: "somar", val: 0, percent: 0, expanded: true, bold: true, showPercent: true },
  { id: 1005, parentId: 1004, description: "Impostos sobre Vendas (ICMS/ISS/PIS)", order: 1, type: "despesas", val: 3400, percent: 0, expanded: true, bold: false, showPercent: true, planoContasRules: rule(3, "Impostos sobre Vendas (ICMS/ISS/PIS)", "Vencimento", "Original") },
  { id: 1006, parentId: 1004, description: "Devoluções e Abatimentos de Clientes", order: 2, type: "despesas", val: 1800, percent: 0, expanded: true, bold: false, showPercent: true, planoContasRules: rule(4, "Devoluções e Abatimentos de Clientes", "Registro", "Original") },
  { id: 1007, parentId: null, description: "(=) RECEITA LÍQUIDA DE VENDAS", order: 3, type: "calculo", val: 0, percent: 0, expanded: true, bold: true, showPercent: true },
  { id: 1008, parentId: null, description: "(-) CUSTOS OPERACIONAIS (CMV/CPV)", order: 4, type: "somar", val: 0, percent: 0, expanded: true, bold: true, showPercent: true },
  { id: 1009, parentId: 1008, description: "Custo de Mercadorias Vendidas (CMV)", order: 1, type: "compras_mercadorias", val: 11200, percent: 0, expanded: true, bold: false, showPercent: true, planoContasRules: rule(5, "Custo de Mercadorias Vendidas (CMV)", "Data de finalização", "Original") },
  { id: 1010, parentId: 1008, description: "Custo de Serviços Prestados (CSP)", order: 2, type: "compras_mercadorias", val: 4200, percent: 0, expanded: true, bold: false, showPercent: true, planoContasRules: rule(6, "Custo de Serviços Prestados (CSP)", "Data de finalização", "Original") },
  { id: 1011, parentId: null, description: "(=) RESULTADO BRUTO (LUCRO BRUTO)", order: 5, type: "calculo", val: 0, percent: 0, expanded: true, bold: true, showPercent: true },
  { id: 1012, parentId: null, description: "(-) DESPESAS OPERACIONAIS", order: 6, type: "somar", val: 0, percent: 0, expanded: false, bold: true, showPercent: true },
  { id: 1013, parentId: 1012, description: "Despesas Administrativas do Período", order: 1, type: "despesas", val: 4500, percent: 0, expanded: true, bold: false, showPercent: true, planoContasRules: rule(7, "Despesas Administrativas do Período", "Vencimento", "Original") },
  { id: 1014, parentId: 1012, description: "Despesas Comerciais e Logística", order: 2, type: "despesas", val: 3300, percent: 0, expanded: true, bold: false, showPercent: true, planoContasRules: rule(8, "Despesas Comerciais e Logística", "Vencimento", "Original") },
  { id: 1015, parentId: 1012, description: "Pró-labore e Salários e Encargos", order: 3, type: "despesas", val: 2000, percent: 0, expanded: true, bold: false, showPercent: true, planoContasRules: rule(9, "Pró-labore e Salários e Encargos", "Vencimento", "Original") },
  { id: 1016, parentId: null, description: "(=) RESULTADO LÍQUIDO DO EXERCÍCIO", order: 7, type: "calculo", val: 0, percent: 0, expanded: true, bold: true, showPercent: true },
]

export const DRE_TYPE_OPTIONS: { value: DreLineType; label: string }[] = [
  { value: "calculo", label: "Cálculo" },
  { value: "receitas", label: "Receitas" },
  { value: "despesas", label: "Despesas" },
  { value: "compras_mercadorias", label: "Compras de Mercadorias" },
  { value: "somar", label: "Somar Filhos" },
  { value: "formas_pagamento", label: "Formas Pagamento (Valor Lançado)" },
]

/** Tipos com painel de plano de contas (e valor calculado pelas regras). */
export const DRE_RULE_TYPES: DreLineType[] = ["receitas", "despesas", "compras_mercadorias"]

export function isRuleType(type: DreLineType): boolean {
  return DRE_RULE_TYPES.includes(type)
}

/** Opções fixas de "Plano de contas." por tipo de informação ("" = sem plano). */
export function drePlanoOptions(type: DreLineType): { value: string; label: string }[] {
  const names: Partial<Record<DreLineType, string[]>> = {
    receitas: ["RECEITAS", "RECEITA BRUTA DE VENDAS", "Receitas Financeiras"],
    despesas: ["DESPESAS", "Despesas Administrativas", "Despesas de Pessoal", "Despesas Tributárias"],
    compras_mercadorias: ["COMPRAS DE MERCADORIAS", "Custo de Mercadorias Vendidas (CMV)"],
  }
  const list = names[type]
  return list ? list.map((n) => ({ value: n, label: n })) : [{ value: "", label: "—" }]
}

/** "Tipo data": compras de mercadorias têm opções próprias. */
export function dreDateOptions(type: DreLineType): string[] {
  return type === "compras_mercadorias"
    ? ["Emissão", "Data de finalização"]
    : ["Registro", "Emissão", "Vencimento", "Recebimento/Pagamento"]
}

export const DRE_VALUE_TYPES = ["Original", "Pendente", "Pago/Recebido", "Estornado", "Multa/Juros", "Desconto"]

/**
 * Valor ilustrativo gravado nas linhas com regras (o sistema anterior não
 * lia lançamentos: o valor vem do nome de cada regra ativa, na mesma ordem
 * de testes de app.js:6834-6853).
 */
export function fabricatedRuleValue(rules: DrePlanoContasRule[]): number {
  let val = 0
  for (const r of rules) {
    if (!r.active) continue
    const n = r.name
    if (n.includes("RECEITA BRUTA")) val += 55450
    else if (n.includes("Mercadorias")) val += 38000
    else if (n.includes("Serviços")) val += 17450
    else if (n.includes("DESPESAS")) val += 9800
    else if (n.includes("Administrativas")) val += 4500
    else if (n.includes("Comerciais") || n.includes("Logística")) val += 3300
    else if (n.includes("Pessoal") || n.includes("Salários") || n.includes("Pró-labore")) val += 2000
    else if (n.includes("COMPRAS")) val += 15400
    else if (n.includes("CMV")) val += 11200
    else if (n.includes("CSP") || n.includes("Serviços Prestados")) val += 4200
    else if (n.includes("Impostos") || n.includes("Deduções")) val += 5200
    else if (n.includes("Tributárias") || n.includes("ICMS")) val += 3400
    else if (n.includes("Devoluções")) val += 1800
    else val += 1500
  }
  return val
}

const num = (v: unknown, fallback = 0): number => {
  const n = typeof v === "number" ? v : Number(v)
  return Number.isFinite(n) ? n : fallback
}

/** Normaliza linhas vindas do banco e ordena como o sistema anterior (ordem de criação). */
export function normalizeDreLines(items: DreLine[]): DreLine[] {
  return items
    .map((l) => ({
      ...l,
      id: num(l.id),
      parentId: l.parentId === null || l.parentId === undefined || (l.parentId as unknown) === "" ? null : num(l.parentId),
      description: String(l.description ?? ""),
      order: num(l.order, 1),
      val: num(l.val),
      percent: num(l.percent),
      expanded: Boolean(l.expanded),
      bold: Boolean(l.bold),
      showPercent: Boolean(l.showPercent),
    }))
    .sort((a, b) => a.id - b.id)
}

/**
 * Recalcula `val` e `percent` (recalculateDreValues, app.js:6472-6535):
 * - "somar" = soma dos filhos;
 * - "calculo" pela descrição: RECEITA LÍQUIDA = RECEITA BRUTA − (DEDUÇÕES ou IMPOSTOS);
 *   RESULTADO/LUCRO BRUTO = RECEITA LÍQUIDA − CUSTO; RESULTADO/LUCRO LÍQUIDO ou
 *   RESULTADO DO EXERCÍCIO = LUCRO BRUTO − DESPESAS; outros = Σ raízes (+) − Σ raízes (−);
 * - percentual sobre a RECEITA BRUTA (ou linha com "ENTRADA"), ou sobre a linha de
 *   cálculo escolhida quando o valor dela for maior que zero.
 * Devolve cópias; as linhas originais não são alteradas.
 */
export function recalculateDreValues(input: DreLine[]): DreLine[] {
  const list = input.map((l) => ({ ...l }))
  const up = (s: string) => s.toUpperCase()
  const findVal = (pred: (l: DreLine) => boolean) => list.find(pred)?.val || 0

  function getNodeValue(node: DreLine, path: Set<number>): number {
    if (path.has(node.id)) return node.val || 0
    if (node.type === "somar") {
      const next = new Set(path).add(node.id)
      let sum = 0
      for (const c of list.filter((l) => l.parentId === node.id)) sum += getNodeValue(c, next)
      node.val = sum
      return sum
    }
    if (node.type === "calculo") {
      const desc = up(node.description)
      if (desc.includes("RECEITA LÍQUIDA")) {
        const receitaBruta = findVal((l) => up(l.description).includes("RECEITA BRUTA"))
        const deducoes = findVal((l) => up(l.description).includes("DEDUÇÕES") || up(l.description).includes("IMPOSTOS"))
        node.val = receitaBruta - deducoes
      } else if (desc.includes("RESULTADO BRUTO") || desc.includes("LUCRO BRUTO")) {
        const receitaLiquida = findVal((l) => up(l.description).includes("RECEITA LÍQUIDA"))
        const custos = findVal((l) => up(l.description).includes("CUSTO"))
        node.val = receitaLiquida - custos
      } else if (desc.includes("RESULTADO LÍQUIDO") || desc.includes("LUCRO LÍQUIDO") || desc.includes("RESULTADO DO EXERCÍCIO")) {
        const lucroBruto = findVal((l) => up(l.description).includes("LUCRO BRUTO") || up(l.description).includes("RESULTADO BRUTO"))
        const despesas = findVal((l) => up(l.description).includes("DESPESAS"))
        node.val = lucroBruto - despesas
      } else {
        const roots = list.filter((l) => l.parentId === null)
        const entradas = roots.filter((l) => l.description.includes("(+)")).reduce((acc, x) => acc + x.val, 0)
        const saidas = roots.filter((l) => l.description.includes("(-)")).reduce((acc, x) => acc + x.val, 0)
        node.val = entradas - saidas
      }
      return node.val
    }
    return node.val || 0
  }

  for (const node of list) {
    if (node.parentId === null) getNodeValue(node, new Set())
  }

  const receitaBrutaNode =
    list.find((l) => up(l.description).includes("RECEITA BRUTA")) || list.find((l) => l.description.includes("ENTRADA"))
  const defaultBaseVal = receitaBrutaNode ? receitaBrutaNode.val : 1
  for (const node of list) {
    let baseVal = defaultBaseVal
    if (node.linhaCalculoId) {
      const custom = list.find((l) => l.id === Number(node.linhaCalculoId))
      if (custom && custom.val > 0) baseVal = custom.val
    }
    node.percent = baseVal > 0 ? (node.val / baseVal) * 100 : 0
  }
  return list
}

export type DreTreeRow = { line: DreLine; depth: number; hasChildren: boolean }

/** Linhas visíveis da árvore: irmãos por `order`, filhos só quando o pai está expandido. */
export function buildDreTreeRows(list: DreLine[]): DreTreeRow[] {
  const rows: DreTreeRow[] = []
  const visit = (parentId: number | null, depth: number, path: Set<number>) => {
    const siblings = list.filter((l) => l.parentId === parentId).sort((a, b) => a.order - b.order)
    for (const node of siblings) {
      if (path.has(node.id)) continue
      const hasChildren = list.some((l) => l.parentId === node.id)
      rows.push({ line: node, depth, hasChildren })
      if (hasChildren && node.expanded) visit(node.id, depth + 1, new Set(path).add(node.id))
    }
  }
  visit(null, 0, new Set())
  return rows
}

/** Ids da linha e de todas as subdivisões (exclusão em cascata). */
export function dreSubtreeIds(list: DreLine[], id: number): number[] {
  const out: number[] = []
  const stack = [id]
  while (stack.length > 0) {
    const current = stack.pop() as number
    if (out.includes(current)) continue
    out.push(current)
    for (const child of list) if (child.parentId === current) stack.push(child.id)
  }
  return out
}

/** Selo contábil pelo prefixo da descrição: "(+)", "(-)" ou "(=)". */
export function dreBadge(description: string): { kind: "plus" | "minus" | "equals" | null; text: string } {
  if (description.startsWith("(+)")) return { kind: "plus", text: description.replace("(+)", "").trim() }
  if (description.startsWith("(-)")) return { kind: "minus", text: description.replace("(-)", "").trim() }
  if (description.startsWith("(=)")) return { kind: "equals", text: description.replace("(=)", "").trim() }
  return { kind: null, text: description }
}
