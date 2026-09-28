import { AwardIcon, BanIcon, ShieldAlertIcon, TicketIcon, VaultIcon, WalletIcon, type LucideIcon } from "lucide-react"

import { Skeleton } from "@/components/ui/skeleton"
import type { Dashboard } from "@/data/reports"
import { formatBRL } from "@/lib/format"

import { KpiStamp, RichKpiCard, RichKpiTitle, RichKpiValue, type ReportTone } from "../gestao/report-ui"

type KpiKey = "faturamento_bruto" | "valor_cancelado" | "faturamento_liquido" | "tickets_validos" | "tickets_cancelados" | "ticket_medio"

type Kpi = {
  key: KpiKey
  title: string
  money: boolean
  tone: ReportTone
  icon: LucideIcon
  /** Classes extras do carimbo (os de tom neutro ficam em cinza, como no original). */
  stamp?: string
}

// Mesmos 6 indicadores, na mesma ordem, cores e carimbos do Dashboard anterior.
const KPIS: Kpi[] = [
  { key: "faturamento_bruto", title: "Faturamento Bruto", money: true, tone: "success", icon: AwardIcon },
  { key: "valor_cancelado", title: "Valor Cancelado", money: true, tone: "danger", icon: ShieldAlertIcon },
  { key: "faturamento_liquido", title: "Faturamento Líquido", money: true, tone: "info", icon: WalletIcon },
  { key: "tickets_validos", title: "Tickets Válidos", money: false, tone: "default", icon: TicketIcon, stamp: "rounded-sm text-muted-foreground" },
  { key: "tickets_cancelados", title: "Tickets Cancelados", money: false, tone: "danger", icon: BanIcon },
  { key: "ticket_medio", title: "Ticket Médio", money: true, tone: "default", icon: VaultIcon, stamp: "text-muted-foreground" },
]

const integer = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 })

/**
 * Tamanho dos valores: 26px como no original, reduzindo só o necessário para
 * o maior deles caber ao lado do carimbo (os totais de todo o período crescem
 * sem limite). Cada cartão é um container: 100cqi = largura útil, 40px ficam
 * para o carimbo e cada caractere ocupa ~0,53em nesta fonte.
 */
function fitFontSize(chars: number) {
  return `clamp(16px, calc((100cqi - 40px) / ${(Math.max(chars, 1) * 0.53).toFixed(2)}), 26px)`
}

function formatKpi(kpi: Kpi, data: Dashboard) {
  const value = Number(data[kpi.key]) || 0
  return kpi.money ? formatBRL(value) : integer.format(value)
}

export function DashboardKpis({ data }: { data: Dashboard | undefined }) {
  const texts = data ? KPIS.map((kpi) => formatKpi(kpi, data)) : null
  const fontSize = fitFontSize(Math.max(0, ...(texts ?? []).map((t) => t.length)))
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-4.5">
      {KPIS.map((kpi, i) => (
        <RichKpiCard key={kpi.key} className="@container">
          <RichKpiTitle>{kpi.title}</RichKpiTitle>
          {texts ? (
            <RichKpiValue tone={kpi.tone} className="pr-10 whitespace-nowrap" style={{ fontSize }}>
              {texts[i]}
            </RichKpiValue>
          ) : (
            <Skeleton className="h-[26px] w-3/5" />
          )}
          <KpiStamp icon={kpi.icon} tone={kpi.tone} className={kpi.stamp} />
        </RichKpiCard>
      ))}
    </div>
  )
}
