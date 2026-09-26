import { AwardIcon, BarChart2Icon, Grid3x3Icon, ListTodoIcon, PlusIcon, RefreshCwIcon, ShieldCheckIcon, XIcon } from "lucide-react"

import { PageHeader } from "@/components/app/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { NativeSelectOption } from "@/components/ui/native-select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"

import { FiveW2HTable } from "./five-w2h-table"
import { FullNativeSelect } from "./full-native-select"
import { BudgetBadge, GridInput, PageLoadError, PageLoading, SectionLabel } from "./sheet-ui"
import {
  addSwotFactor,
  addSwotPlano,
  getSwotVerdict,
  normalizeSwot,
  removeSwotFactor,
  swotSeed,
  type SwotFactor,
  type SwotQuadrant,
  type SwotState,
  type SwotVerdict,
} from "./swot-model"
import { useAutosaveDocument } from "./use-autosave-document"

const SWOT_DEFAULT = swotSeed()

const QUADRANT: Record<SwotQuadrant, { tag: string; placeholder: string; remove: string; title: string }> = {
  forcas: { tag: "border-success/30 bg-success/15 text-success", placeholder: "Digite a força...", remove: "Excluir Força", title: "Força" },
  fraquezas: {
    tag: "border-destructive/30 bg-destructive/15 text-destructive",
    placeholder: "Digite a fraqueza...",
    remove: "Excluir Fraqueza",
    title: "Fraqueza",
  },
  oportunidades: { tag: "border-transparent bg-foreground/80 text-background", placeholder: "Digite a oportunidade...", remove: "Excluir Oportunidade", title: "Oportunidade" },
  ameacas: { tag: "border-transparent bg-muted-foreground text-background", placeholder: "Digite a ameaça...", remove: "Excluir Ameaça", title: "Ameaça" },
}

const PILL = "rounded-full text-[10.5px] font-extrabold uppercase tracking-wider text-muted-foreground"

const VERDICT_BORDER: Record<SwotVerdict["state"], string> = {
  desenvolvimento: "border-b-chart-3",
  crescimento: "border-b-success",
  manutencao: "border-b-warning",
  sobrevivencia: "border-b-destructive",
}

/** Cabeçalho de fator: etiqueta (F1, FR1, O1, A1), texto editável e botão de excluir. */
function FactorHeader({
  type,
  factor,
  onText,
  onRemove,
}: {
  type: SwotQuadrant
  factor: SwotFactor
  onText: (value: string) => void
  onRemove: () => void
}) {
  const q = QUADRANT[type]
  return (
    <div className="group/factor relative flex w-full items-center gap-2">
      <span title={q.title} className={cn("shrink-0 rounded-sm border px-1.5 py-0.5 font-mono text-[9px] font-black", q.tag)}>
        {factor.id}
      </span>
      <GridInput value={factor.texto} placeholder={q.placeholder} aria-label={`${q.title} ${factor.id}`} className="pr-6" onChange={(e) => onText(e.target.value)} />
      <Button
        size="icon-xs"
        variant="ghost"
        className="absolute right-0 size-5 text-muted-foreground opacity-0 group-hover/factor:opacity-60 hover:text-destructive hover:opacity-100 focus-visible:opacity-100"
        title={q.remove}
        aria-label={`${q.remove} ${factor.id}`}
        onClick={onRemove}
      >
        <XIcon />
      </Button>
    </div>
  )
}

function correlationTone(value: number, internalId: string, externalId: string) {
  if (value <= 0) return ""
  const risk = internalId.startsWith("FR") || externalId.startsWith("A")
  if (risk) return value >= 2 ? "bg-destructive/25" : "bg-destructive/10"
  return value >= 2 ? "bg-success/25" : "bg-success/10"
}

function MetricRow({ label, desc, value, className }: { label: string; desc: string; value: number; className: string }) {
  return (
    <div className="flex items-center justify-between border-b border-dashed pb-3.5 last:border-b-0 last:pb-0">
      <div className="flex flex-col gap-1">
        <span className="text-[11px] font-extrabold uppercase tracking-widest text-muted-foreground">{label}</span>
        <span className="text-[11px] text-muted-foreground/80">{desc}</span>
      </div>
      <span className={cn("text-[32px] font-black tracking-tighter tabular-nums", className)}>{value}</span>
    </div>
  )
}

export function SwotPage() {
  const { value: swot, update, isLoading, error, refetch } = useAutosaveDocument<SwotState>("swot", SWOT_DEFAULT, normalizeSwot)

  if (error && !swot) return <PageLoadError error={error} onRetry={() => void refetch()} />
  if (isLoading || !swot) return <PageLoading />

  const { forcas, fraquezas, oportunidades, ameacas, planoAcao } = swot
  const verdict = getSwotVerdict(swot)
  const totalBudget = planoAcao.reduce((acc, p) => acc + (p.quanto || 0), 0)
  const externals = [
    ...oportunidades.map((f) => ({ type: "oportunidades" as const, factor: f })),
    ...ameacas.map((f) => ({ type: "ameacas" as const, factor: f })),
  ]
  const internals = [...forcas.map((f) => ({ type: "forcas" as const, factor: f })), ...fraquezas.map((f) => ({ type: "fraquezas" as const, factor: f }))]

  const setFactorText = (type: SwotQuadrant, id: string, texto: string) =>
    update((s) => ({ ...s, [type]: s[type].map((f) => (f.id === id ? { ...f, texto } : f)) }))
  const setCorrelation = (a: string, b: string, v: number) => update((s) => ({ ...s, correlacoes: { ...s.correlacoes, [`${a}:${b}`]: v } }))
  const setPlano = (id: number, patch: Partial<SwotState["planoAcao"][number]>) =>
    update((s) => ({ ...s, planoAcao: s.planoAcao.map((p) => (p.id === id ? { ...p, ...patch } : p)) }))

  return (
    <div className="flex flex-col gap-7">
      <PageHeader
        title="Análise SWOT Dinâmica"
        subtitle="Matriz quantitativa de impactos estratégicos e planos de ação integrados"
        actions={
          <Button variant="outline" size="sm" className={PILL} onClick={() => update(swotSeed(), { immediate: true })}>
            <RefreshCwIcon data-icon="inline-start" />
            Reiniciar Cenário Exemplo
          </Button>
        }
      />

      {/* Etapa 1: grade de preenchimento */}
      <Card className="gap-3">
        <CardHeader>
          <CardTitle>
            <SectionLabel icon={Grid3x3Icon}>Etapa 1: Cruzamento de Correlações (Estilo Excel)</SectionLabel>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Table className="table-fixed border-collapse text-[13px]" style={{ minWidth: 250 + 180 * Math.max(1, externals.length) }}>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead rowSpan={2} className="sticky left-0 z-10 h-12 w-62.5 border border-r-2 bg-accent px-2.5">
                  <div className="flex flex-col items-center gap-0.5 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                    <span>Externo →</span>
                    <span>↓ Interno</span>
                  </div>
                </TableHead>
                {oportunidades.length > 0 ? (
                  <TableHead colSpan={oportunidades.length} className="h-12 border bg-success/15 text-center text-[11px] font-extrabold uppercase tracking-widest text-success">
                    Oportunidades (Ambiente Externo)
                  </TableHead>
                ) : null}
                {ameacas.length > 0 ? (
                  <TableHead colSpan={ameacas.length} className="h-12 border bg-destructive/15 text-center text-[11px] font-extrabold uppercase tracking-widest text-destructive">
                    Ameaças (Ambiente Externo)
                  </TableHead>
                ) : null}
              </TableRow>
              <TableRow className="hover:bg-transparent">
                {externals.map(({ type, factor }) => (
                  <TableHead key={factor.id} className="h-12 border bg-muted/40 px-2.5">
                    <FactorHeader
                      type={type}
                      factor={factor}
                      onText={(t) => setFactorText(type, factor.id, t)}
                      onRemove={() => update((s) => removeSwotFactor(s, type, factor.id))}
                    />
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {internals.map(({ type, factor }) => (
                <TableRow key={factor.id} className="hover:bg-transparent">
                  <TableCell className="sticky left-0 z-10 h-12 border border-r-2 bg-card px-2.5 font-bold">
                    <FactorHeader
                      type={type}
                      factor={factor}
                      onText={(t) => setFactorText(type, factor.id, t)}
                      onRemove={() => update((s) => removeSwotFactor(s, type, factor.id))}
                    />
                  </TableCell>
                  {externals.map((ext) => {
                    const v = swot.correlacoes[`${factor.id}:${ext.factor.id}`] ?? 0
                    return (
                      <TableCell key={ext.factor.id} className={cn("h-12 border p-0 text-center transition-colors", correlationTone(v, factor.id, ext.factor.id))}>
                        <FullNativeSelect
                          aria-label={`Correlação ${factor.id} × ${ext.factor.id}`}
                          className="h-12 rounded-none border-0 bg-transparent! text-center text-[13px] font-extrabold shadow-none [text-align-last:center] hover:bg-transparent!"
                          value={String(v)}
                          onChange={(e) => setCorrelation(factor.id, ext.factor.id, parseInt(e.target.value, 10) || 0)}
                        >
                          {[0, 1, 2].map((n) => (
                            <NativeSelectOption key={n} value={String(n)}>
                              {n}
                            </NativeSelectOption>
                          ))}
                        </FullNativeSelect>
                      </TableCell>
                    )
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="flex flex-wrap gap-3">
            {(
              [
                ["forcas", "Força (F)", "hover:border-success hover:text-success"],
                ["fraquezas", "Fraqueza (FR)", "hover:border-destructive hover:text-destructive"],
                ["oportunidades", "Oportunidade (O)", "hover:border-primary hover:text-primary"],
                ["ameacas", "Ameaça (A)", "hover:border-muted-foreground hover:text-foreground"],
              ] as const
            ).map(([type, label, hover]) => (
              <Button key={type} variant="outline" size="sm" className={cn(PILL, hover)} onClick={() => update((s) => addSwotFactor(s, type))}>
                <PlusIcon data-icon="inline-start" />
                {label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Etapa 2: cálculos e veredito */}
      <div className="grid grid-cols-1 items-stretch gap-6 min-[1025px]:grid-cols-[1fr_1.6fr]">
        <Card className="justify-center gap-4 border-b-4 border-b-input bg-linear-to-br from-card to-background">
          <CardHeader>
            <CardTitle>
              <SectionLabel icon={BarChart2Icon} className="text-[10px] font-black">
                Cálculos Estratégicos
              </SectionLabel>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <MetricRow label="Capacidade Ofensiva" desc="Forças aproveitando Oportunidades" value={verdict.FO} className="text-chart-3" />
            <MetricRow label="Capacidade Defensiva" desc="Forças blindando contra Ameaças" value={verdict.FA} className="text-success" />
          </CardContent>
        </Card>

        <Card className={cn("relative justify-between gap-3.5 overflow-hidden border-b-[5px] bg-linear-to-br from-card to-background py-7", VERDICT_BORDER[verdict.state])}>
          <CardHeader className="gap-3.5 px-7">
            <ShieldCheckIcon aria-hidden="true" className="size-27.5 text-foreground opacity-25" strokeWidth={1.5} />
            <Badge variant="secondary" className="rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-muted-foreground">
              Veredito Velo Consultoria
            </Badge>
          </CardHeader>
          <CardContent className="px-7">
            <CardTitle className="mt-1 text-xl leading-tight font-black uppercase tracking-[0.08em]">Predominância: {verdict.veredito}</CardTitle>
            <CardDescription className="mt-2.5 text-[13px] leading-relaxed text-foreground">{verdict.verdictText}</CardDescription>
          </CardContent>
          <CardFooter className="mx-7 gap-2 border-t px-0 text-[10.5px] font-extrabold uppercase tracking-wider text-muted-foreground [.border-t]:pt-3">
            <AwardIcon className="size-3.5 text-primary" />
            <span>Análise Quantitativa Autenticada</span>
          </CardFooter>
        </Card>
      </div>

      {/* Etapa 3: plano de ação 5W2H */}
      <Card className="gap-5">
        <CardHeader className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-col gap-1">
            <CardTitle className="flex items-center gap-2 font-extrabold tracking-tight">
              <ListTodoIcon className="size-4.5 text-primary" />
              <span>Etapa 3: Plano de Ação Estratégico (Metodologia 5W2H)</span>
            </CardTitle>
            <CardDescription className="text-xs">Gere e edite planos de ação alinhados com o diagnóstico de {verdict.veredito.toLowerCase()}</CardDescription>
          </div>
          <BudgetBadge label="Orçamento Acumulado:" value={totalBudget} id="swot-plano-total-budget" />
        </CardHeader>

        <CardContent>
          <FiveW2HTable
            rows={planoAcao}
            widths={["25%", "20%", "13%", "13%", "10%", "14%", "11%"]}
            placeholders={{
              oQue: "Verbo no infinitivo...",
              porQue: "Motivação da ação...",
              onde: "Local ou setor...",
              quem: "Responsável...",
              como: "Passo a passo...",
            }}
            onChange={(id, field, v) => setPlano(id, { [field]: v })}
            onQuantoChange={(id, quanto) => setPlano(id, { quanto })}
            onRemove={(id) => update((s) => ({ ...s, planoAcao: s.planoAcao.filter((p) => p.id !== id) }))}
            deleteTitle="Excluir Linha"
            emptyText="Nenhuma ação estratégica definida. Clique no botão abaixo para planejar."
          />
        </CardContent>

        <CardFooter>
          <Button className="rounded-full px-5 text-[11.5px] font-extrabold uppercase tracking-widest" onClick={() => update((s) => addSwotPlano(s))}>
            <PlusIcon data-icon="inline-start" />
            Adicionar Ação 5W2H
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
