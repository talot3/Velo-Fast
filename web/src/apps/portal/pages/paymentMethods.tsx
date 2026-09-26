import { useMemo } from "react"
import { PlusIcon } from "lucide-react"
import { toast } from "sonner"

import { ColorField } from "@/components/app/color-field"
import { useConfirm } from "@/components/app/confirm-dialog"
import { CrudDialog } from "@/components/app/crud-dialog"
import { PageHeader } from "@/components/app/page-header"
import { Button } from "@/components/ui/button"
import { Field, FieldGroup, FieldLabel, FieldLegend, FieldSeparator, FieldSet } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { TableBody, TableRow } from "@/components/ui/table"
import { newId, usePaymentMethods, useRemovePaymentMethods, useSavePaymentMethods } from "@/data/catalog"
import type { PaymentMethod } from "@/data/types"
import { errorMessage } from "@/lib/errors"

import { DataTable, FormGrid, HeadRow, ListRows, RowActions, SPAN, Td, Th } from "../features/financeiro/ui"
import { useFormDialog } from "../features/financeiro/use-form-dialog"

const DEFAULT_BG = "#f3f4f6"
const DEFAULT_TXT = "#000000"

type Draft = { code: string; order: string; name: string; buttonColor: string; textColor: string }

function toDraft(pm: PaymentMethod | null): Draft {
  return {
    code: pm?.code ?? "",
    order: pm ? String(pm.order ?? "") : "",
    name: pm?.name ?? "",
    buttonColor: pm?.buttonColor || DEFAULT_BG,
    textColor: pm?.textColor || DEFAULT_TXT,
  }
}

export default function PaymentMethodsPage() {
  const query = usePaymentMethods()
  const save = useSavePaymentMethods()
  const remove = useRemovePaymentMethods()
  const confirm = useConfirm()
  const form = useFormDialog<PaymentMethod, Draft>(toDraft)
  const d = form.draft

  // Lista na ordem do campo "Ordem" (empate: ordem de cadastro).
  const list = useMemo(() => [...(query.data ?? [])].sort((a, b) => (a.order || 0) - (b.order || 0)), [query.data])

  async function submit() {
    const code = d.code.trim()
    const name = d.name.trim()
    if (!code || !name) {
      form.markAttempted()
      toast.error("Código e Nome são obrigatórios.")
      return
    }
    const item: PaymentMethod = {
      ...(form.editing ?? { active: true }),
      id: form.editing?.id ?? newId(),
      code,
      order: parseInt(d.order, 10) || 0,
      name,
      buttonColor: d.buttonColor.trim() || DEFAULT_BG,
      textColor: d.textColor.trim() || DEFAULT_TXT,
    }
    try {
      await save.mutateAsync(item)
      form.setOpen(false)
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }

  async function removeMethod(pm: PaymentMethod) {
    if (!(await confirm("Remover forma de pagamento?", { destructive: true }))) return
    try {
      await remove.mutateAsync(pm.id)
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Formas de Pagamento"
        actions={
          <Button onClick={() => form.openWith(null)}>
            <PlusIcon data-icon="inline-start" />
            Nova Forma
          </Button>
        }
      />

      <DataTable>
        <HeadRow>
          <Th>Código</Th>
          <Th>Ordem</Th>
          <Th>Nome</Th>
          <Th>Aparência (Botão PDV)</Th>
          <Th className="w-24" />
        </HeadRow>
        <TableBody>
          <ListRows
            colSpan={5}
            isLoading={query.isLoading}
            error={query.error}
            isEmpty={list.length === 0}
            emptyTitle="Nenhuma forma de pagamento cadastrada."
          >
            {list.map((pm) => (
              <TableRow key={pm.id}>
                <Td className="font-extrabold text-muted-foreground">{pm.code}</Td>
                <Td className="font-bold tabular-nums">{pm.order}</Td>
                <Td className="font-extrabold">{pm.name}</Td>
                <Td>
                  <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-md px-3 py-1.5 text-xs font-bold shadow-sm transition-opacity hover:opacity-90"
                    style={{ background: pm.buttonColor || DEFAULT_BG, color: pm.textColor || DEFAULT_TXT }}
                    onClick={() => form.openWith(pm)}
                  >
                    Editar Cor
                  </button>
                </Td>
                <Td>
                  <RowActions onEdit={() => form.openWith(pm)} onRemove={() => void removeMethod(pm)} />
                </Td>
              </TableRow>
            ))}
          </ListRows>
        </TableBody>
      </DataTable>

      <CrudDialog
        open={form.open}
        onOpenChange={form.setOpen}
        title={form.editing ? "Editar Forma de Pgto" : "Nova Forma de Pgto"}
        onSubmit={submit}
        submitting={save.isPending}
      >
        <FieldGroup className="gap-6">
          <FormGrid>
            <Field className={SPAN[3]} data-invalid={(form.attempted && !d.code.trim()) || undefined}>
              <FieldLabel htmlFor="frm-pay-code">Código</FieldLabel>
              <Input
                id="frm-pay-code"
                value={d.code}
                aria-invalid={(form.attempted && !d.code.trim()) || undefined}
                onChange={(e) => form.set("code", e.target.value)}
              />
            </Field>
            <Field className={SPAN[3]}>
              <FieldLabel htmlFor="frm-pay-order">Ordem</FieldLabel>
              <Input id="frm-pay-order" type="number" value={d.order} onChange={(e) => form.set("order", e.target.value)} />
            </Field>
            <Field className={SPAN[6]} data-invalid={(form.attempted && !d.name.trim()) || undefined}>
              <FieldLabel htmlFor="frm-pay-name">Nome</FieldLabel>
              <Input
                id="frm-pay-name"
                value={d.name}
                aria-invalid={(form.attempted && !d.name.trim()) || undefined}
                onChange={(e) => form.set("name", e.target.value)}
              />
            </Field>
          </FormGrid>
          <FieldSeparator />
          <FieldSet>
            <FieldLegend variant="label" className="text-muted-foreground">
              Aparência do Botão (Opcional)
            </FieldLegend>
            <FormGrid>
              <div className={SPAN[6]}>
                <ColorField id="frm-pay-bg" label="Cor de Fundo" value={d.buttonColor} onChange={(v) => form.set("buttonColor", v)} />
              </div>
              <div className={SPAN[6]}>
                <ColorField id="frm-pay-txt" label="Cor da Letra" value={d.textColor} onChange={(v) => form.set("textColor", v)} />
              </div>
            </FormGrid>
          </FieldSet>
        </FieldGroup>
      </CrudDialog>
    </div>
  )
}
