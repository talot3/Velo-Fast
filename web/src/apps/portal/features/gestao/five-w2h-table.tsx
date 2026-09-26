import type { ReactNode } from "react"
import { Trash2Icon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"

import { GridInput, MoneyCellInput } from "./sheet-ui"

export type PlanRow = {
  id: number
  oQue: string
  porQue: string
  onde: string
  quem: string
  /** "YYYY-MM-DD" */
  quando: string
  como: string
  quanto: number
}

export type PlanField = "oQue" | "porQue" | "onde" | "quem" | "quando" | "como"

type Placeholders = Record<"oQue" | "porQue" | "onde" | "quem" | "como", string>

const HEADERS: { key: keyof PlanRow; label: string }[] = [
  { key: "oQue", label: "O Que Fazer (What)" },
  { key: "porQue", label: "Por Quê (Why)" },
  { key: "onde", label: "Onde (Where)" },
  { key: "quem", label: "Quem (Who)" },
  { key: "quando", label: "Quando (When)" },
  { key: "como", label: "Como (How)" },
  { key: "quanto", label: "Quanto (How Much)" },
]

const HEAD = "h-auto border px-3 py-2.5 text-[9.5px] font-extrabold uppercase tracking-wider whitespace-normal text-foreground"

/**
 * Planilha 5W2H editável (SWOT › Etapa 3 e Plano de Ação › Grade de
 * Execução): cada célula é um campo; "Quanto" aceita valores em reais.
 */
export function FiveW2HTable<T extends PlanRow>({
  rows,
  widths,
  placeholders,
  onChange,
  onQuantoChange,
  onRemove,
  deleteTitle,
  emptyText,
  kpi,
  minWidth = 900,
}: {
  rows: T[]
  /** Larguras das 7 colunas (ex.: "25%"). */
  widths: string[]
  placeholders: Placeholders
  onChange: (id: number, field: PlanField, value: string) => void
  onQuantoChange: (id: number, value: number) => void
  onRemove: (id: number) => void
  deleteTitle: string
  emptyText: ReactNode
  /** Coluna "KPI Alvo" (Plano de Ação). */
  kpi?: { width: string; render: (row: T) => ReactNode }
  /** Largura mínima da planilha (rola na horizontal abaixo disso). */
  minWidth?: number
}) {
  const colCount = HEADERS.length + (kpi ? 1 : 0) + 1
  return (
    <Table className="border-collapse text-[12.5px]" style={{ minWidth }}>
      <TableHeader>
        <TableRow className="bg-accent hover:bg-accent">
          {HEADERS.map((h, i) => (
            <TableHead key={h.key} className={cn(HEAD, h.key === "quanto" && "text-right")} style={{ width: widths[i] }}>
              {h.label}
            </TableHead>
          ))}
          {kpi ? (
            <TableHead className={cn(HEAD, "text-center")} style={{ width: kpi.width }}>
              KPI Alvo
            </TableHead>
          ) : null}
          <TableHead className={cn(HEAD, "w-10")}>
            <span className="sr-only">Ações</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.length === 0 ? (
          <TableRow className="hover:bg-transparent">
            <TableCell colSpan={colCount} className="border p-8 text-center font-semibold whitespace-normal text-muted-foreground">
              {emptyText}
            </TableCell>
          </TableRow>
        ) : (
          rows.map((row) => (
            <TableRow key={row.id} className="hover:bg-transparent">
              {(["oQue", "porQue", "onde", "quem"] as const).map((f) => (
                <TableCell key={f} className="border p-1">
                  <GridInput
                    value={row[f]}
                    placeholder={placeholders[f]}
                    aria-label={HEADERS.find((h) => h.key === f)?.label}
                    onChange={(e) => onChange(row.id, f, e.target.value)}
                  />
                </TableCell>
              ))}
              <TableCell className="border p-1">
                <GridInput type="date" className="min-w-29.5" value={row.quando} aria-label="Quando (When)" onChange={(e) => onChange(row.id, "quando", e.target.value)} />
              </TableCell>
              <TableCell className="border p-1">
                <GridInput value={row.como} placeholder={placeholders.como} aria-label="Como (How)" onChange={(e) => onChange(row.id, "como", e.target.value)} />
              </TableCell>
              <TableCell className="border p-1">
                <MoneyCellInput value={row.quanto} placeholder="0,00" aria-label="Quanto (How Much)" onValueChange={(v) => onQuantoChange(row.id, v)} />
              </TableCell>
              {kpi ? <TableCell className="border p-1 text-center">{kpi.render(row)}</TableCell> : null}
              <TableCell className="border p-1 text-center">
                <Button
                  size="icon-xs"
                  variant="ghost"
                  className="size-7 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  title={deleteTitle}
                  aria-label={deleteTitle}
                  onClick={() => onRemove(row.id)}
                >
                  <Trash2Icon />
                </Button>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  )
}
