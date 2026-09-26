import { useCallback, useEffect, useState } from "react"

import { PAGE_IDS, type PageId } from "./nav"

function readHash(): PageId {
  const id = window.location.hash.replace(/^#\/?/, "").split("?")[0] as PageId
  return PAGE_IDS.includes(id) ? id : "home"
}

/** Página atual guardada na URL (#/produtos) — recarregar mantém a página. */
export function usePortalRoute() {
  const [page, setPage] = useState<PageId>(readHash)
  useEffect(() => {
    const onHash = () => setPage(readHash())
    window.addEventListener("hashchange", onHash)
    return () => window.removeEventListener("hashchange", onHash)
  }, [])
  const navigate = useCallback((next: PageId) => {
    if (readHash() === next) setPage(next)
    else window.location.hash = `/${next}`
  }, [])
  return [page, navigate] as const
}
