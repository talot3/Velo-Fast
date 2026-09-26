import { useMemo } from "react"
import { QueryClientProvider } from "@tanstack/react-query"

import { AuthGate } from "@/components/app/auth-gate"
import { ConfirmProvider } from "@/components/app/confirm-dialog"
import { EmptyState } from "@/components/app/empty-state"
import { Button } from "@/components/ui/button"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { useMasterStores } from "@/data/master"
import { AuthProvider, useAuth } from "@/lib/auth"
import { createQueryClient } from "@/lib/query"
import { useThemeMode } from "@/lib/theme"

import { PAGE_TITLES } from "./nav"
import { PageOutlet } from "./page-outlet"
import { PortalNavContext } from "./portal-context"
import { usePortalRoute } from "./router"
import { AppSidebar } from "./shell/app-sidebar"
import { CommandPalette } from "./shell/command-palette"
import { TopBar } from "./shell/top-bar"

/** O master precisa escolher uma loja antes de administrar. */
function MasterStorePicker() {
  const { selectStore } = useAuth()
  const stores = useMasterStores()
  return (
    <div className="mx-auto flex min-h-svh max-w-md flex-col justify-center gap-4 p-6">
      <h1 className="text-xl font-extrabold">Selecionar Filial</h1>
      {(stores.data ?? [])
        .filter((s) => s.active)
        .map((s) => (
          <Button key={s.id} variant="outline" className="justify-start" onClick={() => selectStore(s.id)}>
            {s.id} — {s.name}
          </Button>
        ))}
      {stores.data && stores.data.length === 0 ? <EmptyState title="Nenhuma loja adicional liberada no GELIC." /> : null}
    </div>
  )
}

function PortalShell() {
  const { storeId } = useAuth()
  const [page, navigate] = usePortalRoute()
  const nav = useMemo(() => ({ page, navigate }), [page, navigate])
  if (!storeId) return <MasterStorePicker />
  return (
    <PortalNavContext.Provider value={nav}>
      <SidebarProvider style={{ "--sidebar-width": "260px" } as React.CSSProperties}>
        <AppSidebar page={page} onNavigate={navigate} />
        <SidebarInset className="min-w-0">
          <TopBar title={PAGE_TITLES[page]} />
          <main className="flex-1 overflow-x-hidden p-4 md:p-6">
            <PageOutlet page={page} />
          </main>
        </SidebarInset>
        <CommandPalette onNavigate={navigate} />
      </SidebarProvider>
    </PortalNavContext.Provider>
  )
}

export function App() {
  const queryClient = useMemo(() => createQueryClient(), [])
  const { isDark } = useThemeMode()
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider minRole="supervisor">
        <TooltipProvider>
          <ConfirmProvider>
            <AuthGate>
              <PortalShell />
            </AuthGate>
          </ConfirmProvider>
        </TooltipProvider>
      </AuthProvider>
      <Toaster theme={isDark ? "dark" : "light"} position="bottom-center" richColors />
    </QueryClientProvider>
  )
}
