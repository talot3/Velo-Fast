import { useState, type ComponentProps, type ComponentType, type ReactNode } from "react"
import { TriangleAlertIcon } from "lucide-react"

import { DateRangeFilter } from "@/components/app/date-range-filter"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { DateRange } from "@/data/reports"
import { errorMessage } from "@/lib/errors"
import { formatPercent, presetRange } from "@/lib/format"
import { cn } from "@/lib/utils"

/** Período aplicado ao relatório — começa em "Hoje", como no sistema antigo. */
export function useReportRange() {
  return useState<DateRange>(() => presetRange("hoje"))
}

/**
 * Esqueleto comum dos relatórios de vendas: filtro De/Até com atalhos,
 * cabeçalho "Resultados da Busca" com o botão de exportar e o conteúdo.
 */
export function SalesReportLayout({
  idPrefix,
  range,
  onRangeChange,
  action,
  error,
  children,
}: {
  /** Prefixo dos ids dos campos de data (prod, term, sangria, filter, fechamento). */
  idPrefix: string
  range: DateRange
  onRangeChange: (range: DateRange) => void
  action: ReactNode
  error?: unknown
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-6">
      <DateRangeFilter idPrefix={idPrefix} value={range} onChange={onRangeChange} defaultPreset="hoje" />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-black tracking-tight">Resultados da Busca</h3>
        {action}
      </div>

      {error ? (
        <Alert variant="destructive">
          <TriangleAlertIcon />
          <AlertTitle>Não foi possível carregar o relatório.</AlertTitle>
          <AlertDescription>{errorMessage(error)}</AlertDescription>
        </Alert>
      ) : null}

      {children}
    </div>
  )
}

export type Tone = "default" | "brand" | "success" | "danger"

export const TONE_TEXT: Record<Tone, string> = {
  default: "text-foreground",
  brand: "text-primary",
  success: "text-success",
  danger: "text-destructive",
}

/** Grade dos indicadores (1 coluna no celular). */
export function ReportKpiGrid({ columns = 3, children }: { columns?: 2 | 3; children: ReactNode }) {
  return <div className={cn("grid grid-cols-1 gap-4", columns === 3 ? "md:grid-cols-3" : "md:grid-cols-2")}>{children}</div>
}

/**
 * Cartão de indicador dos relatórios (antigo .velo-kpi-card): rótulo em caixa
 * alta, ícone num quadradinho à direita e o valor grande com a unidade miúda.
 * Sem ícone, vira o antigo .stat-box do Fechamento.
 */
export function ReportKpiCard({
  label,
  value,
  unit,
  icon: Icon,
  iconTone = "default",
  tone = "default",
  loading,
}: {
  label: string
  value: ReactNode
  unit?: string
  icon?: ComponentType<{ className?: string }>
  iconTone?: Tone
  tone?: Tone
  loading?: boolean
}) {
  return (
    <Card className="group relative min-h-[124px] justify-between gap-3 overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-md">
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-[3px] bg-transparent transition-colors group-hover:bg-primary" />
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <CardDescription className="text-[11px] font-extrabold tracking-wider uppercase">{label}</CardDescription>
        {Icon ? (
          <div
            aria-hidden="true"
            className={cn(
              "flex size-8 shrink-0 items-center justify-center rounded-lg border bg-background transition-colors group-hover:text-primary",
              iconTone === "default" ? "text-muted-foreground" : TONE_TEXT[iconTone]
            )}
          >
            <Icon className="size-4" />
          </div>
        ) : null}
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-9 w-32" />
        ) : (
          <CardTitle className={cn("flex items-baseline gap-1 text-[32px] leading-none font-black tracking-tighter tabular-nums", TONE_TEXT[tone])}>
            {value}
            {unit ? <span className="text-sm font-bold tracking-normal text-muted-foreground">{unit}</span> : null}
          </CardTitle>
        )}
      </CardContent>
    </Card>
  )
}

export type ReportColumn = { label: string; className?: string }

/**
 * Tabela dos relatórios (antigo .velo-table dentro de .velo-table-card).
 * `compact`: títulos numa linha só e colunas mais justas (antiga .modern-table
 * do Fechamento) — use também `ReportCell compact` nas linhas.
 */
export function ReportTable({ columns, compact, children }: { columns: ReportColumn[]; compact?: boolean; children: ReactNode }) {
  return (
    <Card className="gap-0 overflow-hidden py-0">
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30">
              {columns.map((c) => (
                <TableHead
                  key={c.label}
                  className={cn(
                    "h-auto py-4 text-[10px] font-black text-muted-foreground uppercase",
                    compact ? "px-4 tracking-wider whitespace-nowrap" : "px-6 tracking-[0.12em] whitespace-normal",
                    c.className
                  )}
                >
                  {c.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>{children}</TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

/** Célula com o espaçamento das tabelas de relatório. */
export function ReportCell({ className, compact, ...props }: ComponentProps<typeof TableCell> & { compact?: boolean }) {
  return <TableCell className={cn("py-4 text-[13.5px] font-semibold whitespace-normal", compact ? "px-4" : "px-6", className)} {...props} />
}

/** Linha de TOTAL GERAL / TOTAL RETIRADO. */
export function ReportTotalRow({ className, ...props }: ComponentProps<typeof TableRow>) {
  return <TableRow className={cn("border-t-[1.5px] bg-accent/50 hover:bg-accent/50", className)} {...props} />
}

/** Linhas-fantasma enquanto o relatório carrega. */
export function LoadingRows({ colSpan, rows = 4 }: { colSpan: number; rows?: number }) {
  return Array.from({ length: rows }, (_, i) => (
    <TableRow key={i} className="hover:bg-transparent">
      <TableCell colSpan={colSpan} className="px-6 py-4">
        <Skeleton className="h-7 w-full" />
      </TableCell>
    </TableRow>
  ))
}

/** Estado vazio dentro da tabela (antigo .velo-empty-state). */
export function EmptyRow({ colSpan, icon: Icon, text }: { colSpan: number; icon?: ComponentType<{ className?: string }>; text: string }) {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell colSpan={colSpan} className="p-0 whitespace-normal">
        <div className="flex flex-col items-center justify-center gap-4 px-6 py-18 text-center">
          {Icon ? <Icon className="size-16 stroke-[1.2] text-muted-foreground opacity-60" /> : null}
          <p className="max-w-80 text-sm leading-normal font-bold text-muted-foreground">{text}</p>
        </div>
      </TableCell>
    </TableRow>
  )
}

/** Pílulas "FORMA: n x" das formas de pagamento usadas. Forma vazia vira "N/D". */
export function PaymentChips({ methods }: { methods: Record<string, number> }) {
  const entries = Object.entries(methods)
  if (entries.length === 0) return null
  return (
    <div className="flex flex-wrap gap-1.5">
      {entries.map(([method, n]) => (
        <Badge key={method || "N/D"} variant="outline" className="rounded-md bg-accent px-2 py-1 text-[11px] font-bold">
          {`${method || "N/D"}: ${n}x`}
        </Badge>
      ))}
    </div>
  )
}

/** Participação no total (0–100). */
export function share(value: number, total: number): number {
  return total > 0 ? (value / total) * 100 : 0
}

/** Barra "% do Total" com o percentual ao lado. */
export function ShareBar({ pct }: { pct: number }) {
  const clamped = Math.max(0, Math.min(100, pct))
  return (
    <div className="flex min-w-28 items-center gap-2">
      <Progress value={clamped} className="h-2 flex-1 bg-accent" aria-label={`${formatPercent(pct)} do total`} />
      <span className="text-[13px] font-extrabold tabular-nums">{formatPercent(pct)}</span>
    </div>
  )
}
