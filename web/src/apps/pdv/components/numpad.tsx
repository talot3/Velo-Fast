import { DeleteIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/** Ordem das teclas de cada teclado (igual ao PDV antigo). */
export const QTY_KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "DEL"]
export const CASH_KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "00", "0", "DEL"]
export const PAY_KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "00", "DEL"]

type NumpadProps = {
  keys: string[]
  onKey: (key: string) => void
  /** "qty" = teclado da tela de vendas; "cash" = suprimento, sangria e pagamento. */
  variant?: "qty" | "cash"
  className?: string
  keyClassName?: string
}

const noFocus = (e: React.MouseEvent) => e.preventDefault()

/** Teclado numérico de 3 colunas, tocável (≥ 46 px). */
export function Numpad({ keys, onKey, variant = "cash", className, keyClassName }: NumpadProps) {
  return (
    <div className={cn("grid grid-cols-3 gap-2", className)}>
      {keys.map((k) => {
        const del = k === "DEL"
        return (
          <Button
            key={k}
            type="button"
            variant="secondary"
            aria-label={del ? "Apagar" : k}
            onMouseDown={noFocus}
            onClick={() => onKey(k)}
            className={cn(
              "h-auto min-h-[46px] border-[1.5px] border-border font-extrabold text-foreground",
              variant === "qty"
                ? "rounded-[10px] bg-background px-2 py-3.5 text-[19px] shadow-none hover:border-input hover:bg-secondary active:bg-border max-md:py-3 max-md:text-[17px]"
                : "rounded-md bg-secondary px-2 py-3.5 text-xl hover:bg-border",
              del && "text-destructive [&_svg:not([class*='size-'])]:size-5",
              keyClassName
            )}
          >
            {del ? variant === "qty" ? "⌫" : <DeleteIcon /> : k}
          </Button>
        )
      })}
    </div>
  )
}
