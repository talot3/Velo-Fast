import { ActivityIcon, ArrowDownRightIcon, DollarSignIcon, FileTextIcon } from "lucide-react"

import { printReport } from "@/components/app/print-report"
import { Button } from "@/components/ui/button"
import { TableRow } from "@/components/ui/table"
import { useCashMovements } from "@/data/reports"
import { formatBRL, formatDateTimeBR, sumMoney } from "@/lib/format"

import {
  EmptyRow,
  LoadingRows,
  ReportCell,
  ReportKpiCard,
  ReportKpiGrid,
  ReportTable,
  ReportTotalRow,
  SalesReportLayout,
  useReportRange,
} from "../features/vendas/report-ui"

const COLUMNS = [
  { label: "#" },
  { label: "Data/Hora" },
  { label: "Motivo" },
  { label: "Terminal" },
  { label: "Operador" },
  { label: "Valor Retirado" },
]

/** Relatório de Sangrias (Retiradas) — antigo renderReportSangrias, agora com as sangrias de todos os caixas. */
export default function Page() {
  const [range, setRange] = useReportRange()
  const query = useCashMovements(range, "sangria")
  // Mais recentes primeiro (o antigo subtraía textos ISO e não ordenava).
  const rows = [...(query.data ?? [])].sort((a, b) => Date.parse(b.occurred_at) - Date.parse(a.occurred_at))
  const grandTotal = sumMoney(rows.map((r) => Number(r.amount) || 0))
  const loading = query.isLoading

  const motivo = (reason: string | null) => reason || "Sangria"
  const terminal = (id: string | null) => `Caixa ${id || "-"}`

  function exportPdf() {
    printReport({
      title: "Relatório de Sangrias",
      period: range,
      summary: [
        { label: "Total Retirado", value: formatBRL(grandTotal) },
        { label: "Operações", value: `${rows.length} un.` },
      ],
      columns: ["#", "Data/Hora", "Motivo", "Terminal", "Operador", "Valor"],
      align: ["left", "left", "left", "left", "left", "right"],
      rows:
        rows.length === 0
          ? [["", "Nenhuma sangria registrada neste período.", "", "", "", ""]]
          : rows.map((r, i) => [
              i + 1,
              formatDateTimeBR(r.occurred_at),
              motivo(r.reason),
              terminal(r.terminal_id),
              r.operator_name || "-",
              `- ${formatBRL(r.amount)}`,
            ]),
      footer: ["", "", "", "", "TOTAL RETIRADO", `- ${formatBRL(grandTotal)}`],
    })
  }

  return (
    <SalesReportLayout
      idPrefix="sangria"
      range={range}
      onRangeChange={setRange}
      error={query.error}
      action={
        <Button variant="outline" onClick={exportPdf} disabled={!query.data}>
          <FileTextIcon data-icon="inline-start" />
          Exportar PDF
        </Button>
      }
    >
      <ReportKpiGrid columns={2}>
        <ReportKpiCard
          label="Total Retirado"
          icon={ArrowDownRightIcon}
          iconTone="danger"
          tone="danger"
          loading={loading}
          value={formatBRL(grandTotal)}
        />
        <ReportKpiCard label="Operações" icon={ActivityIcon} loading={loading} value={rows.length} unit="retiradas" />
      </ReportKpiGrid>

      <ReportTable columns={COLUMNS}>
        {loading ? (
          <LoadingRows colSpan={6} />
        ) : rows.length === 0 ? (
          <EmptyRow colSpan={6} icon={DollarSignIcon} text="Nenhuma sangria ou retirada de caixa registrada neste período." />
        ) : (
          <>
            {rows.map((r, i) => (
              <TableRow key={r.id}>
                <ReportCell className="font-extrabold text-muted-foreground">{i + 1}</ReportCell>
                <ReportCell className="font-extrabold whitespace-nowrap tabular-nums">{formatDateTimeBR(r.occurred_at)}</ReportCell>
                <ReportCell className="font-bold">{motivo(r.reason)}</ReportCell>
                <ReportCell className="font-bold whitespace-nowrap">{terminal(r.terminal_id)}</ReportCell>
                <ReportCell className="font-bold text-muted-foreground">{r.operator_name || "-"}</ReportCell>
                <ReportCell className="text-base font-black whitespace-nowrap text-destructive tabular-nums">- {formatBRL(r.amount)}</ReportCell>
              </TableRow>
            ))}
            <ReportTotalRow className="bg-destructive/5 hover:bg-destructive/5">
              <ReportCell colSpan={5} className="py-4.5 text-right font-black">
                TOTAL RETIRADO
              </ReportCell>
              <ReportCell className="text-[17px] font-black whitespace-nowrap text-destructive tabular-nums">- {formatBRL(grandTotal)}</ReportCell>
            </ReportTotalRow>
          </>
        )}
      </ReportTable>
    </SalesReportLayout>
  )
}
