import { useEffect, useState } from "react"

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"

import { COMMAND_PAGES, type PageId } from "../nav"

/** Paleta Ctrl/⌘+K para ir a qualquer página. */
export function CommandPalette({ onNavigate }: { onNavigate: (page: PageId) => void }) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setOpen((o) => !o)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  return (
    <CommandDialog open={open} onOpenChange={setOpen} title="Buscar página" description="Ir para uma página do portal">
      <CommandInput placeholder="Buscar uma página... (ex: DRE, Produtos, Terminais)" />
      <CommandList>
        <CommandEmpty>Nenhuma página encontrada.</CommandEmpty>
        <CommandGroup heading="Páginas">
          {COMMAND_PAGES.map((p) => (
            <CommandItem
              key={p.page}
              value={`${p.label} ${p.page}`}
              onSelect={() => {
                onNavigate(p.page)
                setOpen(false)
              }}
            >
              {p.label}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
