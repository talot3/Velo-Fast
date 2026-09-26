import { cn } from "@/lib/utils"

import { ticketDateTime, type PaperLine } from "../lib/receipts"
import type { TicketTx } from "../lib/types"
import { formatBRL } from "@/lib/format"

const EQ = "=".repeat(54)
const STARS = "*".repeat(54)
const DASH = "-".repeat(54)

/** Mesa amarelada onde ficam as fichas/comprovantes da prévia. */
export function PaperDesk({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("pdv-scroll flex flex-1 flex-col items-center gap-1 overflow-y-auto bg-(--paper-desk) px-5 py-6", className)}>
      {children}
    </div>
  )
}

/** Uma ficha da prévia (uma por unidade vendida), como no PDV antigo. */
export function TicketStub({
  tx,
  index,
  titleFicha,
  titleTicket,
  terminalId,
  operator,
}: {
  tx: TicketTx
  index: number
  titleFicha: string
  titleTicket: string
  terminalId: string
  operator: string
}) {
  const estorno = tx.price < 0
  const border = estorno ? STARS : EQ
  return (
    <div className="pdv-paper w-full max-w-[480px] shrink-0 overflow-hidden rounded-[4px] font-['Courier_New',Courier,monospace]">
      <div className={cn("px-[18px] pt-3 pb-3.5 text-center", estorno && "border-2 border-dashed border-destructive")}>
        <div className="overflow-hidden text-[10px] leading-[1.1] tracking-[.05em] whitespace-nowrap text-(--paper-rule) opacity-70">
          {border}
        </div>
        <div
          className={cn(
            "mt-1.5 mb-0.5 text-[38px] leading-none tracking-[.02em] text-(--paper-ink)",
            estorno && "text-base font-black text-destructive"
          )}
        >
          {estorno ? "COMPROVANTE DE ESTORNO" : titleFicha}
        </div>
        <div className="mt-px text-[11px] font-bold tracking-[.12em] text-(--paper-sub)">
          {titleTicket} — {terminalId}
        </div>
        <div className="mt-0.5 text-[11px] tracking-[.04em] text-(--paper-meta)">
          #{String(index + 1).padStart(2, "0")} — {ticketDateTime(tx.timestamp)}
        </div>
        <div className="mt-2 mb-1.5 overflow-hidden text-[10px] leading-[1.1] whitespace-nowrap text-(--paper-dash) opacity-60">{DASH}</div>
        <div
          className={cn(
            "pt-0.5 pb-1.5 text-[30px] leading-[1.15] font-bold tracking-[.01em] text-(--paper-strong) max-md:text-[26px]",
            estorno && "font-extrabold text-destructive"
          )}
        >
          {tx.productName}
        </div>
        {estorno ? (
          <>
            <div className="mt-2 mb-1.5 overflow-hidden text-[10px] leading-[1.1] whitespace-nowrap text-(--paper-dash) opacity-60">
              {DASH}
            </div>
            <div className="my-2 text-base font-black text-destructive">VALOR ESTORNADO: {formatBRL(Math.abs(tx.price))}</div>
          </>
        ) : null}
        <div className="overflow-hidden text-[10px] leading-[1.1] tracking-[.05em] whitespace-nowrap text-(--paper-rule) opacity-70">
          {border}
        </div>
        <div className="mt-1 text-[9px] tracking-[.04em] text-(--paper-dash)">
          OP: {operator.toUpperCase()} &nbsp;|&nbsp; {tx.paymentMethod}
        </div>
      </div>
    </div>
  )
}

/** Comprovante em texto monoespaçado (sangria, fechamento). */
export function PaperReceipt({ lines, className }: { lines: PaperLine[]; className?: string }) {
  return (
    <div className={cn("pdv-paper w-full max-w-[480px] shrink-0 overflow-hidden rounded-[4px] px-[18px] py-3.5", className)}>
      <div className="flex flex-col items-center font-mono text-[13px] leading-[1.7] whitespace-pre">
        {lines.map((line, i) => (
          <div
            key={i}
            className={cn(
              "max-w-full overflow-hidden text-center",
              line.kind === "rule" && "text-[15px] font-black",
              line.kind === "title" && "my-2 text-[17px] font-black",
              line.kind === "bold" && "font-black",
              line.kind === "big" && "text-[15px] font-black",
              line.kind === "total" && "text-lg font-black",
              line.kind === "danger" && "my-1 text-xl font-black text-destructive"
            )}
          >
            {line.text}
          </div>
        ))}
      </div>
    </div>
  )
}
