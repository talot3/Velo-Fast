/**
 * RH › Compliance (portal/app.js:9250-10299): cabeçalho, 4 indicadores,
 * Canal de Denúncias & Ouvidoria, Due Diligence de Terceiros e Trilha de
 * Conscientização & Capacitação — nessa ordem, como no sistema antigo.
 */
import { useMemo } from "react"
import { ClockIcon, MegaphoneIcon, ScaleIcon, ShieldCheckIcon, SquareCheckIcon } from "lucide-react"

import { PageHeader } from "@/components/app/page-header"
import { formatPercent } from "@/lib/format"

import { DenunciasPanel, DueDiligencePanel, TreinamentosSection } from "../features/rh/compliance-sections"
import { useDenuncias, useFornecedores, useTreinamentos } from "../features/rh/data"
import { RhKpiCard, RhKpiGrid, StatusPill } from "../features/rh/kit"
import { complianceKpis } from "../features/rh/logic"

export default function CompliancePage() {
  const denuncias = useDenuncias()
  const fornecedores = useFornecedores()
  const treinamentos = useTreinamentos()
  const kpis = useMemo(
    () => complianceKpis(denuncias.data?.items ?? [], fornecedores.data?.items ?? [], treinamentos.data?.items ?? []),
    [denuncias.data, fornecedores.data, treinamentos.data]
  )

  return (
    <div className="flex flex-col gap-7">
      <PageHeader
        title="Monitoramento de Integridade Corporativa"
        subtitle="Com base nos fundamentos do IBGC e no Decreto Federal nº 11.129/22 (Lei Anticorrupção)"
        actions={
          <>
            <StatusPill tone="success">
              <ShieldCheckIcon aria-hidden />
              Canal Seguro
            </StatusPill>
            <StatusPill tone="warning">Auditoria Ativa: 2026</StatusPill>
          </>
        }
      />

      <RhKpiGrid>
        <RhKpiCard
          title="Denúncias em Aberto"
          icon={MegaphoneIcon}
          iconTone="danger"
          valueTone="danger"
          value={denuncias.isError ? "—" : kpis.emAberto}
          sub="Requerendo investigação imediata"
          loading={denuncias.isPending}
        />
        <RhKpiCard
          title="Tempo de Investigação"
          icon={ClockIcon}
          iconTone="brand"
          value={
            <>
              14 <span className="text-sm font-bold tracking-normal text-muted-foreground">Dias</span>
            </>
          }
          sub="Ciclo médio de resolução (Meta: <20d)"
        />
        <RhKpiCard
          title="Adesão ao Código de Conduta"
          icon={SquareCheckIcon}
          iconTone="success"
          valueTone="success"
          value={treinamentos.isError ? "—" : formatPercent(kpis.mediaTreinamentos, 1)}
          sub="Assinaturas e treinamentos da equipe"
          loading={treinamentos.isPending}
        />
        <RhKpiCard
          title="Parceiros Homologados"
          icon={ScaleIcon}
          iconTone="warning"
          valueTone="warning"
          value={fornecedores.isError ? "—" : `${kpis.homologadosPct}%`}
          sub="Due Diligence sem restrições críticas"
          loading={fornecedores.isPending}
        />
      </RhKpiGrid>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <DenunciasPanel />
        <DueDiligencePanel />
      </div>

      <TreinamentosSection />
    </div>
  )
}
