import { PlusIcon } from "lucide-react"
import { toast } from "sonner"

import { CrudDialog } from "@/components/app/crud-dialog"
import { PageHeader } from "@/components/app/page-header"
import { Button } from "@/components/ui/button"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { TableBody, TableRow } from "@/components/ui/table"
import { newNumericId } from "@/data/records"

import { OptionSelect, type Option } from "../features/financeiro/option-select"
import { COLLECTIONS, PLANO_NATUREZAS, type PlanoConta } from "../features/financeiro/types"
import { DataTable, FormGrid, HeadRow, ListRows, Pill, RowActions, SPAN, Td, Th, tipoTone } from "../features/financeiro/ui"
import { useFormDialog } from "../features/financeiro/use-form-dialog"
import { useRecordCrud } from "../features/financeiro/use-record-crud"

type Draft = {
  codigo: string
  descricao: string
  tipo: PlanoConta["tipo"]
  natureza: PlanoConta["natureza"]
  lancamento: "1" | "0"
}

const TIPO_OPTIONS: Option[] = [
  { value: "Receita", label: "Receita" },
  { value: "Despesa", label: "Despesa" },
  { value: "Ativo", label: "Ativo" },
  { value: "Passivo", label: "Passivo" },
  { value: "Patrimônio", label: "Patrimônio Líquido" },
]
const NATUREZA_OPTIONS: Option[] = PLANO_NATUREZAS.map((n) => ({ value: n, label: n }))
const LANCAMENTO_OPTIONS: Option[] = [
  { value: "1", label: "Sim" },
  { value: "0", label: "Não" },
]

function toDraft(item: PlanoConta | null): Draft {
  if (!item) return { codigo: "", descricao: "", tipo: "Receita", natureza: "Analítica", lancamento: "1" }
  return {
    codigo: item.codigo ?? "",
    descricao: item.descricao ?? "",
    tipo: item.tipo,
    natureza: item.natureza,
    lancamento: item.lancamento ? "1" : "0",
  }
}

export default function PlanoContaPage() {
  const crud = useRecordCrud<PlanoConta>(COLLECTIONS.planoContas)
  const form = useFormDialog<PlanoConta, Draft>(toDraft)
  const d = form.draft

  async function submit() {
    const codigo = d.codigo.trim()
    const descricao = d.descricao.trim()
    if (!codigo || !descricao) {
      form.markAttempted()
      toast.error("Código e Descrição são obrigatórios.")
      return
    }
    const item: PlanoConta = {
      ...(form.editing ?? {}),
      id: form.editing?.id ?? newNumericId(),
      codigo,
      descricao,
      tipo: d.tipo,
      natureza: d.natureza,
      lancamento: d.lancamento === "1",
    }
    if (await crud.saveItem(item)) form.setOpen(false)
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Plano de Contas"
        subtitle="Estrutura contábil hierárquica de receitas e despesas"
        actions={
          <Button onClick={() => form.openWith(null)}>
            <PlusIcon data-icon="inline-start" />
            Nova Conta
          </Button>
        }
      />

      <DataTable>
        <HeadRow>
          <Th>Código</Th>
          <Th>Descrição</Th>
          <Th>Tipo</Th>
          <Th>Natureza</Th>
          <Th>Permite Lançamento</Th>
          <Th className="w-20" />
        </HeadRow>
        <TableBody>
          <ListRows
            colSpan={6}
            isLoading={crud.query.isLoading}
            error={crud.query.error}
            isEmpty={crud.items.length === 0}
            emptyTitle="Nenhuma conta cadastrada."
          >
            {crud.items.map((c) => (
              <TableRow key={String(c.id)}>
                <Td className="text-[13px] font-extrabold text-primary">{c.codigo}</Td>
                <Td className="font-bold">{c.descricao}</Td>
                <Td>
                  <Pill shape="round" tone={tipoTone(c.tipo)}>
                    {c.tipo}
                  </Pill>
                </Td>
                <Td className="text-[13px] font-semibold">{c.natureza || "-"}</Td>
                <Td>
                  <Pill tone={c.lancamento ? "success" : "neutral"}>{c.lancamento ? "Sim" : "Não"}</Pill>
                </Td>
                <Td>
                  <RowActions onEdit={() => form.openWith(c)} onRemove={() => void crud.removeItem(c.id, "Remover esta conta?")} />
                </Td>
              </TableRow>
            ))}
          </ListRows>
        </TableBody>
      </DataTable>

      <CrudDialog
        open={form.open}
        onOpenChange={form.setOpen}
        title={form.editing ? "Editar Conta" : "Nova Conta"}
        onSubmit={submit}
        submitting={crud.saving}
      >
        <FormGrid>
          <Field className={SPAN[3]} data-invalid={(form.attempted && !d.codigo.trim()) || undefined}>
            <FieldLabel htmlFor="pc-codigo">Código</FieldLabel>
            <Input
              id="pc-codigo"
              placeholder="Ex: 1.1.01"
              value={d.codigo}
              aria-invalid={(form.attempted && !d.codigo.trim()) || undefined}
              onChange={(e) => form.set("codigo", e.target.value)}
            />
          </Field>
          <Field className={SPAN[9]} data-invalid={(form.attempted && !d.descricao.trim()) || undefined}>
            <FieldLabel htmlFor="pc-descricao">Descrição</FieldLabel>
            <Input
              id="pc-descricao"
              placeholder="Nome da conta"
              value={d.descricao}
              aria-invalid={(form.attempted && !d.descricao.trim()) || undefined}
              onChange={(e) => form.set("descricao", e.target.value)}
            />
          </Field>
          <Field className={SPAN[4]}>
            <FieldLabel htmlFor="pc-tipo">Tipo</FieldLabel>
            <OptionSelect id="pc-tipo" value={d.tipo} options={TIPO_OPTIONS} onChange={(v) => form.set("tipo", v as Draft["tipo"])} />
          </Field>
          <Field className={SPAN[4]}>
            <FieldLabel htmlFor="pc-natureza">Natureza</FieldLabel>
            <OptionSelect
              id="pc-natureza"
              value={d.natureza}
              options={NATUREZA_OPTIONS}
              onChange={(v) => form.set("natureza", v as Draft["natureza"])}
            />
          </Field>
          <Field className={SPAN[4]}>
            <FieldLabel htmlFor="pc-lancamento">Permite Lançamento</FieldLabel>
            <OptionSelect
              id="pc-lancamento"
              value={d.lancamento}
              options={LANCAMENTO_OPTIONS}
              onChange={(v) => form.set("lancamento", v as Draft["lancamento"])}
            />
          </Field>
        </FormGrid>
      </CrudDialog>
    </div>
  )
}
