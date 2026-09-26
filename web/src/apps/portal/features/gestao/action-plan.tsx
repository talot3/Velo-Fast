import { useState, type FormEvent, type ReactNode } from "react"
import { CalendarIcon, CheckSquareIcon, ClipboardListIcon, MegaphoneIcon, PlusCircleIcon, SparklesIcon } from "lucide-react"
import { toast } from "sonner"

import { CrudDialog } from "@/components/app/crud-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { NativeSelectOption } from "@/components/ui/native-select"
import { Textarea } from "@/components/ui/textarea"
import { parseMoneyBR, todayBR } from "@/lib/format"
import { cn } from "@/lib/utils"

import {
  KPI_OPTIONS,
  MACROOBJETIVOS,
  MESES,
  SAZONAL_VAZIO,
  STATUS_OPTIONS,
  actionPlanSeed,
  nextAcaoId,
  normalizeActionPlan,
  type ActionPlanState,
  type ApAcao,
  type ApStatus,
} from "./action-plan-model"
import { FiveW2HTable } from "./five-w2h-table"
import { FullNativeSelect } from "./full-native-select"
import { BudgetBadge, PageLoadError, PageLoading, SectionLabel } from "./sheet-ui"
import { useAutosaveDocument } from "./use-autosave-document"

const ACTION_PLAN_DEFAULT = actionPlanSeed()

const MINI_LABEL = "text-[10px] font-black uppercase tracking-wider text-muted-foreground"

const STATUS_CLASS: Record<ApStatus, string> = {
  "Em execução": "border-success/30 bg-success/15 text-success",
  Concluído: "border-chart-3/30 bg-chart-3/15 text-chart-3",
  Atrasado: "border-destructive/30 bg-destructive/15 text-destructive",
}

/** Cor da etiqueta de KPI (CAC, ROI, LTV, NPS; demais = neutra). */
function kpiClass(kpi: string) {
  if (kpi === "CAC") return "border-destructive/30 bg-destructive/15 text-destructive"
  if (kpi === "ROI") return "border-success/30 bg-success/15 text-success"
  if (kpi === "LTV") return "border-chart-3/30 bg-chart-3/15 text-chart-3"
  if (kpi === "NPS") return "border-warning/30 bg-warning/15 text-warning"
  return "border-border bg-secondary text-secondary-foreground"
}

type Draft = { oQue: string; porQue: string; onde: string; quem: string; quando: string; quanto: string; kpi: string; como: string }

const emptyDraft = (): Draft => ({ oQue: "", porQue: "", onde: "", quem: "", quando: todayBR(), quanto: "", kpi: KPI_OPTIONS[0], como: "" })

function NewActionDialog({
  open,
  onOpenChange,
  mes,
  draft,
  setDraft,
  onSave,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  mes: string
  draft: Draft
  setDraft: (patch: Partial<Draft>) => void
  onSave: () => void
}) {
  const field = (id: string, label: string, span: string, control: ReactNode) => (
    <Field className={cn("gap-1.5", span)}>
      <FieldLabel htmlFor={id} className="text-[11px] font-extrabold uppercase text-muted-foreground">
        {label}
      </FieldLabel>
      {control}
    </Field>
  )
  return (
    <CrudDialog
      open={open}
      onOpenChange={onOpenChange}
      size="md"
      title={`Planejar Ação Estratégica (${mes})`}
      headerExtra={<PlusCircleIcon className="size-5 shrink-0 text-primary" />}
      submitLabel="Gravar Ação"
      onSubmit={onSave}
    >
      <FieldGroup className="grid grid-cols-1 gap-4 sm:grid-cols-12">
        {field(
          "modal-ap-oque",
          "O Que Fazer (What - Iniciar com Verbo no Infinitivo)",
          "sm:col-span-12",
          <Input id="modal-ap-oque" required autoFocus placeholder="Ex: Treinar os operadores comerciais no caixa..." value={draft.oQue} onChange={(e) => setDraft({ oQue: e.target.value })} />
        )}
        {field(
          "modal-ap-porque",
          "Por Quê (Why - Ganho Estratégico Futuro)",
          "sm:col-span-12",
          <Input id="modal-ap-porque" required placeholder="Ex: Evitar atritos de atendimento e reter clientes..." value={draft.porQue} onChange={(e) => setDraft({ porQue: e.target.value })} />
        )}
        {field(
          "modal-ap-onde",
          "Onde (Where)",
          "sm:col-span-6",
          <Input id="modal-ap-onde" required placeholder="Ex: Unidade Centro físico e site..." value={draft.onde} onChange={(e) => setDraft({ onde: e.target.value })} />
        )}
        {field(
          "modal-ap-quem",
          "Quem (Who - Responsável)",
          "sm:col-span-6",
          <Input id="modal-ap-quem" required placeholder="Ex: Supervisor de Atendimento..." value={draft.quem} onChange={(e) => setDraft({ quem: e.target.value })} />
        )}
        {field(
          "modal-ap-quando",
          "Quando (When - Prazo final)",
          "sm:col-span-4",
          <Input id="modal-ap-quando" type="date" required value={draft.quando} onChange={(e) => setDraft({ quando: e.target.value })} />
        )}
        {field(
          "modal-ap-quanto",
          "Quanto (How Much - R$)",
          "sm:col-span-4",
          <Input
            id="modal-ap-quanto"
            required
            inputMode="decimal"
            autoComplete="off"
            placeholder="0,00"
            value={draft.quanto}
            onChange={(e) => setDraft({ quanto: e.target.value })}
          />
        )}
        {field(
          "modal-ap-kpi",
          "KPI Alvo (Métrica)",
          "sm:col-span-4",
          <FullNativeSelect id="modal-ap-kpi" value={draft.kpi} onChange={(e) => setDraft({ kpi: e.target.value })}>
            {KPI_OPTIONS.map((k) => (
              <NativeSelectOption key={k} value={k}>
                {k}
              </NativeSelectOption>
            ))}
          </FullNativeSelect>
        )}
        {field(
          "modal-ap-como",
          "Como Fazer (How - Método de Aplicação)",
          "sm:col-span-12",
          <Textarea
            id="modal-ap-como"
            required
            className="min-h-17.5 resize-y"
            placeholder="Ex: Contratar consultoria de varejo e aplicar dinâmicas de atendimento prático..."
            value={draft.como}
            onChange={(e) => setDraft({ como: e.target.value })}
          />
        )}
      </FieldGroup>
    </CrudDialog>
  )
}

export function ActionPlanPage() {
  const { value: plan, update, isLoading, error, refetch } = useAutosaveDocument<ActionPlanState>("action_plan", ACTION_PLAN_DEFAULT, normalizeActionPlan)
  const [modalOpen, setModalOpen] = useState(false)
  const [draft, setDraftState] = useState<Draft>(emptyDraft)

  if (error && !plan) return <PageLoadError error={error} onRetry={() => void refetch()} />
  if (isLoading || !plan) return <PageLoading />

  const { macroobjetivo, status, mesAtivo, notasDiagnostico } = plan
  const mesAcoes = plan.acoes[mesAtivo] ?? []
  const totalBudget = mesAcoes.reduce((acc, a) => acc + (a.quanto || 0), 0)
  const sazonal = plan.sazonais[mesAtivo] ?? SAZONAL_VAZIO

  const setAcao = (id: number, patch: Partial<ApAcao>) =>
    update((s) => ({ ...s, acoes: { ...s.acoes, [s.mesAtivo]: (s.acoes[s.mesAtivo] ?? []).map((a) => (a.id === id ? { ...a, ...patch } : a)) } }))

  function openModal() {
    setDraftState(emptyDraft())
    setModalOpen(true)
  }

  function saveNewAction(e?: FormEvent) {
    e?.preventDefault()
    const oQue = draft.oQue.trim()
    if (!oQue) {
      toast.error("Por favor, informe a descrição da ação estratégica (O Que Fazer).")
      return
    }
    const parsed = parseMoneyBR(draft.quanto)
    update(
      (s) => {
        const mes = s.mesAtivo
        const acao: ApAcao = {
          id: nextAcaoId(s),
          oQue,
          porQue: draft.porQue.trim(),
          onde: draft.onde.trim(),
          quem: draft.quem.trim(),
          quando: draft.quando || todayBR(),
          como: draft.como.trim(),
          quanto: Number.isFinite(parsed) ? parsed : 0,
          kpi: draft.kpi,
        }
        return { ...s, acoes: { ...s.acoes, [mes]: [...(s.acoes[mes] ?? []), acao] } }
      },
      { immediate: true }
    )
    setModalOpen(false)
  }

  return (
    <div className="grid grid-cols-1 gap-6 min-[1025px]:grid-cols-[minmax(0,1fr)_280px]">
      <div className="flex min-w-0 flex-col gap-6">
        {/* Cabeçalho: foco estratégico e status */}
        <Card className="py-5">
          <CardContent className="flex flex-wrap items-center justify-between gap-4">
            <Field className="w-auto min-w-70 gap-1.5">
              <FieldLabel htmlFor="ap-macroobjetivo" className={MINI_LABEL}>
                Foco Estratégico (Macroobjetivo)
              </FieldLabel>
              <FullNativeSelect id="ap-macroobjetivo" className="font-bold" value={macroobjetivo} onChange={(e) => update((s) => ({ ...s, macroobjetivo: e.target.value }))}>
                {MACROOBJETIVOS.map((m) => (
                  <NativeSelectOption key={m} value={m}>
                    {m}
                  </NativeSelectOption>
                ))}
              </FullNativeSelect>
            </Field>

            <div className="flex items-center gap-3 rounded-xl border bg-accent px-4.5 py-2.5">
              <span className={MINI_LABEL}>Status:</span>
              <Badge variant="outline" className={cn("rounded-full px-2.5 py-1 text-[10.5px] font-black uppercase tracking-wider", STATUS_CLASS[status])}>
                {status}
              </Badge>
              <FullNativeSelect
                aria-label="Status"
                wrapperClassName="w-auto"
                size="sm"
                className="text-[11px] font-extrabold uppercase"
                value={status}
                onChange={(e) => update((s) => ({ ...s, status: e.target.value as ApStatus }))}
              >
                {STATUS_OPTIONS.map((o) => (
                  <NativeSelectOption key={o.value} value={o.value}>
                    {o.label}
                  </NativeSelectOption>
                ))}
              </FullNativeSelect>
            </div>
          </CardContent>
        </Card>

        {/* Cronograma tático anual */}
        <Card className="gap-3">
          <CardHeader>
            <CardTitle>
              <SectionLabel icon={CalendarIcon} className="text-[10px] font-black">
                Cronograma Tático Anual
              </SectionLabel>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-0.5 overflow-x-auto pb-3">
              {MESES.map((m) => {
                const active = m === mesAtivo
                return (
                  <Button
                    key={m}
                    variant={active ? "outline" : "ghost"}
                    aria-pressed={active}
                    className={cn("h-auto flex-auto px-2 py-2.5 text-[12.5px] font-extrabold", active ? "-translate-y-px shadow-md" : "text-muted-foreground")}
                    onClick={() => update((s) => ({ ...s, mesAtivo: m }))}
                  >
                    {m}
                  </Button>
                )
              })}
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 border-t border-dashed pt-4 min-[601px]:grid-cols-2">
              {[
                { icon: SparklesIcon, label: "Ativação de Experiência", value: sazonal.experiencia },
                { icon: MegaphoneIcon, label: "Campanha Sazonal", value: sazonal.campanha },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-center gap-3 rounded-lg border bg-accent px-4 py-3.5">
                  <div className="flex size-9.5 shrink-0 items-center justify-center rounded-full bg-card text-primary shadow-inner">
                    <Icon className="size-4" />
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className={MINI_LABEL}>{label}</span>
                    <span className="text-xs font-bold">{value}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Grade de execução 5W2H */}
        <Card className="gap-5">
          <CardHeader className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-col gap-1">
              <CardTitle className="flex items-center gap-2 font-extrabold tracking-tight">
                <CheckSquareIcon className="size-4.5 text-primary" />
                <span>Grade de Execução ({mesAtivo})</span>
              </CardTitle>
              <CardDescription className="text-xs">Metodologia 5W2H integrada aos indicadores chave de controle</CardDescription>
            </div>
            <BudgetBadge label="Orçamento Mensal:" value={totalBudget} id="ap-total-budget-label" />
          </CardHeader>

          <CardContent>
            <FiveW2HTable
              rows={mesAcoes}
              widths={["22%", "18%", "10%", "10%", "10%", "12%", "10%"]}
              placeholders={{ oQue: "Verbo no infinitivo...", porQue: "Ganho futuro...", onde: "Local...", quem: "Responsável...", como: "Método..." }}
              onChange={(id, f, v) => setAcao(id, { [f]: v })}
              onQuantoChange={(id, quanto) => setAcao(id, { quanto })}
              onRemove={(id) => update((s) => ({ ...s, acoes: { ...s.acoes, [s.mesAtivo]: (s.acoes[s.mesAtivo] ?? []).filter((a) => a.id !== id) } }), { immediate: true })}
              deleteTitle="Excluir Ação"
              minWidth={760}
              emptyText={`Nenhuma ação tática planejada para o mês de ${mesAtivo}.`}
              kpi={{
                width: "10%",
                render: (a) => (
                  <Badge variant="outline" className={cn("rounded-md px-2 py-1 font-mono text-[9px] font-black whitespace-normal uppercase", kpiClass(a.kpi))}>
                    {a.kpi || "NPS"}
                  </Badge>
                ),
              }}
            />
          </CardContent>

          <CardFooter>
            <Button className="rounded-full px-5 text-[11.5px] font-extrabold uppercase tracking-widest" onClick={openModal}>
              + Nova Ação Estratégica
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* Painel lateral: notas de diagnóstico */}
      <Card className="gap-4 self-start border-b-[5px] border-b-muted-foreground/50 bg-linear-to-br from-card to-background">
        <CardHeader className="gap-4">
          <CardTitle className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-muted-foreground">
            <ClipboardListIcon className="size-4" />
            Notas de Diagnóstico
          </CardTitle>
          <CardDescription className="text-[11px] leading-snug">Lembretes dos gaps internos identificados antes de planejar as ações táticas.</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            aria-label="Notas de Diagnóstico"
            className="min-h-45 resize-y border-transparent bg-transparent! px-1.5 text-[12.5px] leading-relaxed font-medium text-muted-foreground shadow-none focus-visible:border-input focus-visible:ring-0"
            placeholder="Digite observações sobre auditorias de campo, gaps comerciais, treinamento pendente..."
            value={notasDiagnostico}
            onChange={(e) => update((s) => ({ ...s, notasDiagnostico: e.target.value }))}
          />
        </CardContent>
        <CardFooter className="justify-end font-mono text-[10px] font-semibold text-muted-foreground opacity-70">Autosalvamento ativo</CardFooter>
      </Card>

      <NewActionDialog
        open={modalOpen}
        onOpenChange={setModalOpen}
        mes={mesAtivo}
        draft={draft}
        setDraft={(p) => setDraftState((d) => ({ ...d, ...p }))}
        onSave={() => saveNewAction()}
      />
    </div>
  )
}
