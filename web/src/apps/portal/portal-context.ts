import { createContext, useContext } from "react"

import type { PageId } from "./nav"

export type PortalNav = {
  page: PageId
  navigate: (page: PageId) => void
}

export const PortalNavContext = createContext<PortalNav | null>(null)

/** Navegação entre páginas do portal (ex.: atalhos da tela Início). */
export function usePortalNav(): PortalNav {
  const ctx = useContext(PortalNavContext)
  if (!ctx) throw new Error("usePortalNav fora do portal")
  return ctx
}
