import { useDashboard } from "@/data/reports"

import { LoadError } from "../features/config/ui"
import { DashboardCharts } from "../features/dashboard/charts"
import { DashboardKpis } from "../features/dashboard/kpis"

/** Dashboard (Visão Geral): indicadores e gráficos de todo o período, calculados no banco. */
export default function DashboardPage() {
  const dashboard = useDashboard()
  if (dashboard.isError) return <LoadError error={dashboard.error} />
  return (
    <div className="flex flex-col gap-7">
      <DashboardKpis data={dashboard.data} />
      <DashboardCharts data={dashboard.data} />
    </div>
  )
}
