import { PrinterIcon } from "lucide-react"

import { printReport } from "@/components/app/print-report"
import { Button } from "@/components/ui/button"
import { TableRow } from "@/components/ui/table"
import { useCashClosingReport } from "@/data/reports"
import { formatBRL, sumMoney } from "@/lib/format"

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
  { label: "Caixa / Terminal" },
  { label: "Total Vendas" },
  { label: "Recebido em Dinheiro" },
  { label: "Cartões / PIX" },
  { label: "Suprimento Inicial" },
  { label: "Sangrias (Retiradas)" },
  { label: "Saldo em Gaveta" },
]

/**
 * Relatório de Fechamento de Caixa — antigo renderReportFechamento. Agora com
 * os dados do banco para todos os caixas (o antigo lia só o localStorage
 * deste navegador e dividia pagamentos combinados meio a meio).
 */
export default function Page() {
  const [range, setRange] = useReportRange()
  const query = useCashClosingReport(range)
  const data = query.data
  const rows = data?.rows ?? []
  const loading = query.isLoading

  const totals = {
    vendas: data?.faturamento ?? 0,
    dinheiro: sumMoney(rows.map((r) => r.dinheiro)),
    cartoes: data?.total_cartoes ?? 0,
    sangrias: sumMoney(rows.map((r) => r.sangrias)),
    gaveta: data?.total_gaveta ?? 0,
  }

  function printFechamento() {
    printReport({
      title: "Relatório de Fechamento",
      period: range,
      summary: [
        { label: "Saldo Total em Gaveta (Líquido)", value: formatBRL(totals.gaveta) },
        { label: "Total Cartões / PIX", value: formatBRL(totals.cartoes) },
        { label: "Faturamento Total no Período", value: formatBRL(totals.vendas) },
      ],
      columns: ["Caixa", "Vendas", "Dinheiro", "Cartão/PIX", "Suprimento", "Sangrias", "Saldo Gaveta"],
      align: ["left", "right", "right", "right", "right", "right", "right"],
      rows: rows.map((r) => [
        `Caixa ${r.terminal_id}`,
        formatBRL(r.total_vendas),
        formatBRL(r.dinheiro),
        formatBRL(r.cartoes),
        formatBRL(r.suprimento),
        `- ${formatBRL(r.sangrias)}`,
        formatBRL(r.saldo_gaveta),
      ]),
      footer: [
        "TOTAL GERAL",
        formatBRL(totals.vendas),
        formatBRL(totals.dinheiro),
        formatBRL(totals.cartoes),
        "-",
        `- ${formatBRL(totals.sangrias)}`,
        formatBRL(totals.gaveta),
      ],
    })
  }

  return (
    <SalesReportLayout
      idPrefix="fechamento"
      range={range}
      onRangeChange={setRange}
      error={query.error}
      action={
        <Button onClick={printFechamento} disabled={!data}>
          <PrinterIcon data-icon="inline-start" />
          Imprimir Fechamento
        </Button>
      }
    >
      <ReportKpiGrid>
        <ReportKpiCard label="Total em Gaveta (Dinheiro Líquido)" tone="success" loading={loading} value={formatBRL(totals.gaveta)} />
        <ReportKpiCard label="Total Cartões / PIX" loading={loading} value={formatBRL(totals.cartoes)} />
        <ReportKpiCard label="Faturamento no Período" tone="brand" loading={loading} value={formatBRL(totals.vendas)} />
      </ReportKpiGrid>

      <ReportTable columns={COLUMNS} compact>
        {loading ? (
          <LoadingRows colSpan={7} />
        ) : rows.length === 0 ? (
          <EmptyRow colSpan={7} text="Nenhuma movimentação registrada no período." />
        ) : (
          <>
            {rows.map((r) => (
              <TableRow key={r.terminal_id}>
                <ReportCell compact className="font-extrabold whitespace-nowrap">Caixa {r.terminal_id}</ReportCell>
                <ReportCell compact className="font-bold whitespace-nowrap text-primary tabular-nums">{formatBRL(r.total_vendas)}</ReportCell>
                <ReportCell compact className="font-bold whitespace-nowrap tabular-nums">{formatBRL(r.dinheiro)}</ReportCell>
                <ReportCell compact className="font-bold whitespace-nowrap tabular-nums">{formatBRL(r.cartoes)}</ReportCell>
                <ReportCell compact className="font-bold whitespace-nowrap text-muted-foreground tabular-nums">{formatBRL(r.suprimento)}</ReportCell>
                <ReportCell compact className="font-bold whitespace-nowrap text-destructive tabular-nums">- {formatBRL(r.sangrias)}</ReportCell>
                <ReportCell compact className="text-base font-black whitespace-nowrap text-success tabular-nums">{formatBRL(r.saldo_gaveta)}</ReportCell>
              </TableRow>
            ))}
            <ReportTotalRow className="bg-accent hover:bg-accent">
              <ReportCell compact className="font-black whitespace-nowrap">TOTAL GERAL</ReportCell>
              <ReportCell compact className="font-black whitespace-nowrap text-primary tabular-nums">{formatBRL(totals.vendas)}</ReportCell>
              <ReportCell compact className="font-black whitespace-nowrap tabular-nums">{formatBRL(totals.dinheiro)}</ReportCell>
              <ReportCell compact className="font-black whitespace-nowrap tabular-nums">{formatBRL(totals.cartoes)}</ReportCell>
              <ReportCell compact className="font-black">-</ReportCell>
              <ReportCell compact className="font-black whitespace-nowrap text-destructive tabular-nums">- {formatBRL(totals.sangrias)}</ReportCell>
              <ReportCell compact className="text-lg font-black whitespace-nowrap text-success tabular-nums">{formatBRL(totals.gaveta)}</ReportCell>
            </ReportTotalRow>
          </>
        )}
      </ReportTable>
    </SalesReportLayout>
  )
}
