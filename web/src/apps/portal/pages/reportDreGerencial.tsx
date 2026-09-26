import { PageHeader } from "@/components/app/page-header"
import { formatBRL } from "@/lib/format"

import { StatementTable, type StatementRow } from "../features/gestao/statement-table"

// Demonstrativo com valores fixos (os mesmos do sistema anterior).
const minus = (v: number) => `- ${formatBRL(v)}`

const ROWS: StatementRow[] = [
  { level: "group", label: "(=) RECEITA BRUTA DE VENDAS", value: formatBRL(25450), pct: "100,00%" },
  { level: "item", label: "(-) Deduções e Impostos", value: minus(2150), pct: "8,45%", tone: "danger" },
  { level: "highlight", label: "(=) RECEITA LÍQUIDA DE VENDAS", value: formatBRL(23300), pct: "91,55%" },
  { level: "item", label: "(-) Custos dos Produtos Vendidos (CPV)", value: minus(6200), pct: "24,36%", tone: "danger" },
  { level: "highlight", label: "(=) LUCRO BRUTO", value: formatBRL(17100), pct: "67,19%" },
  { level: "item", label: "(-) Despesas Operacionais / Administrativas", value: minus(4500), pct: "17,68%", tone: "danger" },
  { level: "item", label: "(-) Salários e Encargos", value: minus(1300), pct: "5,11%", tone: "danger" },
  { level: "group", label: "(=) RESULTADO LÍQUIDO DO PERÍODO (LUCRO)", value: formatBRL(11300), pct: "44,40%", tone: "success" },
]

export default function ReportDreGerencialPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="DRE Gerencial" subtitle="Demonstrativo do Resultado do Exercício consolidado padrão." />
      <StatementTable
        description="Estrutura Gerencial"
        value={{ label: "Valor (R$)", className: "w-40" }}
        pct={{ label: "% da Receita", className: "w-30" }}
        rows={ROWS}
      />
    </div>
  )
}
