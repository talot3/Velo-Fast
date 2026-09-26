import { ChevronDownIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { PRODUCT_ICON_NAMES, productIcon } from "@/lib/product-icons"

/** Seletor do ícone do produto (17 ícones), ao lado do título do cadastro. */
export function IconPicker({ value, onChange }: { value: string; onChange: (icon: string) => void }) {
  const Current = productIcon(value)
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="capitalize" aria-label={`Ícone do produto: ${value}`}>
          <Current data-icon="inline-start" />
          {value}
          <ChevronDownIcon data-icon="inline-end" className="text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-80 min-w-48">
        <DropdownMenuGroup>
          {PRODUCT_ICON_NAMES.map((name) => {
            const Icon = productIcon(name)
            return (
              <DropdownMenuItem key={name} className="gap-3 font-semibold capitalize" onSelect={() => onChange(name)}>
                <Icon />
                {name}
              </DropdownMenuItem>
            )
          })}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
