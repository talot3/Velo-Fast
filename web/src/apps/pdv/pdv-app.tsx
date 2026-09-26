import { useCallback, useEffect, useRef, useState } from "react"
import { LogOutIcon, RefreshCwIcon, WifiOffIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { loadPdv, type PdvCatalog } from "@/data/pdv"
import { useAuth } from "@/lib/auth"
import { errorMessage } from "@/lib/errors"
import { listQueue, pendingCount } from "@/lib/offline-queue"
import { getTerminalId } from "@/lib/store-context"

import { SuprimentoDialog } from "./components/suprimento-dialog"
import { useConnection } from "./hooks/use-connection"
import { clearOrder, loadLocalSession, saveLocalSession, toLocalSession, type LocalSession } from "./lib/device-state"
import { notify } from "./lib/notify"
import { flushPending, syncNow } from "./lib/sync"
import { findTerminalFlex } from "./lib/terminal"
import { PdvScreen } from "./pdv-screen"

const CATALOG_REFRESH_MS = 5 * 60_000

type Ready = { catalog: PdvCatalog; terminalId: string }

/**
 * Qual caixa está aberto neste terminal. Com rede, vale o servidor (ou uma
 * abertura ainda na fila offline); sem rede, vale o que este aparelho sabe.
 */
async function resolveSession(storeId: string, terminalId: string, catalog: PdvCatalog): Promise<LocalSession | null> {
  const local = loadLocalSession(storeId, terminalId)
  if (catalog.offline) return local
  if (catalog.cashSession && catalog.cashSession.terminal_id === terminalId) {
    const server = toLocalSession(catalog.cashSession)
    saveLocalSession(storeId, terminalId, server)
    return server
  }
  if (local) {
    const queued = (await listQueue().catch(() => [])).some(
      (i) => !i.failed && i.op === "open_cash_session" && i.args.p_session_id === local.id
    )
    if (queued) return local
    saveLocalSession(storeId, terminalId, null)
  }
  return null
}

/** Caixa (PDV): carrega o catálogo, decide entre abertura de caixa e vendas, e mantém tudo atualizado. */
export function PdvApp() {
  const { profile, storeId, logout } = useAuth()
  const operator = profile?.username ?? ""
  const connection = useConnection()

  const [ready, setReady] = useState<Ready | null>(null)
  const [session, setSession] = useState<LocalSession | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [closed, setClosed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const sessionRef = useRef<LocalSession | null>(null)
  useEffect(() => {
    sessionRef.current = session
  }, [session])

  // ─── Carga inicial ────────────────────────────────────────────────
  useEffect(() => {
    if (!storeId || !operator) return
    let cancelled = false
    ;(async () => {
      try {
        const rawTid = getTerminalId()
        // Operações pendentes vão antes (o caixa aberto offline precisa existir no servidor).
        if (navigator.onLine && (await pendingCount().catch(() => ({ pending: 0 }))).pending > 0) await flushPending(4000)
        let catalog = await loadPdv(storeId, rawTid)
        let terminalId = rawTid
        const terminal = findTerminalFlex(catalog.terminals, rawTid)
        if (terminal && terminal.id !== rawTid) {
          // ?tid=1 / nome do caixa → id cadastrado (vendas e impressora ficam no terminal certo).
          terminalId = terminal.id
          if (!catalog.offline) catalog = await loadPdv(storeId, terminalId)
        }
        const current = await resolveSession(storeId, terminalId, catalog)
        if (cancelled) return
        setError(null)
        setReady({ catalog, terminalId })
        setSession(current)
        if (current) notify(`Bem-vindo, ${operator.toUpperCase()}! Caixa já aberto.`)
      } catch (err) {
        if (!cancelled) setError(errorMessage(err, "Não foi possível carregar o caixa."))
      }
    })()
    return () => {
      cancelled = true
    }
  }, [storeId, operator, attempt])

  // Sem rede na abertura: tenta de novo quando a conexão voltar.
  useEffect(() => {
    if (!error) return
    const retry = () => setAttempt((a) => a + 1)
    window.addEventListener("online", retry)
    return () => window.removeEventListener("online", retry)
  }, [error])

  const terminalId = ready?.terminalId ?? null

  const adoptSession = useCallback(
    (server: LocalSession) => {
      if (!storeId || !terminalId) return
      saveLocalSession(storeId, terminalId, server)
      setSession(server)
    },
    [storeId, terminalId]
  )

  // ─── Catálogo sempre atualizado (preços, estoque) ─────────────────
  const refreshCatalog = useCallback(async (): Promise<PdvCatalog | null> => {
    if (!storeId || !terminalId || !navigator.onLine) return null
    try {
      const catalog = await loadPdv(storeId, terminalId)
      if (catalog.offline) return null
      setReady((r) => (r ? { ...r, catalog } : r))
      // Outro aparelho/fila abriu o caixa com outro id: segue o do servidor.
      const current = sessionRef.current
      if (catalog.cashSession && current && catalog.cashSession.id !== current.id) adoptSession(toLocalSession(catalog.cashSession))
      return catalog
    } catch {
      return null
    }
  }, [storeId, terminalId, adoptSession])

  const isReady = ready !== null
  useEffect(() => {
    if (!isReady) return
    const timer = setInterval(() => void refreshCatalog(), CATALOG_REFRESH_MS)
    const onOnline = () => void refreshCatalog()
    window.addEventListener("online", onOnline)
    return () => {
      clearInterval(timer)
      window.removeEventListener("online", onOnline)
    }
  }, [isReady, refreshCatalog])

  /** Antes do fechamento: envia a fila e confirma no servidor qual caixa está aberto. */
  const syncSession = useCallback(async (): Promise<LocalSession> => {
    await flushPending()
    const catalog = await refreshCatalog()
    if (catalog?.cashSession) {
      const server = toLocalSession(catalog.cashSession)
      if (sessionRef.current?.id !== server.id) adoptSession(server)
      return server
    }
    if (!sessionRef.current) throw new Error("Nenhum caixa aberto neste terminal.")
    return sessionRef.current
  }, [refreshCatalog, adoptSession])

  // ─── Fim de turno / saída ─────────────────────────────────────────
  const handleClosed = useCallback(() => {
    if (storeId && terminalId) {
      saveLocalSession(storeId, terminalId, null)
      clearOrder(storeId, terminalId)
    }
    setClosed(true)
    notify("🏁 Caixa encerrado com sucesso!")
    setTimeout(() => void logout(), 1800)
  }, [storeId, terminalId, logout])

  const handleLogout = useCallback(async () => {
    if (storeId && terminalId) clearOrder(storeId, terminalId)
    notify("Sessão encerrada. Caixa permanece aberto.")
    // Tenta mandar a fila antes de sair, sem prender o operador.
    await Promise.race([syncNow(), new Promise((resolve) => setTimeout(resolve, 1500))])
    await logout()
  }, [storeId, terminalId, logout])

  // ─── Telas ────────────────────────────────────────────────────────
  if (!storeId) return <BootError message="Nenhuma loja selecionada." onLogout={() => void logout()} />
  if (error && !ready) return <BootError message={error} onRetry={() => setAttempt((a) => a + 1)} onLogout={() => void logout()} />
  if (closed) return <div className="h-svh bg-background" />
  if (!ready) return <BootLoading withLayout={Boolean(loadLocalSession(storeId, getTerminalId()))} />

  if (!session) {
    return (
      <div className="h-svh bg-background">
        <SuprimentoDialog storeId={storeId} terminalId={ready.terminalId} operator={operator} onOpened={(s) => adoptSession(s)} />
      </div>
    )
  }

  return (
    <PdvScreen
      storeId={storeId}
      operator={operator}
      terminalId={ready.terminalId}
      catalog={ready.catalog}
      session={session}
      connection={connection}
      refreshCatalog={refreshCatalog}
      syncSession={syncSession}
      onClosed={handleClosed}
      onLogout={() => void handleLogout()}
    />
  )
}

function BootLoading({ withLayout }: { withLayout: boolean }) {
  if (!withLayout) {
    return (
      <div className="flex h-svh items-center justify-center bg-background">
        <Spinner className="size-6 text-primary" />
      </div>
    )
  }
  return (
    <div className="flex h-svh flex-col bg-background" aria-busy="true">
      <div className="h-[60px] shrink-0 border-b-2 border-primary bg-(--pdv-header) max-md:h-[46px]" />
      <div className="flex min-h-0 flex-1 max-md:flex-col">
        <div className="w-[360px] shrink-0 border-r border-border bg-card max-md:h-[50px] max-md:w-full" />
        <div className="grid flex-1 auto-rows-min grid-cols-[repeat(auto-fill,minmax(150px,1fr))] content-start gap-4 p-5 max-md:grid-cols-[repeat(auto-fill,minmax(120px,1fr))] max-md:gap-2.5 max-md:p-3">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="h-[132px] rounded-2xl border-[1.5px] border-border bg-card" />
          ))}
        </div>
      </div>
    </div>
  )
}

function BootError({ message, onRetry, onLogout }: { message: string; onRetry?: () => void; onLogout: () => void }) {
  return (
    <div className="flex h-svh items-center justify-center bg-background p-4">
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <WifiOffIcon />
          </EmptyMedia>
          <EmptyTitle>Não foi possível abrir o caixa</EmptyTitle>
          <EmptyDescription>{message}</EmptyDescription>
        </EmptyHeader>
        <EmptyContent className="flex-row justify-center">
          {onRetry ? (
            <Button type="button" onClick={onRetry}>
              <RefreshCwIcon data-icon="inline-start" />
              Tentar novamente
            </Button>
          ) : null}
          <Button type="button" variant="outline" onClick={onLogout}>
            <LogOutIcon data-icon="inline-start" />
            Sair
          </Button>
        </EmptyContent>
      </Empty>
    </div>
  )
}
