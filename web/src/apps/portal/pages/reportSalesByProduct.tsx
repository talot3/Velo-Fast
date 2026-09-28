import { BoxIcon, DollarSignIcon, FileTextIcon, FrownIcon, ShoppingBagIcon } from "lucide-react"

import { printReport } from "@/components/app/print-report"
import { Button } from "@/components/ui/button"
import { TableRow } from "@/components/ui/table"
import { useSalesByProduct } from "@/data/reports"
import { formatBRL, formatPercent } from "@/lib/format"

import {
  EmptyRow,
  LoadingRows,
  PaymentChips,
  ReportCell,
  ReportKpiCard,
  ReportKpiGrid,
  ReportTable,
  ReportTotalRow,
  SalesReportLayout,
  share,
  ShareBar,
  useReportRange,
} from "../features/vendas/report-ui"

const COLUMNS = [
  { label: "#" },
  { label: "Produto", className: "min-w-40" },
  { label: "Qtd. Vendida" },
  { label: "Total (R$)" },
  { label: "Ticket Médio" },
  { label: "Pgtos Utilizados", className: "min-w-96" },
  { label: "% do Total" },
]

const ticket = (total: number, qty: number) => (qty > 0 ? total / qty : 0)

/** Relatório de Vendas por Produto — antigo renderReportSalesByProduct. */
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
      title: "Relatório de Vendas por Produto",
      period: range,
      summary: [
        { label: "Total Arrecadado", value: formatBRL(data.total) },
        { label: "Itens Vendidos", value: `${data.units} un.` },
        { label: "Produtos Diferentes", value: String(data.distinct_products) },
      ],
      columns: ["#", "Produto", "Qtd.", "Total", "Ticket Médio", "% Total"],
      align: ["left", "left", "center", "right", "right", "right"],
      rows: rows.map((r, i) => [
        i + 1,
        r.product_name,
        r.qty,
        formatBRL(r.total),
        formatBRL(ticket(r.total, r.qty)),
        formatPercent(share(r.total, grandTotal)),
      ]),
      footer: ["TOTAL GERAL", "", `${data.units} un.`, formatBRL(data.total), "-", "100%"],
    })
  }

  return (
    <SalesReportLayout
      idPrefix="prod"
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
        <ReportKpiCard label="Total Arrecadado" icon={DollarSignIcon} tone="brand" loading={loading} value={formatBRL(grandTotal)} />
        <ReportKpiCard label="Itens Vendidos" icon={ShoppingBagIcon} loading={loading} value={data?.units ?? 0} unit="un." />
        <ReportKpiCard label="Produtos Diferentes" icon={BoxIcon} loading={loading} value={data?.distinct_products ?? 0} unit="itens" />
      </ReportKpiGrid>

      <ReportTable columns={COLUMNS}>
        {loading ? (
          <LoadingRows colSpan={7} />
        ) : rows.length === 0 ? (
          <EmptyRow colSpan={7} icon={FrownIcon} text="Nenhuma venda registrada neste período para exibição." />
        ) : (
          <>
            {rows.map((r, i) => (
              <TableRow key={r.product_name}>
                <ReportCell className="font-extrabold text-muted-foreground">{i + 1}</ReportCell>
                <ReportCell className="font-extrabold">{r.product_name}</ReportCell>
                <ReportCell className="text-base font-black whitespace-nowrap tabular-nums">{r.qty} un.</ReportCell>
                <ReportCell className="text-base font-black whitespace-nowrap text-primary tabular-nums">{formatBRL(r.total)}</ReportCell>
                <ReportCell className="font-bold whitespace-nowrap tabular-nums">{formatBRL(ticket(r.total, r.qty))}</ReportCell>
                <ReportCell>
                  <PaymentChips methods={r.methods} />
                </ReportCell>
                <ReportCell>
                  <ShareBar pct={share(r.total, grandTotal)} />
                </ReportCell>
              </TableRow>
            ))}
            <ReportTotalRow>
              <ReportCell colSpan={2} className="py-4.5 font-black">
                TOTAL GERAL
              </ReportCell>
              <ReportCell className="text-base font-black whitespace-nowrap tabular-nums">{data?.units ?? 0} un.</ReportCell>
              <ReportCell className="text-[17px] font-black whitespace-nowrap text-primary tabular-nums">{formatBRL(grandTotal)}</ReportCell>
              <ReportCell colSpan={3} />
            </ReportTotalRow>
          </>
        )}
      </ReportTable>
    </SalesReportLayout>
  )
}
