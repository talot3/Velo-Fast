import { useRef, type TouchEvent } from "react"

/**
 * Deslizar para a direita fecha a gaveta (regra antiga: mais de 80 px para
 * a direita, com pouca variação vertical).
 */
export function useSwipeClose(onClose: () => void, enabled = true) {
  const start = useRef<{ x: number; y: number } | null>(null)
  if (!enabled) return {}
  return {
    onTouchStart: (e: TouchEvent) => {
      const t = e.changedTouches[0]
      start.current = { x: t.screenX, y: t.screenY }
    },
    onTouchEnd: (e: TouchEvent) => {
      const s = start.current
      start.current = null
      if (!s) return
      const t = e.changedTouches[0]
      const dx = t.screenX - s.x
      const dy = t.screenY - s.y
      if (dx > 80 && Math.abs(dy) < dx * 0.6) onClose()
    },
  }
}
