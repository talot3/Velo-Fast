import { useState } from "react"
import { ArrowLeftRightIcon, DollarSignIcon, InfoIcon, MinusIcon, PlusIcon, RotateCcwIcon, SearchIcon, XIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { Separator } from "@/components/ui/separator"
import { Spinner } from "@/components/ui/spinner"
import type { Product } from "@/data/types"
import { formatBRL, sumMoney } from "@/lib/format"
import { cn } from "@/lib/utils"

import type { ReturnLine } from "../lib/types"
import { delButton, qtyButton } from "./items-drawer"
import { DrawerHeaderBar, SideDrawer, TouchButton } from "./shells"

type DevolucaoDrawerProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  products: Product[]
  /** "Estornar Dinheiro" (supervisor + rede). Devolve true se concluiu. */
  onRefund: (lines: ReturnLine[]) => Promise<boolean>
  /** "Gerar Crédito (Troca)": linhas negativas no carrinho. */
  onCredit: (lines: ReturnLine[]) => void
}

/** "Devolução de Fichas": estorno em dinheiro ou crédito para troca. */
export function DevolucaoDrawer(props: DevolucaoDrawerProps) {
  return (
    <SideDrawer open={props.open} onOpenChange={props.onOpenChange} name="devolucao" swipe={false}>
      <DevolucaoBody {...props} />
    </SideDrawer>
  )
}

function DevolucaoBody({ onOpenChange, products, onRefund, onCredit }: DevolucaoDrawerProps) {
  const [query, setQuery] = useState("")
  const [cart, setCart] = useState<ReturnLine[]>([])
  const [busy, setBusy] = useState(false)

  const q = query.toLowerCase()
  const options = products.filter((p) => p.price > 0 && (!q || p.name.toLowerCase().includes(q)))
  const total = sumMoney(cart.map((l) => l.price * l.qty))

  const add = (p: Product) =>
    setCart((list) => {
      const existing = list.find((l) => l.productId === p.id)
      if (existing) return list.map((l) => (l.productId === p.id ? { ...l, qty: l.qty + 1 } : l))
      return [...list, { productId: p.id, name: p.name, price: p.price, printerId: p.printerId, qty: 1 }]
    })

  const changeQty = (productId: string, delta: number) =>
    setCart((list) => list.map((l) => (l.productId === productId ? { ...l, qty: l.qty + delta } : l)).filter((l) => l.qty > 0))

  const remove = (productId: string) => setCart((list) => list.filter((l) => l.productId !== productId))

  const refund = async () => {
    if (total <= 0 || busy) return
    setBusy(true)
    try {
      if (await onRefund(cart)) setCart([])
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <DrawerHeaderBar icon={<RotateCcwIcon />} title="Devolução de Fichas" onClose={() => onOpenChange(false)} />

      <div className="pdv-scroll flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3">
        <div className="flex shrink-0 flex-col gap-2">
          <InputGroup className="rounded-full bg-secondary">
            <InputGroupAddon className="pl-3">
              <SearchIcon className="size-[13px]" />
            </InputGroupAddon>
            <InputGroupInput
              placeholder="Buscar produto para devolução..."
              autoComplete="off"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="text-[13px] font-semibold"
            />
          </InputGroup>
          <div className="pdv-scroll grid max-h-[140px] grid-cols-2 gap-1.5 overflow-y-auto p-0.5" data-testid="devolucao-produtos">
            {options.length ? (
              options.map((p) => (
                <Button
                  key={p.id}
                  type="button"
                  variant="secondary"
                  title={p.name}
                  className="h-auto min-h-[46px] flex-col items-start justify-center gap-0.5 rounded-md border border-border bg-secondary px-2.5 py-2 text-left hover:border-brand-light hover:bg-destructive/12"
                  onClick={() => add(p)}
                >
                  <span className="w-full truncate text-xs font-bold text-foreground">{p.name}</span>
                  <span className="text-[11px] font-extrabold text-success">{formatBRL(p.price)}</span>
                </Button>
              ))
            ) : (
              <div className="col-span-2 p-2.5 text-center text-[11px] text-muted-foreground">Nenhum produto encontrado</div>
            )}
          </div>
        </div>

        <Separator />

        <div className="flex min-h-0 flex-1 flex-col">
          <span className="mb-1.5 block text-[11px] font-extrabold text-muted-foreground uppercase">Fichas a Devolver</span>
          <div className="flex flex-1 flex-col gap-2 overflow-y-auto" data-testid="devolucao-cart">
            {!cart.length ? (
              <Empty className="flex-1 gap-3 px-2.5 py-5">
                <EmptyHeader>
                  <EmptyMedia className="text-muted-foreground opacity-30">
                    <InfoIcon className="size-8 stroke-[1.3]" />
                  </EmptyMedia>
                  <EmptyTitle className="text-[13px] font-normal text-foreground">Nenhuma ficha selecionada</EmptyTitle>
                  <EmptyDescription className="text-[11px]">Selecione um produto acima para iniciar a devolução</EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              cart.map((line, idx) => (
                <div
                  key={line.productId}
                  className="flex items-center gap-2.5 rounded-[10px] border-[1.5px] border-dashed border-destructive bg-destructive/12 px-3 py-2.5"
                >
                  <span className="min-w-[18px] text-[11px] font-extrabold text-muted-foreground">{idx + 1}.</span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-bold">{line.name}</div>
                    <div className="mt-0.5 text-[11px] text-muted-foreground">{formatBRL(line.price)} un.</div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <TouchButton
                      type="button"
                      variant="secondary"
                      aria-label="Diminuir"
                      className={cn(
                        qtyButton,
                        "after:-inset-x-0.5 border-destructive/40 text-destructive hover:border-destructive hover:bg-destructive"
                      )}
                      onClick={() => changeQty(line.productId, -1)}
                    >
                      <MinusIcon />
                    </TouchButton>
                    <span className="min-w-[18px] text-center text-sm font-extrabold">{line.qty}</span>
                    <TouchButton
                      type="button"
                      variant="secondary"
                      aria-label="Aumentar"
                      className={cn(
                        qtyButton,
                        "after:-inset-x-0.5 border-destructive/40 text-destructive hover:border-destructive hover:bg-destructive"
                      )}
                      onClick={() => changeQty(line.productId, 1)}
                    >
                      <PlusIcon />
                    </TouchButton>
                  </div>
                  <TouchButton
                    type="button"
                    variant="secondary"
                    aria-label="Remover"
                    className={delButton}
                    onClick={() => remove(line.productId)}
                  >
                    <XIcon />
                  </TouchButton>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="flex shrink-0 flex-col gap-2 border-t border-border bg-card px-3.5 py-3">
        <div className="mb-1 flex items-center justify-between text-sm font-extrabold text-muted-foreground">
          <span>VALOR DO REEMBOLSO:</span>
          <span className="text-xl font-black text-destructive" data-testid="devolucao-total">
            {formatBRL(total)}
          </span>
        </div>
        <div className="mt-1 flex gap-2">
          <Button
            type="button"
            disabled={!cart.length || busy}
            data-testid="btn-estornar-dinheiro"
            className="h-auto min-h-[54px] flex-1 rounded-[10px] bg-destructive p-3 text-[13px] font-extrabold whitespace-normal hover:bg-destructive/85 disabled:opacity-35"
            onClick={() => void refund()}
          >
            {busy ? <Spinner data-icon="inline-start" /> : <DollarSignIcon data-icon="inline-start" />}
            {busy ? "Processando..." : "Estornar Dinheiro"}
          </Button>
          <Button
            type="button"
            disabled={!cart.length || busy}
            data-testid="btn-gerar-credito"
            className="h-auto min-h-[54px] flex-1 rounded-[10px] bg-warning p-3 text-[13px] font-extrabold whitespace-normal hover:bg-warning/85 disabled:opacity-35"
            onClick={() => onCredit(cart)}
          >
            <ArrowLeftRightIcon data-icon="inline-start" />
            Gerar Crédito (Troca)
          </Button>
        </div>
      </div>
    </>
  )
}
