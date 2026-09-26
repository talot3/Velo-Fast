import { CalculatorIcon, LayoutGridIcon, SearchIcon, XIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group"
import { formatBRL } from "@/lib/format"
import { cn } from "@/lib/utils"

import { Numpad, QTY_KEYS } from "./numpad"

type OrderPanelProps = {
  count: number
  total: number
  qtyStr: string
  search: string
  numpadOpen: boolean
  onSearch: (value: string) => void
  onClearSearch: () => void
  onNumpadKey: (key: string) => void
  onToggleNumpad: () => void
  onOpenItems: () => void
}

const pillButton =
  "relative h-auto gap-1.5 rounded-full border border-border bg-secondary px-3.5 py-1.5 text-[13px] font-extrabold tracking-[.04em] text-foreground shadow-[0_1px_2px_rgba(0,0,0,0.05)] after:absolute after:-inset-x-1 after:-inset-y-2 hover:bg-accent has-[>svg]:px-3.5 [&_svg:not([class*='size-'])]:size-[15px]"

/**
 * Coluna esquerda: resumo do pedido, busca + teclado de quantidade (sempre
 * visíveis no computador; recolhidos no celular, abertos pelo botão QTD) e
 * subtotal/total.
 */
export function OrderPanel(props: OrderPanelProps) {
  const { count, total, qtyStr, search, numpadOpen } = props
  return (
    <div className="flex w-[360px] shrink-0 flex-col overflow-hidden border-r border-border bg-card max-md:w-full max-md:border-r-0 max-md:border-b-2">
      {/* Barra do pedido */}
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border bg-secondary px-3.5 py-2.5 text-[13px] font-bold text-foreground">
        <span className="whitespace-nowrap text-muted-foreground" data-testid="order-count">
          {count} {count === 1 ? "item" : "itens"}
        </span>
        <div className="flex shrink-0 items-center gap-2.5 max-md:gap-2">
          <Button type="button" variant="secondary" title="Ver produtos" className={pillButton} onClick={props.onOpenItems}>
            <LayoutGridIcon className="text-muted-foreground" />
            ITENS
          </Button>
          <Button
            type="button"
            variant="secondary"
            title="Digitar quantidade"
            aria-pressed={numpadOpen}
            className={cn(
              pillButton,
              "px-3 text-xs has-[>svg]:px-3 md:hidden",
              numpadOpen && "border-brand-dark bg-primary text-primary-foreground hover:bg-primary"
            )}
            onClick={props.onToggleNumpad}
          >
            <CalculatorIcon />
            QTD
          </Button>
          <span className="text-base font-black whitespace-nowrap text-primary" data-testid="order-total">
            TOTAL: {formatBRL(total)}
          </span>
        </div>
      </div>

      {/* Busca + teclado: sempre visíveis no computador; recolhíveis no celular */}
      <div
        data-testid="search-numpad"
        data-expanded={numpadOpen}
        className={cn(
          "pdv-scroll md:contents",
          "max-md:overflow-hidden max-md:transition-[max-height] max-md:duration-250 max-md:ease-out",
          numpadOpen ? "max-md:max-h-[360px] max-md:overflow-y-auto" : "max-md:max-h-0"
        )}
      >
        <div className="flex shrink-0 items-center border-b border-border px-3 py-2">
          <InputGroup>
            <InputGroupAddon>
              <SearchIcon />
            </InputGroupAddon>
            <InputGroupInput
              id="search-input"
              placeholder="Pesquisar item..."
              autoComplete="off"
              value={search}
              onChange={(e) => props.onSearch(e.target.value)}
              className="text-[13px] font-semibold"
            />
            <InputGroupAddon align="inline-end">
              <InputGroupButton
                size="icon-sm"
                aria-label="Limpar busca"
                className="relative after:absolute after:-inset-2"
                onClick={props.onClearSearch}
              >
                <XIcon />
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
        </div>

        <div className="shrink-0 border-t border-border bg-card px-4 py-3.5 max-md:p-2.5">
          <div className="mb-2.5 flex items-center justify-between rounded-[10px] border-[1.5px] border-border bg-background px-4 py-2.5 max-md:mb-1.5 max-md:px-3 max-md:py-2">
            <span className="text-[10px] font-extrabold tracking-[.05em] text-muted-foreground uppercase">Qtd / Valor</span>
            <span className="text-xl font-black text-primary max-md:text-[15px]" data-testid="numpad-value">
              {qtyStr || "—"}
            </span>
          </div>
          <Numpad keys={QTY_KEYS} variant="qty" onKey={props.onNumpadKey} />
        </div>
      </div>

      {/* Resumo (oculto no celular: o total já está na barra) */}
      <div className="flex shrink-0 flex-col gap-1.5 border-t-[1.5px] border-border bg-card px-[18px] py-3.5 max-md:hidden">
        <div className="flex justify-between text-[13px] font-bold text-muted-foreground">
          <span>Subtotal</span>
          <span>{formatBRL(total)}</span>
        </div>
        <div className="mt-1.5 flex items-baseline justify-between border-t-[1.5px] border-border pt-2.5 text-base font-black text-foreground">
          <span>Total a Pagar</span>
          <span className="text-xl text-primary">{formatBRL(total)}</span>
        </div>
      </div>
    </div>
  )
}
