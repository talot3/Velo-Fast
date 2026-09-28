import { useMemo } from "react"
import { FileTextIcon, TriangleAlertIcon } from "lucide-react"

import { KpiCard, KpiGrid } from "@/components/app/kpi"
import { PageHeader } from "@/components/app/page-header"
import { printReport } from "@/components/app/print-report"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useProducts, useSubgroups } from "@/data/catalog"
import type { Product } from "@/data/types"
import { errorMessage } from "@/lib/errors"
import { formatBRL } from "@/lib/format"
import { cn } from "@/lib/utils"

import { formatQty } from "../features/catalogo/lib"

const TH = "text-[11px] font-bold tracking-wide text-muted-foreground uppercase"

type StockStatus = "Sem controle" | "Zerado" | "Baixo" | "Normal"

/** Sem controle · Zerado (= 0) · Baixo (≤ 5) · Normal. */
function stockStatus(p: Product): StockStatus {
  if (p.stock === null) return "Sem controle"
  if (p.stock === 0) return "Zerado"
  if (p.stock <= 5) return "Baixo"
  return "Normal"
}

const STATUS_CLASS: Record<StockStatus, string> = {
  "Sem controle": "bg-muted text-muted-foreground",
  Zerado: "bg-destructive/15 text-destructive",
  Baixo: "bg-warning/25 text-foreground",
  Normal: "bg-success/15 text-success",
}

/** Inventário de Estoque — antigo renderInventory / printInventory. */
export default function Page() {
  const productsQ = useProducts()
  const subgroupsQ = useSubgroups()
  const products = useMemo(() => productsQ.data ?? [], [productsQ.data])
  const subgroupById = useMemo(() => new Map((subgroupsQ.data ?? []).map((s) => [s.id, s])), [subgroupsQ.data])
  const loading = productsQ.isLoading || subgroupsQ.isLoading
  const loadError = productsQ.error ?? subgroupsQ.error

  const withStock = products.filter((p) => p.stock !== null)
  const totalValue = withStock.reduce((acc, p) => acc + p.price * (p.stock || 0), 0)
  const subgroupOf = (p: Product) => (p.subgroupId ? subgroupById.get(p.subgroupId) : undefined)

  function exportPdf() {
    printReport({
      title: "Inventario de Estoque",
      heading: "INVENTARIO DE ESTOQUE",
      orientation: "landscape",
      columns: ["Codigo", "Produto", "Subgrupo", "Estoque", "Preco Venda", "Valor Total", "Status"],
      align: ["left", "left", "left", "center", "right", "right", "center"],
      rows: products.map((p) => [
        p.code || "-",
        p.name,
        subgroupOf(p)?.name ?? "N/A",
        p.stock === null ? "-" : formatQty(p.stock),
        formatBRL(p.price),
        p.stock === null ? "-" : formatBRL(p.price * p.stock),
        stockStatus(p),
      ]),
      footer: [`Total de itens: ${products.length}`, "", "", "", "", "", ""],
    })
  }

  const itens = (n: number) => (
    <>
      {n} <span className="text-sm font-semibold text-muted-foreground">itens</span>
    </>
  )

  return (
    <div className="flex flex-col gap-6">
      {loadError ? (
        <Alert variant="destructive">
          <TriangleAlertIcon />
          <AlertTitle>Não foi possível carregar o inventário.</AlertTitle>
          <AlertDescription>{errorMessage(loadError)}</AlertDescription>
        </Alert>
      ) : null}

      <KpiGrid columns={3}>
        <KpiCard label="Itens com Estoque Controlado" value={loading ? <Skeleton className="h-8 w-20" /> : itens(withStock.length)} />
        <KpiCard label="Valor Total em Estoque" tone="brand" value={loading ? <Skeleton className="h-8 w-32" /> : formatBRL(totalValue)} />
        <KpiCard
          label="Itens sem Controle"
          value={
            loading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <span className="text-muted-foreground">{itens(products.length - withStock.length)}</span>
            )
          }
        />
      </KpiGrid>

      <PageHeader
        title="Posicao de Estoque"
        actions={
          <Button onClick={exportPdf} disabled={loading}>
            <FileTextIcon data-icon="inline-start" />
            Exportar PDF
          </Button>
        }
      />

      <Card className="gap-0 overflow-hidden py-0">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className={TH}>Codigo</TableHead>
                <TableHead className={TH}>Produto</TableHead>
                <TableHead className={TH}>Subgrupo</TableHead>
                <TableHead className={TH}>Qtd. Estoque</TableHead>
                <TableHead className={TH}>Preco Venda</TableHead>
                <TableHead className={TH}>Valor Total</TableHead>
                <TableHead className={TH}>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }, (_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={7}>
                      <Skeleton className="h-7 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : products.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={7} className="py-14 text-center font-semibold text-muted-foreground">
                    Nenhum produto cadastrado.
                  </TableCell>
                </TableRow>
              ) : (
                products.map((p) => {
                  const sg = subgroupOf(p)
                  const status = stockStatus(p)
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="h-12 text-[13px] font-bold text-muted-foreground">{p.code || "-"}</TableCell>
                      <TableCell className="font-extrabold whitespace-normal">{p.name}</TableCell>
                      <TableCell className="whitespace-normal">
                        {sg ? (
                          <span
                            className="inline-block rounded-md px-2 py-1 text-[11px] font-bold"
                            style={{ background: sg.buttonColor || "var(--accent)", color: sg.textColor || "var(--foreground)" }}
                          >
                            {sg.name}
                          </span>
                        ) : (
                          <span className="inline-block rounded-md bg-accent px-2 py-1 text-[11px] font-bold">N/A</span>
                        )}
                      </TableCell>
                      <TableCell className="text-lg font-black tabular-nums">{p.stock === null ? "-" : formatQty(p.stock)}</TableCell>
                      <TableCell className="font-extrabold text-primary tabular-nums">{formatBRL(p.price)}</TableCell>
                      <TableCell className="font-extrabold tabular-nums">{p.stock === null ? "-" : formatBRL(p.price * p.stock)}</TableCell>
                      <TableCell>
                        <Badge className={cn("rounded-md font-bold", STATUS_CLASS[status])}>{status}</Badge>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
