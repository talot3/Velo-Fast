import type { ComponentProps, ComponentType, ReactNode } from "react"

import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card"
import { TableHead, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"

export type ReportTone = "default" | "info" | "success" | "danger" | "brand"

export const TONE_TEXT: Record<ReportTone, string> = {
  default: "text-foreground",
  info: "text-chart-3",
  success: "text-success",
  danger: "text-destructive",
  brand: "text-primary",
}

/**
 * Cartão de indicador com acabamento "tátil" (antigo .rich-kpi-card do
 * Dashboard, usado também pelo Fluxo de Caixa e pelo Ponto de Equilíbrio):
 * título em caixa alta, valor grande e o carimbo com ícone no canto.
 */
export function RichKpiCard({ className, children, ...props }: ComponentProps<typeof Card>) {
  return (
    <Card
      className={cn(
        "relative min-h-[125px] justify-between gap-2 overflow-hidden border-b-4 border-b-input bg-linear-to-br from-card to-background px-5 py-4.5 shadow-md transition-transform hover:-translate-y-0.5",
        className
      )}
      {...props}
    >
      {children}
    </Card>
  )
}

export function RichKpiTitle({ className, ...props }: ComponentProps<typeof CardDescription>) {
  return <CardDescription className={cn("text-[11px] font-extrabold uppercase tracking-wider", className)} {...props} />
}

export function RichKpiValue({ tone = "default", className, ...props }: ComponentProps<typeof CardTitle> & { tone?: ReportTone }) {
  return <CardTitle className={cn("text-[26px] leading-none font-black tracking-tighter tabular-nums", TONE_TEXT[tone], className)} {...props} />
}

/** Carimbo do canto inferior direito (antigo .micro-emboss-stamp). */
export function KpiStamp({
  icon: Icon,
  tone = "default",
  className,
}: {
  icon: ComponentType<{ className?: string }>
  tone?: ReportTone
  className?: string
}) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "absolute right-3.5 bottom-3 flex size-8 items-center justify-center rounded-lg border border-dashed bg-foreground/[0.03] opacity-85 shadow-inner",
        TONE_TEXT[tone],
        className
      )}
    >
      <Icon className="size-4" />
    </div>
  )
}

/** Cartão das tabelas contábeis (antigo .dre-table-card). */
export function ReportTableCard({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <Card className={cn("gap-0 overflow-hidden bg-linear-to-br from-card to-background py-0 shadow-sm", className)}>
      <CardContent className="px-0">{children}</CardContent>
    </Card>
  )
}

/** Cabeçalho das tabelas contábeis: caixa alta, fundo de destaque. */
export function ReportHeadRow({ children }: { children: ReactNode }) {
  return <TableRow className="bg-accent hover:bg-accent">{children}</TableRow>
}

export function ReportHead({ className, ...props }: ComponentProps<typeof TableHead>) {
  return (
    <TableHead
      className={cn("h-auto px-4.5 py-3 text-[11px] font-extrabold uppercase tracking-wider whitespace-normal text-muted-foreground", className)}
      {...props}
    />
  )
}
