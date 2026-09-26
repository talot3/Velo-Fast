import { useRef, useState } from "react"
import { InfoIcon, PrinterIcon, XIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { DialogTitle } from "@/components/ui/dialog"
import { Spinner } from "@/components/ui/spinner"
import type { TicketConfig } from "@/data/types"
import { cn } from "@/lib/utils"

import type { TicketTx } from "../lib/types"
import { PaperDesk, TicketStub } from "./paper"
import { PdvDialog } from "./shells"

type TicketDialogProps = {
  txs: TicketTx[] | null
  ticketConfig: TicketConfig
  terminalId: string
  operator: string
  /** "Fechar" / X / Esc. */
  onClose: () => void
  /** "Imprimir Tickets": devolve true para fechar a prévia. */
  onPrint: (txs: TicketTx[]) => Promise<boolean>
}

/** "Pré-visualização do Cupom": uma ficha por unidade (tela cheia no celular). */
export function TicketDialog({ txs, ticketConfig, terminalId, operator, onClose, onPrint }: TicketDialogProps) {
  const [printing, setPrinting] = useState(false)
  const printingRef = useRef(false)
  // Mantém as fichas na tela durante a animação de fechamento.
  const [shown, setShown] = useState<TicketTx[]>(txs ?? [])
  if (txs && txs !== shown) setShown(txs)
  const open = Boolean(txs)

  const print = async () => {
    if (!txs || printingRef.current) return
    printingRef.current = true
    setPrinting(true)
    try {
      await onPrint(txs)
    } finally {
      printingRef.current = false
      setPrinting(false)
    }
  }

  const titleFicha = ticketConfig.titleFicha || "ficha"
  const titleTicket = ticketConfig.titleTicket || "TICKET 1-A-1"

  return (
    <PdvDialog
      open={open}
      onOpenChange={(o) => !o && onClose()}
      name="ticket"
      className={cn(
        "w-full max-w-[560px] sm:max-w-[560px] max-h-[90svh]",
        "max-md:inset-0 max-md:h-svh max-md:max-h-svh max-md:max-w-full max-md:translate-x-0 max-md:translate-y-0 max-md:rounded-none max-md:border-0"
      )}
    >
      <div className="flex shrink-0 items-center justify-between border-b border-border bg-secondary px-5 py-4 text-primary">
        <div className="flex items-center gap-2">
          <PrinterIcon className="size-[18px]" />
          <DialogTitle className="text-[15px] font-extrabold text-primary">Pré-visualização do Cupom</DialogTitle>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Fechar"
          className="rounded-full text-muted-foreground"
          onClick={onClose}
        >
          <XIcon />
        </Button>
      </div>

      <PaperDesk>
        {shown.map((tx, i) => (
          <TicketStub
            key={tx.id}
            tx={tx}
            index={i}
            titleFicha={titleFicha}
            titleTicket={titleTicket}
            terminalId={terminalId}
            operator={operator}
          />
        ))}
      </PaperDesk>

      <p className="flex shrink-0 items-center gap-1.5 px-5 py-2 text-[11px] font-semibold text-muted-foreground">
        <InfoIcon className="size-[13px] shrink-0" />
        Serão impressos tickets separados por produto
      </p>

      <div className="flex shrink-0 justify-end gap-2.5 border-t border-border px-5 py-3.5 max-md:px-4 max-md:pt-3 max-md:pb-5">
        <Button
          type="button"
          variant="secondary"
          className="h-auto min-h-[46px] rounded-md border-[1.5px] border-input px-5 py-2.5 text-[13px] font-bold max-md:px-5 max-md:py-3.5 max-md:text-sm"
          onClick={onClose}
        >
          Fechar
        </Button>
        <Button
          type="button"
          disabled={printing}
          data-testid="btn-imprimir-tickets"
          className="h-auto min-h-[46px] rounded-md px-[22px] py-2.5 text-[13px] font-extrabold hover:bg-brand-dark max-md:px-5 max-md:py-3.5 max-md:text-sm"
          onClick={() => void print()}
        >
          {printing ? <Spinner data-icon="inline-start" /> : <PrinterIcon data-icon="inline-start" />}
          {printing ? "Enviando..." : "Imprimir Tickets"}
        </Button>
      </div>
    </PdvDialog>
  )
}
