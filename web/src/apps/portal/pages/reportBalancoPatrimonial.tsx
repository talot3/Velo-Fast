import { CircleCheckIcon } from "lucide-react"

import { PageHeader } from "@/components/app/page-header"
import { Badge } from "@/components/ui/badge"
import { formatBRL } from "@/lib/format"

import { StatementTable, type StatementRow } from "../features/gestao/statement-table"

// Demonstrativo com valores fixos (os mesmos do sistema anterior).
const ATIVO: StatementRow[] = [
  { level: "group", label: "1. ATIVO CIRCULANTE", value: formatBRL(23350) },
  { level: "item", label: "Disponibilidades (Caixa e Bancos)", value: formatBRL(11300) },
  { level: "item", label: "Contas a Receber (Clientes)", value: formatBRL(8550) },
  { level: "item", label: "Estoques de Mercadorias", value: formatBRL(3500) },
  { level: "group", label: "2. ATIVO NÃO CIRCULANTE (Realizável a Longo Prazo)", value: formatBRL(15000) },
  { level: "item", label: "Imobilizado (Equipamentos e Ti)", value: formatBRL(15000) },
  { level: "group", label: "TOTAL DO ATIVO", value: formatBRL(38350), tone: "brand", emphasis: true },
]

const PASSIVO: StatementRow[] = [
  { level: "group", label: "3. PASSIVO CIRCULANTE (Curto Prazo)", value: formatBRL(10750) },
  { level: "item", label: "Fornecedores a Pagar", value: formatBRL(6200) },
  { level: "item", label: "Obrigações Sociais (Salários)", value: formatBRL(1300) },
  { level: "item", label: "Obrigações Tributárias (Impostos)", value: formatBRL(3250) },
  { level: "group", label: "4. PASSIVO NÃO CIRCULANTE (Longo Prazo)", value: formatBRL(3000) },
  { level: "item", label: "Financiamentos e Empréstimos", value: formatBRL(3000) },
  { level: "highlight", label: "5. PATRIMÔNIO LÍQUIDO (Recursos Próprios)", value: formatBRL(24600) },
  { level: "item", label: "Capital Social Integralizado", value: formatBRL(20000) },
  { level: "item", label: "Lucros ou Prejuízos Acumulados", value: formatBRL(4600), tone: "success" },
  { level: "group", label: "TOTAL DO PASSIVO E PL", value: formatBRL(38350), tone: "brand", emphasis: true },
]

export default function ReportBalancoPatrimonialPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Balanço Patrimonial"
        subtitle="Demonstrativo consolidado de Ativos, Passivos e Patrimônio Líquido."
        actions={
          <Badge variant="outline" className="rounded-full border-success/30 bg-success/10 px-3.5 py-1.5 text-[11px] font-extrabold text-success">
            <CircleCheckIcon />
            Equação Ativa: Ativo = Passivo + PL
          </Badge>
        }
      />
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
        <StatementTable description="ATIVO (Bens e Direitos)" value={{ label: "Valor (R$)", className: "w-35 text-right" }} rows={ATIVO} alignValueRight />
        <StatementTable
          description="PASSIVO & PATRIMÔNIO LÍQUIDO"
          value={{ label: "Valor (R$)", className: "w-35 text-right" }}
          rows={PASSIVO}
          alignValueRight
        />
      </div>
    </div>
  )
}
