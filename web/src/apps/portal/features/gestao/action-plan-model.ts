/**
 * Plano de Ação e Cronograma Tático — estado e exemplo
 * (legacy/portal/app.js:8351-8618). Guardado no documento "action_plan".
 */
import type { PlanRow } from "./five-w2h-table"

export const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"] as const

export const MACROOBJETIVOS = [
  "Incremento de Ticket Médio",
  "Conversão de Leads",
  "Captação de Clientes",
  "Desenvolvimento e Manutenção (Retenção)",
] as const

export type ApStatus = "Em execução" | "Concluído" | "Atrasado"

/** Opções do seletor de status (valor gravado → rótulo). */
export const STATUS_OPTIONS: { value: ApStatus; label: string }[] = [
  { value: "Em execução", label: "Em Execução" },
  { value: "Concluído", label: "Concluído" },
  { value: "Atrasado", label: "Atrasado" },
]

export const KPI_OPTIONS = ["Taxa de Conversão", "ROI", "LTV", "CAC", "NPS", "Burn Rate"] as const

export type ApAcao = PlanRow & { kpi: string }

export type ActionPlanState = {
  macroobjetivo: string
  status: ApStatus
  mesAtivo: string
  notasDiagnostico: string
  sazonais: Record<string, { experiencia: string; campanha: string }>
  acoes: Record<string, ApAcao[]>
}

/** Ativações quando o mês não tem nada mapeado. */
export const SAZONAL_VAZIO = { experiencia: "Nenhuma ativação mapeada", campanha: "Sem campanha especial" }

export function actionPlanSeed(): ActionPlanState {
  return {
    macroobjetivo: "Incremento de Ticket Médio",
    status: "Em execução",
    mesAtivo: "Maio",
    notasDiagnostico:
      "• Treinamento da equipe comercial pendente de aplicação prática nos caixas.\n• Baixo reforço de marca nos pontos de contato secundários.\n• Ruído detectado nas auditorias de campo no checkout mobile.",
    sazonais: {
      Janeiro: { experiencia: "Resoluções de Ano Novo (Brindes)", campanha: "Liquidação Geral de Verão" },
      Fevereiro: { experiencia: "Esquenta de Carnaval (Acessórios)", campanha: "Volta às Aulas Especiais" },
      Março: { experiencia: "Dia do Consumidor (Mimos VIP)", campanha: "Lançamento da Coleção de Outono" },
      Abril: { experiencia: "Estações de Páscoa (Brindes)", campanha: "Semana Especial de Páscoa" },
      Maio: { experiencia: "Estação de Fotos & Flores (Mães)", campanha: "Campanha Integrada Dia das Mães" },
      Junho: { experiencia: "Cabines de Fotos do Amor", campanha: "Semana dos Namorados" },
      Julho: { experiencia: "Cacau Quente Cortesia no Caixa", campanha: "Grandes Liquidações de Inverno" },
      Agosto: { experiencia: "Estação de Gravação e Brindes (Pais)", campanha: "Especial Dia dos Pais" },
      Setembro: { experiencia: "Semana da Pátria (Decoração)", campanha: "Semanas da Beleza / Boti Promo" },
      Outubro: { experiencia: "Doce ou Travessura (Brinquedos)", campanha: "Semana das Crianças" },
      Novembro: { experiencia: "Checkouts Express e Brindes", campanha: "Novembro Black / Black Friday" },
      Dezembro: { experiencia: "Visita de Papai Noel & Embrulhos", campanha: "Natal e Grandes Festas" },
    },
    acoes: {
      Maio: [
        {
          id: 1,
          oQue: "Treinar a equipe de atendimento em Omnichannel",
          porQue: "Superar o gap de treinamento e elevar a conversão física",
          onde: "Sala de Convenções e Plataforma EAD",
          quem: "Gerência Comercial",
          quando: "2026-05-15",
          como: "Workshop prático com simulações de vendas e roleplay",
          quanto: 2500,
          kpi: "Taxa de Conversão",
        },
        {
          id: 2,
          oQue: "Instalar displays aromáticos na entrada da loja física",
          porQue: "Reforçar a identidade de marca e engajamento sensorial",
          onde: "Entrada e provadores",
          quem: "Visual Merchandising",
          quando: "2026-05-10",
          como: "Instalação de difusores automáticos programados",
          quanto: 800,
          kpi: "ROI",
        },
      ],
      Junho: [
        {
          id: 3,
          oQue: "Criar kits de presentes combinados para o Dia dos Namorados",
          porQue: "Elevar o ticket médio induzindo cross-selling",
          onde: "Área de caixas e gôndolas promocionais",
          quem: "Equipe de Produto",
          quando: "2026-06-05",
          como: "Montagem de caixas exclusivas com descontos progressivos nos combos",
          quanto: 1500,
          kpi: "LTV",
        },
      ],
      Novembro: [
        {
          id: 4,
          oQue: "Configurar hotsite exclusivo de Black Friday com contagem regressiva",
          porQue: "Acelerar a conversão de leads frios com urgência visual",
          onde: "Ambiente Web",
          quem: "TI & Marketing Digital",
          quando: "2026-11-20",
          como: "Landing page SaaS otimizada e integrada ao banco de dados",
          quanto: 4500,
          kpi: "CAC",
        },
      ],
    },
  }
}

const str = (v: unknown) => (typeof v === "string" ? v : v === null || v === undefined ? "" : String(v))
const num = (v: unknown) => {
  const n = typeof v === "number" ? v : Number(v)
  return Number.isFinite(n) ? n : 0
}

/** Garante o formato do documento gravado (campos ausentes voltam ao exemplo/vazio). */
export function normalizeActionPlan(value: ActionPlanState): ActionPlanState {
  const v = (value ?? {}) as Partial<ActionPlanState>
  const seed = actionPlanSeed()
  const acoes: Record<string, ApAcao[]> = {}
  if (v.acoes && typeof v.acoes === "object") {
    for (const [mes, list] of Object.entries(v.acoes)) {
      if (!Array.isArray(list)) continue
      acoes[mes] = list.map((a) => ({
        id: num(a.id),
        oQue: str(a.oQue),
        porQue: str(a.porQue),
        onde: str(a.onde),
        quem: str(a.quem),
        quando: str(a.quando),
        como: str(a.como),
        quanto: num(a.quanto),
        kpi: str(a.kpi),
      }))
    }
  }
  const status = STATUS_OPTIONS.some((o) => o.value === v.status) ? (v.status as ApStatus) : seed.status
  return {
    macroobjetivo: typeof v.macroobjetivo === "string" ? v.macroobjetivo : seed.macroobjetivo,
    status,
    mesAtivo: typeof v.mesAtivo === "string" && v.mesAtivo ? v.mesAtivo : seed.mesAtivo,
    notasDiagnostico: typeof v.notasDiagnostico === "string" ? v.notasDiagnostico : seed.notasDiagnostico,
    sazonais: v.sazonais && typeof v.sazonais === "object" ? v.sazonais : seed.sazonais,
    acoes,
  }
}

/** Próximo id: maior id de todos os meses + 1. */
export function nextAcaoId(s: ActionPlanState): number {
  let max = 0
  for (const list of Object.values(s.acoes)) for (const a of list) if (a.id > max) max = a.id
  return max + 1
}
