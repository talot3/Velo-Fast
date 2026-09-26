import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react"
import {
  ArrowRightIcon,
  BarChart3Icon,
  CheckIcon,
  DollarSignIcon,
  LayersIcon,
  PlusIcon,
  Trash2Icon,
  TrendingUpIcon,
} from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { PricingData } from "@/data/types"
import { formatBRL, formatPercent } from "@/lib/format"
import { cn } from "@/lib/utils"

import { moneyInput, numberInput } from "../lib"
import { useDecimalField } from "../use-decimal-field"
import {
  calcPricing,
  formatMarkup,
  formatPctLabel,
  insumoTotal,
  nextInsumoId,
  resultTone,
  tetoStatus,
  type Insumo,
  type PricingMethod,
} from "./calc"

type PricingModuleProps = {
  value: PricingData
  onChange: (next: PricingData) => void
  /** Escreve preço de venda e custo nos campos do produto. */
  onApply: (price: number, cost: number) => void
}

const TONE_TEXT = { positive: "text-success", negative: "text-destructive", zero: "text-warning" } as const
const TONE_SOFT = {
  positive: "border-success/30 bg-success/10",
  negative: "border-destructive/30 bg-destructive/10",
  zero: "border-warning/30 bg-warning/10",
} as const
const STATUS_TONE = { ok: "positive", warn: "zero", danger: "negative" } as const

/** Enter num campo do módulo não deve gravar o produto (o antigo não tinha formulário). */
function blockEnterSubmit(e: KeyboardEvent) {
  if (e.key === "Enter" && e.target instanceof HTMLInputElement) e.preventDefault()
}

/** Engenharia de Preços — dentro do cadastro de produto, abaixo da divisória. */
export function PricingModule({ value, onChange, onApply }: PricingModuleProps) {
  const c = useMemo(() => calcPricing(value), [value])
  const [focusId, setFocusId] = useState<number | null>(null)
  const [applied, setApplied] = useState(false)
  const appliedTimer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(appliedTimer.current), [])

  const patch = (p: Partial<PricingData>) => onChange({ ...value, ...p })
  const updateInsumo = (id: number, p: Partial<Insumo>) =>
    patch({ insumos: value.insumos.map((r) => (r.id === id ? { ...r, ...p } : r)) })
  const addInsumo = () => {
    const id = nextInsumoId(value.insumos)
    patch({ insumos: [...value.insumos, { id, desc: "", qtd: 1, unid: "un", custoUnit: 0 }] })
    setFocusId(id)
  }
  const removeInsumo = (id: number) => patch({ insumos: value.insumos.filter((r) => r.id !== id) })

  function aplicarPreco() {
    if (c.precoVenda <= 0 || c.divisor <= 0) {
      toast.error("Não é possível aplicar: o preço calculado é inválido. Revise as porcentagens.")
      return
    }
    onApply(c.precoVenda, c.custoTotal)
    setApplied(true)
    window.clearTimeout(appliedTimer.current)
    appliedTimer.current = window.setTimeout(() => setApplied(false), 2000)
  }

  function aplicarCustoMeta() {
    if (value.precoMercado <= 0) {
      toast.error("Informe o preço de mercado para calcular o custo-meta.")
      return
    }
    onApply(value.precoMercado, c.custoTotal)
  }

  const precoSugerido =
    c.precoVenda > 0 && c.divisor > 0 ? formatBRL(c.precoVenda) : c.divisor <= 0 ? "— Inviável —" : "—"
  const lucroTone = resultTone(c.lucroLiquido)
  const pctTone = resultTone(c.pctLucratividade, 0.5)

  return (
    <div className="overflow-hidden rounded-xl border bg-muted/40 shadow-sm" onKeyDown={blockEnterSubmit}>
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-card px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border bg-muted text-primary">
            <DollarSignIcon className="size-[18px]" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-extrabold tracking-tight">Engenharia de Preços</span>
            <span className="text-xs text-muted-foreground">Formação de Preço &amp; Custo-Meta • Tempo Real</span>
          </div>
        </div>
        <Badge className="rounded-sm text-[10px] font-extrabold tracking-wider uppercase">Eng. Econômica</Badge>
      </div>

      <div className="flex flex-col gap-5 p-4 md:p-5">
        {/* 1 — Ficha técnica */}
        <PrecSection
          icon={<LayersIcon className="size-3.5" />}
          title="Ficha Técnica — Composto de Custo Direto"
          subtitle="Insumos · M.O.D. · C.G.F."
        >
          <Table className="text-xs">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="h-8 text-[10px] font-extrabold tracking-wider text-muted-foreground uppercase">
                  Insumo / Matéria-Prima
                </TableHead>
                <TableHead className="h-8 text-right text-[10px] font-extrabold tracking-wider text-muted-foreground uppercase">
                  Qtd.
                </TableHead>
                <TableHead className="h-8 text-center text-[10px] font-extrabold tracking-wider text-muted-foreground uppercase">
                  Unid.
                </TableHead>
                <TableHead className="h-8 text-right text-[10px] font-extrabold tracking-wider text-muted-foreground uppercase">
                  Custo Unit.
                </TableHead>
                <TableHead className="h-8 pr-3 text-right text-[10px] font-extrabold tracking-wider text-muted-foreground uppercase">
                  Total
                </TableHead>
                <TableHead className="h-8 w-9">
                  <span className="sr-only">Remover</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {value.insumos.map((row) => (
                <InsumoRow
                  key={row.id}
                  row={row}
                  autoFocus={row.id === focusId}
                  onChange={(p) => updateInsumo(row.id, p)}
                  onRemove={() => removeInsumo(row.id)}
                />
              ))}
            </TableBody>
          </Table>

          <Button type="button" variant="outline" className="mt-2 w-full border-dashed text-muted-foreground" onClick={addInsumo}>
            <PlusIcon data-icon="inline-start" />
            Adicionar Insumo / Matéria-Prima
          </Button>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <MoneyField
              id="prec-mod"
              dot="bg-success"
              label="Mão de Obra Direta (M.O.D.)"
              value={value.maoDeObra}
              onValueChange={(maoDeObra) => patch({ maoDeObra })}
            />
            <MoneyField
              id="prec-cgf"
              dot="bg-warning"
              label="Custos Gerais de Fabricação (C.G.F.)"
              value={value.cgf}
              onValueChange={(cgf) => patch({ cgf })}
            />
          </div>

          <div className="mt-3 flex items-center justify-between gap-3 rounded-md border border-success/30 bg-success/10 px-3.5 py-2.5">
            <span className="flex items-center gap-2 text-[11px] font-extrabold tracking-wider text-success uppercase">
              <LayersIcon className="size-3" />
              Custo Direto Total (CDT)
            </span>
            <span id="prec-custo-total-value" className="text-base font-black tracking-tight tabular-nums">
              {formatBRL(c.custoTotal)}
            </span>
          </div>
        </PrecSection>

        {/* 2 — Despesas e tributos */}
        <PrecSection
          icon={<BarChart3Icon className="size-3.5" />}
          title="Despesas Operacionais & Carga Tributária"
          subtitle="% sobre o Preço de Venda"
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <PercentField
              id="prec-pct-despesas"
              dot="bg-warning"
              label="Margem de Despesas Operacionais"
              value={value.pctDespesas}
              onValueChange={(pctDespesas) => patch({ pctDespesas })}
            />
            <PercentField
              id="prec-pct-impostos"
              dot="bg-destructive"
              label="Alíquota de Impostos (s/ venda)"
              value={value.pctImpostos}
              onValueChange={(pctImpostos) => patch({ pctImpostos })}
            />
          </div>
        </PrecSection>

        {/* 3 — Módulo de cálculo */}
        <PrecSection icon={<TrendingUpIcon className="size-3.5" />} title="Módulo Interativo de Cálculo" subtitle="Selecione a lógica">
          <Tabs value={value.metodo} onValueChange={(m) => patch({ metodo: m as PricingMethod })} className="gap-5">
            <TabsList className="h-auto w-full">
              <TabsTrigger value="markup" className="h-auto flex-col gap-0.5 py-2 whitespace-normal">
                <span className="text-xs font-extrabold">Aba A — Formação de Preço</span>
                <span className="text-[10px] font-semibold opacity-70 max-sm:hidden">Mark-up Multiplicador</span>
              </TabsTrigger>
              <TabsTrigger value="custo-meta" className="h-auto flex-col gap-0.5 py-2 whitespace-normal">
                <span className="text-xs font-extrabold">Aba B — Custo-Meta / Alvo</span>
                <span className="text-[10px] font-semibold opacity-70 max-sm:hidden">Preço de Mercado → Teto de Custo</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="markup" className="flex flex-col gap-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <PercentField
                  id="prec-pct-lucro"
                  dot="bg-success"
                  label="Margem de Lucro Desejada"
                  value={value.pctLucroDesejado}
                  onValueChange={(pctLucroDesejado) => patch({ pctLucroDesejado })}
                />
                <Field className="gap-1.5">
                  <PrecLabel htmlFor="prec-markup-display" dot="bg-primary">
                    Mark-up Multiplicador
                  </PrecLabel>
                  <Input
                    id="prec-markup-display"
                    readOnly
                    placeholder="—"
                    value={c.divisor > 0 ? `× ${formatMarkup(c.markup)}` : "— Inviável —"}
                    className="font-bold text-muted-foreground tabular-nums"
                  />
                </Field>
              </div>

              <div className="flex flex-col items-center gap-1.5 rounded-lg border bg-card px-5 py-5 text-center shadow-sm">
                <span className="text-[10px] font-extrabold tracking-[0.1em] text-muted-foreground uppercase">
                  Preço de Venda Sugerido
                </span>
                <span id="prec-preco-venda-result" className="text-3xl font-black tracking-tight text-primary tabular-nums">
                  {precoSugerido}
                </span>
                <span id="prec-markup-value" className="text-xs font-bold text-muted-foreground tabular-nums">
                  {c.divisor > 0 ? `Mark-up × ${formatMarkup(c.markup)}` : "— indisponível —"}
                </span>
              </div>

              <Button type="button" id="prec-btn-aplicar" size="lg" className="w-full font-extrabold" onClick={aplicarPreco}>
                {applied ? <CheckIcon data-icon="inline-start" /> : <ArrowRightIcon data-icon="inline-start" />}
                {applied ? "Aplicado com sucesso!" : "Aplicar Preço ao Produto"}
              </Button>
            </TabsContent>

            <TabsContent value="custo-meta" className="flex flex-col gap-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <MoneyField
                  id="prec-preco-mercado"
                  dot="bg-destructive"
                  label="Preço Praticado pelo Mercado / Concorrência"
                  value={value.precoMercado}
                  format={(n) => (n ? numberInput(n) : "")}
                  onValueChange={(precoMercado) => patch({ precoMercado })}
                />
                <PercentField
                  id="prec-pct-lucro-meta"
                  dot="bg-success"
                  label="Margem de Lucro Mínima Aceitável"
                  value={value.pctLucroDesejado}
                  onValueChange={(pctLucroDesejado) => patch({ pctLucroDesejado })}
                />
              </div>

              <TetoResult value={value} result={c} />

              <Button type="button" size="lg" className="w-full font-extrabold" onClick={aplicarCustoMeta}>
                <ArrowRightIcon data-icon="inline-start" />
                Adotar Preço de Mercado e Custo Atual
              </Button>
            </TabsContent>
          </Tabs>
        </PrecSection>

        {/* 4 — DRE unitária */}
        <Card className="gap-0 overflow-hidden py-0 shadow-sm">
          <CardHeader className="flex flex-wrap items-center gap-2 border-b bg-muted/50 px-4 py-2.5 [.border-b]:pb-2.5">
            <BarChart3Icon className="size-3.5 text-muted-foreground" />
            <CardTitle className="text-[11px] font-extrabold tracking-wider uppercase">DRE Unitária</CardTitle>
            <CardDescription className="text-[11px]">Demonstração do Resultado — por Unidade Vendida</CardDescription>
            <Badge variant="outline" className="ml-auto rounded-sm border-success/30 bg-success/10 text-[9px] font-extrabold tracking-widest text-success uppercase">
              <span className="size-1.5 animate-pulse rounded-full bg-success" />
              Tempo Real
            </Badge>
          </CardHeader>
          <CardContent className="p-0">
            <DreRow signal="plus" label="Receita Bruta (Preço de Venda)" value={c.receitaBruta} />
            <DreRow
              signal="minus"
              label="Impostos / Tributação"
              hint={formatPctLabel(value.pctImpostos)}
              value={c.descontoImpostos}
              deduct
            />
            <DreRow signal="equal" label="Receita Líquida de Impostos" value={c.receitaLiquida} result />
            <DreRow signal="minus" label="Custo do Produto Vendido (C.P.V.)" value={c.cpv} deduct />
            <DreRow signal="equal" label="Resultado / Margem Bruta" value={c.resultadoBruto} result />
            <DreRow
              signal="minus"
              label="Despesas Operacionais (Fixas + Variáveis)"
              hint={formatPctLabel(value.pctDespesas)}
              value={c.despesasOper}
              deduct
            />
            <div
              id="dre-final-row"
              className={cn("flex flex-wrap items-center gap-2 border-t-2 px-4 py-3", TONE_SOFT[lucroTone])}
            >
              <DreSignal signal="equal" />
              <span className="flex-1 text-[13px] font-extrabold">Lucro Líquido Real</span>
              <div className="flex shrink-0 items-center gap-2">
                <span
                  id="dre-pct-lucratividade"
                  className={cn(
                    "min-w-12 rounded-sm border px-1.5 py-0.5 text-center text-[11px] font-bold tabular-nums",
                    TONE_SOFT[pctTone],
                    TONE_TEXT[pctTone]
                  )}
                >
                  {formatPercent(c.pctLucratividade, 1)}
                </span>
                <span id="dre-lucro-liquido" className={cn("text-base font-black tabular-nums", TONE_TEXT[lucroTone])}>
                  {formatBRL(c.lucroLiquido)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function PrecSection({ icon, title, subtitle, children }: { icon: ReactNode; title: string; subtitle: string; children: ReactNode }) {
  return (
    <Card className="gap-0 overflow-hidden py-0 shadow-sm">
      <CardHeader className="flex flex-wrap items-center gap-2.5 border-b bg-muted/50 px-4 py-3 [.border-b]:pb-3">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-md border bg-background text-muted-foreground">
          {icon}
        </span>
        <CardTitle className="text-xs font-extrabold tracking-tight">{title}</CardTitle>
        <CardDescription className="ml-auto text-[11px]">{subtitle}</CardDescription>
      </CardHeader>
      <CardContent className="p-4">{children}</CardContent>
    </Card>
  )
}

function PrecLabel({ htmlFor, dot, children }: { htmlFor: string; dot: string; children: ReactNode }) {
  return (
    <FieldLabel htmlFor={htmlFor} className="items-center gap-1.5 text-[10.5px] font-bold tracking-wider text-muted-foreground uppercase">
      <span className={cn("inline-block size-1.5 shrink-0 rounded-full", dot)} />
      {children}
    </FieldLabel>
  )
}

type NumberFieldProps = {
  id: string
  dot: string
  label: string
  value: number
  onValueChange: (value: number) => void
  format?: (value: number) => string
}

function MoneyField({ id, dot, label, value, onValueChange, format }: NumberFieldProps) {
  const field = useDecimalField(value, onValueChange, format)
  return (
    <Field className="gap-1.5">
      <PrecLabel htmlFor={id} dot={dot}>
        {label}
      </PrecLabel>
      <InputGroup>
        <InputGroupAddon className="text-xs font-bold">R$</InputGroupAddon>
        <InputGroupInput id={id} placeholder="0,00" className="font-bold tabular-nums" {...field} />
      </InputGroup>
    </Field>
  )
}

function PercentField({ id, dot, label, value, onValueChange }: NumberFieldProps) {
  const field = useDecimalField(value, onValueChange)
  return (
    <Field className="gap-1.5">
      <PrecLabel htmlFor={id} dot={dot}>
        {label}
      </PrecLabel>
      <InputGroup>
        <InputGroupInput id={id} placeholder="0,0" className="font-bold tabular-nums" {...field} />
        <InputGroupAddon align="inline-end" className="text-xs font-bold">
          %
        </InputGroupAddon>
      </InputGroup>
    </Field>
  )
}

const ghostInput =
  "h-8 border-transparent bg-transparent px-2 text-xs font-semibold shadow-none hover:border-input focus-visible:border-ring dark:bg-transparent"

function InsumoRow({
  row,
  autoFocus,
  onChange,
  onRemove,
}: {
  row: Insumo
  autoFocus: boolean
  onChange: (p: Partial<Insumo>) => void
  onRemove: () => void
}) {
  const qtd = useDecimalField(row.qtd, (v) => onChange({ qtd: v }))
  const custo = useDecimalField(row.custoUnit, (v) => onChange({ custoUnit: v }), (n) => moneyInput(n) || "0,00")
  return (
    <TableRow>
      <TableCell className="min-w-40 p-1">
        <Input
          aria-label="Insumo / Matéria-Prima"
          placeholder="Insumo / Matéria-Prima..."
          value={row.desc}
          autoFocus={autoFocus}
          onChange={(e) => onChange({ desc: e.target.value })}
          className={ghostInput}
        />
      </TableCell>
      <TableCell className="w-20 p-1">
        <Input aria-label="Qtd." className={cn(ghostInput, "text-right tabular-nums")} {...qtd} />
      </TableCell>
      <TableCell className="w-16 p-1">
        <Input
          aria-label="Unid."
          placeholder="un"
          value={row.unid}
          onChange={(e) => onChange({ unid: e.target.value })}
          className={cn(ghostInput, "text-center")}
        />
      </TableCell>
      <TableCell className="w-28 p-1">
        <div className="flex items-center gap-1">
          <span className="text-[10.5px] font-semibold text-muted-foreground">R$</span>
          <Input aria-label="Custo Unit." className={cn(ghostInput, "text-right tabular-nums")} {...custo} />
        </div>
      </TableCell>
      <TableCell className="w-24 p-1 pr-3 text-right text-xs font-extrabold tabular-nums">{formatBRL(insumoTotal(row))}</TableCell>
      <TableCell className="w-9 p-1 text-center">
        <Button
          type="button"
          variant="outline"
          size="icon-xs"
          title="Remover insumo"
          aria-label="Remover insumo"
          className="hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
          onClick={onRemove}
        >
          <Trash2Icon />
        </Button>
      </TableCell>
    </TableRow>
  )
}

function TetoResult({ value, result: c }: { value: PricingData; result: ReturnType<typeof calcPricing> }) {
  // Sem preço de mercado ainda: mostra a instrução inicial do módulo.
  if (value.precoMercado <= 0) {
    return (
      <div id="prec-meta-result-wrapper" className="flex items-center justify-between gap-4 rounded-lg border bg-card px-4 py-4">
        <div className="flex flex-col gap-0.5">
          <span className="text-[10.5px] font-extrabold tracking-wider text-muted-foreground uppercase">— Informe o Preço de Mercado —</span>
          <span className="text-[11px] font-semibold text-muted-foreground">O teto de custo calculará automaticamente</span>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="text-[10.5px] font-extrabold tracking-wider text-muted-foreground uppercase">Teto de Custo</span>
          <span id="prec-teto-custo-value" className="text-xl font-black">
            —
          </span>
        </div>
      </div>
    )
  }
  const status = tetoStatus(c)
  const tone = STATUS_TONE[status]
  const label =
    status === "ok" ? "✓ Custo dentro do Teto" : status === "warn" ? "⚠ Custo no Limite" : "✗ Custo Excede o Teto"
  const desc =
    status === "ok"
      ? `Folga de ${formatBRL(c.tetoCusto - c.custoTotal)} (${formatPercent((1 - c.custoTotal / c.tetoCusto) * 100, 1)} abaixo do teto)`
      : status === "warn"
        ? "Margem de segurança mínima — revise os custos"
        : c.divisor <= 0
          ? "Soma de despesas + impostos + lucro ≥ 100% — inviável"
          : `Excede o teto em ${formatBRL(c.custoTotal - c.tetoCusto)} — produto no prejuízo`
  return (
    <div
      id="prec-meta-result-wrapper"
      data-status={status}
      className={cn("flex items-center justify-between gap-4 rounded-lg border-[1.5px] px-4 py-4", TONE_SOFT[tone])}
    >
      <div className="flex flex-col gap-0.5">
        <span className={cn("text-[10.5px] font-extrabold tracking-wider uppercase", TONE_TEXT[tone])}>{label}</span>
        <span className="text-[11px] font-semibold text-muted-foreground">{desc}</span>
      </div>
      <div className="flex flex-col items-end gap-1">
        <span className={cn("text-[10.5px] font-extrabold tracking-wider uppercase", TONE_TEXT[tone])}>Teto de Custo</span>
        <span id="prec-teto-custo-value" className={cn("text-xl font-black tracking-tight tabular-nums", TONE_TEXT[tone])}>
          {c.divisor > 0 ? formatBRL(c.tetoCusto) : "— Inviável —"}
        </span>
      </div>
    </div>
  )
}

type Signal = "plus" | "minus" | "equal"

function DreSignal({ signal }: { signal: Signal }) {
  const text = signal === "plus" ? "(+)" : signal === "minus" ? "(−)" : "(=)"
  const color = signal === "plus" ? "text-success" : signal === "minus" ? "text-destructive" : "text-muted-foreground"
  return <span className={cn("w-6 shrink-0 text-center text-[11px] font-black", color)}>{text}</span>
}

function DreRow({
  signal,
  label,
  hint,
  value,
  deduct,
  result,
}: {
  signal: Signal
  label: string
  hint?: string
  value: number
  deduct?: boolean
  result?: boolean
}) {
  return (
    <div className={cn("flex items-center gap-2 border-b px-4 py-2", result && "bg-success/5")}>
      <DreSignal signal={signal} />
      <span className={cn("flex flex-1 flex-wrap items-center gap-1.5 text-xs", result ? "font-bold" : "font-semibold")}>
        {label}
        {hint ? <span className="text-[10px] font-medium text-muted-foreground">{hint}</span> : null}
      </span>
      <span
        className={cn(
          "min-w-20 text-right text-[12.5px] font-extrabold tabular-nums",
          deduct && "text-destructive",
          result && "text-[13px]"
        )}
      >
        {formatBRL(Math.abs(value))}
      </span>
    </div>
  )
}
