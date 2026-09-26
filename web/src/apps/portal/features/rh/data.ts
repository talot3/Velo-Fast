/**
 * Coleções de RH no Supabase (store_records), com os exemplos do sistema
 * antigo enquanto a coleção da loja estiver vazia.
 */
import { useRecords } from "@/data/records"

import { SEED_CAPACITACAO, SEED_COLABORADORES, SEED_DENUNCIAS, SEED_FORNECEDORES, SEED_PIPELINE, SEED_TREINAMENTOS } from "./seeds"
import type { Colaborador, Denuncia, DueDiligence, Talento, Treinamento, Trilha } from "./types"

export const useDenuncias = () => useRecords<Denuncia>("compliance_denuncias", SEED_DENUNCIAS)
export const useFornecedores = () => useRecords<DueDiligence>("compliance_fornecedores", SEED_FORNECEDORES)
export const useTreinamentos = () => useRecords<Treinamento>("compliance_treinamentos", SEED_TREINAMENTOS)
export const useColaboradores = () => useRecords<Colaborador>("skills_colaboradores", SEED_COLABORADORES)
export const useCapacitacao = () => useRecords<Trilha>("skills_capacitacao", SEED_CAPACITACAO)
export const usePipeline = () => useRecords<Talento>("skills_pipeline", SEED_PIPELINE)
