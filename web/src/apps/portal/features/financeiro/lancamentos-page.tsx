/**
 * Receitas e Despesas: a mesma tela (renderFinLancamentos do sistema antigo),
 * filtrada pelo tipo do lançamento.
 */
import { useMemo } from "react"
import { PlusIcon } from "lucide-react"
import { toast } from "sonner"

import { CrudDialog } from "@/components/app/crud-dialog"
import { KpiCard, KpiGrid } from "@/components/app/kpi"
import { PageHeader } from "@/components/app/page-header"
import { Button } from "@/components/ui/button"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { TableBody, TableRow } from "@/components/ui/table"
import { newNumericId, useRecords } from "@/data/records"
import { formatBRL, formatDateBR, todayBR } from "@/lib/format"
import { cn } from "@/lib/utils"

import { fromMoneyInput, toMoneyInput } from "./money"
import { OptionSelect, type Option } from "./option-select"
import {
  COLLECTIONS,
  type CentroCusto,
  type ContaFinanceira,
  type Lancamento,
  type LancamentoStatus,
  type LancamentoTipo,
  type PlanoConta,
} from "./types"
import { DataTable, FormGrid, HeadRow, ListRows, MONEY_CELL, Pill, RowActions, SPAN, Td, Th, type Tone } from "./ui"
import { useFormDialog } from "./use-form-dialog"
import { useRecordCrud } from "./use-record-crud"

type Draft = {
  data: string
  valor: string
  status: LancamentoStatus
  descricao: string
  planoContaId: string
  centroCustoId: string
  contaFinanceiraId: string
  obs: string
}

const STATUS_TONE: Record<string, Tone> = { Pago: "success", Cancelado: "danger", Pendente: "warning" }

function toDraft(item: Lancamento | null): Draft {
  return {
    data: item ? item.data ?? "" : todayBR(),
    valor: toMoneyInput(item?.valor ?? 0),
    status: item?.status ?? "Pago",
    descricao: item?.descricao ?? "",
    planoContaId: item?.planoContaId != null ? String(item.planoContaId) : "",
    centroCustoId: item?.centroCustoId != null ? String(item.centroCustoId) : "",
    contaFinanceiraId: item?.contaFinanceiraId != null ? String(item.contaFinanceiraId) : "",
    obs: item?.obs ?? "",
  }
}

/** Busca pelo id guardado como texto (comparação solta, como o `==` antigo). */
function byId<T extends { id: number | string }>(list: T[], id: string | number | null | undefined) {
  if (id === null || id === undefined || id === "") return undefined
  return list.find((x) => String(x.id) === String(id))
}

/** Opções "codigo — descricao"; mantém o item já escolhido mesmo se inativo. */
function codeOptions<T extends { id: number | string; codigo: string; descricao: string }>(
  list: T[],
  isActive: (item: T) => boolean,
  selected: string
): Option[] {
  return list
    .filter((c) => isActive(c) || String(c.id) === selected)
    .map((c) => ({ value: String(c.id), label: `${c.codigo} — ${c.descricao}` }))
}

export function LancamentosPage({ tipo }: { tipo: LancamentoTipo }) {
  const crud = useRecordCrud<Lancamento>(COLLECTIONS.lancamentos)
  const planos = useRecords<PlanoConta>(COLLECTIONS.planoContas).data?.items ?? []
  const centros = useRecords<CentroCusto>(COLLECTIONS.centrosCusto).data?.items ?? []
  const contas = useRecords<ContaFinanceira>(COLLECTIONS.contasFinanceiras).data?.items ?? []
  const form = useFormDialog<Lancamento, Draft>(toDraft)
  const d = form.draft
  const isReceita = tipo === "Receita"
  const tipoLower = tipo.toLowerCase()

  const list = useMemo(() => crud.items.filter((l) => l.tipo === tipo), [crud.items, tipo])
  // Mais recentes primeiro (ordenação estável: empates mantêm a ordem de cadastro).
  const rows = useMemo(() => [...list].sort((a, b) => (b.data ?? "").localeCompare(a.data ?? "")), [list])
  const total = list.reduce((s, l) => s + (Number(l.valor) || 0), 0)

  const statusOptions: Option[] = [
    { value: "Pago", label: isReceita ? "Recebido" : "Pago" },
    { value: "Pendente", label: "Pendente" },
    { value: "Cancelado", label: "Cancelado" },
  ]
  const planoOptions = codeOptions(planos, () => true, d.planoContaId)
  const centroOptions = codeOptions(centros, (c) => Boolean(c.ativo), d.centroCustoId)
  const contaOptions = codeOptions(contas, (c) => Boolean(c.ativa), d.contaFinanceiraId)

  // Tipo do formulário: o do lançamento em edição; senão o da tela.
  const formTipo = form.editing?.tipo ?? tipo

  async function submit() {
    const descricao = d.descricao.trim()
    const valor = fromMoneyInput(d.valor)
    if (!descricao) {
      form.markAttempted()
      toast.error("A descrição é obrigatória.")
      return
    }
    if (valor <= 0) {
      form.markAttempted()
      toast.error("Informe um valor maior que zero.")
      return
    }
    const item: Lancamento = {
      ...(form.editing ?? {}),
      id: form.editing?.id ?? newNumericId(),
      data: d.data,
      tipo: formTipo,
      descricao,
      valor,
      status: d.status,
      planoContaId: d.planoContaId || null,
      centroCustoId: d.centroCustoId || null,
      contaFinanceiraId: d.contaFinanceiraId || null,
      obs: d.obs.trim(),
    }
    if (await crud.saveItem(item)) form.setOpen(false)
  }

  const valorInvalid = form.attempted && !(fromMoneyInput(d.valor) > 0)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`Gestão de ${tipo}s`}
        subtitle={`Controle detalhado de ${tipoLower}s financeiras`}
        actions={
          <Button onClick={() => form.openWith(null)}>
            <PlusIcon data-icon="inline-start" />
            Nova {tipo}
          </Button>
        }
      />

      <KpiGrid columns={2}>
        <KpiCard label={`Total ${tipo}s`} value={formatBRL(total)} tone={isReceita ? "success" : "danger"} />
        <KpiCard label="Lançamentos" value={list.length} />
      </KpiGrid>

      <DataTable>
        <HeadRow>
          <Th>Data</Th>
          <Th>Descrição</Th>
          <Th>Plano de Contas</Th>
          <Th>Centro de Custo</Th>
          <Th>Conta Financeira</Th>
          <Th>Status</Th>
          <Th>Valor</Th>
          <Th className="w-20" />
        </HeadRow>
        <TableBody>
          <ListRows
            colSpan={8}
            isLoading={crud.query.isLoading}
            error={crud.query.error}
            isEmpty={list.length === 0}
            emptyTitle={`Nenhuma ${tipoLower} registrada.`}
          >
            {rows.map((l) => {
              const status = l.status || "Pago"
              return (
                <TableRow key={String(l.id)}>
                  <Td className="font-bold whitespace-nowrap tabular-nums">{l.data ? formatDateBR(l.data) : "-"}</Td>
                  <Td className="font-bold">{l.descricao}</Td>
                  <Td className="text-xs text-muted-foreground">{byId(planos, l.planoContaId)?.descricao ?? "-"}</Td>
                  <Td className="text-xs text-muted-foreground">{byId(centros, l.centroCustoId)?.descricao ?? "-"}</Td>
                  <Td className="text-xs text-muted-foreground">{byId(contas, l.contaFinanceiraId)?.descricao ?? "-"}</Td>
                  <Td>
                    <Pill tone={STATUS_TONE[status] ?? "warning"}>{status}</Pill>
                  </Td>
                  <Td className={cn("text-base font-black", MONEY_CELL, isReceita ? "text-success" : "text-destructive")}>
                    {isReceita ? "" : "- "}
                    {formatBRL(l.valor)}
                  </Td>
                  <Td>
                    <RowActions onEdit={() => form.openWith(l)} onRemove={() => void crud.removeItem(l.id, `Remover esta ${tipoLower}?`)} />
                  </Td>
                </TableRow>
              )
            })}
          </ListRows>
        </TableBody>
      </DataTable>

      <CrudDialog
        open={form.open}
        onOpenChange={form.setOpen}
        title={form.editing ? `Editar ${formTipo}` : `Nova ${tipo}`}
        onSubmit={submit}
        submitting={crud.saving}
      >
        <FormGrid>
          <Field className={SPAN[4]}>
            <FieldLabel htmlFor="lan-data">Data</FieldLabel>
            <Input id="lan-data" type="date" value={d.data} onChange={(e) => form.set("data", e.target.value)} />
          </Field>
          <Field className={SPAN[4]} data-invalid={valorInvalid || undefined}>
            <FieldLabel htmlFor="lan-valor">Valor (R$)</FieldLabel>
            <Input
              id="lan-valor"
              inputMode="decimal"
              placeholder="0,00"
              value={d.valor}
              aria-invalid={valorInvalid || undefined}
              onChange={(e) => form.set("valor", e.target.value)}
            />
          </Field>
          <Field className={SPAN[4]}>
            <FieldLabel htmlFor="lan-status">Status</FieldLabel>
            <OptionSelect
              id="lan-status"
              value={d.status}
              options={statusOptions}
              onChange={(v) => form.set("status", v as LancamentoStatus)}
            />
          </Field>
          <Field className={SPAN[12]} data-invalid={(form.attempted && !d.descricao.trim()) || undefined}>
            <FieldLabel htmlFor="lan-descricao">Descrição</FieldLabel>
            <Input
              id="lan-descricao"
              placeholder={`Descreva a ${formTipo.toLowerCase()}`}
              value={d.descricao}
              aria-invalid={(form.attempted && !d.descricao.trim()) || undefined}
              onChange={(e) => form.set("descricao", e.target.value)}
            />
          </Field>
          <Field className={SPAN[4]}>
            <FieldLabel htmlFor="lan-plano">Plano de Contas</FieldLabel>
            <OptionSelect
              id="lan-plano"
              value={d.planoContaId}
              options={planoOptions}
              emptyLabel="— Selecione —"
              onChange={(v) => form.set("planoContaId", v)}
            />
          </Field>
          <Field className={SPAN[4]}>
            <FieldLabel htmlFor="lan-centro">Centro de Custo</FieldLabel>
            <OptionSelect
              id="lan-centro"
              value={d.centroCustoId}
              options={centroOptions}
              emptyLabel="— Selecione —"
              onChange={(v) => form.set("centroCustoId", v)}
            />
          </Field>
          <Field className={SPAN[4]}>
            <FieldLabel htmlFor="lan-conta">Conta Financeira</FieldLabel>
            <OptionSelect
              id="lan-conta"
              value={d.contaFinanceiraId}
              options={contaOptions}
              emptyLabel="— Selecione —"
              onChange={(v) => form.set("contaFinanceiraId", v)}
            />
          </Field>
          <Field className={SPAN[12]}>
            <FieldLabel htmlFor="lan-obs">Observações</FieldLabel>
            <Input
              id="lan-obs"
              placeholder="Observações adicionais (opcional)"
              value={d.obs}
              onChange={(e) => form.set("obs", e.target.value)}
            />
          </Field>
        </FormGrid>
      </CrudDialog>
    </div>
  )
}
