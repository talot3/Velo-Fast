import { useState } from "react"
import { EllipsisVerticalIcon, PrinterIcon, RefreshCwIcon } from "lucide-react"

import { LiveClock } from "@/components/app/live-clock"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverDescription, PopoverHeader, PopoverTitle, PopoverTrigger } from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import { Spinner } from "@/components/ui/spinner"
import { formatDateTimeBR } from "@/lib/format"
import { cn } from "@/lib/utils"

import { queueOpLabel, type ConnectionState } from "../hooks/use-connection"

type HeaderProps = {
  terminalName: string
  operator: string
  version: string
  connection: ConnectionState
  onReprint: () => void
  onMenu: () => void
}

const hdrButton =
  "relative size-[38px] rounded-md border-[1.5px] border-foreground/20 bg-foreground/10 p-0 text-foreground after:absolute after:-inset-1 hover:border-foreground/35 hover:bg-foreground/20 [&_svg:not([class*='size-'])]:size-[18px]"

/** Barra superior: CAIXA | OPERADOR | versão … conexão, relógio, reimpressão, menu. */
export function PdvHeader({ terminalName, operator, version, connection, onReprint, onMenu }: HeaderProps) {
  return (
    <header className="flex h-[60px] shrink-0 items-center justify-between gap-3 border-b-2 border-primary bg-(--pdv-header) px-6 shadow-[0_4px_20px_rgba(0,0,0,0.25)] max-md:h-[46px] max-md:px-3">
      <div className="flex min-w-0 items-center gap-3 text-[13.5px] font-bold tracking-[.03em] text-(--pdv-header-foreground) max-md:gap-1.5 max-md:text-xs">
        <span className="truncate" data-testid="hdr-terminal">
          {terminalName}
        </span>
        <span className="opacity-40">|</span>
        <span className="shrink-0 font-black text-brand-light" data-testid="hdr-operator">
          {operator.toUpperCase()}
        </span>
        <span className="opacity-40">|</span>
        <span className="inline-flex shrink-0 items-center rounded-[4px] bg-foreground/15 px-1.5 py-0.5 text-[11px] font-bold text-foreground opacity-60">
          v{version}
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-3 max-md:gap-2">
        <ConnectionIndicator connection={connection} />
        <LiveClock className="text-xl font-black tracking-[.02em] text-foreground [text-shadow:0_2px_4px_rgba(0,0,0,0.5)] max-md:text-[15px]" />
        <Button type="button" variant="secondary" title="Reimpressão" aria-label="Reimpressão" className={hdrButton} onClick={onReprint}>
          <PrinterIcon />
        </Button>
        <Button type="button" variant="secondary" title="Mais opções" aria-label="Mais opções" className={hdrButton} onClick={onMenu}>
          <EllipsisVerticalIcon />
        </Button>
      </div>
    </header>
  )
}

const pill = "max-w-[40vw] gap-1.5 rounded-full px-3 py-[5px] text-[11px] font-extrabold tracking-[.02em] uppercase"

/** "Offline · N pendente(s)" / "Sem conexão" / "Sincronizando N..." + falhas. */
function ConnectionIndicator({ connection }: { connection: ConnectionState }) {
  const { online, pending, failed } = connection
  let label: string | null = null
  if (!online) label = pending > 0 ? `Offline · ${pending} pendente(s)` : "Sem conexão"
  else if (pending > 0) label = `Sincronizando ${pending}...`
  return (
    <>
      {label ? (
        <Badge
          variant="outline"
          role="status"
          title={label}
          data-testid="connection-indicator"
          className={cn(
            pill,
            online ? "border-primary/35 bg-primary/15 text-brand-light" : "border-destructive/35 bg-destructive/15 text-destructive"
          )}
        >
          <span className="size-[7px] shrink-0 animate-[pdv-connection-pulse_1.4s_ease-in-out_infinite] rounded-full bg-current motion-reduce:animate-none" />
          <span className="truncate">{label}</span>
        </Badge>
      ) : null}
      {failed > 0 ? <FailuresPopover connection={connection} /> : null}
    </>
  )
}

/** Operações recusadas pelo servidor: ficam visíveis, com opção de reenviar. */
function FailuresPopover({ connection }: { connection: ConnectionState }) {
  const [busy, setBusy] = useState(false)
  const retry = async () => {
    setBusy(true)
    try {
      await connection.retryFailed()
    } finally {
      setBusy(false)
    }
  }
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Badge asChild variant="outline" className={cn(pill, "cursor-pointer border-destructive/35 bg-destructive/15 text-destructive")}>
          <button type="button" data-testid="connection-failures">
            <span className="size-[7px] shrink-0 rounded-full bg-current" />
            <span className="truncate">{connection.failed} falha(s)</span>
          </button>
        </Badge>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <PopoverHeader>
          <PopoverTitle>Não sincronizado</PopoverTitle>
          <PopoverDescription>O servidor recusou estas operações deste caixa.</PopoverDescription>
        </PopoverHeader>
        <div className="mt-3 flex max-h-60 flex-col gap-2 overflow-y-auto">
          {connection.failures.map((f, i) => (
            <div key={f.key} className="flex flex-col gap-1 text-xs">
              {i > 0 ? <Separator className="mb-1" /> : null}
              <span className="font-bold">
                {queueOpLabel(f.op)} · {formatDateTimeBR(f.createdAt)}
              </span>
              <span className="text-destructive">{f.lastError || "Recusada pelo servidor."}</span>
            </div>
          ))}
        </div>
        <Button type="button" size="sm" className="mt-3 w-full" disabled={busy || !connection.online} onClick={retry}>
          {busy ? <Spinner data-icon="inline-start" /> : <RefreshCwIcon data-icon="inline-start" />}
          Tentar novamente
        </Button>
      </PopoverContent>
    </Popover>
  )
}
