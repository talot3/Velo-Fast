/**
 * Formatação e datas no padrão brasileiro. As datas de negócio ("hoje",
 * filtros De/Até) são sempre no fuso de São Paulo, não no fuso do aparelho
 * nem em UTC.
 */
export const TIME_ZONE = "America/Sao_Paulo"

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })
const decimal2 = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/** "R$ 1.234,56" */
export function formatBRL(value: number | string | null | undefined): string {
  return brl.format(Number(value ?? 0) || 0)
}

/** "R$ 12.50" — formato com ponto usado em várias telas do sistema original. */
export function formatMoneyDot(value: number | string | null | undefined): string {
  return `R$ ${(Number(value ?? 0) || 0).toFixed(2)}`
}

/** "R$ 12,50" — formato com vírgula usado nos teclados numéricos e comprovantes. */
export function formatMoneyComma(value: number | string | null | undefined): string {
  return `R$ ${(Number(value ?? 0) || 0).toFixed(2).replace(".", ",")}`
}

/** "1.234,56" */
export function formatDecimal(value: number | string | null | undefined): string {
  return decimal2.format(Number(value ?? 0) || 0)
}

export function formatPercent(value: number, digits = 1): string {
  return `${(Number(value) || 0).toFixed(digits).replace(".", ",")}%`
}

/**
 * Lê um valor digitado no padrão brasileiro ou internacional:
 * "1.234,56" → 1234.56 · "150,50" → 150.5 · "150.50" → 150.5 · "R$ 9" → 9.
 * Retorna NaN se não houver número.
 */
export function parseMoneyBR(input: string | number | null | undefined): number {
  if (typeof input === "number") return input
  if (!input) return NaN
  let s = String(input).replace(/[^\d,.-]/g, "")
  if (!s) return NaN
  const lastComma = s.lastIndexOf(",")
  const lastDot = s.lastIndexOf(".")
  if (lastComma > lastDot) {
    s = s.replace(/\./g, "").replace(",", ".")
  } else if (lastDot > lastComma && lastComma !== -1) {
    s = s.replace(/,/g, "")
  } else if (lastComma === -1 && (s.match(/\./g) ?? []).length > 1) {
    s = s.replace(/\./g, "")
  }
  return Number(s)
}

/** Arredonda para centavos evitando erros de ponto flutuante (0,1 + 0,2). */
export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

/** Soma valores em centavos inteiros. */
export function sumMoney(values: number[]): number {
  return values.reduce((acc, v) => acc + Math.round(v * 100), 0) / 100
}

/** "YYYY-MM-DD" do dia em São Paulo para um instante (padrão: agora). */
export function toLocalDateString(date: Date | string | number = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(new Date(date))
}

export function todayBR(): string {
  return toLocalDateString()
}

/** Soma dias a uma data "YYYY-MM-DD" (sem depender do fuso do aparelho). */
export function addDays(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split("-").map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d + days))
  return dt.toISOString().slice(0, 10)
}

/** "DD/MM/YYYY" a partir de "YYYY-MM-DD" (sem conversão de fuso). */
export function formatDateBR(isoDate: string | null | undefined): string {
  if (!isoDate) return "N/A"
  const [y, m, d] = isoDate.slice(0, 10).split("-")
  if (!y || !m || !d) return isoDate
  return `${d}/${m}/${y}`
}

/** "26/09/2026, 14:03:12" no fuso de São Paulo. */
export function formatDateTimeBR(value: Date | string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—"
  return new Date(value).toLocaleString("pt-BR", { timeZone: TIME_ZONE })
}

export function formatTimeBR(value: Date | string | number = new Date(), withSeconds = false): string {
  return new Date(value).toLocaleTimeString("pt-BR", {
    timeZone: TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    ...(withSeconds ? { second: "2-digit" } : {}),
  })
}

/** Dias entre hoje (SP) e uma data "YYYY-MM-DD" (negativo = passou). */
export function daysUntil(isoDate: string): number {
  const utc = (iso: string) => {
    const [y, m, d] = iso.slice(0, 10).split("-").map(Number)
    return Date.UTC(y, m - 1, d)
  }
  return Math.round((utc(isoDate) - utc(todayBR())) / 86400000)
}

export type DatePreset = "hoje" | "ontem" | "7dias" | "30dias" | "esteMes" | "ultimoMes" | "esteAno" | "ultimoAno"

export const DATE_PRESETS: { id: DatePreset; label: string }[] = [
  { id: "hoje", label: "Hoje" },
  { id: "ontem", label: "Ontem" },
  { id: "7dias", label: "7 dias atrás" },
  { id: "30dias", label: "30 dias atrás" },
  { id: "esteMes", label: "Este mês" },
  { id: "ultimoMes", label: "Último mês" },
  { id: "esteAno", label: "Este ano" },
  { id: "ultimoAno", label: "Último ano" },
]

/** Intervalo [de, até] de um atalho de período (datas "YYYY-MM-DD" em SP). */
export function presetRange(preset: DatePreset): { from: string; to: string } {
  const today = todayBR()
  const [y, m] = today.split("-").map(Number)
  const pad = (n: number) => String(n).padStart(2, "0")
  const lastDayOfMonth = (year: number, month: number) => new Date(Date.UTC(year, month, 0)).getUTCDate()
  switch (preset) {
    case "hoje":
      return { from: today, to: today }
    case "ontem": {
      const d = addDays(today, -1)
      return { from: d, to: d }
    }
    case "7dias":
      return { from: addDays(today, -7), to: today }
    case "30dias":
      return { from: addDays(today, -30), to: today }
    case "esteMes":
      return { from: `${y}-${pad(m)}-01`, to: today }
    case "ultimoMes": {
      const py = m === 1 ? y - 1 : y
      const pm = m === 1 ? 12 : m - 1
      return { from: `${py}-${pad(pm)}-01`, to: `${py}-${pad(pm)}-${pad(lastDayOfMonth(py, pm))}` }
    }
    case "esteAno":
      return { from: `${y}-01-01`, to: today }
    case "ultimoAno":
      return { from: `${y - 1}-01-01`, to: `${y - 1}-12-31` }
  }
}

/** CNPJ "00.000.000/0000-00" quando tiver 14 dígitos. */
export function formatCNPJ(cnpj: string | null | undefined): string {
  const digits = (cnpj ?? "").replace(/\D/g, "")
  if (digits.length !== 14) return cnpj ?? ""
  return digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5")
}
