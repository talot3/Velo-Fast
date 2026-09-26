import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { buttonVariants } from "@/components/ui/button"

type ConfirmOptions = {
  title?: string
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
}

type Pending = { message: string; options: ConfirmOptions; resolve: (ok: boolean) => void }

const ConfirmContext = createContext<((message: string, options?: ConfirmOptions) => Promise<boolean>) | null>(null)

/** Substitui o confirm() nativo por um diálogo (mesmas mensagens do sistema). */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<Pending | null>(null)
  const pendingRef = useRef<Pending | null>(null)

  const confirm = useCallback((message: string, options: ConfirmOptions = {}) => {
    return new Promise<boolean>((resolve) => {
      const p = { message, options, resolve }
      pendingRef.current = p
      setPending(p)
    })
  }, [])

  const close = (ok: boolean) => {
    pendingRef.current?.resolve(ok)
    pendingRef.current = null
    setPending(null)
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <AlertDialog open={Boolean(pending)} onOpenChange={(open) => !open && close(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{pending?.options.title ?? "Confirmação"}</AlertDialogTitle>
            <AlertDialogDescription className="whitespace-pre-line">{pending?.message}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => close(false)}>{pending?.options.cancelLabel ?? "Voltar"}</AlertDialogCancel>
            <AlertDialogAction
              className={pending?.options.destructive ? buttonVariants({ variant: "destructive" }) : undefined}
              onClick={() => close(true)}
            >
              {pending?.options.confirmLabel ?? "Confirmar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ConfirmContext.Provider>
  )
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext)
  if (!ctx) throw new Error("useConfirm fora do ConfirmProvider")
  return ctx
}
