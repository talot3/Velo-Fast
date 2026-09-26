import { CircleCheckIcon, TrendingDownIcon, TrendingUpIcon, WalletIcon } from "lucide-react"

import { PageHeader } from "@/components/app/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatBRL } from "@/lib/format"
import { cn } from "@/lib/utils"

import { KpiStamp, RichKpiCard, RichKpiTitle, RichKpiValue, TONE_TEXT, type ReportTone } from "../features/gestao/report-ui"

// Relatório demonstrativo com valores fixos (os mesmos do sistema anterior).
const KPIS: { title: string; value: number; tone: ReportTone; icon: typeof WalletIcon }[] = [
  { title: "Saldo Inicial consolidado", value: 5000, tone: "info", icon: WalletIcon },
  { title: "Total de Entradas (Recebido)", value: 25450, tone: "success", icon: TrendingUpIcon },
  { title: "Total de Saídas (Pago)", value: 14150, tone: "danger", icon: TrendingDownIcon },
  { title: "Saldo Final Previsto", value: 16300, tone: "success", icon: CircleCheckIcon },
]

type Tipo = "SALDO" | "ENTRADA" | "SAÍDA"

const TIPO_TONE: Record<Tipo, ReportTone> = { SALDO: "brand", ENTRADA: "success", SAÍDA: "danger" }

const EXTRATO: { data: string; descricao: string; tipo: Tipo; valor: number }[] = [
  { data: "30/05/2026", descricao: "Saldo Inicial de Caixa", tipo: "SALDO", valor: 5000 },
  { data: "30/05/2026", descricao: "Recebimento de Vendas à vista (Caixa)", tipo: "ENTRADA", valor: 12350 },
  { data: "30/05/2026", descricao: "Recebimentos de Duplicatas", tipo: "ENTRADA", valor: 8500 },
  { data: "30/05/2026", descricao: "Pagamento de Fornecedores", tipo: "SAÍDA", valor: 6200 },
  { data: "30/05/2026", descricao: "Despesas Operacionais do Período", tipo: "SAÍDA", valor: 4500 },
]

export default function ReportFluxoCaixaPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Fluxo de Caixa Simplificado" subtitle="Acompanhe as entradas e saídas previstas e consolidadas." />

      <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-5">
        {KPIS.map((k) => (
          <RichKpiCard key={k.title}>
            <RichKpiTitle>{k.title}</RichKpiTitle>
            <RichKpiValue tone={k.tone} className="pr-10">
              {formatBRL(k.value)}
            </RichKpiValue>
            <KpiStamp icon={k.icon} tone={k.tone} />
          </RichKpiCard>
        ))}
      </div>

      <Card className="gap-4">
        <CardHeader>
          <CardTitle className="text-sm font-extrabold uppercase tracking-wide">Extrato do Período</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Data</TableHead>
                <TableHead className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Descrição / Categoria</TableHead>
                <TableHead className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Tipo</TableHead>
                <TableHead className="text-right text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Valor (R$)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {EXTRATO.map((row) => {
                const tone = TONE_TEXT[TIPO_TONE[row.tipo]]
                return (
                  <TableRow key={row.descricao}>
                    <TableCell className="py-3.5 font-bold text-muted-foreground">{row.data}</TableCell>
                    <TableCell className="py-3.5 font-extrabold">{row.descricao}</TableCell>
                    <TableCell className={cn("py-3.5 font-extrabold", tone)}>{row.tipo}</TableCell>
                    <TableCell className={cn("py-3.5 text-right font-extrabold tabular-nums", tone)}>
                      {row.tipo === "SAÍDA" ? `- ${formatBRL(row.valor)}` : formatBRL(row.valor)}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
