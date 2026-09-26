/**
 * RH › Gestão de Skills (portal/app.js:10305-11400): cabeçalho, 4
 * indicadores, Matriz de Competências Atuais (com o painel "Diagnóstico
 * Científico"), Plano de Capacitação & Upskilling e Pipeline de Talentos —
 * nessa ordem, como no sistema antigo.
 */
import { useMemo } from "react"
import { AwardIcon, SparklesIcon, TriangleAlertIcon, UsersRoundIcon } from "lucide-react"

import { PageHeader } from "@/components/app/page-header"
import { formatPercent } from "@/lib/format"

import { useCapacitacao, useColaboradores, usePipeline } from "../features/rh/data"
import { RhKpiCard, RhKpiGrid, Tag } from "../features/rh/kit"
import { skillsKpis } from "../features/rh/logic"
import { CapacitacaoPanel, MatrizPanel, PipelineSection } from "../features/rh/skills-sections"

export default function SkillsPage() {
  const colaboradores = useColaboradores()
  const capacitacao = useCapacitacao()
  const pipeline = usePipeline()
  const kpis = useMemo(
    () => skillsKpis(colaboradores.data?.items ?? [], capacitacao.data?.items ?? [], pipeline.data?.items ?? []),
    [colaboradores.data, capacitacao.data, pipeline.data]
  )

  return (
    <div className="flex flex-col gap-7">
      <PageHeader
        title="Mapeamento Científico de Competências & Skills"
        subtitle="Análise baseada no Modelo dos Big Five, Capacidades Dinâmicas e Soft Skills da Indústria 4.0"
        actions={
          <>
            <Tag tone="info">
              <AwardIcon aria-hidden />
              Big Five Homologado
            </Tag>
            <Tag tone="neutral">Renovação de Capacidades</Tag>
          </>
        }
      />

      <RhKpiGrid>
        <RhKpiCard
          title="Índice de Soft Skills"
          icon={AwardIcon}
          iconTone="info"
          valueTone="info"
          value={colaboradores.isError ? "—" : formatPercent(kpis.indiceSoftSkills, 1)}
          sub="Prontidão comportamental média"
          loading={colaboradores.isPending}
        />
        <RhKpiCard
          title="Liderança Criativa"
          icon={SparklesIcon}
          iconTone="pink"
          valueTone="pink"
          value={colaboradores.isError ? "—" : kpis.liderancaCriativa === null ? "80%" : formatPercent(kpis.liderancaCriativa, 1)}
          sub="Fomento e suporte à inovação"
          loading={colaboradores.isPending}
        />
        <RhKpiCard
          title="Skill Gaps Ativos"
          icon={TriangleAlertIcon}
          iconTone="warning"
          valueTone="warning"
          value={capacitacao.isError ? "—" : kpis.skillGaps}
          sub="Trilhas de upskilling pendentes"
          loading={capacitacao.isPending}
        />
        <RhKpiCard
          title="Banco de Talentos Pool"
          icon={UsersRoundIcon}
          iconTone="success"
          valueTone="success"
          value={pipeline.isError ? "—" : kpis.bancoTalentos}
          sub="Profissionais sendo lapidados"
          loading={pipeline.isPending}
        />
      </RhKpiGrid>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <MatrizPanel />
        <CapacitacaoPanel />
      </div>

      <PipelineSection />
    </div>
  )
}
