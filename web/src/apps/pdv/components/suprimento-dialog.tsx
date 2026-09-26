import { useRef, useState } from "react"
import { LockOpenIcon, WalletIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { Spinner } from "@/components/ui/spinner"
import { openCashSession } from "@/data/pdv"
import { errorMessage } from "@/lib/errors"
import { formatBRL } from "@/lib/format"

import { numpadKey, usePdvKeys } from "../hooks/use-pdv-keys"
import { toLocalSession, type LocalSession } from "../lib/device-state"
import { notify } from "../lib/notify"
import { centsToValue } from "../lib/receipts"
import { CASH_KEYS, Numpad } from "./numpad"
import { PdvDialog } from "./shells"

type SuprimentoDialogProps = {
  storeId: string
  terminalId: string
  operator: string
  /** Caixa aberto (ou já aberto por outro operador neste terminal). */
  onOpened: (session: LocalSession, alreadyOpen: boolean) => void
}

/** "Abertura de Caixa": valor do suprimento inicial em dinheiro. */
export function SuprimentoDialog({ storeId, terminalId, operator, onOpened }: SuprimentoDialogProps) {
  const [digits, setDigits] = useState("")
  const [busy, setBusy] = useState<null | "skip" | "open">(null)
  const busyRef = useRef(false)
  const value = centsToValue(digits)

  const press = (key: string) => {
    if (key === "DEL") setDigits((d) => d.slice(0, -1))
    else if (key !== ".") setDigits((d) => (d.length + key.length <= 10 ? d + key : d))
  }

  usePdvKeys(true, (ev) => {
    const key = numpadKey(ev)
    if (key && key !== ".") {
      ev.preventDefault()
      press(key)
    }
  })

  const confirm = async (skip: boolean) => {
    if (busyRef.current) return
    busyRef.current = true
    setBusy(skip ? "skip" : "open")
    const amount = skip ? 0 : value
    const id = crypto.randomUUID()
    const openedAt = new Date().toISOString()
    try {
      const res = await openCashSession({ storeId, sessionId: id, terminalId, openingAmount: amount, openedAt })
      if (res.queued) {
        notify(skip ? "Caixa aberto sem suprimento." : `Caixa aberto com suprimento de ${formatBRL(amount)}`)
        onOpened({ id, terminal_id: terminalId, opened_at: openedAt, opening_amount: amount, operator_name: operator }, false)
        return
      }
      const already = res.data.status === "already_open"
      if (already) notify(`Bem-vindo, ${operator.toUpperCase()}! Caixa já aberto.`)
      else notify(skip ? "Caixa aberto sem suprimento." : `Caixa aberto com suprimento de ${formatBRL(amount)}`)
      onOpened(toLocalSession(res.data.session), already)
    } catch (error) {
      notify(`⚠️ ${errorMessage(error)}`, 5000)
      busyRef.current = false
      setBusy(null)
    }
  }

  return (
    <PdvDialog
      open
      onOpenChange={() => undefined}
      name="suprimento"
      escapeCloses={false}
      className="w-full max-w-[400px] sm:max-w-[400px] max-md:top-auto max-md:bottom-4 max-md:w-[calc(100%-32px)] max-md:translate-y-0"
    >
      <div className="flex flex-col items-center gap-2.5 border-b border-border bg-secondary px-7 py-6 text-center">
        <div className="flex size-14 items-center justify-center rounded-full border border-border bg-secondary text-primary">
          <WalletIcon className="size-7" />
        </div>
        <DialogTitle className="text-xl font-black text-brand-dark">Abertura de Caixa</DialogTitle>
        <DialogDescription className="text-[13px] font-medium text-brand-light">
          Informe o valor do suprimento inicial em dinheiro
        </DialogDescription>
      </div>
      <div className="flex flex-col gap-4 px-6 pt-5 pb-6">
        <div className="flex items-center justify-between rounded-[10px] border-2 border-border bg-secondary px-5 py-3.5">
          <span className="text-[11px] font-extrabold tracking-[.06em] text-muted-foreground uppercase">Suprimento</span>
          <span className="text-[26px] font-black text-primary" data-testid="sup-value">
            {formatBRL(value)}
          </span>
        </div>
        <Numpad keys={CASH_KEYS} onKey={press} />
        <div className="flex flex-col gap-2">
          <Button
            type="button"
            variant="secondary"
            disabled={busy !== null}
            className="h-auto min-h-[46px] rounded-md border-[1.5px] border-input bg-transparent p-2.5 text-[13px] font-bold text-muted-foreground hover:bg-border"
            onClick={() => void confirm(true)}
          >
            {busy === "skip" ? <Spinner data-icon="inline-start" /> : null}
            Pular (sem suprimento)
          </Button>
          <Button
            type="button"
            disabled={busy !== null}
            className="h-auto min-h-[46px] rounded-[10px] p-3.5 text-[15px] font-black tracking-[.05em] shadow-[0_4px_14px_rgba(255,176,32,0.25)] hover:bg-brand-dark [&_svg:not([class*='size-'])]:size-[18px]"
            onClick={() => void confirm(false)}
          >
            {busy === "open" ? <Spinner data-icon="inline-start" /> : <LockOpenIcon data-icon="inline-start" />}
            ABRIR CAIXA
          </Button>
        </div>
      </div>
    </PdvDialog>
  )
}
