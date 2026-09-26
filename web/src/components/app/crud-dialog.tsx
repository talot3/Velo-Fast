import type { FormEvent, ReactNode } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"

type CrudDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  /** Conteúdo extra no cabeçalho (ex.: seletor de ícone do produto). */
  headerExtra?: ReactNode
  children: ReactNode
  /** Rótulo do botão principal (ex.: "Gravar", "Gravar Registro"). */
  submitLabel?: string
  onSubmit: () => void | Promise<void>
  submitting?: boolean
  submitDisabled?: boolean
  /** Botões extras à esquerda do principal (ex.: "Testar Impressão"). */
  extraActions?: ReactNode
  /** "lg" = 980px como o modal de cadastro antigo; "md" = 640px. */
  size?: "md" | "lg"
}

/**
 * Modal de cadastro padrão do portal (o antigo #product-modal): título,
 * corpo com formulário e rodapé "Cancelar" + botão de gravar.
 */
export function CrudDialog({
  open,
  onOpenChange,
  title,
  description,
  headerExtra,
  children,
  submitLabel = "Gravar",
  onSubmit,
  submitting,
  submitDisabled,
  extraActions,
  size = "lg",
}: CrudDialogProps) {
  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    void onSubmit()
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "flex max-h-[92vh] flex-col gap-0 p-0 max-sm:h-full max-sm:max-h-full max-sm:max-w-full max-sm:rounded-none",
          size === "lg" ? "sm:max-w-[min(980px,96vw)]" : "sm:max-w-[min(640px,96vw)]"
        )}
      >
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <DialogHeader className="flex-row items-center gap-3 border-b px-6 py-4">
            {headerExtra}
            <div className="flex flex-col gap-1">
              <DialogTitle>{title}</DialogTitle>
              {description ? <DialogDescription>{description}</DialogDescription> : <DialogDescription className="sr-only">{title}</DialogDescription>}
            </div>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>
          <DialogFooter className="border-t px-6 py-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            {extraActions}
            <Button type="submit" disabled={submitting || submitDisabled}>
              {submitting ? <Spinner data-icon="inline-start" /> : null}
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
