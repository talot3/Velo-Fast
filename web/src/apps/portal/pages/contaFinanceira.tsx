import { PlusIcon } from "lucide-react"
import { toast } from "sonner"

import { CrudDialog } from "@/components/app/crud-dialog"
import { KpiCard, KpiGrid } from "@/components/app/kpi"
import { PageHeader } from "@/components/app/page-header"
import { Button } from "@/components/ui/button"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { TableBody, TableRow } from "@/components/ui/table"
import { newNumericId } from "@/data/records"
import { formatBRL } from "@/lib/format"
import { cn } from "@/lib/utils"

import { fromMoneyInput, toMoneyInput } from "../features/financeiro/money"
import { OptionSelect, type Option } from "../features/financeiro/option-select"
import { COLLECTIONS, CONTA_TIPOS, type ContaFinanceira } from "../features/financeiro/types"
import { DataTable, FormGrid, HeadRow, ListRows, MONEY_CELL, Pill, RowActions, SPAN, Td, Th } from "../features/financeiro/ui"
import { useFormDialog } from "../features/financeiro/use-form-dialog"
import { useRecordCrud } from "../features/financeiro/use-record-crud"

type Draft = {
  codigo: string
  descricao: string
  tipo: ContaFinanceira["tipo"]
  banco: string
  agencia: string
  conta: string
  ativa: "1" | "0"
  saldoInicial: string
}

const TIPO_OPTIONS: Option[] = CONTA_TIPOS.map((t) => ({ value: t, label: t }))
const STATUS_OPTIONS: Option[] = [
  { value: "1", label: "Ativa" },
  { value: "0", label: "Inativa" },
]

function toDraft(item: ContaFinanceira | null): Draft {
  return {
    codigo: item?.codigo ?? "",
    descricao: item?.descricao ?? "",
    tipo: item?.tipo ?? "Caixa",
    banco: item?.banco ?? "",
    agencia: item?.agencia ?? "",
    conta: item?.conta ?? "",
    ativa: !item || item.ativa ? "1" : "0",
    saldoInicial: toMoneyInput(item?.saldoInicial ?? 0),
  }
}

/** "banco / Ag. agência" como na lista antiga. */
function bancoAgencia(c: ContaFinanceira) {
  if (!c.banco) return "-"
  return c.agencia ? `${c.banco} / Ag. ${c.agencia}` : c.banco
}

export default function ContaFinanceiraPage() {
  const crud = useRecordCrud<ContaFinanceira>(COLLECTIONS.contasFinanceiras)
  const form = useFormDialog<ContaFinanceira, Draft>(toDraft)
  const d = form.draft
  const list = crud.items
  const totalSaldo = list.reduce((s, c) => s + (Number(c.saldoInicial) || 0), 0)

  async function submit() {
    const codigo = d.codigo.trim()
    const descricao = d.descricao.trim()
    if (!codigo || !descricao) {
      form.markAttempted()
      toast.error("Código e Descrição são obrigatórios.")
      return
    }
    const item: ContaFinanceira = {
      ...(form.editing ?? {}),
      id: form.editing?.id ?? newNumericId(),
      codigo,
      descricao,
      tipo: d.tipo,
      banco: d.banco.trim(),
      agencia: d.agencia.trim(),
      conta: d.conta.trim(),
      saldoInicial: fromMoneyInput(d.saldoInicial),
      ativa: d.ativa === "1",
    }
    if (await crud.saveItem(item)) form.setOpen(false)
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Contas Financeiras"
        subtitle="Caixas, bancos e carteiras financeiras da empresa"
        actions={
          <Button onClick={() => form.openWith(null)}>
            <PlusIcon data-icon="inline-start" />
            Nova Conta
          </Button>
        }
      />

      <KpiGrid columns={3}>
        <KpiCard label="Contas Cadastradas" value={list.length} />
        <KpiCard label="Saldo Inicial Total" value={formatBRL(totalSaldo)} tone="brand" />
        <KpiCard label="Contas Ativas" value={list.filter((c) => c.ativa).length} tone="success" />
      </KpiGrid>

      <DataTable>
        <HeadRow>
          <Th>Código</Th>
          <Th>Descrição</Th>
          <Th>Tipo</Th>
          <Th>Banco / Agência</Th>
          <Th>Saldo Inicial</Th>
          <Th>Status</Th>
          <Th className="w-20" />
        </HeadRow>
        <TableBody>
          <ListRows
            colSpan={7}
            isLoading={crud.query.isLoading}
            error={crud.query.error}
            isEmpty={list.length === 0}
            emptyTitle="Nenhuma conta financeira cadastrada."
          >
            {list.map((c) => (
              <TableRow key={String(c.id)}>
                <Td className="text-[13px] font-extrabold text-primary">{c.codigo}</Td>
                <Td className="font-bold">{c.descricao}</Td>
                <Td>
                  <Pill shape="round" tone="info">
                    {c.tipo}
                  </Pill>
                </Td>
                <Td className="text-[13px] text-muted-foreground">{bancoAgencia(c)}</Td>
                <Td className={cn("font-extrabold text-primary", MONEY_CELL)}>{formatBRL(c.saldoInicial)}</Td>
                <Td>
                  <Pill tone={c.ativa ? "success" : "danger"}>{c.ativa ? "Ativa" : "Inativa"}</Pill>
                </Td>
                <Td>
                  <RowActions
                    onEdit={() => form.openWith(c)}
                    onRemove={() => void crud.removeItem(c.id, "Remover esta conta financeira?")}
                  />
                </Td>
              </TableRow>
            ))}
          </ListRows>
        </TableBody>
      </DataTable>

      <CrudDialog
        open={form.open}
        onOpenChange={form.setOpen}
        title={form.editing ? "Editar Conta Financeira" : "Nova Conta Financeira"}
        onSubmit={submit}
        submitting={crud.saving}
      >
        <FormGrid>
          <Field className={SPAN[3]} data-invalid={(form.attempted && !d.codigo.trim()) || undefined}>
            <FieldLabel htmlFor="cf-codigo">Código</FieldLabel>
            <Input
              id="cf-codigo"
              placeholder="Ex: CX-001"
              value={d.codigo}
              aria-invalid={(form.attempted && !d.codigo.trim()) || undefined}
              onChange={(e) => form.set("codigo", e.target.value)}
            />
          </Field>
          <Field className={SPAN[6]} data-invalid={(form.attempted && !d.descricao.trim()) || undefined}>
            <FieldLabel htmlFor="cf-descricao">Descrição</FieldLabel>
            <Input
              id="cf-descricao"
              placeholder="Nome da conta"
              value={d.descricao}
              aria-invalid={(form.attempted && !d.descricao.trim()) || undefined}
              onChange={(e) => form.set("descricao", e.target.value)}
            />
          </Field>
          <Field className={SPAN[3]}>
            <FieldLabel htmlFor="cf-tipo">Tipo</FieldLabel>
            <OptionSelect id="cf-tipo" value={d.tipo} options={TIPO_OPTIONS} onChange={(v) => form.set("tipo", v as Draft["tipo"])} />
          </Field>
          <Field className={SPAN[4]}>
            <FieldLabel htmlFor="cf-banco">Banco</FieldLabel>
            <Input id="cf-banco" placeholder="Ex: Bradesco, Itaú..." value={d.banco} onChange={(e) => form.set("banco", e.target.value)} />
          </Field>
          <Field className={SPAN[3]}>
            <FieldLabel htmlFor="cf-agencia">Agência</FieldLabel>
            <Input id="cf-agencia" placeholder="0000-0" value={d.agencia} onChange={(e) => form.set("agencia", e.target.value)} />
          </Field>
          <Field className={SPAN[3]}>
            <FieldLabel htmlFor="cf-conta">Nº da Conta</FieldLabel>
            <Input id="cf-conta" placeholder="00000-0" value={d.conta} onChange={(e) => form.set("conta", e.target.value)} />
          </Field>
          <Field className={SPAN[2]}>
            <FieldLabel htmlFor="cf-ativa">Status</FieldLabel>
            <OptionSelect id="cf-ativa" value={d.ativa} options={STATUS_OPTIONS} onChange={(v) => form.set("ativa", v as Draft["ativa"])} />
          </Field>
          <Field className={SPAN[4]}>
            <FieldLabel htmlFor="cf-saldo">Saldo Inicial (R$)</FieldLabel>
            <Input
              id="cf-saldo"
              inputMode="decimal"
              placeholder="0,00"
              value={d.saldoInicial}
              onChange={(e) => form.set("saldoInicial", e.target.value)}
            />
          </Field>
        </FormGrid>
      </CrudDialog>
    </div>
  )
}
