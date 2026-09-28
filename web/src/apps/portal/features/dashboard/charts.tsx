import { useMemo, type ReactNode } from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Pie,
  PieChart,
  Sector,
  Text,
  XAxis,
  YAxis,
  type PieSectorDataItem,
  type XAxisTickContentProps,
  type YAxisTickContentProps,
} from "recharts"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { Skeleton } from "@/components/ui/skeleton"
import type { Dashboard } from "@/data/reports"
import { useIsMobile } from "@/hooks/use-mobile"
import { formatBRL } from "@/lib/format"
import { cn } from "@/lib/utils"

type Row = { name: string; total: number }

const CHART_HEIGHT = "aspect-auto h-[260px] w-full"

// Cores das fatias, em ordem fixa (o vermelho, que também é a cor de erro, fica por último).
const SLICE_COLORS = ["var(--chart-1)", "var(--chart-3)", "var(--chart-2)", "var(--chart-5)", "var(--chart-4)"]

const barConfig = { total: { label: "Vendas", color: "var(--chart-3)" } } satisfies ChartConfig

const axisInteger = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 })
const axisCompact = new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 })

/** Escala de valores do eixo: "1.800" enquanto o maior valor < 100 mil; senão "150 mil", "1,2 mi". */
function axisMoney(rows: Row[]) {
  const format = Math.max(0, ...rows.map((r) => r.total)) >= 100_000 ? axisCompact : axisInteger
  return (value: number) => format.format(value)
}

function toRows(rows: Row[] | undefined): Row[] {
  return (rows ?? []).map((r) => ({ name: String(r.name), total: Number(r.total) || 0 }))
}

/** Linha do tooltip: cor, rótulo e valor em reais. */
function MoneyLine({ color, label, value }: { color?: string; label: ReactNode; value: unknown }) {
  return (
    <div className="flex w-full items-center gap-2">
      <span className="size-2.5 shrink-0 rounded-[2px]" style={{ backgroundColor: color }} />
      <span className="text-muted-foreground">{label}</span>
      <span className="ml-auto pl-3 font-mono font-medium text-foreground tabular-nums">{formatBRL(Number(value))}</span>
    </div>
  )
}

function ChartCard({ title, extra, wide, children }: { title: string; extra?: string; wide?: boolean; children: ReactNode }) {
  return (
    <Card className={cn("min-w-0 gap-4 py-4.5", wide && "@2xl:col-span-2")}>
      <CardHeader className="px-5">
        <CardTitle className="text-xs font-bold tracking-wider uppercase">
          {title}
          {extra ? <span className="ml-1.5 font-medium tracking-normal text-muted-foreground normal-case">{extra}</span> : null}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-5">{children}</CardContent>
    </Card>
  )
}

/** Carregando → esqueleto; sem vendas → aviso; senão o gráfico. */
function ChartBody({ rows, chart }: { rows: Row[] | null; chart: (rows: Row[]) => ReactNode }) {
  if (rows === null) return <Skeleton className="h-[260px] w-full" />
  if (rows.length === 0) {
    return <p className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">Nenhuma venda registrada.</p>
  }
  return chart(rows)
}

// O Text do Recharts mede as palavras num <span> com este estilo; precisa ser "12px" (um número
// não é aplicado ao span e a medida sai na fonte herdada, cortando rótulos que cabem).
const TICK_STYLE = { fontSize: "12px" }

/** Rótulo do eixo de categorias em uma linha, com reticências se não couber. */
function CategoryTickY({ x, y, payload, width }: YAxisTickContentProps & { width: number }) {
  return (
    <Text x={Number(x)} y={Number(y)} width={width} maxLines={1} textAnchor="end" verticalAnchor="middle" style={TICK_STYLE} className="fill-muted-foreground">
      {String(payload.value)}
    </Text>
  )
}

/** Rótulo do eixo X com quebra em até 2 linhas na largura da barra. */
function CategoryTickX({ x, y, payload, width, visibleTicksCount }: XAxisTickContentProps) {
  const band = Number(width) / Math.max(1, visibleTicksCount)
  return (
    <Text x={Number(x)} y={Number(y)} width={Math.max(40, band - 8)} maxLines={2} textAnchor="middle" verticalAnchor="start" style={TICK_STYLE} className="fill-muted-foreground">
      {String(payload.value)}
    </Text>
  )
}

/** Vendas por Produto — Top 10: barras horizontais. */
function TopProductsChart({ rows }: { rows: Row[] }) {
  const isMobile = useIsMobile()
  const labelWidth = isMobile ? 104 : 180
  return (
    <ChartContainer config={barConfig} className={CHART_HEIGHT}>
      <BarChart accessibilityLayer data={rows} layout="vertical" margin={{ left: 0, right: 12, top: 0, bottom: 0 }}>
        <CartesianGrid horizontal={false} />
        <XAxis type="number" dataKey="total" tickLine={false} axisLine={false} tickMargin={6} tickFormatter={axisMoney(rows)} />
        <YAxis
          type="category"
          dataKey="name"
          width={labelWidth + 10}
          tickLine={false}
          axisLine={false}
          interval={0}
          tick={(props: YAxisTickContentProps) => <CategoryTickY {...props} width={labelWidth} />}
        />
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent formatter={(value, _name, item) => <MoneyLine color={item.color} label="Vendas" value={value} />} />
          }
        />
        <Bar dataKey="total" fill="var(--color-total)" radius={[0, 4, 4, 0]} maxBarSize={28} />
      </BarChart>
    </ChartContainer>
  )
}

/** Vendas por Subgrupo: barras verticais. */
function SubgroupChart({ rows }: { rows: Row[] }) {
  return (
    <ChartContainer config={barConfig} className={CHART_HEIGHT}>
      <BarChart accessibilityLayer data={rows} margin={{ left: 0, right: 0, top: 8, bottom: 0 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="name" tickLine={false} axisLine={false} interval={0} height={40} tick={CategoryTickX} />
        <YAxis tickLine={false} axisLine={false} width="auto" tickFormatter={axisMoney(rows)} />
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent formatter={(value, _name, item) => <MoneyLine color={item.color} label="Vendas" value={value} />} />
          }
        />
        <Bar dataKey="total" fill="var(--color-total)" radius={[4, 4, 0, 0]} maxBarSize={72} />
      </BarChart>
    </ChartContainer>
  )
}

type Slice = { key: string; name: string; total: number; fill: string; others?: Row[] }

/** Até 5 fatias com as 5 cores do tema; a partir da 6ª, as menores viram "Outros". */
function toSlices(rows: Row[]): { slices: Slice[]; config: ChartConfig } {
  const max = SLICE_COLORS.length
  const head = rows.length > max ? rows.slice(0, max - 1) : rows
  const rest = rows.length > max ? rows.slice(max - 1) : []
  const slices: Slice[] = head.map((r, i) => ({ key: `s${i}`, name: r.name, total: r.total, fill: `var(--color-s${i})` }))
  if (rest.length) {
    const i = slices.length
    slices.push({ key: `s${i}`, name: "Outros", total: rest.reduce((sum, r) => sum + r.total, 0), fill: `var(--color-s${i})`, others: rest })
  }
  const config: ChartConfig = {}
  slices.forEach((s, i) => (config[s.key] = { label: s.name, color: SLICE_COLORS[i] }))
  return { slices, config }
}

/** Fatia sob o cursor cresce 4px, como no original. */
function ActiveSlice(props: PieSectorDataItem) {
  return <Sector {...props} outerRadius={(props.outerRadius ?? 0) + 4} />
}

/** Rosca (Por Forma de Pagamento / Por Terminal de Caixa). */
function DoughnutChart({ rows }: { rows: Row[] }) {
  const { slices, config } = useMemo(() => toSlices(rows), [rows])
  return (
    <ChartContainer config={config} className={CHART_HEIGHT}>
      <PieChart accessibilityLayer>
        <ChartTooltip
          content={
            <ChartTooltipContent
              hideLabel
              nameKey="key"
              formatter={(value, _name, item) => {
                const slice = item.payload as Slice
                return (
                  <div className="flex w-full flex-col gap-1">
                    <MoneyLine color={item.payload?.fill ?? item.color} label={slice.name} value={value} />
                    {slice.others?.map((o) => (
                      <div key={o.name} className="flex gap-3 pl-4.5 text-muted-foreground">
                        <span>{o.name}</span>
                        <span className="ml-auto font-mono tabular-nums">{formatBRL(o.total)}</span>
                      </div>
                    ))}
                  </div>
                )
              }}
            />
          }
        />
        <Pie data={slices} dataKey="total" nameKey="key" startAngle={90} endAngle={-270} innerRadius="58%" outerRadius="90%" stroke="var(--card)" strokeWidth={2} activeShape={ActiveSlice} />
        <ChartLegend content={<ChartLegendContent nameKey="key" className="flex-wrap gap-x-4 gap-y-1.5 text-muted-foreground" />} />
      </PieChart>
    </ChartContainer>
  )
}

/** Os 4 gráficos do Dashboard, na mesma grade do original (largos em cima e embaixo). */
export function DashboardCharts({ data }: { data: Dashboard | undefined }) {
  const sets = useMemo(
    () =>
      data
        ? { products: toRows(data.top_products), payments: toRows(data.by_payment), terminals: toRows(data.by_terminal), subgroups: toRows(data.by_subgroup) }
        : null,
    [data]
  )
  return (
    <div className="@container">
      <div className="grid grid-cols-1 gap-4 @2xl:grid-cols-2">
        <ChartCard title="Vendas por Produto" extra="Top 10" wide>
          <ChartBody rows={sets?.products ?? null} chart={(r) => <TopProductsChart rows={r} />} />
        </ChartCard>
        <ChartCard title="Por Forma de Pagamento">
          <ChartBody rows={sets?.payments ?? null} chart={(r) => <DoughnutChart rows={r} />} />
        </ChartCard>
        <ChartCard title="Por Terminal de Caixa">
          <ChartBody rows={sets?.terminals ?? null} chart={(r) => <DoughnutChart rows={r} />} />
        </ChartCard>
        <ChartCard title="Vendas por Subgrupo" wide>
          <ChartBody rows={sets?.subgroups ?? null} chart={(r) => <SubgroupChart rows={r} />} />
        </ChartCard>
      </div>
    </div>
  )
}
