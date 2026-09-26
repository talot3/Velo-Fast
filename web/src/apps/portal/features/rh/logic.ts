/**
 * Regras das telas de RH (cálculos dos indicadores, filtros e ordenação),
 * iguais às do sistema antigo (portal/app.js:9884-10081 e 10992-11207).
 */
import type { Colaborador, Denuncia, DueDiligence, Talento, Treinamento, Trilha } from "./types"

/** Valor dos filtros de seleção que mostra tudo. */
export const TODOS = "Todos"

const lower = (s: unknown) => String(s ?? "").toLowerCase()
const byNumericId = <T extends { id: number | string }>(a: T, b: T) => Number(a.id) - Number(b.id)

/** Ordem de cadastro (ids numéricos crescentes), como a lista do sistema antigo. */
export function sortById<T extends { id: number | string }>(items: T[]): T[] {
  return [...items].sort(byNumericId)
}

// ─── Compliance ─────────────────────────────────────────────────────

export function complianceKpis(denuncias: Denuncia[], fornecedores: DueDiligence[], treinamentos: Treinamento[]) {
  const emAberto = denuncias.filter((d) => d.status === "Em Análise").length
  const totalConcluido = treinamentos.reduce((acc, t) => acc + (Number(t.concluido) || 0), 0)
  const mediaTreinamentos = treinamentos.length > 0 ? totalConcluido / treinamentos.length : 0
  const certificados = fornecedores.filter((f) => f.status === "Certificado").length
  const homologadosPct = fornecedores.length > 0 ? Math.round((certificados / fornecedores.length) * 100) : 100
  return { emAberto, mediaTreinamentos, homologadosPct }
}

/** Busca por ID, descrição ou tipo + status; mais recentes (ID maior) primeiro. */
export function filtrarDenuncias(items: Denuncia[], busca: string, status: string): Denuncia[] {
  const q = busca.toLowerCase().trim()
  return items
    .filter((d) => {
      const matchesQuery = lower(d.id).includes(q) || lower(d.descricao).includes(q) || lower(d.tipo).includes(q)
      return matchesQuery && (status === TODOS || d.status === status)
    })
    .sort((a, b) => String(b.id).localeCompare(String(a.id)))
}

/** Busca por fornecedor ou tipo de análise + nível de risco. */
export function filtrarFornecedores(items: DueDiligence[], busca: string, risco: string): DueDiligence[] {
  const q = busca.toLowerCase().trim()
  return sortById(items).filter((f) => {
    const matchesQuery = lower(f.fornecedor).includes(q) || lower(f.tipo).includes(q)
    return matchesQuery && (risco === TODOS || f.risco === risco)
  })
}

// ─── Gestão de Skills ───────────────────────────────────────────────

export const NIVEIS = ["Júnior", "Pleno", "Sênior", "Especialista"] as const
export type Nivel = (typeof NIVEIS)[number]

/** Nível exibido na matriz, deduzido do texto do cargo. */
export function nivelGeral(cargo: string): Nivel {
  const c = String(cargo ?? "")
  if (c.includes("Jr") || c.includes("Júnior")) return "Júnior"
  if (c.includes("Sênior") || c.includes("Sr")) return "Sênior"
  if (c.includes("Principal")) return "Especialista"
  return "Pleno"
}

/** Iniciais do avatar: primeira letra das duas primeiras palavras. */
export function iniciais(nome: string): string {
  return String(nome ?? "")
    .split(/\s+/)
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

const soma = (valores: number[]) => valores.reduce((x, y) => x + (Number(y) || 0), 0)

export function skillsKpis(colaboradores: Colaborador[], trilhas: Trilha[], pipeline: Talento[]) {
  // Índice de Soft Skills: média das médias Big Five de cada colaborador.
  const totalPontos = colaboradores.reduce((acc, c) => acc + soma(c.pontuacoes ?? []) / 5, 0)
  const indiceSoftSkills = colaboradores.length > 0 ? totalPontos / colaboradores.length : 0
  // Liderança Criativa: média de (Abertura + Extroversão) / 2 entre os líderes.
  const lideres = colaboradores.filter((c) => {
    const cargo = String(c.cargo ?? "")
    return cargo.includes("Supervisor") || cargo.includes("Principal") || cargo.includes("Sr")
  })
  const totalLideranca = lideres.reduce((acc, c) => acc + ((Number(c.pontuacoes?.[4]) || 0) + (Number(c.pontuacoes?.[0]) || 0)) / 2, 0)
  const liderancaCriativa = lideres.length > 0 ? totalLideranca / lideres.length : null
  const skillGaps = trilhas.filter((t) => t.status !== "Concluído").length
  return { indiceSoftSkills, liderancaCriativa, skillGaps, bancoTalentos: pipeline.length }
}

/** Busca por nome, departamento ou cargo + nível (o mesmo nível exibido na coluna "Nível"). */
export function filtrarColaboradores(items: Colaborador[], busca: string, nivel: string): Colaborador[] {
  const q = busca.toLowerCase().trim()
  return sortById(items).filter((c) => {
    const matchesQuery = lower(c.nome).includes(q) || lower(c.depto).includes(q) || lower(c.cargo).includes(q)
    return matchesQuery && (nivel === TODOS || nivelGeral(c.cargo) === nivel)
  })
}

/** Busca por trilha, público ou skill + status. */
export function filtrarTrilhas(items: Trilha[], busca: string, status: string): Trilha[] {
  const q = busca.toLowerCase().trim()
  return sortById(items).filter((t) => {
    const matchesQuery = lower(t.nome).includes(q) || lower(t.publico).includes(q) || lower(t.skill).includes(q)
    return matchesQuery && (status === TODOS || t.status === status)
  })
}
