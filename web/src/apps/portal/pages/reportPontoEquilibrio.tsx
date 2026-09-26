import { useState } from "react"
import { ScaleIcon } from "lucide-react"

import { PageHeader } from "@/components/app/page-header"
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { formatBRL, formatDecimal, parseMoneyBR } from "@/lib/format"

import { KpiStamp, RichKpiCard, RichKpiTitle, RichKpiValue } from "../features/gestao/report-ui"

const LABEL = "text-[11px] font-extrabold uppercase text-muted-foreground"

/** Número digitado (aceita "14150.00", "14.150,00" ou "65,5"); vazio/inválido = 0. */
function readNumber(text: string): number {
  const n = parseMoneyBR(text)
  return Number.isFinite(n) ? n : 0
}

export default function ReportPontoEquilibrioPage() {
  // Calculadora local, com os valores iniciais do sistema anterior.
  const [custoFixo, setCustoFixo] = useState("14150.00")
  const [margem, setMargem] = useState("65.0")

  const cf = readNumber(custoFixo)
  const mc = readNumber(margem)
  const pe = mc > 0 ? cf / (mc / 100) : 0

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Ponto de Equilíbrio" subtitle="Calcule o faturamento mínimo necessário para cobrir todos os custos." />

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[1fr_1.5fr]">
        <RichKpiCard className="min-h-0 gap-4 px-0 py-6 hover:translate-y-0">
          <CardHeader className="mx-6 border-b border-dashed px-0 [.border-b]:pb-2">
            <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground">Variáveis de Cálculo</CardTitle>
          </CardHeader>
          <CardContent>
            <FieldGroup className="gap-4">
              <Field className="gap-1.5">
                <FieldLabel htmlFor="pe-custo-fixo" className={LABEL}>
                  Custos Fixos Totais (R$)
                </FieldLabel>
                <Input
                  id="pe-custo-fixo"
                  inputMode="decimal"
                  autoComplete="off"
                  className="font-semibold"
                  value={custoFixo}
                  onChange={(e) => setCustoFixo(e.target.value)}
                />
              </Field>
              <Field className="gap-1.5">
                <FieldLabel htmlFor="pe-margem" className={LABEL}>
                  Margem de Contribuição (%)
                </FieldLabel>
                <Input
                  id="pe-margem"
                  inputMode="decimal"
                  autoComplete="off"
                  className="font-semibold"
                  value={margem}
                  onChange={(e) => setMargem(e.target.value)}
                />
              </Field>
            </FieldGroup>
          </CardContent>
        </RichKpiCard>

        <RichKpiCard className="min-h-[220px] items-center justify-center gap-0 p-8 text-center hover:translate-y-0">
          <RichKpiTitle className="mb-3 text-[13px]">Faturamento Mínimo Necessário (Meta PE)</RichKpiTitle>
          <RichKpiValue tone="info" id="pe-resultado-faturamento" className="text-[38px]" aria-live="polite">
            {formatBRL(pe)}
          </RichKpiValue>
          <CardContent className="px-0">
            <p className="mt-4 max-w-80 text-xs leading-normal font-semibold text-muted-foreground">
              Com custos fixos de R$ <span id="lbl-custo-fixo">{formatDecimal(cf)}</span> e margem de{" "}
              <span id="lbl-margem">{mc.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}</span>%, sua empresa entra em ponto de equilíbrio ao
              faturar o valor acima.
            </p>
          </CardContent>
          <KpiStamp icon={ScaleIcon} tone="info" className="right-4 bottom-4" />
        </RichKpiCard>
      </div>
    </div>
  )
}
