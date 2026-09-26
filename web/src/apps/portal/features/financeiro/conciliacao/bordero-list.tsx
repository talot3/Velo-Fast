import { EyeIcon, PlusIcon } from "lucide-react"

import { KpiCard, KpiGrid } from "@/components/app/kpi"
import { PageHeader } from "@/components/app/page-header"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { TableBody, TableRow } from "@/components/ui/table"
import { formatBRL, formatDateBR } from "@/lib/format"
import { cn } from "@/lib/utils"

import { DataTable, HeadRow, ListRows, MONEY_CELL, Pill, RowActions, Td, Th, type Tone } from "../ui"
import type { BorderoRowStatus, BorderoView } from "./model"

const STATUS_TONE: Record<BorderoRowStatus, Tone> = { Conciliado: "success", Pendente: "warning", "Em aberto": "info" }

/** "+R$ 1,00" / "-R$ 15,66" / "R$ 0,00"; "—" quando não há vendas do sistema. */
function Diferenca({ value }: { value: number | null }) {
  if (value === null) return <span className="text-muted-foreground">—</span>
  const tone = value === 0 ? "text-foreground" : value > 0 ? "text-success" : "text-destructive"
  return (
    <span className={tone}>
      {value > 0 ? "+" : ""}
      {formatBRL(value)}
    </span>
  )
}

type BorderoListProps = {
  views: BorderoView[]
  isLoading: boolean
  error: unknown
  onOpen: (view: BorderoView) => void
  onRemove: (view: BorderoView) => void
  onNew: () => void
}

export function BorderoList({ views, isLoading, error, onOpen, onRemove, onNew }: BorderoListProps) {
  const pendentes = views.filter((b) => b.status === "Pendente").length
  const conciliados = views.filter((b) => b.status === "Conciliado").length
  const stat = (n: number) => (isLoading ? <Skeleton className="h-8 w-12" /> : n)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Conciliação de Caixa (Borderôs)"
        subtitle="Selecione um borderô de fechamento para realizar a conciliação fina por forma de pagamento."
        actions={
          <Button onClick={onNew}>
            <PlusIcon data-icon="inline-start" />
            Lançar Fechamento (Borderô)
          </Button>
        }
      />

      <KpiGrid columns={3}>
        <KpiCard label="Total Fechamentos" value={stat(views.length)} tone="brand" />
        <KpiCard label="Pendentes de Conferência" value={stat(pendentes)} tone="warning" />
        <KpiCard label="Conciliados" value={stat(conciliados)} tone="success" />
      </KpiGrid>

      <DataTable>
        <HeadRow>
          <Th>Data</Th>
          <Th>Terminal</Th>
          <Th>Operador</Th>
          <Th>Vendas Sistema</Th>
          <Th>Valor Declarado</Th>
          <Th>Diferença</Th>
          <Th>Status</Th>
          <Th className="w-[200px]" />
        </HeadRow>
        <TableBody>
          <ListRows
            colSpan={8}
            isLoading={isLoading}
            error={error}
            isEmpty={views.length === 0}
            emptyTitle="Nenhum borderô ou fechamento aguardando conciliação."
          >
            {views.map((b) => (
              <TableRow key={b.key}>
                <Td className="font-bold whitespace-nowrap tabular-nums">{b.data ? formatDateBR(b.data) : "-"}</Td>
                <Td className="font-bold">{b.terminal}</Td>
                <Td className="font-bold uppercase">{b.operador}</Td>
                <Td className={cn("font-black", MONEY_CELL, b.vendasSistema === null ? "text-muted-foreground" : "text-primary")}>
                  {b.vendasSistema === null ? "—" : formatBRL(b.vendasSistema)}
                </Td>
                <Td className={cn("font-black text-success", MONEY_CELL)}>{formatBRL(b.totalDeclarado)}</Td>
                <Td className={cn("font-black", MONEY_CELL)}>
                  <Diferenca value={b.diferenca} />
                </Td>
                <Td>
                  <Pill tone={STATUS_TONE[b.status]}>{b.status}</Pill>
                </Td>
                <Td>
                  <div className="flex items-center justify-end gap-2">
                    <Button size="sm" onClick={() => onOpen(b)}>
                      <EyeIcon data-icon="inline-start" />
                      Abrir Conciliador
                    </Button>
                    {/* Sessão sem conferência gravada: não há o que remover. */}
                    <RowActions onRemove={() => onRemove(b)} disabled={b.source === "session" && b.session !== null && !b.record} />
                  </div>
                </Td>
              </TableRow>
            ))}
          </ListRows>
        </TableBody>
      </DataTable>
    </div>
  )
}
