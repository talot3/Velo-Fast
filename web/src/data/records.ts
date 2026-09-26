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
 * Dados de exemplo ("seed"): enquanto a coleção nunca foi usada, as telas
 * mostram os dados de exemplo do sistema antigo sem gravá-los. Na primeira
 * gravação ou exclusão os exemplos são gravados junto (para não sumirem) e a
 * coleção ganha uma linha-marcador ("__init__"): a partir daí, lista vazia é
 * vazia de verdade — excluir tudo não traz os exemplos de volta (como na v1).
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

/** Id da linha-marcador "coleção já usada" (nunca aparece nas telas). */
const INIT_ID = "__init__"

type RecordsResult<T> = {
  items: T[]
  isSeed: boolean
  /** A linha-marcador já existe no banco. */
  marked?: boolean
}

async function fetchRecords<T extends WithId>(
  storeId: string,
  collection: RecordCollection
): Promise<{ items: T[]; marked: boolean }> {
  const { data, error } = await supabase()
    .from("store_records")
    .select("id, data, created_at")
    .eq("store_id", storeId)
    .eq("collection", collection)
    .order("created_at", { ascending: true })
  if (error) throw error
  let marked = false
  const items: T[] = []
  for (const r of data) {
    if (r.id === INIT_ID) {
      marked = true
      continue
    }
    const value = (r.data ?? {}) as Record<string, unknown>
    // O id original (número no sistema antigo) fica dentro de data.
    items.push({ ...value, id: value.id ?? r.id } as T)
  }
  return { items, marked }
}

/** Lista uma coleção. Com `seed`, mostra os exemplos enquanto ela nunca foi usada. */
export function useRecords<T extends WithId>(collection: RecordCollection, seed?: T[]) {
  const storeId = useStoreId()
  return useQuery<RecordsResult<T>>({
    queryKey: recordsKey(storeId, collection),
    queryFn: async () => {
      const { items, marked } = await fetchRecords<T>(storeId, collection)
      if (items.length === 0 && !marked && seed && seed.length > 0) return { items: seed, isSeed: true, marked }
      return { items, isSeed: false, marked }
    },
  })
}

/**
 * Gravações de uma mesma coleção rodam uma de cada vez: cada uma parte do
 * resultado da anterior (duas edições rápidas sobre os exemplos não se
 * sobrescrevem).
 */
const writeQueues = new Map<string, Promise<unknown>>()
function inOrder<R>(queue: string, task: () => Promise<R>): Promise<R> {
  const run = (writeQueues.get(queue) ?? Promise.resolve()).catch(() => undefined).then(task)
  writeQueues.set(queue, run)
  return run
}

function markerRow(storeId: string, collection: RecordCollection) {
  return { store_id: storeId, collection, id: INIT_ID, data: { initialized: true } as NonNullable<Json> }
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
    mutationFn: (items: T | T[]) =>
      inOrder(`${storeId}/${collection}`, async () => {
        const list = Array.isArray(items) ? items : [items]
        const key = recordsKey(storeId, collection)
        const cached = qc.getQueryData<RecordsResult<T>>(key)
        const rows = new Map<string, ReturnType<typeof toRow>>()
        if (cached?.isSeed) {
          for (const s of cached.items) rows.set(String(s.id), toRow(storeId, collection, s))
        }
        for (const item of list) rows.set(String(item.id), toRow(storeId, collection, item))
        if (rows.size === 0) return
        if (!cached?.marked) rows.set(INIT_ID, markerRow(storeId, collection))
        const { error } = await supabase()
          .from("store_records")
          .upsert([...rows.values()], { onConflict: "store_id,collection,id", defaultToNull: false })
        if (error) throw error
        // O cache passa a refletir o que foi gravado (antes mesmo de recarregar
        // do banco): a próxima gravação não regrava os exemplos por cima.
        if (cached) {
          const byId = new Map(cached.items.map((i) => [String(i.id), i]))
          for (const item of list) byId.set(String(item.id), item)
          qc.setQueryData<RecordsResult<T>>(key, { items: [...byId.values()], isSeed: false, marked: true })
        }
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: recordsKey(storeId, collection) }),
  })
}

/** Exclui registros pelo id. */
export function useRemoveRecords(collection: RecordCollection) {
  const storeId = useStoreId()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (ids: (string | number) | (string | number)[]) =>
      inOrder(`${storeId}/${collection}`, async () => {
        const list = (Array.isArray(ids) ? ids : [ids]).map(String)
        const key = recordsKey(storeId, collection)
        const cached = qc.getQueryData<RecordsResult<WithId>>(key)
        const upsert = async (rows: ReturnType<typeof markerRow>[]) => {
          const { error } = await supabase()
            .from("store_records")
            .upsert(rows, { onConflict: "store_id,collection,id", defaultToNull: false })
          if (error) throw error
        }
        if (cached?.isSeed) {
          // Exclusão de um exemplo: grava os demais exemplos (e o marcador)
          // para não voltarem — mesmo que não sobre nenhum.
          const keep = cached.items.filter((s) => !list.includes(String(s.id)))
          await upsert([...keep.map((s) => toRow(storeId, collection, s)), markerRow(storeId, collection)])
        } else {
          const { error } = await supabase()
            .from("store_records")
            .delete()
            .eq("store_id", storeId)
            .eq("collection", collection)
            .in("id", list.filter((id) => id !== INIT_ID))
          if (error) throw error
          if (!cached?.marked) await upsert([markerRow(storeId, collection)])
        }
        if (cached) {
          const items = cached.items.filter((i) => !list.includes(String(i.id)))
          qc.setQueryData<RecordsResult<WithId>>(key, { items, isSeed: false, marked: true })
        }
      }),
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
