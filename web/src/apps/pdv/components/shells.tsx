import type { ComponentProps, ReactNode } from "react"
import { ArrowRightIcon, XIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

import { useSwipeClose } from "../hooks/use-swipe-close"

/** Ao abrir, o foco vai para o próprio painel (não para um botão: Enter não "clica" sem querer). */
const focusPanel = (e: Event) => {
  e.preventDefault()
  ;(e.currentTarget as HTMLElement | null)?.focus({ preventScroll: true })
}

type PdvDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Nome da sobreposição (os atalhos de teclado sabem qual está aberta). */
  name: string
  className?: string
  children: ReactNode
  /** Esc fecha? (o suprimento não fecha) */
  escapeCloses?: boolean
}

/**
 * Modal do caixa (pagamento, cupom, sangria, suprimento, fechamento). Como
 * no antigo, clicar fora não fecha; Esc fecha (menos o suprimento).
 */
export function PdvDialog({ open, onOpenChange, name, className, children, escapeCloses = true }: PdvDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-pdv-overlay={name}
        showCloseButton={false}
        aria-describedby={undefined}
        onOpenAutoFocus={focusPanel}
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => {
          if (!escapeCloses) e.preventDefault()
        }}
        className={cn(
          "flex max-h-[92svh] flex-col gap-0 overflow-hidden rounded-2xl border-border bg-card p-0 shadow-[0_12px_32px_-8px_rgba(0,0,0,0.5),0_2px_6px_rgba(0,0,0,0.3)] outline-none",
          className
        )}
      >
        {children}
      </DialogContent>
    </Dialog>
  )
}

type SideDrawerProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  name: string
  /** Largura: gavetas de itens/listas (460 px) ou menu (300 px). */
  size?: "wide" | "slim"
  /** Deslizar para a direita fecha (itens, menu, reimpressão, cancelamento). */
  swipe?: boolean
  className?: string
  children: ReactNode
}

/** Gaveta lateral direita (antigo .itens-drawer / .menu-drawer). */
export function SideDrawer({ open, onOpenChange, name, size = "wide", swipe = true, className, children }: SideDrawerProps) {
  const swipeHandlers = useSwipeClose(() => onOpenChange(false), swipe)
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        data-pdv-overlay={name}
        showCloseButton={false}
        aria-describedby={undefined}
        onOpenAutoFocus={focusPanel}
        {...swipeHandlers}
        className={cn(
          "gap-0 overflow-hidden border-l-0 bg-card p-0 shadow-[-8px_0_32px_rgba(0,0,0,0.2)] outline-none data-[state=closed]:duration-300 data-[state=open]:duration-300 sm:max-w-none",
          size === "wide" ? "w-[min(460px,100vw)]" : "w-[min(300px,92vw)]",
          className
        )}
      >
        {children}
      </SheetContent>
    </Sheet>
  )
}

/** Cabeçalho das gavetas: X redondo, título com ícone e extras à direita. */
export function DrawerHeaderBar({
  icon,
  title,
  onClose,
  children,
  className,
}: {
  icon: ReactNode
  title: string
  onClose: () => void
  children?: ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex shrink-0 items-center gap-3 border-b-[1.5px] border-border bg-secondary px-5 py-4", className)}>
      <CloseRoundButton onClick={onClose} />
      <SheetTitle className="flex items-center gap-2 text-[15px] font-extrabold whitespace-nowrap text-foreground [&_svg:not([class*='size-'])]:size-[18px]">
        {icon}
        {title}
      </SheetTitle>
      {children}
    </div>
  )
}

export function CloseRoundButton({ onClick, className }: { onClick: () => void; className?: string }) {
  return (
    <Button
      type="button"
      variant="secondary"
      aria-label="Fechar"
      onClick={onClick}
      className={cn(
        "relative size-9 shrink-0 rounded-full border-[1.5px] border-border bg-background p-0 text-muted-foreground after:absolute after:-inset-[5px] hover:border-input hover:bg-card hover:text-foreground [&_svg:not([class*='size-'])]:size-5",
        className
      )}
    >
      <XIcon />
    </Button>
  )
}

/** "Dica: Deslize para a direita para fechar" com a seta animada. */
export function SwipeHint() {
  return (
    <div className="flex shrink-0 items-center justify-center gap-2 border-b border-border bg-secondary px-3 py-2 text-[11px] font-bold text-muted-foreground select-none">
      <ArrowRightIcon className="size-3 animate-[pdv-swipe-hint_1.5s_ease-in-out_infinite] text-primary motion-reduce:animate-none" />
      <span>Dica: Deslize para a direita para fechar</span>
    </div>
  )
}

/** Botão pequeno com área de toque ampliada (≥ 46 px) sem mudar o desenho. */
export function TouchButton({ className, ...props }: ComponentProps<typeof Button>) {
  return <Button {...props} className={cn("relative after:absolute after:-inset-2", className)} />
}
