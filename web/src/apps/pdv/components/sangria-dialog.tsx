import { useRef, useState } from "react"
import { CheckIcon, PrinterIcon, WalletIcon, XIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { DialogTitle } from "@/components/ui/dialog"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { addCashMovement } from "@/data/pdv"
import { errorMessage } from "@/lib/errors"
import { formatBRL } from "@/lib/format"
import { cn } from "@/lib/utils"

import { numpadKey, usePdvKeys } from "../hooks/use-pdv-keys"
import { notify } from "../lib/notify"
import { printSangria, type PrintContext } from "../lib/printing"
import { centsToValue, sangriaPaper, type Sangria } from "../lib/receipts"
import { CASH_KEYS, Numpad } from "./numpad"
import { PaperDesk, PaperReceipt } from "./paper"
import { PdvDialog } from "./shells"

type SangriaDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  print: PrintContext
}

/** Modal da sangria: valor + motivo → registra no banco → prévia → imprime. */
export function SangriaDialog({ open, onOpenChange, print }: SangriaDialogProps) {
  return (
    <PdvDialog
      open={open}
      onOpenChange={onOpenChange}
      name="sangria"
      className="w-full max-w-[420px] sm:max-w-[420px] max-h-[95svh] max-md:top-auto max-md:bottom-0 max-md:max-w-full max-md:translate-y-0 max-md:rounded-b-none"
    >
      <SangriaBody open={open} onOpenChange={onOpenChange} print={print} />
    </PdvDialog>
  )
}

function SangriaBody({ open, onOpenChange, print }: SangriaDialogProps) {
  const [digits, setDigits] = useState("")
  const [motivo, setMotivo] = useState("")
  const [current, setCurrent] = useState<Sangria | null>(null)
  const [busy, setBusy] = useState<null | "save" | "print">(null)
  const busyRef = useRef(false)
  const value = centsToValue(digits)
  const close = () => onOpenChange(false)

  const press = (key: string) => {
    if (key === "DEL") setDigits((d) => d.slice(0, -1))
    else if (key !== ".") setDigits((d) => (d.length + key.length <= 10 ? d + key : d))
  }

  usePdvKeys(open && !current, (ev) => {
    const key = numpadKey(ev)
    if (key && key !== ".") {
      ev.preventDefault()
      press(key)
    }
  })

  const register = async () => {
    if (busyRef.current) return
    if (value <= 0) {
      notify("⚠️ Informe um valor para a sangria.")
      return
    }
    busyRef.current = true
    setBusy("save")
    const sangria: Sangria = {
      id: crypto.randomUUID(),
      valor: value,
      motivo: motivo.trim() || "Sangria de caixa",
      operador: print.operator,
      terminal: print.terminalId,
      timestamp: new Date().toISOString(),
    }
    try {
      const res = await addCashMovement({
        storeId: print.storeId,
        id: sangria.id,
        terminalId: print.terminalId,
        kind: "sangria",
        amount: sangria.valor,
        reason: sangria.motivo,
        occurredAt: sangria.timestamp,
      })
      if (res.queued) notify("⚠️ Sem conexão — sangria será sincronizada automaticamente.")
      setCurrent(sangria)
    } catch (error) {
      notify(`⚠️ ${errorMessage(error)}`, 5000)
    } finally {
      busyRef.current = false
      setBusy(null)
    }
  }

  const printReceipt = async () => {
    if (!current || busyRef.current) return
    busyRef.current = true
    setBusy("print")
    try {
      const result = await printSangria(print, current)
      notify(result.message)
      if (result.ok) close()
    } finally {
      busyRef.current = false
      setBusy(null)
    }
  }

  return (
    <>
      <div className="flex shrink-0 items-center justify-between border-b border-border bg-secondary px-5 py-4 text-primary">
        <div className="flex items-center gap-2.5">
          <WalletIcon className="size-5" />
          <DialogTitle className="text-base font-black text-primary">Sangria de Caixa</DialogTitle>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Fechar"
          className="rounded-full text-muted-foreground"
          onClick={close}
        >
          <XIcon />
        </Button>
      </div>

      {!current ? (
        <div className="pdv-scroll flex min-h-0 flex-col gap-3 overflow-y-auto p-5">
          <div className="flex items-center justify-between rounded-[10px] border-2 border-border bg-secondary px-5 py-3.5">
            <span className="text-[11px] font-extrabold tracking-[.06em] text-muted-foreground uppercase">Valor da Sangria</span>
            <span className="text-[26px] font-black text-destructive" data-testid="sangria-value">
              {formatBRL(value)}
            </span>
          </div>
          <Numpad keys={CASH_KEYS} onKey={press} className="mb-1" />
          <FieldGroup className="gap-1.5">
            <Field className="gap-1.5">
              <FieldLabel htmlFor="sangria-motivo" className="text-[11px] font-extrabold tracking-[.05em] text-muted-foreground uppercase">
                Motivo
              </FieldLabel>
              <Input
                id="sangria-motivo"
                value={motivo}
                autoComplete="off"
                placeholder="Ex: Troco para caixa, pagamento de fornecedor..."
                onChange={(e) => setMotivo(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    void register()
                  }
                }}
                className="h-auto rounded-md border-[1.5px] px-3.5 py-[11px] text-sm font-semibold focus-visible:border-destructive focus-visible:ring-destructive/20"
              />
            </Field>
          </FieldGroup>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              className="h-auto min-h-[46px] flex-1 rounded-md border-[1.5px] border-input bg-transparent p-2.5 text-[13px] font-bold text-muted-foreground hover:bg-border"
              onClick={close}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={busy !== null}
              className="h-auto min-h-[46px] flex-[2] rounded-[10px] bg-destructive p-3.5 text-[15px] font-black tracking-[.05em] hover:bg-destructive/85"
              onClick={() => void register()}
            >
              {busy === "save" ? <Spinner data-icon="inline-start" /> : <CheckIcon data-icon="inline-start" />}
              Registrar Sangria
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex min-h-0 flex-col gap-3 p-5">
          <PaperDesk className="min-h-0 flex-none py-6">
            <PaperReceipt lines={sangriaPaper(current)} className="py-6" />
          </PaperDesk>
          <div className="mt-3 flex gap-2">
            <Button
              type="button"
              variant="secondary"
              className="h-auto min-h-[46px] flex-1 rounded-md border-[1.5px] border-input px-5 py-2.5 text-[13px] font-bold"
              onClick={close}
            >
              Fechar
            </Button>
            <Button
              type="button"
              disabled={busy !== null}
              className={cn("h-auto min-h-[46px] flex-[2] rounded-md px-[22px] py-2.5 text-[13px] font-extrabold hover:bg-brand-dark")}
              onClick={() => void printReceipt()}
            >
              {busy === "print" ? <Spinner data-icon="inline-start" /> : <PrinterIcon data-icon="inline-start" />}
              {busy === "print" ? "Enviando..." : "Imprimir Comprovante"}
            </Button>
          </div>
        </div>
      )}
    </>
  )
}
