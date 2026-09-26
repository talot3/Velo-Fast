import { Component, lazy, Suspense, type ComponentType, type LazyExoticComponent, type ReactNode } from "react"
import { TriangleAlertIcon } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

import type { PageId } from "./nav"

// Cada página é um arquivo em ./pages/<id>.tsx, baixado só quando aberto.
const modules = import.meta.glob<{ default: ComponentType }>("./pages/*.tsx")
const cache = new Map<PageId, LazyExoticComponent<ComponentType>>()

function pageComponent(id: PageId) {
  let comp = cache.get(id)
  if (!comp) {
    const loader = modules[`./pages/${id}.tsx`]
    comp = lazy(loader ?? (async () => ({ default: () => <p>Página não encontrada.</p> })))
    cache.set(id, comp)
  }
  return comp
}

/** Pré-carrega uma página (ex.: ao passar o mouse no menu). */
export function preloadPage(id: PageId) {
  void modules[`./pages/${id}.tsx`]?.()
}

class PageErrorBoundary extends Component<{ children: ReactNode; resetKey: string }, { error: Error | null }> {
  state = { error: null as Error | null }
  static getDerivedStateFromError(error: Error) {
    return { error }
  }
  componentDidUpdate(prev: { resetKey: string }) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null })
  }
  render() {
    if (!this.state.error) return this.props.children
    return (
      <Alert variant="destructive">
        <TriangleAlertIcon />
        <AlertTitle>Não foi possível abrir esta página.</AlertTitle>
        <AlertDescription className="flex flex-col items-start gap-3">
          <span>{this.state.error.message}</span>
          <Button size="sm" variant="outline" onClick={() => window.location.reload()}>
            Recarregar
          </Button>
        </AlertDescription>
      </Alert>
    )
  }
}

function PageSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  )
}

export function PageOutlet({ page }: { page: PageId }) {
  const Page = pageComponent(page)
  return (
    <PageErrorBoundary resetKey={page}>
      <Suspense fallback={<PageSkeleton />}>
        <div key={page} className="animate-in fade-in-0 duration-200">
          <Page />
        </div>
      </Suspense>
    </PageErrorBoundary>
  )
}
