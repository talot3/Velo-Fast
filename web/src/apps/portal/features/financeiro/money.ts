import { parseMoneyBR, roundMoney } from "@/lib/format"

/** Número → texto de campo de digitação ("1234,56"). */
export function toMoneyInput(value: number | null | undefined): string {
  const n = Number(value ?? 0) || 0
  return n.toFixed(2).replace(".", ",")
}

/** Texto digitado ("150,50", "1.234,56", "150.50") → número; vazio/inválido = 0. */
export function fromMoneyInput(text: string): number {
  const n = parseMoneyBR(text)
  return Number.isFinite(n) ? roundMoney(n) : 0
}

/** Soma os valores de um mapa forma → valor. */
export function sumValues(map: Record<string, number> | null | undefined): number {
  return roundMoney(Object.values(map ?? {}).reduce((acc, v) => acc + (Number(v) || 0), 0))
}
