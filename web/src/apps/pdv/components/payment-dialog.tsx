import { useRef, useState } from "react"
import { BanknoteIcon, ChevronRightIcon, CreditCardIcon, QrCodeIcon, XIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { DialogTitle } from "@/components/ui/dialog"
import { Spinner } from "@/components/ui/spinner"
import type { PaymentMethod } from "@/data/types"
import { formatBRL, roundMoney, sumMoney } from "@/lib/format"
import { cn } from "@/lib/utils"

import { numpadKey, usePdvKeys } from "../hooks/use-pdv-keys"
import { centsToValue, isCashMethod } from "../lib/receipts"
import type { AppliedPayment } from "../lib/types"
import { Numpad, PAY_KEYS } from "./numpad"
import { PdvDialog, TouchButton } from "./shells"

type PaymentDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  total: number
  methods: PaymentMethod[]
  /** Registra a venda; devolve false se deu erro (a venda continua aberta). */
  onFinalize: (payments: AppliedPayment[]) => Promise<boolean>
}

/** Modal de pagamento (inferior no celular). Os pagamentos recomeçam a cada abertura, como no antigo. */
export function PaymentDialog(props: PaymentDialogProps) {
  return (
    <PdvDialog
      open={props.open}
      onOpenChange={props.onOpenChange}
      name="payment"
      className={cn(
        "w-[90%] max-w-[900px] sm:max-w-[900px]",
        "max-md:top-auto max-md:bottom-0 max-md:left-0 max-md:w-full max-md:max-w-full max-md:translate-x-0 max-md:translate-y-0 max-md:rounded-t-[20px] max-md:rounded-b-none max-md:border-b-0"
      )}
    >
      <PaymentBody {...props} />
    </PdvDialog>
  )
}

function methodIcon(name: string) {
  const upper = name.toUpperCase()
  if (upper.includes("DINHEIRO")) return BanknoteIcon
  if (upper.includes("PIX")) return QrCodeIcon
  return CreditCardIcon
}

const FAST_CASH = [5, 10, 20, 50, 100]

function PaymentBody({ open, total, methods, onFinalize, onOpenChange }: PaymentDialogProps) {
  const [payStr, setPayStr] = useState("")
  const [payments, setPayments] = useState<AppliedPayment[]>([])
  const [busy, setBusy] = useState(false)
  const busyRef = useRef(false)

  const paid = sumMoney(payments.map((p) => p.amount))
  const balance = roundMoney(total - paid)
  const change = roundMoney(paid - total)
  const settled = balance <= 0.001
  const typed = centsToValue(payStr)

  const npPay = (key: string) => {
    if (key === "DEL") setPayStr((s) => s.slice(0, -1))
    else if (key !== ".") setPayStr((s) => (s.length < 8 ? s + key : s))
  }

  const setFastCash = (value: number | "exact") => {
    if (value === "exact") setPayStr(String(Math.round(Math.max(0, balance) * 100)))
    else setPayStr(String(value * 100))
  }

  const selectMethod = (pm: PaymentMethod) => {
    const rest = roundMoney(total - paid)
    if (rest <= 0) return
    const custom = payStr ? typed : 0
    let amount = custom > 0 ? custom : rest
    // Troco só no dinheiro: nos outros meios o valor trava no que falta.
    if (custom > rest + 0.001 && !isCashMethod(pm.name)) amount = rest
    setPayments((list) => [...list, { method_id: pm.id, method_name: pm.name, amount: roundMoney(amount) }])
    setPayStr("")
  }

  const finalize = async () => {
    if (busyRef.current || !settled) return
    busyRef.current = true
    setBusy(true)
    const ok = await onFinalize(payments)
    if (!ok) {
      busyRef.current = false
      setBusy(false)
    }
  }

  usePdvKeys(open, (ev) => {
    if (ev.key === "Enter") {
      if (settled && !busyRef.current) {
        ev.preventDefault()
        void finalize()
      }
      return
    }
    const key = numpadKey(ev)
    if (key && key !== ".") {
      ev.preventDefault()
      npPay(key)
    }
  })

  return (
    <>
      <div className="shrink-0 border-b-[1.5px] border-border bg-secondary px-7 py-6 text-center max-md:px-4 max-md:py-4">
        <DialogTitle className="text-[11px] leading-normal font-extrabold tracking-[.08em] text-muted-foreground uppercase">
          Pagamento
        </DialogTitle>
        <div
          className="mt-1.5 text-[46px] leading-tight font-black tracking-[-.03em] text-primary tabular-nums max-md:text-[30px]"
          data-testid="pay-big-total"
        >
          {formatBRL(total)}
        </div>
      </div>

      <div className="pdv-scroll flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-6 max-md:gap-3 max-md:px-4 max-md:py-3.5">
        <div className="grid grid-cols-[1.3fr_1fr] items-start gap-6 max-md:grid-cols-1 max-md:gap-4">
          {/* Esquerda: teclado + sugestões | formas de pagamento */}
          <div className="flex items-stretch gap-4 max-md:flex-col max-md:gap-3">
            <div className="flex flex-1 flex-col gap-2.5">
              <div className="flex items-center justify-between rounded-[10px] border-2 border-border bg-secondary px-3.5 py-2.5">
                <span className="text-[11px] font-extrabold tracking-[.06em] text-muted-foreground uppercase">Valor Recebido</span>
                <span className="text-xl font-black text-primary" data-testid="pay-numpad-value">
                  {typed > 0 ? formatBRL(typed) : "—"}
                </span>
              </div>
              <Numpad keys={PAY_KEYS} onKey={npPay} className="gap-1.5" />
              <div className="mt-1 flex flex-wrap gap-1.5">
                {FAST_CASH.map((v) => (
                  <Button
                    key={v}
                    type="button"
                    variant="secondary"
                    onMouseDown={(e) => e.preventDefault()}
                    className="h-auto min-h-[36px] rounded-md border-[1.5px] border-border bg-background px-3.5 py-2 text-xs font-bold hover:border-input hover:bg-secondary"
                    onClick={() => setFastCash(v)}
                  >
                    R$ {v}
                  </Button>
                ))}
                <Button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  className="h-auto min-h-[36px] grow rounded-md border-[1.5px] border-brand-dark px-3.5 py-2 text-xs font-bold shadow-[0_3px_6px_rgba(255,176,32,0.25)] hover:bg-brand-light"
                  onClick={() => setFastCash("exact")}
                >
                  Exato
                </Button>
              </div>
            </div>

            <div className="flex flex-1 flex-col">
              <div className="grid h-full content-start gap-2 max-md:grid-cols-2" data-testid="pay-methods">
                {methods.map((pm) => {
                  const Icon = methodIcon(pm.name)
                  return (
                    <Button
                      key={pm.id}
                      type="button"
                      variant="secondary"
                      onMouseDown={(e) => e.preventDefault()}
                      className="h-auto min-h-[46px] justify-between gap-3 rounded-[10px] border-[1.5px] border-border bg-background px-5 py-4 text-left text-[13.5px] font-extrabold tracking-[.04em] whitespace-normal shadow-none hover:-translate-y-px hover:border-input hover:bg-secondary max-md:gap-2 max-md:px-2.5 max-md:py-2.5 max-md:text-xs"
                      onClick={() => selectMethod(pm)}
                    >
                      <span className="flex items-center gap-3 max-md:gap-2">
                        <Icon className="size-[18px] shrink-0 opacity-85" />
                        <span>{pm.name}</span>
                      </span>
                      <ChevronRightIcon className="size-4 shrink-0 opacity-40" />
                    </Button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Direita: situação + pagamentos lançados */}
          <div className="flex flex-col gap-3">
            <div className="overflow-hidden rounded-2xl border-[1.5px] border-border bg-card shadow-[0_2px_6px_rgba(0,0,0,0.25),0_6px_16px_rgba(0,0,0,0.2)]">
              <div className="flex items-center justify-between border-b-[1.5px] border-border px-5 py-3.5 text-[13.5px] font-bold text-muted-foreground">
                <span>Total da Venda</span>
                <span data-testid="ps-total">{formatBRL(total)}</span>
              </div>
              <div className="flex items-center justify-between border-b-[1.5px] border-border px-5 py-3.5 text-[13.5px] font-bold text-success">
                <span>Valor Pago</span>
                <span className="text-[15px] font-black" data-testid="ps-paid">
                  {formatBRL(paid)}
                </span>
              </div>
              {settled ? (
                <div className="flex items-center justify-between px-5 py-3.5 text-[15px] font-black text-primary">
                  <span>Troco</span>
                  <span className="text-lg" data-testid="ps-change">
                    {formatBRL(Math.max(0, change))}
                  </span>
                </div>
              ) : (
                <div className="flex items-center justify-between px-5 py-3.5 text-[15px] font-black text-destructive">
                  <span>Falta Pagar</span>
                  <span className="text-lg" data-testid="ps-balance">
                    {formatBRL(Math.max(0, balance))}
                  </span>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2" data-testid="pay-applied">
              {payments.map((p, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between rounded-md border border-success/15 bg-success/8 px-4 py-2 text-xs font-extrabold text-success"
                >
                  <span>{p.method_name}</span>
                  <div className="flex items-center gap-2">
                    <span>{formatBRL(p.amount)}</span>
                    <TouchButton
                      type="button"
                      variant="ghost"
                      aria-label="Remover pagamento"
                      className="size-6 p-0 text-destructive hover:bg-transparent hover:text-destructive hover:opacity-60"
                      disabled={busy}
                      onClick={() => setPayments((list) => list.filter((_, i) => i !== idx))}
                    >
                      <XIcon />
                    </TouchButton>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-center justify-between gap-4 border-t-[1.5px] border-border bg-secondary px-6 py-4 max-md:gap-2 max-md:px-4 max-md:pt-2.5 max-md:pb-4">
        <Button
          type="button"
          variant="secondary"
          className="h-auto min-h-[46px] rounded-md border-[1.5px] border-border bg-background px-6 py-3 text-[13.5px] font-extrabold text-muted-foreground hover:border-input hover:bg-card hover:text-foreground max-md:px-[18px] max-md:text-[13px]"
          onClick={() => onOpenChange(false)}
        >
          ← Voltar
        </Button>
        {settled ? (
          <Button
            type="button"
            disabled={busy}
            data-testid="btn-finalizar"
            className="h-auto min-h-[46px] flex-1 rounded-md border-[1.5px] border-(--success-strong-hover) bg-(--success-strong) px-7 py-3.5 text-[15px] font-black text-(--success-strong-foreground) shadow-[0_4px_12px_rgba(11,138,95,0.3)] hover:bg-(--success-strong-hover) max-md:px-[18px] max-md:py-3 max-md:text-sm"
            onClick={() => void finalize()}
          >
            {busy ? <Spinner data-icon="inline-start" /> : null}
            {busy ? "Processando..." : "FINALIZAR VENDA"}
          </Button>
        ) : null}
      </div>
    </>
  )
}
