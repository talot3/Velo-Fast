/**
 * Dados de exemplo do sistema antigo (portal/app.js:9252-9276 e 10307-10331),
 * copiados sem alteração (inclusive os ids). Aparecem enquanto a coleção da
 * loja está vazia; a primeira gravação os persiste junto (ver data/records.ts).
 */
import type { Colaborador, Denuncia, DueDiligence, Talento, Treinamento, Trilha } from "./types"

export const SEED_DENUNCIAS: Denuncia[] = [
  { id: "#DEN-2026-01", tipo: "Trabalhista", data: "2026-05-10", status: "Resolvido", descricao: "Relato de jornada de trabalho excessiva e falta de registro de horas extras na Unidade Varejo Centro.", prioridade: "Média", responsavel: "Ana Paula (RH)" },
  { id: "#DEN-2026-02", tipo: "Conflito de Interesses", data: "2026-05-18", status: "Em Análise", descricao: "Fornecedor contratado para fornecimento de TI possui vínculos de parentesco com gerente de suprimentos.", prioridade: "Alta", responsavel: "Carlos Lima (Auditoria)" },
  { id: "#DEN-2026-03", tipo: "Segurança da Informação", data: "2026-05-22", status: "Mitigado", descricao: "Uso de chaves de acesso genéricas e compartilhamento de senhas do PDV master entre turnos.", prioridade: "Alta", responsavel: "Roberto Silva (TI)" },
  { id: "#DEN-2026-04", tipo: "Trabalhista", data: "2026-05-28", status: "Em Análise", descricao: "Denúncia confidencial relatando comportamento ríspido, humilhante e assédio verbal no setor de recebimento.", prioridade: "Crítica", responsavel: "Ana Paula (RH)" },
  { id: "#DEN-2026-05", tipo: "Ética e Conduta", data: "2026-05-29", status: "Resolvido", descricao: "Suposto desvio de materiais de embalagem descartados para uso comercial paralelo no entorno da loja.", prioridade: "Baixa", responsavel: "Carlos Lima (Auditoria)" },
]

export const SEED_FORNECEDORES: DueDiligence[] = [
  { id: 1, fornecedor: "Logística Express S.A.", tipo: "Fiscal/Trabalhista", risco: "Baixo", status: "Certificado", analista: "Carlos Lima", dataAnalise: "2026-04-12" },
  { id: 2, fornecedor: "Sistemas e Soluções Tech", tipo: "LGPD/Segurança", risco: "Médio", status: "Pendente", analista: "Roberto Silva", dataAnalise: "2026-05-02" },
  { id: 3, fornecedor: "Alimentos e Refeições Ltda", tipo: "Fiscal/Trabalhista", risco: "Alto", status: "Rejeitado", analista: "Carlos Lima", dataAnalise: "2026-05-15" },
  { id: 4, fornecedor: "Marketing Digital e Eventos", tipo: "Reputacional", risco: "Baixo", status: "Certificado", analista: "Ana Paula", dataAnalise: "2026-05-20" },
  { id: 5, fornecedor: "Segurança & Vigilância Velo", tipo: "LGPD/Segurança", risco: "Alto", status: "Certificado", analista: "Roberto Silva", dataAnalise: "2026-05-25" },
]

export const SEED_TREINAMENTOS: Treinamento[] = [
  { id: 1, nome: "Curso de LGPD e Proteção de Dados", concluido: 92, icone: "shield", cor: "#4f46e5", duracao: "4h" },
  { id: 2, nome: "Treinamento Antiasseio e Diversidade", concluido: 88, icone: "users-2", cor: "#db2777", duracao: "2h" },
  { id: 3, nome: "Código de Conduta & Integridade IBGC", concluido: 97, icone: "scale", cor: "#059669", duracao: "3h" },
  { id: 4, nome: "Segurança Física & Compliance Varejo", concluido: 74, icone: "alert-triangle", cor: "#ea580c", duracao: "1.5h" },
]

export const SEED_COLABORADORES: Colaborador[] = [
  { id: 1, nome: "Wagner Garcia", depto: "Comercial", cargo: "Supervisor de Vendas", hardSkills: ["BI / Analytics", "Gestão Comercial", "PDV Master"], softSkills: ["Adaptabilidade", "Resiliência", "Liderança"], pontuacoes: [85, 90, 78, 88, 92] },
  { id: 2, nome: "Ana Paula Souza", depto: "Recursos Humanos", cargo: "Business Partner Sr", hardSkills: ["Cargos & Salários", "Due Diligence Trabalhista", "Psicologia Org."], softSkills: ["Empatia", "Comunicação Assertiva", "Inteligência Emocional"], pontuacoes: [90, 95, 88, 96, 85] },
  { id: 3, nome: "Roberto Silva", depto: "Tecnologia", cargo: "Arquiteto de Sistemas", hardSkills: ["JavaScript / Node.js", "Segurança da Informação", "Bancos de Dados"], softSkills: ["Foco em Resultados", "Trabalho em Equipe", "Resolução de Problemas"], pontuacoes: [65, 92, 85, 75, 96] },
  { id: 4, nome: "Carlos Lima", depto: "Controladoria & Compliance", cargo: "Auditor Interno Sênior", hardSkills: ["Lei 11.129/22", "Normas IBGC", "Auditoria Fiscal"], softSkills: ["Atenção aos Detalhes", "Ética Profissional", "Pensamento Crítico"], pontuacoes: [70, 98, 92, 82, 80] },
  { id: 5, nome: "Juliana Mendes", depto: "Marketing & Criação", cargo: "Designer UI/UX Principal", hardSkills: ["Figma / Design Premium", "Criação de Identidade", "Pesquisa com Usuários"], softSkills: ["Criatividade Disruptiva", "Amabilidade", "Pensamento Lateral"], pontuacoes: [88, 85, 80, 92, 98] },
]

export const SEED_CAPACITACAO: Trilha[] = [
  { id: 1, nome: "Liderança Criativa e Inovação", publico: "Gerentes e Supervisores", skill: "Liderança Criativa", progresso: 95, status: "Concluído" },
  { id: 2, nome: "Comunicação Assertiva no Ponto de Venda", publico: "Frente de Caixa e Atendimento", skill: "Comunicação", progresso: 68, status: "Em Andamento" },
  { id: 3, nome: "Treinamento LGPD e Segurança da Informação", publico: "Toda a Organização", skill: "Segurança da Informação", progresso: 85, status: "Em Andamento" },
  { id: 4, nome: "Resolução de Problemas Complexos no Varejo", publico: "Líderes de Unidade e Compras", skill: "Pensamento Crítico", progresso: 100, status: "Concluído" },
  { id: 5, nome: "Workshop Capacidades Dinâmicas & Renovação", publico: "C-Level e Diretores", skill: "Adaptabilidade", progresso: 25, status: "Planejado" },
]

export const SEED_PIPELINE: Talento[] = [
  { id: 1, nome: "Felipe Rocha", cargo: "Analista de Vendas Jr", skill: "Comercial & Negociação", estagio: "mapeamento", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=100&q=80" },
  { id: 2, nome: "Mariana Costa", cargo: "Desenvolvedora Full Stack", skill: "JavaScript / SQL", estagio: "avaliacao", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=100&q=80" },
  { id: 3, nome: "Lucas Almeida", cargo: "Supervisor de Logística", skill: "Capacidades Dinâmicas", estagio: "mentoria", avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=100&q=80" },
  { id: 4, nome: "Sandra Pires", cargo: "Coordenadora Adjunta de RH", skill: "Liderança & Empatia", estagio: "pronto", avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=100&q=80" },
]
