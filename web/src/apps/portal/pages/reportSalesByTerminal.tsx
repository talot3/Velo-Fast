import { DollarSignIcon, FileTextIcon, FrownIcon, MonitorIcon, TicketIcon } from "lucide-react"

import { printReport } from "@/components/app/print-report"
import { Button } from "@/components/ui/button"
import { TableRow } from "@/components/ui/table"
import { useSalesByTerminal } from "@/data/reports"
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
  { label: "Caixa / Terminal" },
  { label: "Qtd. Vendas" },
  { label: "Total Arrecadado" },
  { label: "Ticket Médio" },
  { label: "Formas de Pgto", className: "min-w-96" },
  { label: "% do Total" },
]

const ticket = (total: number, units: number) => (units > 0 ? total / units : 0)

/** Relatório de Vendas por Caixa — antigo renderReportSalesByTerminal. */
export default function Page() {
  const [range, setRange] = useReportRange()
  const query = useSalesByTerminal(range)
  const data = query.data
  const rows = data?.rows ?? []
  const grandTotal = data?.total ?? 0
  const loading = query.isLoading

  function exportPdf() {
    if (!data) return
    printReport({
      title: "Relatório de Vendas por Caixa",
      period: range,
      summary: [
        { label: "Total Arrecadado", value: formatBRL(data.total) },
        { label: "Tickets Emitidos", value: `${data.tickets} un.` },
        { label: "Caixas Ativos", value: String(data.terminals) },
      ],
      columns: ["#", "Caixa / Terminal", "Qtd. Vendas", "Total Arrecadado", "Ticket Médio", "% Total"],
      align: ["left", "left", "center", "right", "right", "right"],
      rows: rows.map((r, i) => [
        i + 1,
        `Caixa ${r.terminal_id}`,
        r.units,
        formatBRL(r.total),
        formatBRL(ticket(r.total, r.units)),
        formatPercent(share(r.total, grandTotal)),
      ]),
      footer: ["TOTAL GERAL", "", `${data.tickets} un.`, formatBRL(data.total), "-", "100%"],
    })
  }

  return (
    <SalesReportLayout
      idPrefix="term"
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
        <ReportKpiCard label="Tickets Emitidos" icon={TicketIcon} loading={loading} value={data?.tickets ?? 0} unit="un." />
        <ReportKpiCard label="Caixas Ativos" icon={MonitorIcon} loading={loading} value={data?.terminals ?? 0} unit="caixas" />
      </ReportKpiGrid>

      <ReportTable columns={COLUMNS}>
        {loading ? (
          <LoadingRows colSpan={7} />
        ) : rows.length === 0 ? (
          <EmptyRow colSpan={7} icon={FrownIcon} text="Nenhuma venda registrada neste período para os caixas." />
        ) : (
          <>
            {rows.map((r, i) => (
              <TableRow key={r.terminal_id}>
                <ReportCell className="font-extrabold text-muted-foreground">{i + 1}</ReportCell>
                <ReportCell className="font-extrabold whitespace-nowrap">Caixa {r.terminal_id}</ReportCell>
                <ReportCell className="text-base font-black whitespace-nowrap tabular-nums">{r.units} un.</ReportCell>
                <ReportCell className="text-base font-black whitespace-nowrap text-primary tabular-nums">{formatBRL(r.total)}</ReportCell>
                <ReportCell className="font-bold whitespace-nowrap tabular-nums">{formatBRL(ticket(r.total, r.units))}</ReportCell>
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
              <ReportCell className="text-base font-black whitespace-nowrap tabular-nums">{data?.tickets ?? 0} un.</ReportCell>
              <ReportCell className="text-[17px] font-black whitespace-nowrap text-primary tabular-nums">{formatBRL(grandTotal)}</ReportCell>
              <ReportCell colSpan={3} />
            </ReportTotalRow>
          </>
        )}
      </ReportTable>
    </SalesReportLayout>
  )
}
