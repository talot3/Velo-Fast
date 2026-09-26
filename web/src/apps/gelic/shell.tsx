import type { CSSProperties } from "react"
import { LogOutIcon, ShieldCheckIcon, ShieldIcon, StoreIcon } from "lucide-react"

import { useConfirm } from "@/components/app/confirm-dialog"
import { LiveClock } from "@/components/app/live-clock"
import { Button } from "@/components/ui/button"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useAuth } from "@/lib/auth"

import { StoresPanel } from "./stores-panel"

/** Layout do GELIC: menu lateral de 260px, cabeçalho de 64px e conteúdo com rolagem própria. */
export function GelicShell() {
  return (
    <SidebarProvider style={{ "--sidebar-width": "260px" } as CSSProperties} className="h-svh overflow-hidden">
      <GelicSidebar />
      <SidebarInset className="min-w-0 overflow-hidden">
        <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b bg-card px-4 md:px-8">
          <div className="flex min-w-0 items-center gap-2">
            <SidebarTrigger className="md:hidden" aria-label="Abrir menu" />
            <h2 id="page-title" className="truncate text-lg font-bold tracking-tight">
              Licenciamento e Filiais
            </h2>
          </div>
          <LiveClock className="w-20 shrink-0 font-bold tabular-nums text-primary" />
        </header>
        <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8">
          <StoresPanel />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

function GelicSidebar() {
  const { logout } = useAuth()
  const confirm = useConfirm()
  const { isMobile, setOpenMobile } = useSidebar()

  async function handleLogout() {
    if (!(await confirm("Deseja realmente sair do GELIC?", { confirmLabel: "Sair" }))) return
    await logout()
  }

  return (
    <Sidebar className="*:data-[slot=sidebar-inner]:bg-card">
      <SidebarHeader className="px-4 pt-6 pb-8">
        <div className="flex items-center gap-3 px-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <ShieldIcon aria-hidden className="size-5" strokeWidth={3} />
          </div>
          <h1 className="text-lg font-extrabold tracking-tight text-primary">GELIC</h1>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-4">
        <SidebarGroup className="p-0">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                isActive
                className="h-10 gap-2.5 px-3.5 text-[13.5px] font-semibold text-muted-foreground data-[active=true]:font-semibold data-[active=true]:text-primary"
                onClick={() => isMobile && setOpenMobile(false)}
              >
                <StoreIcon />
                <span>Licenciamento Lojas</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="px-4 pt-2 pb-6">
        <div className="flex items-center gap-3 rounded-md border bg-accent p-3">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <ShieldCheckIcon aria-hidden className="size-5" />
          </div>
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-[13px] font-bold">GELIC</span>
            <span className="truncate text-[11px] text-muted-foreground">Painel do Revendedor</span>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Sair do GELIC"
                className="text-muted-foreground hover:bg-transparent hover:text-destructive"
                onClick={() => void handleLogout()}
              >
                <LogOutIcon />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Sair do GELIC</TooltipContent>
          </Tooltip>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
