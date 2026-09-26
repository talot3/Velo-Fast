/**
 * Controle de versão: próxima versão (SemVer, patch + 1) e datas no fuso de
 * São Paulo. O sistema antigo sugeria a data em UTC no campo datetime-local
 * (3 horas adiantada); aqui o campo mostra e grava o horário de São Paulo.
 */
import type { Version } from "@/data/types"
import { TIME_ZONE } from "@/lib/format"

export const INITIAL_VERSION_DESCRIPTION =
  "Versão inicial de lançamento do sistema VELO com controle de vendas e impressão de cupom."

/** Versão inicial mostrada enquanto a loja não tem histórico (como no antigo). */
export function seedVersion(date: Date = new Date()): Version {
  return { id: 1, version: "1.0.0", date: date.toISOString(), description: INITIAL_VERSION_DESCRIPTION }
}

/** "1.0.0" → "1.0.1"; formato desconhecido → "1.0.1". */
export function nextPatchVersion(current: string | null | undefined): string {
  const parts = (current ?? "").replace(/[^0-9.]/g, "").split(".")
  if (parts.length === 3 && parts.every((p) => /^\d+$/.test(p))) {
    parts[2] = String(Number(parts[2]) + 1)
    return parts.join(".")
  }
  return "1.0.1"
}

function zonedParts(ts: number) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(ts))
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? "00"
  return { year: get("year"), month: get("month"), day: get("day"), hour: get("hour"), minute: get("minute"), second: get("second") }
}

/** Diferença (ms) entre o relógio de São Paulo e o UTC num instante. */
function offsetAt(ts: number): number {
  const p = zonedParts(ts)
  const asUtc = Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day), Number(p.hour), Number(p.minute), Number(p.second))
  return asUtc - Math.floor(ts / 1000) * 1000
}

/** Valor "YYYY-MM-DDTHH:mm" (horário de São Paulo) para um input datetime-local. */
export function saoPauloDateTimeInput(date: Date = new Date()): string {
  const p = zonedParts(date.getTime())
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`
}

/** Converte o valor do datetime-local (horário de São Paulo) em ISO UTC. */
export function saoPauloInputToIso(value: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value)
  if (!m) return null
  const [y, mo, d, h, mi] = m.slice(1).map(Number)
  const wall = Date.UTC(y, mo - 1, d, h, mi)
  let ts = wall - offsetAt(wall)
  const corrected = wall - offsetAt(ts)
  if (corrected !== ts) ts = corrected
  return new Date(ts).toISOString()
}

/** "26 de setembro de 2026 às 12:59" no fuso de São Paulo. */
export function formatVersionDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleDateString("pt-BR", {
    timeZone: TIME_ZONE,
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

/** Mais recente primeiro. */
export function sortVersionsDesc(versions: Version[]): Version[] {
  const time = (v: Version) => {
    const t = new Date(v.date).getTime()
    return Number.isNaN(t) ? 0 : t
  }
  return [...versions].sort((a, b) => time(b) - time(a))
}
