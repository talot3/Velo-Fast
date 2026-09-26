/**
 * Registros por módulo do portal (tabela store_records) e documentos
 * únicos (tabela store_documents).
 *
 * Coleções usadas pelo portal (nomes fixos — não invente outros sem
 * necessidade):
 *   plano_contas, centros_custo, contas_financeiras, lancamentos, borderos,
 *   cargos, dre_lines, compliance_denuncias, compliance_fornecedores,
 *   compliance_treinamentos, skills_colaboradores, skills_capacitacao,
 *   skills_pipeline
 * Documentos: swot, action_plan
 *
 * Dados de exemplo ("seed"): quando a coleção está vazia, as telas mostram
 * os dados de exemplo do sistema antigo sem gravá-los. Na primeira gravação
 * os exemplos são gravados junto, para não sumirem.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import type { Json } from "@/data/database.types"
import { useStoreId } from "@/lib/auth"
import { supabase } from "@/lib/supabase"

export type RecordCollection =
  | "plano_contas"
  | "centros_custo"
  | "contas_financeiras"
  | "lancamentos"
  | "borderos"
  | "cargos"
  | "dre_lines"
  | "compliance_denuncias"
  | "compliance_fornecedores"
  | "compliance_treinamentos"
  | "skills_colaboradores"
  | "skills_capacitacao"
  | "skills_pipeline"

export type DocumentKey = "swot" | "action_plan"

type WithId = { id: string | number }

const recordsKey = (storeId: string, collection: string) => ["store_records", storeId, collection] as const

type RecordsResult<T> = { items: T[]; isSeed: boolean }

async function fetchRecords<T extends WithId>(storeId: string, collection: RecordCollection): Promise<T[]> {
  const { data, error } = await supabase()
    .from("store_records")
    .select("id, data, created_at")
    .eq("store_id", storeId)
    .eq("collection", collection)
    .order("created_at", { ascending: true })
  if (error) throw error
  return data.map((r) => {
    const value = (r.data ?? {}) as Record<string, unknown>
    // O id original (número no sistema antigo) fica dentro de data.
    return { ...value, id: value.id ?? r.id } as T
  })
}

/** Lista uma coleção. Com `seed`, mostra os exemplos enquanto estiver vazia. */
export function useRecords<T extends WithId>(collection: RecordCollection, seed?: T[]) {
  const storeId = useStoreId()
  return useQuery<RecordsResult<T>>({
    queryKey: recordsKey(storeId, collection),
    queryFn: async () => {
      const items = await fetchRecords<T>(storeId, collection)
      if (items.length === 0 && seed && seed.length > 0) return { items: seed, isSeed: true }
      return { items, isSeed: false }
    },
  })
}

function toRow(storeId: string, collection: RecordCollection, item: WithId) {
  return {
    store_id: storeId,
    collection,
    id: String(item.id),
    data: item as unknown as NonNullable<Json>,
  }
}

/** Grava (cria/atualiza) um ou vários registros. */
export function useSaveRecords<T extends WithId>(collection: RecordCollection) {
  const storeId = useStoreId()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (items: T | T[]) => {
      const list = Array.isArray(items) ? items : [items]
      const cached = qc.getQueryData<RecordsResult<T>>(recordsKey(storeId, collection))
      const rows = new Map<string, ReturnType<typeof toRow>>()
      if (cached?.isSeed) {
        for (const s of cached.items) rows.set(String(s.id), toRow(storeId, collection, s))
      }
      for (const item of list) rows.set(String(item.id), toRow(storeId, collection, item))
      if (rows.size === 0) return
      const { error } = await supabase()
        .from("store_records")
        .upsert([...rows.values()], { onConflict: "store_id,collection,id", defaultToNull: false })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: recordsKey(storeId, collection) }),
  })
}

/** Exclui registros pelo id. */
export function useRemoveRecords(collection: RecordCollection) {
  const storeId = useStoreId()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (ids: (string | number) | (string | number)[]) => {
      const list = (Array.isArray(ids) ? ids : [ids]).map(String)
      const cached = qc.getQueryData<RecordsResult<WithId>>(recordsKey(storeId, collection))
      if (cached?.isSeed) {
        // Exclusão de um exemplo: grava os demais exemplos para não voltarem.
        const keep = cached.items.filter((s) => !list.includes(String(s.id)))
        if (keep.length > 0) {
          const { error } = await supabase()
            .from("store_records")
            .upsert(keep.map((s) => toRow(storeId, collection, s)), { onConflict: "store_id,collection,id", defaultToNull: false })
          if (error) throw error
        }
        return
      }
      const { error } = await supabase()
        .from("store_records")
        .delete()
        .eq("store_id", storeId)
        .eq("collection", collection)
        .in("id", list)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: recordsKey(storeId, collection) }),
  })
}

/** Id numérico novo, como o sistema antigo (Date.now), sem colisão local. */
let lastNumericId = 0
export function newNumericId(): number {
  const now = Date.now()
  lastNumericId = now > lastNumericId ? now : lastNumericId + 1
  return lastNumericId
}

// ─── Documentos únicos (estado de uma tela inteira) ─────────────────
const documentKey = (storeId: string, key: DocumentKey) => ["store_documents", storeId, key] as const

export function useDocument<T>(key: DocumentKey, defaults: T) {
  const storeId = useStoreId()
  return useQuery({
    queryKey: documentKey(storeId, key),
    queryFn: async () => {
      const { data, error } = await supabase()
        .from("store_documents")
        .select("data, version")
        .eq("store_id", storeId)
        .eq("key", key)
        .maybeSingle()
      if (error) throw error
      return { value: (data?.data as T | undefined) ?? defaults, isDefault: !data, version: data?.version ?? 0 }
    },
  })
}

export function useSaveDocument<T>(key: DocumentKey) {
  const storeId = useStoreId()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (value: T) => {
      const { error } = await supabase()
        .from("store_documents")
        .upsert({ store_id: storeId, key, data: value as unknown as NonNullable<Json> }, { onConflict: "store_id,key" })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: documentKey(storeId, key) }),
  })
}
