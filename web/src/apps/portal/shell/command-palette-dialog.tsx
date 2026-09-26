import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"

import { COMMAND_PAGES, type PageId } from "../nav"

/** Conteúdo da paleta Ctrl/⌘+K (carregado à parte; ver command-palette.tsx). */
export default function CommandPaletteDialog({
  open,
  setOpen,
  onNavigate,
}: {
  open: boolean
  setOpen: (open: boolean) => void
  onNavigate: (page: PageId) => void
}) {
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
