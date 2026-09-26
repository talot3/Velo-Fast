import { toast } from "sonner"

/**
 * Aviso do caixa: como o antigo, um aviso novo substitui o anterior (mesmo
 * id) e some sozinho depois de 2,8 s.
 */
export function notify(message: string, duration = 2800) {
  toast(message, { id: "pdv-toast", duration })
}

/** Aviso que não pode ser coberto pelo próximo (ex.: venda rejeitada na sincronização). */
export function alertNotify(message: string, duration = 10_000) {
  toast.error(message, { duration })
}
