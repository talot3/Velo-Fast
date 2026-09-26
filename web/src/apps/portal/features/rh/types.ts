/**
 * Formatos dos registros de RH (Compliance e Gestão de Skills), iguais aos
 * do sistema antigo (portal/app.js) — os nomes dos campos são mantidos.
 */

export type DenunciaStatus = "Em Análise" | "Mitigado" | "Resolvido"
export type Prioridade = "Baixa" | "Média" | "Alta" | "Crítica"

/** Relato do Canal de Denúncias (coleção compliance_denuncias). */
export type Denuncia = {
  id: string
  tipo: string
  /** "YYYY-MM-DD" */
  data: string
  status: DenunciaStatus
  descricao: string
  prioridade: Prioridade
  responsavel: string
}

export type TipoHomologacao = "Fiscal/Trabalhista" | "LGPD/Segurança" | "Reputacional"
export type Risco = "Baixo" | "Médio" | "Alto"
export type StatusCertificacao = "Certificado" | "Pendente" | "Rejeitado"

/** Análise de Due Diligence de terceiros (coleção compliance_fornecedores). */
export type DueDiligence = {
  id: number
  fornecedor: string
  tipo: TipoHomologacao
  risco: Risco
  status: StatusCertificacao
  analista: string
  /** "YYYY-MM-DD" */
  dataAnalise: string
}

/** Treinamento obrigatório (coleção compliance_treinamentos, só leitura). */
export type Treinamento = {
  id: number
  nome: string
  /** % de conclusão */
  concluido: number
  /** nome do ícone lucide (ex.: "shield") */
  icone: string
  cor: string
  duracao: string
}

/** Colaborador da matriz de competências (coleção skills_colaboradores, só leitura). */
export type Colaborador = {
  id: number
  nome: string
  depto: string
  cargo: string
  hardSkills: string[]
  softSkills: string[]
  /** Big Five, 0-100: Extroversão, Conscienciosidade, Estabilidade Emocional, Amabilidade, Abertura */
  pontuacoes: number[]
}

export type TrilhaStatus = "Planejado" | "Em Andamento" | "Concluído"

/** Trilha do Plano de Capacitação (coleção skills_capacitacao). */
export type Trilha = {
  id: number
  nome: string
  publico: string
  skill: string
  progresso: number
  status: TrilhaStatus
}

export type Estagio = "mapeamento" | "avaliacao" | "mentoria" | "pronto"

/** Talento do pipeline de sucessão (coleção skills_pipeline, só leitura). */
export type Talento = {
  id: number
  nome: string
  cargo: string
  skill: string
  estagio: Estagio
  avatar: string
}
