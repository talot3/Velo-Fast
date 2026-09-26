import type { ComponentType, ReactNode } from "react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

type KpiCardProps = {
  label: string
  value: ReactNode
  hint?: ReactNode
  icon?: ComponentType<{ className?: string }>
  tone?: "default" | "success" | "danger" | "warning" | "brand"
  className?: string
}

const TONE: Record<NonNullable<KpiCardProps["tone"]>, string> = {
  default: "text-foreground",
  success: "text-success",
  danger: "text-destructive",
  warning: "text-warning",
  brand: "text-primary",
}

/** Cartão de indicador (KPI) usado em dashboards e relatórios. */
export function KpiCard({ label, value, hint, icon: Icon, tone = "default", className }: KpiCardProps) {
  return (
    <Card className={cn("gap-2", className)}>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardDescription className="text-xs font-semibold uppercase tracking-wide">{label}</CardDescription>
        {Icon ? <Icon className="text-muted-foreground" /> : null}
      </CardHeader>
      <CardContent className="flex flex-col gap-1">
        <CardTitle className={cn("text-2xl font-extrabold tabular-nums", TONE[tone])}>{value}</CardTitle>
        {hint ? <div className="text-xs text-muted-foreground">{hint}</div> : null}
      </CardContent>
    </Card>
  )
}

/** Grade de KPIs responsiva (1 coluna no celular). */
export function KpiGrid({ children, columns = 3 }: { children: ReactNode; columns?: 2 | 3 | 4 | 6 }) {
  const cols = { 2: "md:grid-cols-2", 3: "md:grid-cols-3", 4: "md:grid-cols-2 xl:grid-cols-4", 6: "md:grid-cols-3 xl:grid-cols-6" }[columns]
  return <div className={cn("grid grid-cols-1 gap-4", cols)}>{children}</div>
}
