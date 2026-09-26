import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react"
import { ChevronDownIcon, ChevronRightIcon, PenLineIcon, PlusIcon, SaveIcon, Trash2Icon, XIcon } from "lucide-react"
import { toast } from "sonner"

import { useConfirm } from "@/components/app/confirm-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { NativeSelectOption } from "@/components/ui/native-select"
import { Progress } from "@/components/ui/progress"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { newNumericId } from "@/data/records"
import { formatBRL, formatPercent } from "@/lib/format"
import { cn } from "@/lib/utils"

import {
  DRE_TYPE_OPTIONS,
  DRE_VALUE_TYPES,
  buildDreTreeRows,
  dreBadge,
  dreDateOptions,
  drePlanoOptions,
  dreSubtreeIds,
  fabricatedRuleValue,
  isRuleType,
  recalculateDreValues,
  type DreLine,
  type DreLineType,
  type DrePlanoContasRule,
} from "./dre-model"
import { FullNativeSelect } from "./full-native-select"
import { PageLoadError, PageLoading } from "./sheet-ui"
import { useDreLines } from "./use-dre-lines"

// ─── Formulário (painel da esquerda) ─────────────────────────────────

type DreFormState = {
  description: string
  order: string
  parentId: string
  type: DreLineType
  pcSelect: string
  includeChildren: boolean
  dateType: string
  valueType: string
  /** Regras em edição; só vão para a linha ao clicar em "Gravar". */
  rules: DrePlanoContasRule[]
  expanded: boolean
  bold: boolean
  showPercent: boolean
  calcBase: string
}

function formFromLine(line: DreLine | null): DreFormState {
  const type = line?.type ?? "calculo"
  return {
    description: line?.description ?? "",
    order: String(line?.order ?? 1),
    parentId: line?.parentId != null ? String(line.parentId) : "",
    type,
    pcSelect: drePlanoOptions(type)[0].value,
    includeChildren: false,
    dateType: dreDateOptions(type)[0],
    valueType: DRE_VALUE_TYPES[0],
    rules: (line?.planoContasRules ?? []).map((r) => ({ ...r })),
    expanded: !line || line.expanded,
    bold: Boolean(line?.bold),
    showPercent: !line || line.showPercent,
    calcBase: line?.linhaCalculoId ? String(line.linhaCalculoId) : "",
  }
}

/** Valores e percentuais da árvore (duas passadas: linhas de cálculo fora de ordem também fecham). */
function computeDre(lines: DreLine[]): DreLine[] {
  return recalculateDreValues(recalculateDreValues(lines))
}

const LABEL = "text-[11px] font-extrabold uppercase text-muted-foreground"

function FormField({ id, label, className, children }: { id: string; label: string; className?: string; children: ReactNode }) {
  return (
    <Field className={cn("gap-1.5", className)}>
      <FieldLabel htmlFor={id} className={LABEL}>
        {label}
      </FieldLabel>
      {children}
    </Field>
  )
}

function CheckField({ id, label, checked, onChange }: { id: string; label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <Field orientation="horizontal" className="w-fit gap-2">
      <Checkbox id={id} checked={checked} onCheckedChange={(v) => onChange(v === true)} />
      <FieldLabel htmlFor={id} className="text-xs font-bold text-muted-foreground">
        {label}
      </FieldLabel>
    </Field>
  )
}

function DreFormPanel({
  form,
  patch,
  isNew,
  title,
  parentOptions,
  calcBaseOptions,
  parentValue,
  calcBaseValue,
  onNew,
  onSave,
}: {
  form: DreFormState
  patch: (p: Partial<DreFormState>) => void
  isNew: boolean
  title: string
  parentOptions: DreLine[]
  calcBaseOptions: DreLine[]
  parentValue: string
  calcBaseValue: string
  onNew: () => void
  onSave: () => void
}) {
  const showRules = isRuleType(form.type)

  function changeType(type: DreLineType) {
    // Como antes: ao trocar o tipo, as listas de plano e de data voltam à primeira opção.
    patch({ type, pcSelect: drePlanoOptions(type)[0].value, dateType: dreDateOptions(type)[0] })
  }

  function addRule() {
    const name = form.pcSelect
    if (!name) {
      toast.error("Por favor, selecione um plano de contas.")
      return
    }
    const rule: DrePlanoContasRule = {
      id: newNumericId(),
      name: name + (form.includeChildren ? " (Com Filhos)" : ""),
      tpData: form.dateType,
      tpValor: form.valueType,
      active: true,
    }
    patch({ rules: [...form.rules, rule] })
  }

  return (
    <Card className="gap-5 bg-linear-to-br from-card to-background shadow-lg min-[951px]:sticky min-[951px]:top-5">
      <CardHeader className="mx-6 flex items-center justify-between gap-2 border-b border-dashed px-0 [.border-b]:pb-3.5">
        <CardTitle className="text-sm font-extrabold tracking-tight">{title}</CardTitle>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="rounded-full border-success/40 text-[11px] font-extrabold uppercase text-success hover:bg-success/10 hover:text-success"
            onClick={onNew}
          >
            <PlusIcon data-icon="inline-start" />
            Nova
          </Button>
          <Button size="sm" className="rounded-full text-[11px] font-extrabold uppercase" onClick={onSave}>
            <SaveIcon data-icon="inline-start" />
            Gravar
          </Button>
          {!isNew ? (
            <Button size="icon-xs" variant="ghost" className="rounded-full text-muted-foreground" title="Limpar Seleção" aria-label="Limpar Seleção" onClick={onNew}>
              <XIcon />
            </Button>
          ) : null}
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        <FormField id="dre-inp-desc" label="Descrição">
          <Input
            id="dre-inp-desc"
            className="font-semibold"
            placeholder="Ex: (+) RECEITA BRUTA DE VENDAS, (-) Impostos"
            value={form.description}
            onChange={(e) => patch({ description: e.target.value })}
          />
        </FormField>

        <div className="grid grid-cols-2 gap-3.5">
          <FormField id="dre-inp-order" label="Ordem">
            <Input id="dre-inp-order" type="number" className="font-semibold" value={form.order} onChange={(e) => patch({ order: e.target.value })} />
          </FormField>
          <FormField id="dre-inp-parent" label="Aninhar Linha" className="min-w-0">
            <FullNativeSelect id="dre-inp-parent" className="font-semibold" value={parentValue} onChange={(e) => patch({ parentId: e.target.value })}>
              <NativeSelectOption value="">— Nenhuma (Linha Raiz) —</NativeSelectOption>
              {parentOptions.map((l) => (
                <NativeSelectOption key={l.id} value={String(l.id)}>
                  {l.description}
                </NativeSelectOption>
              ))}
            </FullNativeSelect>
          </FormField>
        </div>

        <FormField id="dre-inp-type" label="Tipo de Informação">
          <FullNativeSelect id="dre-inp-type" className="font-semibold" value={form.type} onChange={(e) => changeType(e.target.value as DreLineType)}>
            {DRE_TYPE_OPTIONS.map((o) => (
              <NativeSelectOption key={o.value} value={o.value}>
                {o.label}
              </NativeSelectOption>
            ))}
          </FullNativeSelect>
        </FormField>

        {showRules ? (
          <div className="flex flex-col gap-3 border-t border-dashed pt-3.5">
            <div className="flex items-end gap-2.5">
              <FormField id="dre-pc-select" label="Plano de contas." className="min-w-0 flex-1">
                <FullNativeSelect id="dre-pc-select" className="font-semibold" value={form.pcSelect} onChange={(e) => patch({ pcSelect: e.target.value })}>
                  {drePlanoOptions(form.type).map((o) => (
                    <NativeSelectOption key={o.value} value={o.value}>
                      {o.label}
                    </NativeSelectOption>
                  ))}
                </FullNativeSelect>
              </FormField>
              <div className="flex w-20 shrink-0 flex-col items-center gap-1.5">
                <Label htmlFor="dre-pc-include-children" className="text-center text-[10px] font-extrabold uppercase text-muted-foreground">
                  Incluir Filhos?
                </Label>
                <Checkbox
                  id="dre-pc-include-children"
                  className="mb-2.5 size-4.5"
                  checked={form.includeChildren}
                  onCheckedChange={(v) => patch({ includeChildren: v === true })}
                />
              </div>
            </div>

            <div className="flex items-end gap-2.5">
              <FormField id="dre-pc-date-type" label="Tipo data" className="min-w-0 flex-1">
                <FullNativeSelect id="dre-pc-date-type" className="font-semibold" value={form.dateType} onChange={(e) => patch({ dateType: e.target.value })}>
                  {dreDateOptions(form.type).map((d) => (
                    <NativeSelectOption key={d} value={d}>
                      {d}
                    </NativeSelectOption>
                  ))}
                </FullNativeSelect>
              </FormField>
              <FormField id="dre-pc-value-type" label="Tipo Valor" className="min-w-0 flex-1">
                <FullNativeSelect id="dre-pc-value-type" className="font-semibold" value={form.valueType} onChange={(e) => patch({ valueType: e.target.value })}>
                  {DRE_VALUE_TYPES.map((v) => (
                    <NativeSelectOption key={v} value={v}>
                      {v}
                    </NativeSelectOption>
                  ))}
                </FullNativeSelect>
              </FormField>
              <Button size="icon" className="shrink-0" aria-label="Adicionar plano de contas" onClick={addRule}>
                <PlusIcon />
              </Button>
            </div>

            <div className="max-h-50 overflow-y-auto rounded-md border bg-card">
              <Table className="text-xs">
                <TableHeader>
                  <TableRow className="bg-accent hover:bg-accent">
                    <TableHead className="h-8 font-extrabold text-muted-foreground">Nome</TableHead>
                    <TableHead className="h-8 font-extrabold whitespace-normal text-muted-foreground">Tp. Data</TableHead>
                    <TableHead className="h-8 font-extrabold whitespace-normal text-muted-foreground">Tp. Valor</TableHead>
                    <TableHead className="h-8 w-10 text-center font-extrabold">Ativo</TableHead>
                    <TableHead className="h-8 w-10">
                      <span className="sr-only">Excluir</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {form.rules.length === 0 ? (
                    <TableRow className="hover:bg-transparent">
                      <TableCell colSpan={5} className="py-3 text-center text-muted-foreground">
                        Nenhum plano de contas vinculado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    form.rules.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-bold whitespace-normal">{r.name}</TableCell>
                        <TableCell className="whitespace-normal text-muted-foreground">{r.tpData}</TableCell>
                        <TableCell className="whitespace-normal text-muted-foreground">{r.tpValor}</TableCell>
                        <TableCell className="text-center">
                          <Checkbox
                            aria-label={`Ativo: ${r.name}`}
                            checked={r.active}
                            onCheckedChange={(v) => patch({ rules: form.rules.map((x) => (x.id === r.id ? { ...x, active: v === true } : x)) })}
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            size="icon-xs"
                            variant="ghost"
                            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                            aria-label={`Excluir plano ${r.name}`}
                            onClick={() => patch({ rules: form.rules.filter((x) => x.id !== r.id) })}
                          >
                            <Trash2Icon />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        ) : null}

        <div className="flex flex-col gap-3 border-t border-dashed pt-4">
          <CheckField id="dre-chk-expanded" label="Iniciar Expandido" checked={form.expanded} onChange={(v) => patch({ expanded: v })} />
          <CheckField id="dre-chk-bold" label="Negrito" checked={form.bold} onChange={(v) => patch({ bold: v })} />
          <CheckField id="dre-chk-percent" label="Exibir Percentual" checked={form.showPercent} onChange={(v) => patch({ showPercent: v })} />
        </div>

        <FormField id="dre-inp-calc-base" label="Linha calculo (Valor linha / Valor Linha calculo * 100)" className="border-t border-dashed pt-4">
          <FullNativeSelect id="dre-inp-calc-base" className="font-semibold" value={calcBaseValue} onChange={(e) => patch({ calcBase: e.target.value })}>
            <NativeSelectOption value="">— Selecione (Padrão: Receita Bruta) —</NativeSelectOption>
            {calcBaseOptions.map((l) => (
              <NativeSelectOption key={l.id} value={String(l.id)}>
                {l.description}
              </NativeSelectOption>
            ))}
          </FullNativeSelect>
        </FormField>
      </CardContent>
    </Card>
  )
}

// ─── Árvore (tabela da direita) ──────────────────────────────────────

const BADGE_CLASS = {
  plus: "border-success/25 bg-success/10 text-success",
  minus: "border-destructive/25 bg-destructive/10 text-destructive",
  equals: "border-chart-3/25 bg-chart-3/10 text-chart-3",
} as const

const BADGE_SIGN = { plus: "+", minus: "-", equals: "=" } as const

function DreTreeTable({
  lines,
  activeId,
  onSelect,
  onToggle,
  onDelete,
}: {
  lines: DreLine[]
  activeId: number | null
  onSelect: (id: number) => void
  onToggle: (id: number) => void
  onDelete: (id: number) => void
}) {
  const rows = useMemo(() => buildDreTreeRows(lines), [lines])

  function rowKeyDown(e: KeyboardEvent<HTMLTableRowElement>, id: number) {
    if (e.target !== e.currentTarget) return
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      onSelect(id)
    }
  }

  return (
    <Card className="gap-0 overflow-hidden bg-linear-to-br from-card to-background py-0 shadow-sm">
      <CardContent className="px-0">
        <Table className="min-w-150">
          <TableHeader>
            <TableRow className="bg-accent hover:bg-accent">
              {["Descrição", "Valor (R$)", "% da Receita"].map((h, i) => (
                <TableHead
                  key={h}
                  className={cn("h-auto px-4.5 py-3 text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground", i === 1 && "w-37.5", i === 2 && "w-32.5")}
                >
                  {h}
                </TableHead>
              ))}
              <TableHead className="h-auto w-25 px-4.5 py-3 text-right text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(({ line, depth, hasChildren }) => {
              const isRoot = line.parentId === null
              const selected = line.id === activeId
              const badge = dreBadge(line.description)
              const pct = Math.min(100, Math.max(0, line.percent)) || 0
              return (
                <TableRow
                  key={line.id}
                  tabIndex={0}
                  data-state={selected ? "selected" : undefined}
                  className={cn(
                    "cursor-pointer text-[13px] outline-none focus-visible:bg-muted/60",
                    isRoot && "bg-accent hover:bg-accent/70",
                    selected && "bg-primary/10 hover:bg-primary/15 data-[state=selected]:bg-primary/10"
                  )}
                  onClick={() => onSelect(line.id)}
                  onKeyDown={(e) => rowKeyDown(e, line.id)}
                >
                  <TableCell
                    className={cn(
                      "px-4.5 whitespace-normal",
                      isRoot ? "py-3.5 font-black uppercase tracking-wide" : "py-2.5 font-semibold",
                      !isRoot && line.bold && "font-extrabold",
                      selected && "shadow-[inset_4px_0_0_var(--color-primary)]"
                    )}
                  >
                    <div className="flex items-center">
                      {Array.from({ length: depth }, (_, i) => (
                        <span key={i} aria-hidden="true" className="mr-2 inline-block h-4.5 w-6 shrink-0 border-r" />
                      ))}
                      {hasChildren ? (
                        <Button
                          size="icon-xs"
                          variant="ghost"
                          className="mr-1 size-5 shrink-0 text-muted-foreground"
                          aria-expanded={line.expanded}
                          aria-label={line.expanded ? "Recolher" : "Expandir"}
                          onClick={(e) => {
                            e.stopPropagation()
                            onToggle(line.id)
                          }}
                        >
                          {line.expanded ? <ChevronDownIcon /> : <ChevronRightIcon />}
                        </Button>
                      ) : (
                        <span aria-hidden="true" className="inline-block w-6 shrink-0" />
                      )}
                      {badge.kind ? (
                        <span
                          className={cn(
                            "mr-2 inline-flex min-w-5 shrink-0 items-center justify-center rounded-sm border px-1.5 py-0.5 font-mono text-[10px] font-black",
                            BADGE_CLASS[badge.kind]
                          )}
                        >
                          {BADGE_SIGN[badge.kind]}
                        </span>
                      ) : null}
                      <span className="tracking-tight">{badge.text}</span>
                    </div>
                  </TableCell>
                  <TableCell className={cn("px-4.5 tabular-nums", isRoot ? "font-black" : "font-bold", !isRoot && line.bold && "font-extrabold")}>
                    {formatBRL(line.val)}
                  </TableCell>
                  <TableCell className="px-4.5 text-xs font-bold text-muted-foreground">
                    {line.showPercent ? (
                      <div className="flex flex-col gap-1">
                        <span className={cn("tabular-nums", isRoot && "font-black text-foreground")}>{formatPercent(line.percent, 2)}</span>
                        <Progress
                          value={pct}
                          aria-label="% da Receita"
                          className={cn(
                            "h-1 bg-border",
                            line.description.includes("(-)") ? "[&>[data-slot=progress-indicator]]:bg-destructive" : "[&>[data-slot=progress-indicator]]:bg-chart-3"
                          )}
                        />
                      </div>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell className="px-4.5 text-right">
                    <div className="inline-flex items-center gap-1">
                      <Button
                        size="icon-xs"
                        variant="ghost"
                        className="text-muted-foreground hover:bg-chart-3/10 hover:text-chart-3"
                        title="Editar linha"
                        aria-label="Editar linha"
                        onClick={(e) => {
                          e.stopPropagation()
                          onSelect(line.id)
                        }}
                      >
                        <PenLineIcon />
                      </Button>
                      <Button
                        size="icon-xs"
                        variant="ghost"
                        className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        title="Excluir linha"
                        aria-label="Excluir linha"
                        onClick={(e) => {
                          e.stopPropagation()
                          onDelete(line.id)
                        }}
                      >
                        <Trash2Icon />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

// ─── Página ──────────────────────────────────────────────────────────

export function DrePersonalizadaPage() {
  const confirm = useConfirm()
  const { lines, isLoading, error, refetch, commit, commitRemoval } = useDreLines()
  /** Linha em edição; null = "Nova Linha". */
  const [activeId, setActiveId] = useState<number | null>(null)
  const [form, setForm] = useState<DreFormState>(() => formFromLine(null))
  const initialized = useRef(false)

  // Ao abrir, a primeira linha já vem selecionada para edição (como antes).
  useEffect(() => {
    if (initialized.current || !lines) return
    initialized.current = true
    const first = lines[0] ?? null
    setActiveId(first?.id ?? null)
    setForm(formFromLine(first))
  }, [lines])

  const computed = useMemo(() => (lines ? computeDre(lines) : []), [lines])

  if (error && !lines) return <PageLoadError error={error} onRetry={() => void refetch()} />
  if (isLoading || !lines) return <PageLoading />

  const all = lines
  const activeLine = activeId !== null ? all.find((l) => l.id === activeId) : undefined
  const isNew = activeId === null
  const blocked = activeId !== null ? dreSubtreeIds(all, activeId) : []
  const parentOptions = all.filter((l) => !blocked.includes(l.id))
  const calcBaseOptions = all.filter((l) => l.id !== activeId)
  const parentValue = parentOptions.some((l) => String(l.id) === form.parentId) ? form.parentId : ""
  const calcBaseValue = calcBaseOptions.some((l) => String(l.id) === form.calcBase) ? form.calcBase : ""

  function patch(p: Partial<DreFormState>) {
    setForm((f) => ({ ...f, ...p }))
  }

  function load(line: DreLine | null) {
    setActiveId(line?.id ?? null)
    setForm(formFromLine(line))
  }

  function handleSave() {
    const description = form.description.trim()
    if (!description) {
      toast.error("Por favor, informe a descrição da linha.")
      return
    }
    const order = parseInt(form.order, 10) || 1
    const parentId = parentValue ? parseInt(parentValue, 10) : null
    const type = form.type
    const planoContasRules = form.rules
    // Linhas com regras recebem o valor ilustrativo das regras ativas; as demais, 0 (recalculadas na árvore).
    const val = isRuleType(type) ? fabricatedRuleValue(planoContasRules) : 0
    const linhaCalculoId = calcBaseValue ? parseInt(calcBaseValue, 10) : null
    const fields = { description, order, parentId, type, val, expanded: form.expanded, bold: form.bold, showPercent: form.showPercent, planoContasRules, linhaCalculoId }

    let saved: DreLine
    let next: DreLine[]
    if (activeId !== null) {
      saved = { ...(activeLine ?? { id: activeId, percent: 0 }), ...fields }
      next = activeLine ? all.map((l) => (l.id === activeId ? saved : l)) : [...all, saved]
    } else {
      saved = { id: newNumericId(), percent: 0, ...fields }
      next = [...all, saved]
    }
    commit(next, [saved])
    load(saved)
  }

  async function handleDelete(id: number) {
    if (!(await confirm("Deseja realmente excluir esta linha e todas as suas subdivisões?", { destructive: true }))) return
    const ids = dreSubtreeIds(all, id)
    const next = all.filter((l) => !ids.includes(l.id))
    commitRemoval(next, ids)
    load(next[0] ?? null)
  }

  function handleToggle(id: number) {
    const line = all.find((l) => l.id === id)
    if (!line) return
    const changed = { ...line, expanded: !line.expanded }
    commit(
      all.map((l) => (l.id === id ? changed : l)),
      [changed]
    )
    if (activeId === id) patch({ expanded: changed.expanded })
  }

  function handleSelect(id: number) {
    load(all.find((l) => l.id === id) ?? null)
  }

  return (
    <div className="grid grid-cols-1 items-start gap-6 min-[951px]:grid-cols-[380px_minmax(0,1fr)]">
      <DreFormPanel
        form={form}
        patch={patch}
        isNew={isNew}
        title={isNew ? "Nova Linha" : `Linhas perfil #${activeId}`}
        parentOptions={parentOptions}
        calcBaseOptions={calcBaseOptions}
        parentValue={parentValue}
        calcBaseValue={calcBaseValue}
        onNew={() => load(null)}
        onSave={handleSave}
      />
      <DreTreeTable lines={computed} activeId={activeId} onSelect={handleSelect} onToggle={handleToggle} onDelete={(id) => void handleDelete(id)} />
    </div>
  )
}
