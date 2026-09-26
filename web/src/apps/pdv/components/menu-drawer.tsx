import type { ComponentType } from "react"
import { ChevronRightIcon, CircleXIcon, ClipboardCheckIcon, LogOutIcon, MenuIcon, RotateCcwIcon, WalletIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

import { DrawerHeaderBar, SideDrawer, SwipeHint } from "./shells"

export type MenuAction = "sangria" | "fechamento" | "cancelamento" | "devolucoes" | "sair"

type MenuDrawerProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  terminalId: string
  operator: string
  version: string
  onSelect: (action: MenuAction) => void
}

type Option = { action: MenuAction; title: string; desc: string; icon: ComponentType<{ className?: string }>; iconClass: string }

const OPTIONS: Option[] = [
  { action: "sangria", title: "Sangria", desc: "Retirada de valor do caixa", icon: WalletIcon, iconClass: "text-(--pdv-icon-sangria)" },
  {
    action: "fechamento",
    title: "Fechamento de Caixa",
    desc: "Encerrar o turno atual",
    icon: ClipboardCheckIcon,
    iconClass: "text-(--pdv-icon-fechar)",
  },
  {
    action: "cancelamento",
    title: "Cancelamento",
    desc: "Cancelar últimas vendas (50 tickets)",
    icon: CircleXIcon,
    iconClass: "text-(--pdv-icon-cancel)",
  },
  {
    action: "devolucoes",
    title: "Devoluções",
    desc: "Estornar valor de fichas ou trocar por crédito",
    icon: RotateCcwIcon,
    iconClass: "text-warning",
  },
]

const SAIR: Option = {
  action: "sair",
  title: "Sair",
  desc: "Encerrar sessão do operador",
  icon: LogOutIcon,
  iconClass: "text-(--pdv-icon-cancel)",
}

/** Menu (⋮): Sangria, Fechamento, Cancelamento, Devoluções e Sair. */
export function MenuDrawer({ open, onOpenChange, terminalId, operator, version, onSelect }: MenuDrawerProps) {
  return (
    <SideDrawer open={open} onOpenChange={onOpenChange} name="menu" size="slim">
      <DrawerHeaderBar icon={<MenuIcon className="size-4" />} title="Menu" onClose={() => onOpenChange(false)} />
      <SwipeHint />
      <div className="flex shrink-0 flex-col gap-1 border-b-[1.5px] border-border bg-background px-5 py-[18px]">
        <div className="flex w-full items-center justify-between">
          <span className="text-[10px] font-extrabold tracking-[.08em] text-muted-foreground uppercase">{terminalId || "CAIXA"}</span>
          <span className="text-[11px] font-bold text-muted-foreground opacity-70">Versão {version}</span>
        </div>
        <span className="text-[15px] font-black text-foreground">{operator || "—"}</span>
      </div>
      <nav className="pdv-scroll flex flex-1 flex-col gap-1.5 overflow-y-auto p-3">
        {OPTIONS.map((o) => (
          <MenuOption key={o.action} option={o} onSelect={onSelect} />
        ))}
        <Separator className="mx-2 my-1.5 w-auto" />
        <MenuOption option={SAIR} onSelect={onSelect} danger />
      </nav>
    </SideDrawer>
  )
}

function MenuOption({ option, onSelect, danger }: { option: Option; onSelect: (a: MenuAction) => void; danger?: boolean }) {
  const Icon = option.icon
  return (
    <Button
      type="button"
      variant="ghost"
      data-testid={`menu-${option.action}`}
      className="group h-auto w-full justify-start gap-4 rounded-[10px] border border-transparent px-3.5 py-4 text-left whitespace-normal hover:border-border hover:bg-background active:scale-[.98]"
      onClick={() => onSelect(option.action)}
    >
      <span
        className={cn(
          "flex size-[38px] shrink-0 items-center justify-center rounded-lg border border-border bg-background transition-colors group-hover:border-input group-hover:bg-card",
          option.iconClass
        )}
      >
        <Icon className="size-5" />
      </span>
      <span className="flex flex-1 flex-col gap-0.5">
        <span className={cn("text-sm font-extrabold text-foreground", danger && "text-destructive")}>{option.title}</span>
        <span className="text-[11px] font-medium text-muted-foreground">{option.desc}</span>
      </span>
      <ChevronRightIcon className="size-4 shrink-0 opacity-40" />
    </Button>
  )
}
