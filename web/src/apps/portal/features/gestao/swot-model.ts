/**
 * Matriz SWOT Dinâmica — estado, exemplo e regras do veredito
 * (legacy/portal/app.js:7345-7629). Guardado no documento "swot".
 */
import { todayBR } from "@/lib/format"

export type SwotFactor = { id: string; texto: string }

export type SwotPlanoItem = {
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

export type SwotQuadrant = "forcas" | "fraquezas" | "oportunidades" | "ameacas"

export type SwotState = {
  forcas: SwotFactor[]
  fraquezas: SwotFactor[]
  oportunidades: SwotFactor[]
  ameacas: SwotFactor[]
  /** "F1:O1" → 0 | 1 | 2 */
  correlacoes: Record<string, number>
  planoAcao: SwotPlanoItem[]
}

export const SWOT_PREFIX: Record<SwotQuadrant, string> = { forcas: "F", fraquezas: "FR", oportunidades: "O", ameacas: "A" }

/** Cenário de exemplo (o mesmo de "Reiniciar Cenário Exemplo"). */
export function swotSeed(): SwotState {
  return {
    forcas: [
      { id: "F1", texto: "Marca tradicional consolidada fisicamente na região" },
      { id: "F2", texto: "Equipe de vendas altamente treinada e consultiva" },
    ],
    fraquezas: [
      { id: "FR1", texto: "Presença digital incipiente e e-commerce lento" },
      { id: "FR2", texto: "Dependência de terceiros para logística local" },
    ],
    oportunidades: [
      { id: "O1", texto: "Crescimento acelerado na demanda de entregas rápidas" },
      { id: "O2", texto: "Adoção de canais de compras digitais por novos públicos" },
    ],
    ameacas: [
      { id: "A1", texto: "Entrada de grande marketplace com entrega no mesmo dia" },
      { id: "A2", texto: "Alta volatilidade no custo de frete e insumos" },
    ],
    correlacoes: {
      "F1:O1": 1, "F1:O2": 2, "F1:A1": 1, "F1:A2": 0,
      "F2:O1": 0, "F2:O2": 2, "F2:A1": 2, "F2:A2": 0,
      "FR1:O1": 2, "FR1:O2": 1, "FR1:A1": 2, "FR1:A2": 0,
      "FR2:O1": 2, "FR2:O2": 0, "FR2:A1": 1, "FR2:A2": 1,
    },
    planoAcao: [
      {
        id: 1,
        oQue: "Desenvolver nova plataforma de e-commerce integrada",
        porQue: "Superar a fraqueza de presença digital e capturar compras online",
        onde: "Ambiente online e servidores internos",
        quem: "Diretoria de Tecnologia e Agência Parceira",
        quando: "2026-07-30",
        como: "Contratação de plataforma SaaS integrada via API ao ERP",
        quanto: 15000,
      },
      {
        id: 2,
        oQue: "Treinar equipe e contratar motoboys dedicados",
        porQue: "Reduzir custos e acelerar prazos de entrega urbana",
        onde: "CD Urbano da Unidade Centro",
        quem: "Supervisor de Operações",
        quando: "2026-06-15",
        como: "Roteirizador integrado e equipe exclusiva com taxa fixa",
        quanto: 2500,
      },
    ],
  }
}

const str = (v: unknown) => (typeof v === "string" ? v : v === null || v === undefined ? "" : String(v))
const num = (v: unknown) => {
  const n = typeof v === "number" ? v : Number(v)
  return Number.isFinite(n) ? n : 0
}

function factors(v: unknown): SwotFactor[] {
  return Array.isArray(v) ? v.filter((f) => f && typeof f === "object").map((f) => ({ id: str(f.id), texto: str(f.texto) })) : []
}

/** Garante o formato do documento gravado (campos ausentes viram vazios). */
export function normalizeSwot(value: SwotState): SwotState {
  const v = (value ?? {}) as Partial<SwotState>
  const correlacoes: Record<string, number> = {}
  if (v.correlacoes && typeof v.correlacoes === "object") {
    for (const [k, n] of Object.entries(v.correlacoes)) correlacoes[k] = num(n)
  }
  return {
    forcas: factors(v.forcas),
    fraquezas: factors(v.fraquezas),
    oportunidades: factors(v.oportunidades),
    ameacas: factors(v.ameacas),
    correlacoes,
    planoAcao: Array.isArray(v.planoAcao)
      ? v.planoAcao.map((p) => ({
          id: num(p.id),
          oQue: str(p.oQue),
          porQue: str(p.porQue),
          onde: str(p.onde),
          quem: str(p.quem),
          quando: str(p.quando),
          como: str(p.como),
          quanto: num(p.quanto),
        }))
      : [],
  }
}

export type SwotVerdict = {
  FO: number
  FA: number
  DO: number
  DA: number
  veredito: "Crescimento" | "Desenvolvimento" | "Manutenção" | "Sobrevivência"
  state: "desenvolvimento" | "crescimento" | "manutencao" | "sobrevivencia"
  verdictText: string
}

const corr = (s: SwotState, a: string, b: string) => s.correlacoes[`${a}:${b}`] || 0

/** Somas dos quadrantes e posicionamento (getSwotVerdictData, app.js:7558-7598). */
export function getSwotVerdict(s: SwotState): SwotVerdict {
  const sum = (rows: SwotFactor[], cols: SwotFactor[]) => rows.reduce((acc, r) => acc + cols.reduce((a, c) => a + corr(s, r.id, c.id), 0), 0)
  const FO = sum(s.forcas, s.oportunidades) // Capacidade Ofensiva
  const FA = sum(s.forcas, s.ameacas) // Capacidade Defensiva
  const DO = sum(s.fraquezas, s.oportunidades) // Vulnerabilidades a Desenvolver
  const DA = sum(s.fraquezas, s.ameacas) // Sobrevivência Crítica
  const max = Math.max(FO, FA, DO, DA)
  const base = { FO, FA, DO, DA }
  if (max === 0) {
    return {
      ...base,
      veredito: "Desenvolvimento",
      state: "desenvolvimento",
      verdictText:
        "Aguardando preenchimento. Atribua notas de correlação nas células de interseção (0, 1 ou 2) para obter o veredito especializado da consultoria humana.",
    }
  }
  if (max === FO) {
    return {
      ...base,
      veredito: "Crescimento",
      state: "crescimento",
      verdictText:
        "Cenário estratégico de Crescimento. Suas Forças internas estão altamente alinhadas com as Oportunidades externas. A recomendação da consultoria é investir agressivamente em expansão comercial, novos mercados e escala.",
    }
  }
  if (max === DO) {
    return {
      ...base,
      veredito: "Desenvolvimento",
      state: "desenvolvimento",
      verdictText:
        "Cenário estratégico de Desenvolvimento. O mercado está gerando Oportunidades valiosas, porém as Fraquezas internas impedem seu aproveitamento pleno. A prioridade máxima é sanar essas falhas e desenvolver novas capacidades antes de expandir.",
    }
  }
  if (max === FA) {
    return {
      ...base,
      veredito: "Manutenção",
      state: "manutencao",
      verdictText:
        "Cenário estratégico de Manutenção. Suas Forças são importantes para blindar o negócio, mas o ambiente externo apresenta Ameaças severas. Foque em blindagem de clientes tradicionais, eficiência de processos e sustentabilidade financeira.",
    }
  }
  return {
    ...base,
    veredito: "Sobrevivência",
    state: "sobrevivencia",
    verdictText:
      "Cenário de alto risco de Sobrevivência. Suas Fraquezas críticas internas o deixam extremamente vulnerável a Ameaças do mercado (como a forte concorrência digital). Prioridade absoluta para desinvestimentos, cortes profundos e contingenciamento.",
  }
}

/** Novo fator com o próximo número do quadrante e correlações zeradas com o outro eixo. */
export function addSwotFactor(s: SwotState, type: SwotQuadrant): SwotState {
  const prefix = SWOT_PREFIX[type]
  const nextNum = s[type].reduce((max, item) => Math.max(max, parseInt(item.id.replace(prefix, ""), 10) || 0), 0) + 1
  const newId = `${prefix}${nextNum}`
  const correlacoes = { ...s.correlacoes }
  if (type === "forcas" || type === "fraquezas") {
    for (const o of s.oportunidades) correlacoes[`${newId}:${o.id}`] = 0
    for (const a of s.ameacas) correlacoes[`${newId}:${a.id}`] = 0
  } else {
    for (const f of s.forcas) correlacoes[`${f.id}:${newId}`] = 0
    for (const fr of s.fraquezas) correlacoes[`${fr.id}:${newId}`] = 0
  }
  return { ...s, [type]: [...s[type], { id: newId, texto: `Novo fator ${prefix}${nextNum}...` }], correlacoes }
}

/** Remove o fator e as correlações dele. */
export function removeSwotFactor(s: SwotState, type: SwotQuadrant, id: string): SwotState {
  const correlacoes: Record<string, number> = {}
  for (const [key, v] of Object.entries(s.correlacoes)) {
    const [a, b] = key.split(":")
    if (a !== id && b !== id) correlacoes[key] = v
  }
  return { ...s, [type]: s[type].filter((f) => f.id !== id), correlacoes }
}

/** Nova linha 5W2H com o verbo sugerido pelo veredito atual. */
export function addSwotPlano(s: SwotState): SwotState {
  const nextId = s.planoAcao.reduce((max, p) => Math.max(max, p.id), 0) + 1
  const { veredito } = getSwotVerdict(s)
  let verbo = "Desenvolver"
  if (veredito === "Crescimento") verbo = "Expandir"
  if (veredito === "Manutenção") verbo = "Otimizar"
  if (veredito === "Sobrevivência") verbo = "Mitigar"
  const item: SwotPlanoItem = { id: nextId, oQue: `${verbo} `, porQue: "", onde: "", quem: "", quando: todayBR(), como: "", quanto: 0 }
  return { ...s, planoAcao: [...s.planoAcao, item] }
}
