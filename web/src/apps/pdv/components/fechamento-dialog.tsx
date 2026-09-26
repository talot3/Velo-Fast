import { useEffect, useEffectEvent, useRef, useState } from "react"
import { ClipboardCheckIcon, PrinterIcon, TriangleAlertIcon, XIcon } from "lucide-react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { DialogTitle } from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { cashSummary, closeCashSession } from "@/data/pdv"
import type { CashSummary } from "@/data/types"
import { errorMessage, isNetworkError } from "@/lib/errors"

import type { LocalSession } from "../lib/device-state"
import { notify } from "../lib/notify"
import { printFechamento, type PrintContext } from "../lib/printing"
import { fechamentoPaper, nativeFechamento } from "../lib/receipts"
import { PaperDesk, PaperReceipt } from "./paper"
import { PdvDialog } from "./shells"

export const OFFLINE_CLOSING = "⚠️ Sem conexão — fechamento de caixa indisponível."

type FechamentoDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  print: PrintContext
  /** Envia a fila e confere no servidor qual é o caixa aberto deste terminal. */
  syncSession: () => Promise<LocalSession>
  /** Operações da fila recusadas pelo servidor (não entram no fechamento). */
  failedCount: number
  onClosed: () => void
}

/** "Fechamento de Caixa": prévia calculada no banco, imprime e encerra. */
export function FechamentoDialog(props: FechamentoDialogProps) {
  return (
    <PdvDialog
      open={props.open}
      onOpenChange={props.onOpenChange}
      name="fechamento"
      className="w-full max-w-[480px] sm:max-w-[480px] max-h-[95svh] max-md:top-auto max-md:bottom-0 max-md:max-w-full max-md:translate-y-0 max-md:rounded-b-none"
    >
      <FechamentoBody {...props} />
    </PdvDialog>
  )
}

type Loaded = { session: LocalSession; summary: CashSummary; closedAt: string }

function FechamentoBody({ onOpenChange, print, syncSession, failedCount, onClosed }: FechamentoDialogProps) {
  const [data, setData] = useState<Loaded | null>(null)
  const [busy, setBusy] = useState<null | "print" | "close">(null)
  const busyRef = useRef(false)
  const close = () => onOpenChange(false)

  const cancelled = useRef(false)
  const load = useEffectEvent(async () => {
    if (!navigator.onLine) {
      notify(OFFLINE_CLOSING)
      onOpenChange(false)
      return
    }
    try {
      const session = await syncSession()
      const summary = await cashSummary(print.storeId, session.id)
      if (!cancelled.current) setData({ session, summary, closedAt: new Date().toISOString() })
    } catch (error) {
      if (cancelled.current) return
      notify(isNetworkError(error) ? OFFLINE_CLOSING : `❌ Erro: ${errorMessage(error)}`, 5000)
      onOpenChange(false)
    }
  })

  // Carrega uma vez por abertura (o conteúdo é montado de novo a cada abertura).
  useEffect(() => {
    cancelled.current = false
    void load()
    return () => {
      cancelled.current = true
    }
  }, [])

  const finish = async (withPrint: boolean) => {
    if (!data || busyRef.current) return
    busyRef.current = true
    setBusy(withPrint ? "print" : "close")
    try {
      if (withPrint) {
        const payload = nativeFechamento({
          terminalId: print.terminalId,
          operator: print.operator,
          session: data.session,
          summary: data.summary,
          closedAt: data.closedAt,
        })
        notify(await printFechamento(print, data.session.id, payload))
        setBusy("close")
      }
      await closeCashSession(print.storeId, data.session.id)
      onClosed()
    } catch (error) {
      notify(`❌ Erro: ${errorMessage(error)}`, 5000)
      busyRef.current = false
      setBusy(null)
    }
  }

  return (
    <>
      <div className="flex shrink-0 items-center justify-between bg-brand-dark px-5 py-4 text-primary-foreground">
        <div className="flex items-center gap-2.5">
          <ClipboardCheckIcon className="size-5" />
          <DialogTitle className="text-base font-black text-primary-foreground">Fechamento de Caixa</DialogTitle>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Fechar"
          className="rounded-full text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
          onClick={close}
        >
          <XIcon />
        </Button>
      </div>

      <PaperDesk className="max-h-[55svh] min-h-[200px] p-4">
        {data ? (
          <PaperReceipt
            className="py-6 [&>div]:text-xs [&>div]:leading-[1.8]"
            lines={fechamentoPaper({
              terminalId: print.terminalId,
              operator: print.operator,
              session: data.session,
              summary: data.summary,
              closedAt: data.closedAt,
            })}
          />
        ) : (
          <div
            className="pdv-paper flex w-full max-w-[480px] flex-col items-center gap-3 rounded-[4px] px-6 py-8"
            data-testid="fechamento-loading"
          >
            {Array.from({ length: 9 }, (_, i) => (
              <Skeleton key={i} className="h-3.5 w-3/4 bg-(--paper-rule)/15" />
            ))}
          </div>
        )}
      </PaperDesk>

      <div className="flex shrink-0 flex-col gap-3 p-5">
        {failedCount > 0 ? (
          <Alert variant="destructive">
            <TriangleAlertIcon />
            <AlertDescription>
              {failedCount} operação(ões) deste caixa foram recusadas na sincronização e não entram neste fechamento.
            </AlertDescription>
          </Alert>
        ) : null}
        <div className="flex gap-2">
          <Button
            type="button"
            variant="secondary"
            disabled={busy !== null}
            className="h-auto min-h-[46px] flex-1 rounded-md border-[1.5px] border-input bg-transparent p-2.5 text-[13px] font-bold text-muted-foreground hover:bg-border"
            onClick={close}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={!data || busy !== null}
            data-testid="btn-imprimir-fechar"
            className="h-auto min-h-[46px] flex-[2] rounded-md px-[22px] py-2.5 text-[13px] font-extrabold hover:bg-brand-dark"
            onClick={() => void finish(true)}
          >
            {busy === "print" ? <Spinner data-icon="inline-start" /> : <PrinterIcon data-icon="inline-start" />}
            {busy === "print" ? "Imprimindo..." : "Imprimir e Fechar Caixa"}
          </Button>
        </div>
        <Button
          type="button"
          variant="secondary"
          disabled={!data || busy !== null}
          data-testid="btn-fechar-sem-imprimir"
          className="h-auto min-h-[46px] w-full rounded-[10px] border-[1.5px] border-destructive/40 bg-destructive/12 p-3 text-[13px] font-extrabold text-destructive hover:bg-destructive/20"
          onClick={() => void finish(false)}
        >
          {busy === "close" ? <Spinner data-icon="inline-start" /> : null}
          Fechar Caixa Sem Imprimir
        </Button>
      </div>
    </>
  )
}
