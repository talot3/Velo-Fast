/**
 * Módulo de Precificação (antigo portal/precificacao.js): estado da ficha
 * técnica e fórmulas. Agora o estado é por produto (product.pricing).
 */
import type { PricingData } from "@/data/types"

export type Insumo = PricingData["insumos"][number]
export type PricingMethod = PricingData["metodo"]

/** Ficha técnica de exemplo do sistema antigo (Concreto H-21 → CDT R$ 247,87). */
export function defaultPricing(): PricingData {
  return {
    metodo: "markup",
    insumos: [
      { id: 1, desc: "Cimento CP-II E-32 (sc 50kg)", qtd: 2.5, unid: "sc", custoUnit: 35.0 },
      { id: 2, desc: "Brita 1 (m³ posto obra)", qtd: 0.55, unid: "m³", custoUnit: 95.0 },
      { id: 3, desc: "Areia Média Lavada (m³)", qtd: 0.4, unid: "m³", custoUnit: 72.0 },
      { id: 4, desc: "Água Tratada (m³)", qtd: 0.18, unid: "m³", custoUnit: 7.5 },
      { id: 5, desc: "Aditivo Plastificante BASF (L)", qtd: 0.6, unid: "L", custoUnit: 9.95 },
    ],
    maoDeObra: 42.0,
    cgf: 30.0,
    pctDespesas: 12.0,
    pctImpostos: 11.0,
    pctLucroDesejado: 15.0,
    precoMercado: 0,
  }
}

const num = (v: unknown) => {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? ""))
  return Number.isFinite(n) ? n : 0
}

/** Aceita o JSON salvo no produto mesmo que venha incompleto. */
export function normalizePricing(raw: Partial<PricingData> | null | undefined): PricingData {
  const base = defaultPricing()
  if (!raw || typeof raw !== "object") return base
  const insumos = Array.isArray(raw.insumos)
    ? raw.insumos.map((r, i) => ({
        id: Number.isFinite(Number(r?.id)) ? Number(r.id) : i + 1,
        desc: String(r?.desc ?? ""),
        qtd: num(r?.qtd),
        unid: String(r?.unid ?? ""),
        custoUnit: num(r?.custoUnit),
      }))
    : base.insumos
  return {
    metodo: raw.metodo === "custo-meta" ? "custo-meta" : "markup",
    insumos,
    maoDeObra: raw.maoDeObra === undefined ? base.maoDeObra : num(raw.maoDeObra),
    cgf: raw.cgf === undefined ? base.cgf : num(raw.cgf),
    pctDespesas: raw.pctDespesas === undefined ? base.pctDespesas : num(raw.pctDespesas),
    pctImpostos: raw.pctImpostos === undefined ? base.pctImpostos : num(raw.pctImpostos),
    pctLucroDesejado: raw.pctLucroDesejado === undefined ? base.pctLucroDesejado : num(raw.pctLucroDesejado),
    precoMercado: num(raw.precoMercado),
  }
}

/**
 * Estado inicial ao abrir o produto: a ficha salva nele; sem ficha, o exemplo
 * padrão com o preço de mercado = preço de venda atual (como o antigo fazia).
 */
export function initialPricing(product: { pricing: PricingData | null; price: number } | null): PricingData {
  if (product?.pricing) return normalizePricing(product.pricing)
  const state = defaultPricing()
  if (product && product.price > 0) state.precoMercado = product.price
  return state
}

export function nextInsumoId(insumos: Insumo[]): number {
  return insumos.reduce((max, r) => Math.max(max, r.id), 0) + 1
}

export function insumoTotal(row: Insumo): number {
  return num(row.qtd) * num(row.custoUnit)
}

export type PricingResult = {
  custoInsumos: number
  custoTotal: number
  precoVenda: number
  markup: number
  receitaBruta: number
  descontoImpostos: number
  receitaLiquida: number
  cpv: number
  resultadoBruto: number
  despesasOper: number
  lucroLiquido: number
  pctLucratividade: number
  tetoCusto: number
  divisor: number
}

/** Fórmulas do antigo precCalc(). */
export function calcPricing(s: PricingData): PricingResult {
  const custoInsumos = s.insumos.reduce((acc, row) => acc + insumoTotal(row), 0)
  const custoTotal = custoInsumos + num(s.maoDeObra) + num(s.cgf)

  const pctDesp = num(s.pctDespesas) / 100
  const pctImp = num(s.pctImpostos) / 100
  const pctLucro = num(s.pctLucroDesejado) / 100
  const divisor = 1 - pctDesp - pctImp - pctLucro

  let precoVenda = 0
  let markup = 0
  if (s.metodo === "markup") {
    if (divisor > 0) {
      precoVenda = custoTotal / divisor
      markup = 1 / divisor
    }
  } else {
    // Custo-meta: o usuário informa o preço de mercado.
    precoVenda = num(s.precoMercado)
    if (precoVenda > 0 && divisor > 0) markup = 1 / divisor
  }

  // DRE unitária
  const receitaBruta = precoVenda
  const descontoImpostos = receitaBruta * pctImp
  const receitaLiquida = receitaBruta - descontoImpostos
  const cpv = custoTotal
  const resultadoBruto = receitaLiquida - cpv
  const despesasOper = receitaBruta * pctDesp
  const lucroLiquido = resultadoBruto - despesasOper
  const pctLucratividade = receitaBruta > 0 ? (lucroLiquido / receitaBruta) * 100 : 0

  // Custo-meta: teto de custo permitido
  const tetoCusto = s.metodo === "custo-meta" ? precoVenda * divisor : 0

  return {
    custoInsumos,
    custoTotal,
    precoVenda,
    markup,
    receitaBruta,
    descontoImpostos,
    receitaLiquida,
    cpv,
    resultadoBruto,
    despesasOper,
    lucroLiquido,
    pctLucratividade,
    tetoCusto,
    divisor,
  }
}

export type TetoStatus = "ok" | "warn" | "danger"

/** ok: CDT ≤ 90% do teto · warn: CDT ≤ teto · danger: acima (ou teto ≤ 0). */
export function tetoStatus(c: PricingResult): TetoStatus {
  if (c.tetoCusto <= 0) return "danger"
  if (c.custoTotal <= c.tetoCusto * 0.9) return "ok"
  if (c.custoTotal <= c.tetoCusto) return "warn"
  return "danger"
}

/** Sinal do resultado (cor da linha final da DRE e do percentual). */
export function resultTone(value: number, tolerance = 0): "positive" | "negative" | "zero" {
  if (value > tolerance) return "positive"
  if (value < -tolerance) return "negative"
  return "zero"
}

/** "× 1,6129" (antigo toFixed(4), agora com vírgula). */
export function formatMarkup(markup: number): string {
  return markup.toFixed(4).replace(".", ",")
}

/** "(11%)" / "(11,5%)" — rótulo das linhas de impostos e despesas. */
export function formatPctLabel(value: number): string {
  return `(${String(num(value)).replace(".", ",")}%)`
}
