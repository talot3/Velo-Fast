/**
 * Peças visuais comuns às telas de Configurações, Colaboradores e Sistema:
 * tabela de cadastro (antigo glass-card + modern-table), ações da linha,
 * rótulos de seção e a faixa "# NOVO / Data:" dos formulários.
 */
import type { ComponentProps, ComponentType, ReactNode } from "react"
import { PenLineIcon, Trash2Icon, TriangleAlertIcon } from "lucide-react"

import { EmptyState } from "@/components/app/empty-state"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { errorMessage } from "@/lib/errors"
import { cn } from "@/lib/utils"

export type TableColumn = { label: string; className?: string }

/** Tabela de cadastro dentro de um cartão sem margem interna. */
export function ConfigTable({ columns, children }: { columns: TableColumn[]; children: ReactNode }) {
  return (
    <Card className="gap-0 overflow-hidden py-0">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {columns.map((c, i) => (
              <TableHead
                key={`${c.label}-${i}`}
                className={cn("h-11 px-4 text-[11px] font-bold tracking-wider text-muted-foreground uppercase", c.className)}
              >
                {c.label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>{children}</TableBody>
      </Table>
    </Card>
  )
}

/** Célula com o espaçamento das tabelas de cadastro. */
export function Cell({ className, ...props }: ComponentProps<typeof TableCell>) {
  return <TableCell className={cn("px-4 py-3.5", className)} {...props} />
}

/** Linha única de "lista vazia" ocupando todas as colunas. */
export function EmptyRow({ colSpan, title, icon }: { colSpan: number; title: string; icon?: ComponentType }) {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell colSpan={colSpan} className="p-0 whitespace-normal">
        <EmptyState title={title} icon={icon} />
      </TableCell>
    </TableRow>
  )
}

/** Linhas de carregamento. */
export function LoadingRows({ colSpan, rows = 3 }: { colSpan: number; rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }, (_, i) => (
        <TableRow key={i} className="hover:bg-transparent">
          <TableCell colSpan={colSpan} className="px-4 py-3.5">
            <Skeleton className="h-6 w-full" />
          </TableCell>
        </TableRow>
      ))}
    </>
  )
}

/** Aviso de falha ao carregar dados. */
export function LoadError({ error, title = "Não foi possível carregar os dados." }: { error: unknown; title?: string }) {
  return (
    <Alert variant="destructive">
      <TriangleAlertIcon />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{errorMessage(error)}</AlertDescription>
    </Alert>
  )
}

/** Botões "editar" e "remover" alinhados à direita (com extras antes). */
export function RowActions({ onEdit, onDelete, children }: { onEdit: () => void; onDelete: () => void; children?: ReactNode }) {
  return (
    <div className="flex items-center justify-end gap-1">
      {children}
      <Button type="button" variant="ghost" size="icon-sm" className="text-primary hover:text-primary" aria-label="Editar" title="Editar" onClick={onEdit}>
        <PenLineIcon />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="text-destructive hover:text-destructive"
        aria-label="Remover"
        title="Remover"
        onClick={onDelete}
      >
        <Trash2Icon />
      </Button>
    </div>
  )
}

/** Rótulo de seção dos formulários ("Detalhes da impressora"...). */
export function SectionLabel({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("text-[11px] font-extrabold tracking-widest text-primary uppercase", className)}>{children}</p>
}

/** Faixa superior dos formulários: "# ID" à esquerda e "Data: ..." à direita. */
export function FormStrip({ id, date }: { id: string; date: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-dashed border-input pb-4">
      <span className="text-sm font-extrabold text-muted-foreground"># {id}</span>
      <span className="text-xs font-semibold text-muted-foreground">Data: {date}</span>
    </div>
  )
}
