import { CalendarIcon, FileTextIcon, ShoppingBagIcon, TrendingUpIcon } from "lucide-react"

import { printReport } from "@/components/app/print-report"
import { Button } from "@/components/ui/button"
import { TableRow } from "@/components/ui/table"
import { useSalesByProduct } from "@/data/reports"
import { formatBRL, formatPercent } from "@/lib/format"

import {
  EmptyRow,
  LoadingRows,
  ReportCell,
  ReportKpiCard,
  ReportKpiGrid,
  ReportTable,
  SalesReportLayout,
  share,
  useReportRange,
} from "../features/vendas/report-ui"

const COLUMNS = [
  { label: "#", className: "w-[60px]" },
  { label: "Produto", className: "min-w-40" },
  { label: "Qtd. Vendida", className: "text-center" },
  { label: "Faturamento (R$)", className: "text-right" },
  { label: "Participação (%)", className: "text-right" },
]

/** Relatório de Vendas por Período — antigo renderReportSalesByPeriod. */
export default function Page() {
  const [range, setRange] = useReportRange()
  const query = useSalesByProduct(range)
  const data = query.data
  const rows = data?.rows ?? []
  const grandTotal = data?.total ?? 0
  const loading = query.isLoading

  function exportPdf() {
    if (!data) return
    printReport({
      title: "Relatório por Período",
      period: range,
      summary: [
        { label: "Total Arrecadado", value: formatBRL(data.total) },
        { label: "Itens Vendidos", value: `${data.units} un.` },
        { label: "Tickets Emitidos", value: `${data.records} op.` },
      ],
      columns: ["#", "Produto", "Qtd. Vendida", "Faturamento (R$)", "% Total"],
      align: ["left", "left", "center", "right", "right"],
      rows: rows.map((r, i) => [i + 1, r.product_name, r.qty, formatBRL(r.total), formatPercent(share(r.total, grandTotal))]),
      footer: ["TOTAL GERAL", "", `${data.units} un.`, formatBRL(data.total), "100%"],
    })
  }

  return (
    <SalesReportLayout
      idPrefix="filter"
      range={range}
      onRangeChange={setRange}
      error={query.error}
      action={
        <Button variant="outline" onClick={exportPdf} disabled={!data}>
          <FileTextIcon data-icon="inline-start" />
          Exportar PDF
        </Button>
      }
    >
      <ReportKpiGrid>
        <ReportKpiCard
          label="Faturamento no Período"
          icon={TrendingUpIcon}
          iconTone="success"
          tone="brand"
          loading={loading}
          value={formatBRL(grandTotal)}
        />
        <ReportKpiCard label="Itens Vendidos" icon={ShoppingBagIcon} loading={loading} value={data?.units ?? 0} unit="un." />
        <ReportKpiCard label="Tickets Gerados" icon={FileTextIcon} loading={loading} value={data?.records ?? 0} unit="operações" />
      </ReportKpiGrid>

      <ReportTable columns={COLUMNS}>
        {loading ? (
          <LoadingRows colSpan={5} />
        ) : rows.length === 0 ? (
          <EmptyRow colSpan={5} icon={CalendarIcon} text="Nenhuma venda encontrada para o período selecionado." />
        ) : (
          rows.map((r, i) => (
            <TableRow key={r.product_name}>
              <ReportCell className="font-extrabold text-muted-foreground">{i + 1}</ReportCell>
              <ReportCell className="font-extrabold">{r.product_name}</ReportCell>
              <ReportCell className="text-center text-base font-black whitespace-nowrap tabular-nums">{r.qty} un.</ReportCell>
              <ReportCell className="text-right text-base font-black whitespace-nowrap text-primary tabular-nums">{formatBRL(r.total)}</ReportCell>
              <ReportCell className="text-right font-bold whitespace-nowrap tabular-nums">{formatPercent(share(r.total, grandTotal))}</ReportCell>
            </TableRow>
          ))
        )}
      </ReportTable>
    </SalesReportLayout>
  )
}
