import { useState } from "react"
import { toast } from "sonner"

import { useConfirm } from "@/components/app/confirm-dialog"
import { useUpdateStore } from "@/data/master"
import type { StoreInfo } from "@/data/types"
import { ApiError } from "@/lib/api"
import { errorMessage } from "@/lib/errors"
import { formatDateBR } from "@/lib/format"

import { openStorePortal } from "./portal-handoff"
import { isExpired } from "./stores"

/** Mensagens de falha de conexão (sem citar serviços locais do sistema antigo). */
export const CONNECTION_ERROR = {
  load: "Erro ao conectar ao servidor. Verifique sua conexão com a internet.",
  license: "Erro de conexão ao salvar alteração de licença.",
  create: "Erro ao salvar novo cliente no servidor. Verifique sua conexão com a internet.",
  enter: "Erro ao selecionar filial. Verifique sua conexão com a internet.",
} as const

/** true quando a requisição nem chegou ao servidor (sem internet, DNS, CORS...). */
export function isConnectionFailure(error: unknown): boolean {
  if (error instanceof ApiError) return error.status === 0
  const e = error as { message?: string; name?: string } | null
  if (!e) return false
  if (e.name === "TypeError" || e.name === "AbortError") return true
  return /Failed to fetch|NetworkError|Load failed|fetch failed/i.test(e.message ?? "")
}

/** Avisa a falha com o texto do sistema: de servidor (com o detalhe) ou de conexão. */
export function notifyFailure(error: unknown, serverText: string, connectionText: string) {
  if (isConnectionFailure(error)) {
    toast.error(connectionText)
  } else {
    toast.error(serverText, { description: errorMessage(error) })
  }
}

type Action = "toggle" | "enter"

/** Liberar/bloquear licença e "Entrar" no portal de uma loja. */
export function useStoreActions() {
  const confirm = useConfirm()
  const update = useUpdateStore()
  // Ação em andamento por loja (duas lojas podem estar gravando ao mesmo tempo).
  const [busy, setBusyMap] = useState<Record<string, Action>>({})
  const setBusy = (storeId: string, action: Action | null) =>
    setBusyMap((prev) => {
      const next = { ...prev }
      if (action) next[storeId] = action
      else delete next[storeId]
      return next
    })

  async function toggleLicense(store: StoreInfo) {
    const activate = !store.active
    const ok = await confirm(
      `Deseja realmente ${activate ? "LIBERAR" : "BLOQUEAR"} a licença da loja "${store.name}"?`,
      { confirmLabel: activate ? "Liberar" : "Bloquear", destructive: !activate }
    )
    if (!ok) return
    setBusy(store.id, "toggle")
    try {
      // Reenvia o limite atual: sem ele, master_update_store grava 1
      // (greatest(null, 1) = 1 no Postgres) e o limite da loja se perde.
      await update.mutateAsync({ storeId: store.id, active: activate, terminalsAllowed: store.terminalsAllowed })
    } catch (error) {
      notifyFailure(error, "Erro ao salvar alteração de licença.", CONNECTION_ERROR.license)
    } finally {
      setBusy(store.id, null)
    }
  }

  async function enterStore(store: StoreInfo) {
    if (!store.active) {
      toast.error(
        `Acesso Negado: A licença da loja "${store.name}" está BLOQUEADA. Ative a licença para poder acessar.`
      )
      return
    }
    if (isExpired(store)) {
      const ok = await confirm(
        `Atenção: A licença da loja "${store.name}" está EXPIRADA (${formatDateBR(store.expireDate)}).\nComo Administrador Master, você deseja continuar o acesso mesmo expirado?`,
        { confirmLabel: "Continuar" }
      )
      if (!ok) return
    }
    setBusy(store.id, "enter")
    try {
      await openStorePortal(store.id)
      // Segue "ocupado" até o navegador abrir o portal.
    } catch (error) {
      notifyFailure(error, "Falha do servidor ao alternar para a loja selecionada.", CONNECTION_ERROR.enter)
      setBusy(store.id, null)
    }
  }

  return {
    toggleLicense,
    enterStore,
    isBusy: (storeId: string, action: Action) => busy[storeId] === action,
  }
}
