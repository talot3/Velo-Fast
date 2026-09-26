/**
 * "Lançar Fechamento (Borderô)": borderô manual (o botão antigo chamava uma
 * função que não existia). Fica em store_records/borderos com source "manual".
 */
import { useMemo, useState } from "react"
import { toast } from "sonner"

import { CrudDialog } from "@/components/app/crud-dialog"
import { Field, FieldGroup, FieldLabel, FieldLegend, FieldSeparator, FieldSet } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { usePaymentMethods } from "@/data/catalog"
import { newNumericId, useSaveRecords } from "@/data/records"
import { errorMessage } from "@/lib/errors"
import { todayBR } from "@/lib/format"

import { fromMoneyInput } from "../money"
import { COLLECTIONS, type BorderoRecord } from "../types"
import { FormGrid, SPAN } from "../ui"
import { METODOS_PADRAO, metodoSlug } from "./model"

export function ManualBorderoDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const paymentMethods = usePaymentMethods()
  const save = useSaveRecords<BorderoRecord>(COLLECTIONS.borderos)
  const [data, setData] = useState(todayBR)
  const [terminal, setTerminal] = useState("")
  const [operador, setOperador] = useState("")
  const [suprimento, setSuprimento] = useState("")
  const [valores, setValores] = useState<Record<string, string>>({})
  const [attempted, setAttempted] = useState(false)

  // Formas de pagamento da loja (na ordem do cadastro); sem cadastro, as 4 padrão.
  const metodos = useMemo(() => {
    const names = [...(paymentMethods.data ?? [])]
      .filter((p) => p.active !== false)
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .map((p) => p.name.trim())
      .filter(Boolean)
    return names.length > 0 ? Array.from(new Set(names)) : METODOS_PADRAO
  }, [paymentMethods.data])

  async function submit() {
    if (!data || !terminal.trim() || !operador.trim()) {
      setAttempted(true)
      toast.error("Data, Terminal e Operador são obrigatórios.")
      return
    }
    const declarado = Object.fromEntries(metodos.map((m) => [m, fromMoneyInput(valores[m] ?? "")]))
    const record: BorderoRecord = {
      id: newNumericId(),
      source: "manual",
      data,
      terminal: terminal.trim(),
      operador: operador.trim(),
      suprimento: fromMoneyInput(suprimento),
      vendasReais: 0,
      declarado,
      vendasPorMetodo: {},
      configMetodos: {},
      status: "Pendente",
      observacao: "",
    }
    try {
      await save.mutateAsync(record)
      onOpenChange(false)
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }

  const invalid = (value: string) => (attempted && !value.trim()) || undefined

  return (
    <CrudDialog open={open} onOpenChange={onOpenChange} title="Lançar Fechamento (Borderô)" onSubmit={submit} submitting={save.isPending}>
      <FieldGroup className="gap-6">
        <FormGrid>
          <Field className={SPAN[3]} data-invalid={invalid(data)}>
            <FieldLabel htmlFor="brd-data">Data</FieldLabel>
            <Input id="brd-data" type="date" value={data} aria-invalid={invalid(data)} onChange={(e) => setData(e.target.value)} />
          </Field>
          <Field className={SPAN[3]} data-invalid={invalid(terminal)}>
            <FieldLabel htmlFor="brd-terminal">Terminal</FieldLabel>
            <Input
              id="brd-terminal"
              placeholder="Ex: CX1"
              value={terminal}
              aria-invalid={invalid(terminal)}
              onChange={(e) => setTerminal(e.target.value)}
            />
          </Field>
          <Field className={SPAN[3]} data-invalid={invalid(operador)}>
            <FieldLabel htmlFor="brd-operador">Operador</FieldLabel>
            <Input id="brd-operador" value={operador} aria-invalid={invalid(operador)} onChange={(e) => setOperador(e.target.value)} />
          </Field>
          <Field className={SPAN[3]}>
            <FieldLabel htmlFor="brd-suprimento">Suprimento (R$)</FieldLabel>
            <Input
              id="brd-suprimento"
              inputMode="decimal"
              placeholder="0,00"
              value={suprimento}
              onChange={(e) => setSuprimento(e.target.value)}
            />
          </Field>
        </FormGrid>
        <FieldSeparator />
        <FieldSet>
          <FieldLegend variant="label" className="text-muted-foreground">
            Valor Declarado
          </FieldLegend>
          <FormGrid>
            {metodos.map((m) => (
              <Field key={m} className={SPAN[3]}>
                <FieldLabel htmlFor={`brd-val-${metodoSlug(m)}`}>{m}</FieldLabel>
                <Input
                  id={`brd-val-${metodoSlug(m)}`}
                  inputMode="decimal"
                  placeholder="0,00"
                  value={valores[m] ?? ""}
                  onChange={(e) => setValores((v) => ({ ...v, [m]: e.target.value }))}
                />
              </Field>
            ))}
          </FormGrid>
        </FieldSet>
      </FieldGroup>
    </CrudDialog>
  )
}
