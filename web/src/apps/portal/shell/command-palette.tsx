import { lazy, Suspense, useEffect, useState } from "react"

import type { PageId } from "../nav"

// O diálogo (e a biblioteca cmdk) fica num arquivo à parte, baixado quando o
// portal fica ocioso — não pesa na abertura e o primeiro Ctrl+K é imediato.
const loadDialog = () => import("./command-palette-dialog")
const CommandPaletteDialog = lazy(loadDialog)

/** Paleta Ctrl/⌘+K para ir a qualquer página. */
export function CommandPalette({ onNavigate }: { onNavigate: (page: PageId) => void }) {
  const [open, setOpen] = useState(false)
  const [used, setUsed] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setUsed(true)
        setOpen((o) => !o)
      }
    }
    window.addEventListener("keydown", onKey)
    const prefetch = window.setTimeout(() => void loadDialog(), 3000)
    return () => {
      window.removeEventListener("keydown", onKey)
      window.clearTimeout(prefetch)
    }
  }, [])

  if (!used) return null
  return (
    <Suspense fallback={null}>
      <CommandPaletteDialog open={open} setOpen={setOpen} onNavigate={onNavigate} />
    </Suspense>
  )
}
