/**
 * Kit visual das telas de RH (Compliance e Gestão de Skills). No sistema
 * antigo as duas telas dividiam o CSS injetado pela Compliance; aqui cada
 * peça é um componente, então qualquer tela funciona aberta diretamente.
 */
import type { CSSProperties, ReactNode } from "react"
import { Trash2Icon, TriangleAlertIcon, type LucideIcon } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Empty, EmptyDescription, EmptyHeader } from "@/components/ui/empty"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { TableCell, TableRow } from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { errorMessage } from "@/lib/errors"
import { cn } from "@/lib/utils"

import type { DenunciaStatus, Prioridade, Risco, StatusCertificacao, TrilhaStatus } from "./types"

// ─── Tons (todos vindos do tema) ────────────────────────────────────

export type Tone = "success" | "warning" | "danger" | "info" | "pink" | "blue" | "brand" | "neutral" | "default"

const TONE_COLOR: Record<Tone, string> = {
  success: "var(--success)",
  warning: "var(--warning)",
  danger: "var(--destructive)",
  info: "var(--chart-5)",
  pink: "var(--chart-4)",
  blue: "var(--chart-3)",
  brand: "var(--primary)",
  neutral: "var(--muted-foreground)",
  default: "var(--foreground)",
}

/** Define `--tone` (uma cor do tema) para as classes TONE_* abaixo. */
export const toneStyle = (tone: Tone) => ({ "--tone": TONE_COLOR[tone] }) as CSSProperties

/** Ícones: a cor do tom, pura. */
export const TONE_ICON = "text-(--tone)"
/**
 * Textos pequenos: o tom misturado com a cor do texto. Âmbar, violeta e azul
 * do tema são claros demais sobre fundo branco; a mistura escurece no tema
 * claro e clareia no escuro, sem cor fixa por tema.
 */
export const TONE_TEXT = "text-[color:color-mix(in_oklab,var(--tone)_62%,var(--foreground))]"
/** Números grandes dos indicadores: mistura mais leve, cor mais viva. */
const TONE_VALUE = "text-[color:color-mix(in_oklab,var(--tone)_80%,var(--foreground))]"
/** Etiquetas: fundo e borda translúcidos do tom. */
const TONE_SOFT = cn("border-(--tone)/25 bg-(--tone)/10", TONE_TEXT)

/** Resolvido/Certificado/Concluído = verde · Mitigado/Pendente/Em Andamento = âmbar · demais = vermelho. */
export function statusTone(status: DenunciaStatus | StatusCertificacao | TrilhaStatus | string): Tone {
  if (status === "Resolvido" || status === "Certificado" || status === "Concluído") return "success"
  if (status === "Mitigado" || status === "Pendente" || status === "Em Andamento") return "warning"
  return "danger"
}

export function riscoTone(risco: Risco | string): Tone {
  return risco === "Baixo" ? "success" : risco === "Médio" ? "warning" : "danger"
}

export function prioridadeTone(prioridade: Prioridade | string): Tone {
  return prioridade === "Crítica" || prioridade === "Alta" ? "danger" : prioridade === "Média" ? "warning" : "success"
}

// ─── Etiquetas ──────────────────────────────────────────────────────

/** Pílula de status (Resolvido, Em Análise, Certificado…). */
export function StatusPill({ tone, className, children }: { tone: Tone; className?: string; children: ReactNode }) {
  return (
    <Badge
      variant="outline"
      style={toneStyle(tone)}
      className={cn("rounded-full px-2.5 text-[10px] font-extrabold tracking-wide uppercase", TONE_SOFT, className)}
    >
      {children}
    </Badge>
  )
}

/** Etiqueta retangular (skills, nível, risco, status das trilhas). */
export function Tag({ tone, className, children }: { tone: Tone; className?: string; children: ReactNode }) {
  return (
    <Badge
      variant="outline"
      style={toneStyle(tone)}
      className={cn("rounded-sm px-2 text-[10px] font-extrabold tracking-wide uppercase", TONE_SOFT, className)}
    >
      {children}
    </Badge>
  )
}

/** Selo de nível de risco (Baixo / Médio / Alto). */
export function RiskBadge({ value, tone, className }: { value: string; tone: Tone; className?: string }) {
  return <Tag tone={tone} className={cn("border-transparent px-1.5", className)}>{value}</Tag>
}

// ─── Cabeçalho, indicadores e painéis ───────────────────────────────

/** Indicador do topo: título, ícone colorido, valor e legenda. */
export function RhKpiCard({
  title,
  icon: Icon,
  iconTone,
  valueTone = "default",
  value,
  sub,
  loading,
}: {
  title: string
  icon: LucideIcon
  iconTone: Tone
  valueTone?: Tone
  value: ReactNode
  sub: string
  loading?: boolean
}) {
  return (
    <Card className="min-h-[125px] justify-between gap-3 py-[18px]">
      <CardHeader className="px-5">
        <CardDescription className="text-[11px] leading-snug font-extrabold tracking-[0.08em] uppercase">{title}</CardDescription>
        <CardAction>
          <span style={toneStyle(iconTone)} className={cn("flex size-8 items-center justify-center rounded-lg border bg-accent", TONE_ICON)}>
            <Icon className="size-4" aria-hidden />
          </span>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-1.5 px-5">
        <CardTitle
          style={toneStyle(valueTone)}
          className={cn("flex items-baseline gap-1 text-[28px] leading-none font-black tracking-tight tabular-nums", TONE_VALUE)}
        >
          {loading ? <Skeleton className="h-7 w-20" /> : value}
        </CardTitle>
        <p className="text-[11px] font-semibold text-muted-foreground">{sub}</p>
      </CardContent>
    </Card>
  )
}

/** Grade dos 4 indicadores (2 colunas até 1024px, 1 no celular). */
export function RhKpiGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">{children}</div>
}

/**
 * Painel com cabeçalho (ícone, título, subtítulo e ação à direita).
 * `fixed` = altura fixa de 520px com rolagem interna, como no sistema antigo.
 */
export function RhPanel({
  icon: Icon,
  iconTone,
  title,
  subtitle,
  action,
  fixed = false,
  className,
  children,
}: {
  icon: LucideIcon
  iconTone: Tone
  title: string
  subtitle: string
  action?: ReactNode
  fixed?: boolean
  className?: string
  children: ReactNode
}) {
  return (
    <Card className={cn("gap-4", fixed && "h-[520px]", className)}>
      {/* Ação à direita do título; em telas estreitas ela desce para baixo dele. */}
      <CardHeader className="flex flex-wrap items-start justify-between gap-x-2 gap-y-3 border-b [.border-b]:pb-3.5">
        <div className="flex min-w-0 flex-[1_1_16rem] flex-col gap-1">
          <CardTitle className="flex items-center gap-2 text-base font-extrabold tracking-tight">
            <Icon style={toneStyle(iconTone)} className={cn("size-[18px] shrink-0", TONE_ICON)} aria-hidden />
            <h3>{title}</h3>
          </CardTitle>
          <CardDescription className="text-xs">{subtitle}</CardDescription>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </CardHeader>
      <CardContent className={cn("flex flex-col gap-4", fixed && "min-h-0 flex-1")}>{children}</CardContent>
    </Card>
  )
}

export type FilterOption = { value: string; label: string }

/** Barra de busca + filtro de seleção dos painéis. */
export function FilterBar({
  search,
  onSearch,
  placeholder,
  filter,
  onFilter,
  filterLabel,
  options,
}: {
  search: string
  onSearch: (value: string) => void
  placeholder: string
  filter: string
  onFilter: (value: string) => void
  filterLabel: string
  options: FilterOption[]
}) {
  return (
    <div className="flex gap-2.5">
      <Input value={search} onChange={(e) => onSearch(e.target.value)} placeholder={placeholder} aria-label={placeholder} className="min-w-0 flex-1" />
      <Select value={filter} onValueChange={onFilter}>
        <SelectTrigger aria-label={filterLabel} className="w-36 shrink-0 sm:w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {options.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  )
}

/** Rótulo pequeno em caixa-alta dos detalhes (modal e painel lateral). */
export function DetailLabel({ className, children }: { className?: string; children: ReactNode }) {
  return <span className={cn("block text-[11px] font-extrabold text-muted-foreground uppercase", className)}>{children}</span>
}

// ─── Tabelas ────────────────────────────────────────────────────────

/** Área de rolagem das tabelas (cabeçalho fixo; rola nos dois eixos). */
export function TableScroll({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn("min-h-0 flex-1 overflow-auto [scrollbar-width:thin] [&>[data-slot=table-container]]:overflow-visible", className)}>
      {children}
    </div>
  )
}

/**
 * Classes do cabeçalho das tabelas (fixo no topo ao rolar). O z-10 mantém o
 * cabeçalho acima das barras de progresso (posicionadas) das linhas.
 */
export const TH = "sticky top-0 z-10 h-auto bg-muted px-3 py-2.5 text-[11px] font-bold tracking-wider whitespace-normal text-muted-foreground uppercase"
/** Classes das células das tabelas. */
export const TD = "px-3 py-2.5 font-semibold"

export function EmptyRow({ colSpan, children }: { colSpan: number; children: ReactNode }) {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell colSpan={colSpan} className="py-12 text-center font-semibold whitespace-normal text-muted-foreground">
        {children}
      </TableCell>
    </TableRow>
  )
}

export function SkeletonRows({ colSpan, rows = 4 }: { colSpan: number; rows?: number }) {
  return Array.from({ length: rows }, (_, i) => (
    <TableRow key={i} className="hover:bg-transparent">
      <TableCell colSpan={colSpan} className="px-3 py-3">
        <Skeleton className="h-9 w-full" />
      </TableCell>
    </TableRow>
  ))
}

/** Mensagem de lista vazia fora de tabelas. */
export function EmptyMessage({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <Empty className={cn("p-6 md:p-6", className)}>
      <EmptyHeader>
        <EmptyDescription className="text-xs font-semibold">{children}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  )
}

/** Botão de excluir das linhas (lixeira vermelha com dica). */
export function DeleteButton({ label, onClick, disabled }: { label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={label}
          disabled={disabled}
          onClick={onClick}
          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2Icon />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

/** Falha ao carregar uma coleção (com opção de tentar de novo). */
export function LoadError({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  return (
    <Alert variant="destructive">
      <TriangleAlertIcon />
      <AlertTitle>Não foi possível carregar os dados.</AlertTitle>
      <AlertDescription className="flex flex-col items-start gap-2">
        <span>{errorMessage(error)}</span>
        <Button size="sm" variant="outline" onClick={onRetry}>
          Tentar novamente
        </Button>
      </AlertDescription>
    </Alert>
  )
}
