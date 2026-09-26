import { useEffect, useState, type ReactNode } from "react"
import { ArrowLeftIcon, CheckCheckIcon, CheckIcon, SaveIcon, SquareCheckIcon, TableIcon } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { useRecords, useSaveRecords } from "@/data/records"
import { useCashMovements } from "@/data/reports"
import type { CashSession } from "@/data/types"
import { errorMessage } from "@/lib/errors"
import { formatBRL, formatDateBR, roundMoney, sumMoney, toLocalDateString, todayBR } from "@/lib/format"
import { cn } from "@/lib/utils"

import { fromMoneyInput, toMoneyInput } from "../money"
import { OptionSelect, resolveOption, type Option } from "../option-select"
import { COLLECTIONS, type BorderoRecord, type ContaFinanceira, type MetodoConfig, type PlanoConta } from "../types"
import { WARNING_TEXT } from "../ui"
import {
  FORNECEDORES,
  contaOptions,
  defaultConfig,
  metodoColumns,
  metodoSlug,
  parsePercent,
  planoOptions,
  type BorderoView,
} from "./model"

/** Estado editável de uma coluna (forma de pagamento). Campos digitados ficam como texto. */
type ColumnState = {
  planoId: string
  depositoDt: string
  contaId: string
  percentualTaxa: string
  fornecedorId: string
  planoTaxaId: string
  conciliado: boolean
  digitado: string
}

function initialColumns(view: BorderoView, columns: string[]): Record<string, ColumnState> {
  const out: Record<string, ColumnState> = {}
  for (const m of columns) {
    const cfg: MetodoConfig = { ...defaultConfig(m, view.data), ...(view.record?.configMetodos?.[m] ?? {}) }
    out[m] = {
      planoId: String(cfg.planoId ?? ""),
      depositoDt: cfg.depositoDt || view.data,
      contaId: String(cfg.contaId ?? ""),
      percentualTaxa: (Number(cfg.percentualTaxa) || 0).toFixed(2).replace(".", ","),
      fornecedorId: String(cfg.fornecedorId ?? ""),
      planoTaxaId: String(cfg.planoTaxaId ?? ""),
      conciliado: Boolean(cfg.conciliado),
      // Valor digitado começa vazio (0) até o gestor conferir — nada de valor inventado.
      digitado: view.declarado[m] !== undefined ? toMoneyInput(view.declarado[m]) : "",
    }
  }
  return out
}

/** Nomes de id únicos por coluna (formas com acento/espaço). */
function slugsFor(columns: string[]): Record<string, string> {
  const used = new Set<string>()
  const out: Record<string, string> = {}
  for (const m of columns) {
    let s = metodoSlug(m)
    for (let i = 2; used.has(s); i++) s = `${metodoSlug(m)}-${i}`
    used.add(s)
    out[m] = s
  }
  return out
}

export function BorderoDetail({ view, onBack }: { view: BorderoView; onBack: () => void }) {
  const planosQ = useRecords<PlanoConta>(COLLECTIONS.planoContas)
  const contasQ = useRecords<ContaFinanceira>(COLLECTIONS.contasFinanceiras)
  const save = useSaveRecords<BorderoRecord>(COLLECTIONS.borderos)
  // Colunas e valores são fixados ao abrir; o gestor edita localmente até gravar.
  const [columns] = useState(() => metodoColumns(view))
  const [slugs] = useState(() => slugsFor(columns))
  const [cols, setCols] = useState(() => initialColumns(view, columns))

  useEffect(() => window.scrollTo({ top: 0 }), [])

  const planoOpts = planoOptions(planosQ.data?.items ?? [])
  const contaOpts = contaOptions(contasQ.data?.items ?? [])
  const optionsLoading = planosQ.isLoading || contasQ.isLoading
  const id5 = String(view.id).substring(0, 5)

  function update(metodo: string, patch: Partial<ColumnState>) {
    setCols((prev) => ({ ...prev, [metodo]: { ...prev[metodo], ...patch } }))
  }

  function conciliarTodos() {
    setCols((prev) => Object.fromEntries(Object.entries(prev).map(([m, c]) => [m, { ...c, conciliado: true }])))
  }

  async function gravar() {
    const declarado: Record<string, number> = {}
    const configMetodos: Record<string, MetodoConfig> = {}
    for (const m of columns) {
      const c = cols[m]
      declarado[m] = fromMoneyInput(c.digitado)
      configMetodos[m] = {
        planoId: resolveOption(c.planoId, planoOpts),
        depositoDt: c.depositoDt,
        contaId: resolveOption(c.contaId, contaOpts),
        percentualTaxa: parsePercent(c.percentualTaxa),
        fornecedorId: resolveOption(c.fornecedorId, FORNECEDORES),
        planoTaxaId: resolveOption(c.planoTaxaId, planoOpts),
        conciliado: c.conciliado,
      }
    }
    // Todos conciliados → borderô "Conciliado"; senão continua "Pendente".
    const todosConciliados = Object.values(configMetodos).every((c) => c.conciliado)
    const record: BorderoRecord = {
      ...(view.record ?? {}),
      id: view.id,
      source: view.session ? "session" : view.record?.source,
      data: view.data,
      terminal: view.terminal,
      operador: view.operador,
      suprimento: view.suprimento,
      vendasReais: view.session ? Number(view.session.closing?.total_vendas ?? 0) : Number(view.record?.vendasReais ?? 0),
      vendasPorMetodo: view.session ? (view.sistema ?? {}) : (view.record?.vendasPorMetodo ?? {}),
      declarado,
      configMetodos,
      status: todosConciliados ? "Conciliado" : "Pendente",
      observacao: view.record?.observacao ?? "",
    }
    try {
      await save.mutateAsync(record)
      toast.success("Conciliação financeira salva com sucesso!")
      onBack()
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeftIcon data-icon="inline-start" />
          Voltar
        </Button>
        <span className="text-[13px] font-bold text-muted-foreground">
          Nº Fechamento: <strong className="text-foreground">{id5}</strong>
        </span>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-black tracking-tight">Fechamento de Caixa: #{id5}</CardTitle>
          <CardDescription className="leading-relaxed">
            Abertura realizada em <strong className="text-foreground">{view.data ? formatDateBR(view.data) : "-"}</strong> pelo operador{" "}
            <strong className="text-foreground uppercase">{view.operador}</strong>.
            <br />
            Fechamento do Caixa conferido no portal Velo.
          </CardDescription>
        </CardHeader>
        <CardFooter className="flex-wrap gap-3 border-t">
          <Button onClick={() => void gravar()} disabled={save.isPending || optionsLoading}>
            {save.isPending ? <Spinner data-icon="inline-start" /> : <SaveIcon data-icon="inline-start" />}
            Gravar Conciliação
          </Button>
          <Button className="bg-success text-primary-foreground hover:bg-success/90" onClick={conciliarTodos}>
            <CheckCheckIcon data-icon="inline-start" />
            Conciliar todos
          </Button>
        </CardFooter>
      </Card>

      <h4 className="flex items-center gap-2 text-base font-black">
        <TableIcon className="size-[18px]" />
        Painel de Conciliação Financeira
      </h4>

      {optionsLoading ? (
        <div className="flex gap-4 overflow-hidden">
          {columns.map((m) => (
            <Skeleton key={m} className="h-[640px] w-[310px] shrink-0" />
          ))}
        </div>
      ) : (
        <div className="flex items-stretch gap-4 overflow-x-auto pb-4">
          {columns.map((m) => (
            <MetodoColumn
              key={m}
              metodo={m}
              slug={slugs[m]}
              col={cols[m]}
              onChange={(patch) => update(m, patch)}
              sistema={view.sistema ? (view.sistema[m] ?? 0) : null}
              planoOpts={planoOpts}
              contaOpts={contaOpts}
              sangria={m === "DINHEIRO" ? <SangriaTurno view={view} /> : undefined}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function SmallField({ label, htmlFor, small, children }: { label: string; htmlFor: string; small?: boolean; children: ReactNode }) {
  return (
    <Field className="gap-1.5">
      <FieldLabel htmlFor={htmlFor} className={cn("font-bold text-muted-foreground", small ? "text-[10px]" : "text-[11px]")}>
        {label}
      </FieldLabel>
      {children}
    </Field>
  )
}

function ValueRow({ label, children, valueClassName }: { label: string; children: ReactNode; valueClassName?: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("tabular-nums", valueClassName)}>{children}</span>
    </div>
  )
}

type MetodoColumnProps = {
  metodo: string
  slug: string
  col: ColumnState
  onChange: (patch: Partial<ColumnState>) => void
  /** Vendas do sistema nesta forma; null = indisponível. */
  sistema: number | null
  planoOpts: Option[]
  contaOpts: Option[]
  /** Só na coluna DINHEIRO. */
  sangria?: ReactNode
}

function MetodoColumn({ metodo, slug, col, onChange, sistema, planoOpts, contaOpts, sangria }: MetodoColumnProps) {
  const valDigitado = fromMoneyInput(col.digitado)
  const valConciliado = col.conciliado ? valDigitado : 0
  const diferenca = sistema === null ? null : roundMoney(valDigitado - sistema)
  // Taxa e líquido sobre o valor conciliado, recalculados a cada digitação.
  const pct = parsePercent(col.percentualTaxa)
  const valTaxa = roundMoney((valConciliado * pct) / 100)
  const valLiquido = roundMoney(valConciliado - valTaxa)

  return (
    <Card className="w-[310px] shrink-0 gap-3 p-4" data-metodo={metodo}>
      <h4 className="border-b-2 border-accent pb-2 text-center text-sm font-black tracking-wider">{metodo}</h4>

      <Button
        type="button"
        size="sm"
        aria-pressed={col.conciliado}
        className={cn("w-full font-extrabold", col.conciliado && "bg-success text-primary-foreground hover:bg-success/90")}
        onClick={() => onChange({ conciliado: !col.conciliado })}
      >
        {col.conciliado ? <CheckIcon data-icon="inline-start" /> : <SquareCheckIcon data-icon="inline-start" />}
        {col.conciliado ? "CONCILIADO" : "CONCILIAR"}
      </Button>

      <SmallField label="Plano" htmlFor={`plano-${slug}`}>
        <OptionSelect
          id={`plano-${slug}`}
          size="sm"
          value={resolveOption(col.planoId, planoOpts)}
          options={planoOpts}
          onChange={(v) => onChange({ planoId: v })}
        />
      </SmallField>

      <SmallField label="Data depósito" htmlFor={`dep-${slug}`}>
        <Input
          id={`dep-${slug}`}
          type="date"
          className="h-8 text-xs md:text-xs"
          value={col.depositoDt}
          onChange={(e) => onChange({ depositoDt: e.target.value })}
        />
      </SmallField>

      <SmallField label="Conta" htmlFor={`conta-${slug}`}>
        <OptionSelect
          id={`conta-${slug}`}
          size="sm"
          value={resolveOption(col.contaId, contaOpts)}
          options={contaOpts}
          onChange={(v) => onChange({ contaId: v })}
        />
      </SmallField>

      <div className="flex flex-col gap-2 rounded-md bg-muted p-2.5 text-xs font-semibold">
        <ValueRow label="Valor Sistema">{sistema === null ? "—" : formatBRL(sistema)}</ValueRow>
        <div className="flex items-center justify-between gap-2">
          <label htmlFor={`digitado-${slug}`} className="text-muted-foreground">
            Valor Digitado
          </label>
          <Input
            id={`digitado-${slug}`}
            inputMode="decimal"
            placeholder="0,00"
            className="h-7 w-[100px] bg-card px-1.5 text-right text-xs md:text-xs"
            value={col.digitado}
            onChange={(e) => onChange({ digitado: e.target.value })}
          />
        </div>
        <ValueRow label="Valor Saldo">{sistema === null ? "—" : formatBRL(sistema)}</ValueRow>
        <ValueRow label="Valor conciliação" valueClassName="font-extrabold text-primary">
          {formatBRL(valConciliado)}
        </ValueRow>
        <ValueRow
          label="Diferença"
          valueClassName={diferenca === null ? "text-muted-foreground" : diferenca >= 0 ? "text-success" : "text-destructive"}
        >
          {diferenca === null ? "—" : formatBRL(diferenca)}
        </ValueRow>
      </div>

      {diferenca !== null && diferenca < 0 ? (
        <div className="flex flex-col gap-0.5 rounded-md border border-destructive/30 bg-destructive/10 p-2">
          <span className="text-[10px] font-extrabold text-destructive uppercase">Falta</span>
          <span className="text-right text-sm font-black text-destructive tabular-nums">- {formatBRL(Math.abs(diferenca))}</span>
        </div>
      ) : null}

      {sangria !== undefined ? (
        <div className="flex flex-col gap-1.5 border-t border-dashed pt-2.5">
          <span className="text-[11px] font-extrabold text-muted-foreground uppercase">Sangrias</span>
          <div className={cn("flex justify-between gap-2 text-xs font-bold", WARNING_TEXT)}>
            <span>Sangria do Turno</span>
            <span className="tabular-nums">{sangria}</span>
          </div>
        </div>
      ) : null}

      <div className="flex flex-col gap-2 border-t border-dashed pt-2.5">
        <span className="text-[11px] font-extrabold text-muted-foreground uppercase">Taxa Administrativa</span>
        <SmallField label="Fornecedor" htmlFor={`forn-${slug}`} small>
          <OptionSelect
            id={`forn-${slug}`}
            size="sm"
            className="text-xs"
            value={resolveOption(col.fornecedorId, FORNECEDORES)}
            options={FORNECEDORES}
            onChange={(v) => onChange({ fornecedorId: v })}
          />
        </SmallField>
        <SmallField label="Plano de contas" htmlFor={`planotaxa-${slug}`} small>
          <OptionSelect
            id={`planotaxa-${slug}`}
            size="sm"
            className="text-xs"
            value={resolveOption(col.planoTaxaId, planoOpts)}
            options={planoOpts}
            onChange={(v) => onChange({ planoTaxaId: v })}
          />
        </SmallField>
        <div className="grid grid-cols-2 gap-2">
          <SmallField label="Percentual Taxa (%)" htmlFor={`pct-${slug}`} small>
            <Input
              id={`pct-${slug}`}
              inputMode="decimal"
              className="h-8 text-right text-xs md:text-xs"
              value={col.percentualTaxa}
              onChange={(e) => onChange({ percentualTaxa: e.target.value })}
            />
          </SmallField>
          <div className="flex flex-col justify-end text-right font-bold">
            <span className="text-[9px] text-muted-foreground uppercase">Valor taxa (R$)</span>
            <span id={`valtaxa-${slug}`} className="text-[13px] text-destructive tabular-nums">
              {formatBRL(valTaxa)}
            </span>
          </div>
        </div>
        <div className="flex justify-between gap-2 border-t pt-1.5 text-[13px] font-extrabold text-primary">
          <span>Valor líquido (R$)</span>
          <span id={`liq-${slug}`} className="tabular-nums">
            {formatBRL(valLiquido)}
          </span>
        </div>
      </div>
    </Card>
  )
}

/** Sangrias da sessão: do fechamento gravado ou, sem ele, dos movimentos registrados. */
function SangriaTurno({ view }: { view: BorderoView }) {
  const s = view.session
  if (!s) return <>—</>
  if (s.closing) return <>- {formatBRL(s.closing.total_sangrias)}</>
  return <SangriasDaSessao session={s} />
}

function SangriasDaSessao({ session }: { session: CashSession }) {
  const from = toLocalDateString(session.opened_at)
  const end = session.closed_at ? toLocalDateString(session.closed_at) : todayBR()
  const q = useCashMovements({ from, to: end < from ? from : end }, "sangria")
  if (q.isLoading) return <Skeleton className="h-4 w-16" />
  if (q.error || !q.data) return <>—</>
  const total = sumMoney(q.data.filter((m) => m.session_id === session.id).map((m) => Number(m.amount) || 0))
  return <>- {formatBRL(total)}</>
}
