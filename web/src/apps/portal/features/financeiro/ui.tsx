/**
 * Peças visuais comuns às telas do Financeiro: tabela em cartão (antigo
 * .glass-card + .modern-table), pílulas de tipo/status e ações da linha.
 */
import type { ComponentProps, ReactNode } from "react"
import { PenLineIcon, Trash2Icon, TriangleAlertIcon } from "lucide-react"

import { EmptyState } from "@/components/app/empty-state"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { errorMessage } from "@/lib/errors"
import { cn } from "@/lib/utils"

export type Tone = "success" | "danger" | "warning" | "info" | "neutral"

/**
 * Texto âmbar/azul legível nos dois temas: o token é o mesmo no claro e no
 * escuro, então a cor é misturada com --foreground (escurece no claro,
 * clareia no escuro).
 */
export const WARNING_TEXT = "text-[color:color-mix(in_oklab,var(--warning)_60%,var(--foreground))]"
const INFO_TEXT = "text-[color:color-mix(in_oklab,var(--chart-3)_60%,var(--foreground))]"

const TONE_CLASS: Record<Tone, string> = {
  success: "bg-success/15 text-success",
  danger: "bg-destructive/15 text-destructive",
  warning: cn("bg-warning/15", WARNING_TEXT),
  info: cn("bg-chart-3/15", INFO_TEXT),
  neutral: "bg-muted text-muted-foreground",
}

/** Pílula colorida. "round" = tipo (arredondada); "tag" = status (cantos retos). */
export function Pill({ tone, shape = "tag", children }: { tone: Tone; shape?: "round" | "tag"; children: ReactNode }) {
  return (
    <Badge
      variant="outline"
      className={cn("border-transparent font-bold", shape === "round" ? "rounded-full px-2.5" : "rounded-sm", TONE_CLASS[tone])}
    >
      {children}
    </Badge>
  )
}

/** Cor do tipo contábil (Receita verde, Despesa vermelha, demais azul). */
export function tipoTone(tipo: string | null | undefined): Tone {
  if (tipo === "Receita") return "success"
  if (tipo === "Despesa") return "danger"
  return "info"
}

/** Tabela dentro de um cartão sem espaçamento interno. */
export function DataTable({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <Card className={cn("gap-0 overflow-hidden py-0", className)}>
      <Table>{children}</Table>
    </Card>
  )
}

export function HeadRow({ children }: { children: ReactNode }) {
  return (
    <TableHeader>
      <TableRow className="hover:bg-transparent">{children}</TableRow>
    </TableHeader>
  )
}

export function Th({ className, ...props }: ComponentProps<typeof TableHead>) {
  return (
    <TableHead
      className={cn("h-11 px-4 text-xs font-bold tracking-wider text-muted-foreground uppercase", className)}
      {...props}
    />
  )
}

/** Célula: textos longos quebram linha (como a tabela antiga); use MONEY_CELL em valores. */
export function Td({ className, ...props }: ComponentProps<typeof TableCell>) {
  return <TableCell className={cn("px-4 py-3.5 whitespace-normal", className)} {...props} />
}

/** Valor em dinheiro: sem quebra de linha e com algarismos alinhados. */
export const MONEY_CELL = "whitespace-nowrap tabular-nums"

/** Linha única ocupando a tabela inteira (vazio, carregando, erro). */
function FullRow({ colSpan, children }: { colSpan: number; children: ReactNode }) {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell colSpan={colSpan} className="p-0 whitespace-normal">
        {children}
      </TableCell>
    </TableRow>
  )
}

type ListStateProps = {
  colSpan: number
  isLoading: boolean
  error: unknown
  isEmpty: boolean
  emptyTitle: string
  children: ReactNode
}

/** Corpo da tabela conforme o estado da consulta (carregando / erro / vazio / linhas). */
export function ListRows({ colSpan, isLoading, error, isEmpty, emptyTitle, children }: ListStateProps) {
  if (isLoading) {
    return (
      <>
        {[0, 1, 2].map((i) => (
          <FullRow key={i} colSpan={colSpan}>
            <div className="px-4 py-3.5">
              <Skeleton className="h-5 w-full" />
            </div>
          </FullRow>
        ))}
      </>
    )
  }
  if (error) {
    return (
      <FullRow colSpan={colSpan}>
        <div className="p-4">
          <Alert variant="destructive">
            <TriangleAlertIcon />
            <AlertDescription>{errorMessage(error)}</AlertDescription>
          </Alert>
        </div>
      </FullRow>
    )
  }
  if (isEmpty) {
    return (
      <FullRow colSpan={colSpan}>
        <EmptyState title={emptyTitle} />
      </FullRow>
    )
  }
  return <>{children}</>
}

/** Ícones de editar (âmbar) e excluir (vermelho) no fim da linha. */
export function RowActions({ onEdit, onRemove, disabled }: { onEdit?: () => void; onRemove: () => void; disabled?: boolean }) {
  return (
    <div className="flex items-center justify-end gap-1">
      {onEdit ? (
        <Button type="button" variant="ghost" size="icon-sm" className="text-primary hover:text-primary" aria-label="Editar" title="Editar" onClick={onEdit}>
          <PenLineIcon />
        </Button>
      ) : null}
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="text-destructive hover:text-destructive"
        aria-label="Remover"
        title="Remover"
        disabled={disabled}
        onClick={onRemove}
      >
        <Trash2Icon />
      </Button>
    </div>
  )
}

/** Grade de 12 colunas do formulário (antigo .form-grid); 1 coluna no celular. */
export function FormGrid({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("grid grid-cols-12 gap-4", className)}>{children}</div>
}

/** Largura de um campo na grade (antigos col-2 … col-12). */
export const SPAN = {
  2: "col-span-12 md:col-span-2",
  3: "col-span-12 md:col-span-3",
  4: "col-span-12 md:col-span-4",
  6: "col-span-12 md:col-span-6",
  9: "col-span-12 md:col-span-9",
  12: "col-span-12",
} as const
