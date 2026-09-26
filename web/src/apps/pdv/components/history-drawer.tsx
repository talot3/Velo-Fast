import { useEffect, useEffectEvent, useRef, useState } from "react"
import { CircleXIcon, InboxIcon, RotateCcwIcon, SearchIcon, Trash2Icon } from "lucide-react"

import { useConfirm } from "@/components/app/confirm-dialog"
import { useElevate } from "@/components/app/elevate-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { cancelSaleItems, recentItems } from "@/data/pdv"
import type { RecentItem } from "@/data/types"
import { errorMessage, isNetworkError } from "@/lib/errors"
import { cn } from "@/lib/utils"

import { loadHistoryHiddenBefore, saveHistoryHiddenBefore } from "../lib/device-state"
import { notify } from "../lib/notify"
import { reprintItem, type PrintContext } from "../lib/printing"
import { recentItemName, shortDateTime } from "../lib/receipts"
import { DrawerHeaderBar, SideDrawer, SwipeHint } from "./shells"

type HistoryDrawerProps = {
  mode: "reimp" | "cancel"
  open: boolean
  onOpenChange: (open: boolean) => void
  print: PrintContext
  /** Depois de um cancelamento (estoque mudou). */
  onCancelled: () => void
}

const metaTag = "rounded-[4px] bg-border px-1.5 py-px text-[11px] font-normal text-muted-foreground"

const TEXTS = {
  reimp: {
    title: "Reimpressão",
    placeholder: "Buscar produto...",
    empty: "Nenhum ticket impresso ainda",
    emptyHint: "Os tickets impressos aparecerão aqui",
  },
  cancel: {
    title: "Cancelamento",
    placeholder: "Buscar venda...",
    empty: "Nenhuma venda registrada",
    emptyHint: "As últimas vendas aparecerão aqui",
  },
}

/**
 * Reimpressão e Cancelamento: as últimas 50 fichas DESTE terminal, vindas
 * do servidor (o antigo usava o histórico de impressão do navegador, e a
 * reimpressão nunca funcionava).
 */
export function HistoryDrawer(props: HistoryDrawerProps) {
  const t = TEXTS[props.mode]
  return (
    <SideDrawer open={props.open} onOpenChange={props.onOpenChange} name={props.mode}>
      <HistoryBody {...props} title={t.title} />
    </SideDrawer>
  )
}

function HistoryBody({ mode, open, onOpenChange, print, onCancelled, title }: HistoryDrawerProps & { title: string }) {
  const t = TEXTS[mode]
  const confirm = useConfirm()
  const elevate = useElevate()
  const [items, setItems] = useState<RecentItem[] | null>(null)
  const [query, setQuery] = useState("")
  const [hiddenBefore, setHiddenBefore] = useState(() => loadHistoryHiddenBefore(print.storeId, print.terminalId))
  const [busyId, setBusyId] = useState<string | null>(null)
  const alive = useRef(true)

  const load = useEffectEvent(async () => {
    try {
      const list = await recentItems(print.storeId, print.terminalId)
      if (alive.current) setItems(list)
    } catch (error) {
      if (!alive.current) return
      setItems([])
      notify(isNetworkError(error) || !navigator.onLine ? "❌ Erro ao conectar com o servidor." : `❌ Erro: ${errorMessage(error)}`)
    }
  })

  useEffect(() => {
    alive.current = true
    if (open) void load()
    return () => {
      alive.current = false
    }
  }, [open])

  const cutoff = hiddenBefore ? Date.parse(hiddenBefore) : null
  const visible = (items ?? []).filter((i) => i.status === "active" && (cutoff === null || Date.parse(i.sold_at) > cutoff))
  const q = mode === "cancel" ? query.trim().toLowerCase() : query.toLowerCase()
  const filtered = q
    ? visible.filter(
        (i) =>
          recentItemName(i).toLowerCase().includes(q) ||
          (i.operator_name || "").toLowerCase().includes(q) ||
          (i.payment_label || "").toLowerCase().includes(q)
      )
    : visible

  const clearHistory = async () => {
    if (!(await confirm("Limpar todo o histórico de vendas/impressões?", { confirmLabel: "Limpar histórico", destructive: true }))) return
    const newest = visible.reduce((max, i) => Math.max(max, Date.parse(i.sold_at)), Date.now())
    const iso = new Date(newest).toISOString()
    saveHistoryHiddenBefore(print.storeId, print.terminalId, iso)
    setHiddenBefore(iso)
  }

  const reprint = async (item: RecentItem) => {
    setBusyId(item.id)
    notify("🖨 Reenviando para impressora...")
    try {
      notify(await reprintItem(print, item))
    } finally {
      setBusyId(null)
    }
  }

  const cancel = async (item: RecentItem) => {
    if (
      !(await confirm("Deseja realmente cancelar esta venda? Esta ação não pode ser desfeita.", {
        confirmLabel: "Cancelar venda",
        destructive: true,
      }))
    )
      return
    if (!navigator.onLine) {
      notify("❌ Erro ao conectar com o servidor.")
      return
    }
    const sup = await elevate()
    if (!sup) return
    setBusyId(item.id)
    try {
      notify("⏳ Cancelando venda...")
      await cancelSaleItems(sup.client, print.storeId, [item.id])
      notify("✅ Venda cancelada com sucesso!")
      onCancelled()
      await load()
    } catch (error) {
      notify(isNetworkError(error) ? "❌ Erro ao conectar com o servidor." : `❌ Erro: ${errorMessage(error, "Falha ao cancelar venda.")}`)
    } finally {
      await sup.release()
      setBusyId(null)
    }
  }

  const total = visible.length
  return (
    <>
      <DrawerHeaderBar icon={mode === "reimp" ? <RotateCcwIcon /> : <CircleXIcon />} title={title} onClose={() => onOpenChange(false)}>
        <InputGroup className="h-8 flex-1 rounded-full bg-secondary">
          <InputGroupAddon className="pl-3 text-primary">
            <SearchIcon className="size-[13px]" />
          </InputGroupAddon>
          <InputGroupInput
            placeholder={t.placeholder}
            autoComplete="off"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="text-[13px] font-semibold"
          />
        </InputGroup>
      </DrawerHeaderBar>
      <SwipeHint />

      <div className="pdv-scroll flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-3" data-testid={`${mode}-list`}>
        {items === null ? (
          Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-[62px] shrink-0 rounded-[10px] bg-secondary" />)
        ) : !filtered.length ? (
          <Empty className="flex-1 gap-3 p-10">
            <EmptyHeader>
              <EmptyMedia className="text-muted-foreground opacity-30">
                {mode === "reimp" ? <RotateCcwIcon className="size-11 stroke-[1.3]" /> : <InboxIcon className="size-11 stroke-[1.3]" />}
              </EmptyMedia>
              <EmptyTitle className="text-sm font-normal text-foreground">{q ? "Nenhum resultado encontrado" : t.empty}</EmptyTitle>
              <EmptyDescription className="text-xs">{q ? "Tente outro termo de busca" : t.emptyHint}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          filtered.map((item, idx) => (
            <div
              key={item.id}
              data-testid={`${mode}-item`}
              className="flex items-center gap-2.5 rounded-[10px] border border-border bg-secondary px-3.5 py-3 transition-colors hover:border-brand-light"
            >
              <span className="min-w-5 text-center text-[11px] font-extrabold text-muted-foreground/70">{idx + 1}</span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-extrabold">{recentItemName(item)}</div>
                <div className="mt-[3px] flex flex-wrap gap-2">
                  <Badge variant="secondary" className={metaTag}>
                    {shortDateTime(item.sold_at)}
                  </Badge>
                  {item.payment_label ? (
                    <Badge variant="secondary" className={metaTag}>
                      {item.payment_label}
                    </Badge>
                  ) : null}
                  {item.operator_name ? (
                    <Badge variant="secondary" className={metaTag}>
                      {item.operator_name}
                    </Badge>
                  ) : null}
                </div>
              </div>
              {mode === "reimp" ? (
                <Button
                  type="button"
                  disabled={busyId !== null}
                  className="relative h-9 shrink-0 gap-1.5 rounded-md px-3 text-[11px] font-extrabold tracking-[.04em] after:absolute after:-inset-y-1 hover:bg-brand-light has-[>svg]:px-3 [&_svg:not([class*='size-'])]:size-3"
                  onClick={() => void reprint(item)}
                >
                  {busyId === item.id ? <Spinner data-icon="inline-start" /> : <RotateCcwIcon data-icon="inline-start" />}
                  Reimprimir
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="secondary"
                  disabled={busyId !== null}
                  className={cn(
                    "relative h-9 shrink-0 gap-1.5 rounded-md bg-destructive/10 px-3 text-[11px] font-extrabold tracking-[.04em] text-destructive after:absolute after:-inset-y-1 hover:bg-destructive/20 has-[>svg]:px-3 [&_svg:not([class*='size-'])]:size-3.5"
                  )}
                  onClick={() => void cancel(item)}
                >
                  {busyId === item.id ? <Spinner data-icon="inline-start" /> : <Trash2Icon data-icon="inline-start" />}
                  Cancelar
                </Button>
              )}
            </div>
          ))
        )}
      </div>

      <div className="flex shrink-0 items-center justify-between border-t border-border bg-secondary px-3.5 py-2.5">
        <span className="text-xs font-bold text-muted-foreground" data-testid={`${mode}-count`}>
          {total} registro{total !== 1 ? "s" : ""}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="gap-1.5 px-2 text-xs font-bold text-destructive hover:bg-destructive/12 hover:text-destructive [&_svg:not([class*='size-'])]:size-[13px]"
          onClick={() => void clearHistory()}
        >
          <Trash2Icon data-icon="inline-start" />
          Limpar histórico
        </Button>
      </div>
    </>
  )
}
