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
import { CENTRO_TIPOS, COLLECTIONS, type CentroCusto } from "../features/financeiro/types"
import { DataTable, FormGrid, HeadRow, ListRows, Pill, RowActions, SPAN, Td, Th, tipoTone } from "../features/financeiro/ui"
import { useFormDialog } from "../features/financeiro/use-form-dialog"
import { useRecordCrud } from "../features/financeiro/use-record-crud"

type Draft = {
  codigo: string
  descricao: string
  responsavel: string
  tipo: CentroCusto["tipo"]
  ativo: "1" | "0"
}

const TIPO_OPTIONS: Option[] = CENTRO_TIPOS.map((t) => ({ value: t, label: t }))
const STATUS_OPTIONS: Option[] = [
  { value: "1", label: "Ativo" },
  { value: "0", label: "Inativo" },
]

function toDraft(item: CentroCusto | null): Draft {
  if (!item) return { codigo: "", descricao: "", responsavel: "", tipo: "Misto", ativo: "1" }
  return {
    codigo: item.codigo ?? "",
    descricao: item.descricao ?? "",
    responsavel: item.responsavel ?? "",
    tipo: item.tipo || "Misto",
    ativo: item.ativo ? "1" : "0",
  }
}

export default function CentroCustoPage() {
  const crud = useRecordCrud<CentroCusto>(COLLECTIONS.centrosCusto)
  const form = useFormDialog<CentroCusto, Draft>(toDraft)
  const d = form.draft

  async function submit() {
    const codigo = d.codigo.trim()
    const descricao = d.descricao.trim()
    if (!codigo || !descricao) {
      form.markAttempted()
      toast.error("Código e Descrição são obrigatórios.")
      return
    }
    const item: CentroCusto = {
      ...(form.editing ?? {}),
      id: form.editing?.id ?? newNumericId(),
      codigo,
      descricao,
      responsavel: d.responsavel.trim(),
      tipo: d.tipo,
      ativo: d.ativo === "1",
    }
    if (await crud.saveItem(item)) form.setOpen(false)
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Centros de Custos"
        subtitle="Unidades organizacionais para apropriação de receitas e despesas"
        actions={
          <Button onClick={() => form.openWith(null)}>
            <PlusIcon data-icon="inline-start" />
            Novo Centro
          </Button>
        }
      />

      <DataTable>
        <HeadRow>
          <Th>Código</Th>
          <Th>Descrição</Th>
          <Th>Responsável</Th>
          <Th>Tipo</Th>
          <Th>Status</Th>
          <Th className="w-20" />
        </HeadRow>
        <TableBody>
          <ListRows
            colSpan={6}
            isLoading={crud.query.isLoading}
            error={crud.query.error}
            isEmpty={crud.items.length === 0}
            emptyTitle="Nenhum centro de custo cadastrado."
          >
            {crud.items.map((c) => (
              <TableRow key={String(c.id)}>
                <Td className="text-[13px] font-extrabold text-primary">{c.codigo}</Td>
                <Td className="font-bold">{c.descricao}</Td>
                <Td className="text-[13px] text-muted-foreground">{c.responsavel || "-"}</Td>
                <Td>
                  <Pill shape="round" tone={tipoTone(c.tipo)}>
                    {c.tipo || "Misto"}
                  </Pill>
                </Td>
                <Td>
                  <Pill tone={c.ativo ? "success" : "danger"}>{c.ativo ? "Ativo" : "Inativo"}</Pill>
                </Td>
                <Td>
                  <RowActions
                    onEdit={() => form.openWith(c)}
                    onRemove={() => void crud.removeItem(c.id, "Remover este centro de custo?")}
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
        title={form.editing ? "Editar Centro de Custo" : "Novo Centro de Custo"}
        onSubmit={submit}
        submitting={crud.saving}
      >
        <FormGrid>
          <Field className={SPAN[3]} data-invalid={(form.attempted && !d.codigo.trim()) || undefined}>
            <FieldLabel htmlFor="cc-codigo">Código</FieldLabel>
            <Input
              id="cc-codigo"
              placeholder="Ex: CC-001"
              value={d.codigo}
              aria-invalid={(form.attempted && !d.codigo.trim()) || undefined}
              onChange={(e) => form.set("codigo", e.target.value)}
            />
          </Field>
          <Field className={SPAN[9]} data-invalid={(form.attempted && !d.descricao.trim()) || undefined}>
            <FieldLabel htmlFor="cc-descricao">Descrição</FieldLabel>
            <Input
              id="cc-descricao"
              placeholder="Nome do centro de custo"
              value={d.descricao}
              aria-invalid={(form.attempted && !d.descricao.trim()) || undefined}
              onChange={(e) => form.set("descricao", e.target.value)}
            />
          </Field>
          <Field className={SPAN[6]}>
            <FieldLabel htmlFor="cc-responsavel">Responsável</FieldLabel>
            <Input
              id="cc-responsavel"
              placeholder="Nome do responsável"
              value={d.responsavel}
              onChange={(e) => form.set("responsavel", e.target.value)}
            />
          </Field>
          <Field className={SPAN[3]}>
            <FieldLabel htmlFor="cc-tipo">Tipo</FieldLabel>
            <OptionSelect id="cc-tipo" value={d.tipo} options={TIPO_OPTIONS} onChange={(v) => form.set("tipo", v as Draft["tipo"])} />
          </Field>
          <Field className={SPAN[3]}>
            <FieldLabel htmlFor="cc-ativo">Status</FieldLabel>
            <OptionSelect id="cc-ativo" value={d.ativo} options={STATUS_OPTIONS} onChange={(v) => form.set("ativo", v as Draft["ativo"])} />
          </Field>
        </FormGrid>
      </CrudDialog>
    </div>
  )
}
