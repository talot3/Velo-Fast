import { CreditCardIcon, MinusIcon, PlusIcon, ShoppingCartIcon, XIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { formatBRL } from "@/lib/format"
import { cn } from "@/lib/utils"

import type { OrderLine } from "../lib/types"
import { DrawerHeaderBar, SideDrawer, SwipeHint, TouchButton } from "./shells"

type ItemsDrawerProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  lines: OrderLine[]
  count: number
  total: number
  onChangeQty: (uid: string, delta: number) => void
  onRemove: (uid: string) => void
  onNewSale: () => void
  onCancelLast: () => void
  onPay: () => void
}

export const qtyButton =
  "size-[30px] rounded-md border border-input bg-card p-0 text-lg font-bold text-primary hover:border-primary hover:bg-primary hover:text-primary-foreground [&_svg:not([class*='size-'])]:size-4"
export const delButton =
  "size-[30px] rounded-md border border-destructive/35 bg-destructive/12 p-0 text-sm font-bold text-destructive hover:border-destructive hover:bg-destructive hover:text-primary-foreground [&_svg:not([class*='size-'])]:size-3.5"

/** Gaveta "Itens do Pedido" — o carrinho de verdade do caixa. */
export function ItemsDrawer(props: ItemsDrawerProps) {
  const { lines, count, total } = props
  const close = () => props.onOpenChange(false)
  return (
    <SideDrawer open={props.open} onOpenChange={props.onOpenChange} name="items">
      <DrawerHeaderBar icon={<ShoppingCartIcon />} title="Itens do Pedido" onClose={close} className="justify-between">
        <span className="flex-1" />
        <Badge
          variant="outline"
          className="min-w-8 rounded-full border-[1.5px] border-border bg-background px-3 py-[3px] text-[11px] font-extrabold text-primary"
          data-testid="drawer-badge"
        >
          {count}
        </Badge>
      </DrawerHeaderBar>
      <SwipeHint />

      <div className="pdv-scroll flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-3" data-testid="drawer-cart-list">
        {!lines.length ? (
          <Empty className="flex-1 gap-3 p-10">
            <EmptyHeader>
              <EmptyMedia className="text-muted-foreground opacity-30">
                <ShoppingCartIcon className="size-12 stroke-[1.3]" />
              </EmptyMedia>
              <EmptyTitle className="text-sm font-normal text-muted-foreground">Nenhum item adicionado</EmptyTitle>
              <EmptyDescription className="text-xs">Adicione produtos pelo grid de vendas</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          lines.map((line, idx) => {
            const negative = line.price < 0
            return (
              <div
                key={line.uid}
                data-testid="drawer-item"
                className={cn(
                  "flex items-center gap-2.5 rounded-[10px] border border-border bg-secondary px-3.5 py-3 transition-colors hover:border-brand-light",
                  negative && "border-[1.5px] border-dashed border-destructive bg-destructive/12 hover:border-destructive"
                )}
              >
                <span className="min-w-[18px] text-[11px] font-extrabold text-muted-foreground">{idx + 1}.</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-bold">{line.name}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {negative ? `- ${formatBRL(Math.abs(line.price))} un.` : `${formatBRL(line.price)} un.`}
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <TouchButton
                    type="button"
                    variant="secondary"
                    aria-label="Diminuir"
                    className={cn(
                      qtyButton,
                      "after:-inset-x-0.5",
                      negative && "border-destructive/40 text-destructive hover:border-destructive hover:bg-destructive"
                    )}
                    onClick={() => props.onChangeQty(line.uid, -1)}
                  >
                    <MinusIcon />
                  </TouchButton>
                  <span className="min-w-6 text-center text-[15px] font-extrabold" data-testid="drawer-qty">
                    {line.qty}
                  </span>
                  <TouchButton
                    type="button"
                    variant="secondary"
                    aria-label="Aumentar"
                    className={cn(
                      qtyButton,
                      "after:-inset-x-0.5",
                      negative && "border-destructive/40 text-destructive hover:border-destructive hover:bg-destructive"
                    )}
                    onClick={() => props.onChangeQty(line.uid, 1)}
                  >
                    <PlusIcon />
                  </TouchButton>
                </div>
                <TouchButton
                  type="button"
                  variant="secondary"
                  aria-label="Remover"
                  className={delButton}
                  onClick={() => props.onRemove(line.uid)}
                >
                  <XIcon />
                </TouchButton>
              </div>
            )
          })
        )}
      </div>

      <div className="flex shrink-0 flex-col gap-2 border-t-2 border-border bg-card px-3.5 py-3">
        <div className="flex gap-2">
          <Button
            type="button"
            variant="secondary"
            className="h-auto min-h-[46px] flex-1 rounded-md border-[1.5px] border-input bg-secondary px-2 py-[11px] text-xs font-extrabold tracking-[.04em] hover:bg-border"
            onClick={props.onNewSale}
          >
            <PlusIcon data-icon="inline-start" />
            NOVA VENDA
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="h-auto min-h-[46px] flex-1 rounded-md border-[1.5px] border-destructive/35 bg-destructive/12 px-2 py-[11px] text-xs font-extrabold tracking-[.04em] text-destructive hover:bg-destructive/20"
            onClick={props.onCancelLast}
          >
            <XIcon data-icon="inline-start" />
            CANCELAR
          </Button>
        </div>
        <div className="flex items-baseline justify-between px-0.5 pt-1 pb-0.5">
          <span className="text-[13px] font-semibold text-muted-foreground">Total a pagar</span>
          <span className="text-[28px] font-black tracking-[-0.01em] text-primary tabular-nums" data-testid="drawer-total">
            {formatBRL(total)}
          </span>
        </div>
        <Button
          type="button"
          disabled={!lines.length}
          className="h-auto min-h-[54px] w-full rounded-[10px] p-[17px] text-base font-black tracking-[.04em] shadow-[0_6px_20px_rgba(255,176,32,0.3)] hover:bg-brand-light active:scale-[.98] disabled:opacity-35 disabled:shadow-none [&_svg:not([class*='size-'])]:size-[18px]"
          onClick={props.onPay}
        >
          <CreditCardIcon data-icon="inline-start" />
          PAGAR
        </Button>
      </div>
    </SideDrawer>
  )
}
