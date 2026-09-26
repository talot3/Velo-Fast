import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"

import { ReportHead, ReportHeadRow, ReportTableCard, TONE_TEXT, type ReportTone } from "./report-ui"

export type StatementRow = {
  label: string
  /** Valor já formatado (ex.: "- R$ 2.150,00"). */
  value: string
  pct?: string
  /** group = linha de grupo/total; highlight = subtotal destacado; item = linha recuada. */
  level: "group" | "highlight" | "item"
  tone?: ReportTone
  /** Total final em destaque (maior). */
  emphasis?: boolean
}

type Column = { label: string; className?: string }

/**
 * Tabela de demonstrativo contábil estática (DRE Gerencial, Balanço):
 * mesmas linhas, recuos e destaques do sistema anterior.
 */
export function StatementTable({
  description,
  value,
  pct,
  rows,
  alignValueRight,
}: {
  description: string
  value: Column
  pct?: Column
  rows: StatementRow[]
  alignValueRight?: boolean
}) {
  return (
    <ReportTableCard>
      <Table>
        <TableHeader>
          <ReportHeadRow>
            <ReportHead>{description}</ReportHead>
            <ReportHead className={value.className}>{value.label}</ReportHead>
            {pct ? <ReportHead className={pct.className}>{pct.label}</ReportHead> : null}
          </ReportHeadRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow
              key={row.label}
              className={cn(
                "text-[13px]",
                row.level === "group" && "bg-accent hover:bg-accent/80",
                row.level === "highlight" && "bg-accent/50 hover:bg-accent/70"
              )}
            >
              <TableCell
                className={cn(
                  "px-4.5 py-2.5 whitespace-normal",
                  row.level === "item" ? "pl-7 font-semibold" : "font-extrabold"
                )}
              >
                {row.label}
              </TableCell>
              <TableCell
                className={cn(
                  "px-4.5 py-2.5 tabular-nums",
                  row.level === "item" ? "font-bold" : "font-extrabold",
                  alignValueRight && "text-right",
                  row.emphasis && "text-[15px]",
                  row.tone && TONE_TEXT[row.tone]
                )}
              >
                {row.value}
              </TableCell>
              {pct ? (
                <TableCell className={cn("px-4.5 py-2.5 text-xs text-muted-foreground tabular-nums", row.level === "item" ? "font-bold" : "font-extrabold")}>
                  {row.pct}
                </TableCell>
              ) : null}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ReportTableCard>
  )
}
