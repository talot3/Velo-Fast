import { TIME_ZONE } from "@/lib/format"

const hourFormat = new Intl.DateTimeFormat("pt-BR", { timeZone: TIME_ZONE, hour: "numeric", hourCycle: "h23" })

/** Hora cheia (0–23) no fuso de São Paulo, qualquer que seja o fuso do aparelho. */
export function hourBR(date: Date = new Date()): number {
  const hour = hourFormat.formatToParts(date).find((p) => p.type === "hour")?.value
  return Number(hour ?? 0) % 24
}

/** Saudação da tela Início: "Bom dia" (até 11h59), "Boa tarde" (até 17h59), "Boa noite". */
export function greetingFor(date: Date = new Date()): string {
  const hour = hourBR(date)
  if (hour < 12) return "Bom dia"
  if (hour < 18) return "Boa tarde"
  return "Boa noite"
}
