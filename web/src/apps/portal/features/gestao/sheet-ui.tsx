import { useEffect, useRef, useState, type ComponentProps, type ComponentType, type ReactNode } from "react"
import { RotateCwIcon, TriangleAlertIcon } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { errorMessage } from "@/lib/errors"
import { formatBRL, formatDecimal, parseMoneyBR } from "@/lib/format"
import { cn } from "@/lib/utils"

/** Rótulo pequeno em caixa alta com ícone (ex.: "Etapa 1: ..."). */
export function SectionLabel({
  icon: Icon,
  children,
  className,
}: {
  icon?: ComponentType<{ className?: string }>
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground", className)}>
      {Icon ? <Icon className="size-3.5" /> : null}
      <span>{children}</span>
    </div>
  )
}

/** Campo de texto "dentro da planilha": sem borda até receber foco. */
export function GridInput({ className, ...props }: ComponentProps<typeof Input>) {
  return (
    <Input
      className={cn(
        "h-8 rounded-sm border-transparent bg-transparent! px-2 text-xs font-semibold shadow-none md:text-xs",
        "focus-visible:border-primary focus-visible:bg-primary/5! focus-visible:ring-0",
        className
      )}
      {...props}
    />
  )
}

/**
 * Valor em reais dentro da planilha: aceita "150,50", "1.234,56" ou "150.50"
 * (parseMoneyBR) e mostra no padrão brasileiro ao sair do campo.
 */
export function MoneyCellInput({
  value,
  onValueChange,
  className,
  ...props
}: Omit<ComponentProps<typeof Input>, "value" | "onChange" | "type"> & {
  value: number
  onValueChange: (value: number) => void
}) {
  const [text, setText] = useState(() => formatDecimal(value))
  const focused = useRef(false)

  useEffect(() => {
    if (!focused.current) setText(formatDecimal(value))
  }, [value])

  return (
    <GridInput
      {...props}
      type="text"
      inputMode="decimal"
      className={cn("min-w-21 text-right font-bold tabular-nums", className)}
      value={text}
      onFocus={() => {
        focused.current = true
      }}
      onChange={(e) => {
        setText(e.target.value)
        const n = parseMoneyBR(e.target.value)
        onValueChange(Number.isFinite(n) ? n : 0)
      }}
      onBlur={() => {
        focused.current = false
        const n = parseMoneyBR(text)
        setText(formatDecimal(Number.isFinite(n) ? n : 0))
      }}
    />
  )
}

/** Selo de orçamento ("Orçamento Acumulado: R$ 17.500,00"). */
export function BudgetBadge({ label, value, id }: { label: string; value: number; id?: string }) {
  return (
    <div className="rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-[13.5px] font-black text-primary">
      <span>{label} </span>
      <span id={id} className="tabular-nums">
        {formatBRL(value)}
      </span>
    </div>
  )
}

/** Carregando a tela (documento ou coleção). */
export function PageLoading() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-10 w-72" />
      <Skeleton className="h-64 w-full" />
      <Skeleton className="h-48 w-full" />
    </div>
  )
}

/** Falha ao carregar os dados da tela. */
export function PageLoadError({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  return (
    <Alert variant="destructive">
      <TriangleAlertIcon />
      <AlertTitle>Não foi possível carregar os dados.</AlertTitle>
      <AlertDescription className="flex flex-col items-start gap-3">
        <span>{errorMessage(error)}</span>
        <Button size="sm" variant="outline" onClick={onRetry}>
          <RotateCwIcon data-icon="inline-start" />
          Tentar novamente
        </Button>
      </AlertDescription>
    </Alert>
  )
}
