import { useEffect, useEffectEvent } from "react"

/** O foco está num campo de texto? (as teclas ficam com o campo) */
export function isTypingTarget(target: EventTarget | null) {
  const el = target as HTMLElement | null
  if (!el) return false
  const tag = (el.tagName || "").toUpperCase()
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable
}

/**
 * Há um diálogo aberto que não é do caixa (confirmação, autorização do
 * supervisor)? Nesse caso o teclado não mexe em nada atrás dele.
 */
export function foreignDialogOpen() {
  return Boolean(document.querySelector('[role="alertdialog"], [role="dialog"]:not([data-pdv-overlay])'))
}

/**
 * Atalhos de teclado do caixa (números, ponto, Backspace, Enter). Esc fica
 * com os próprios diálogos (fecham o de cima).
 */
export function usePdvKeys(enabled: boolean, handler: (ev: KeyboardEvent) => void) {
  const onKey = useEffectEvent((ev: KeyboardEvent) => {
    if (ev.defaultPrevented || ev.isComposing || ev.ctrlKey || ev.metaKey || ev.altKey) return
    if (ev.key === "Escape") return
    if (isTypingTarget(ev.target)) return
    if (foreignDialogOpen()) return
    handler(ev)
  })
  useEffect(() => {
    if (!enabled) return
    const listener = (ev: KeyboardEvent) => onKey(ev)
    window.addEventListener("keydown", listener)
    return () => window.removeEventListener("keydown", listener)
  }, [enabled])
}

/** Tecla de numpad: dígito → "0".."9", Backspace → "DEL", ponto → ".". */
export function numpadKey(ev: KeyboardEvent): string | null {
  if (/^[0-9]$/.test(ev.key)) return ev.key
  if (ev.key === "Backspace") return "DEL"
  if (ev.key === "." || ev.key === ",") return "."
  return null
}
