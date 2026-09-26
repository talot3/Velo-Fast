import { useEffect, useState } from "react"
import { ChevronDownIcon, MenuIcon, PowerIcon, PrinterIcon } from "lucide-react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { useStoreSettings } from "@/data/settings"
import { useAuth } from "@/lib/auth"

import { ancestorsOf, NAV, type NavNode, type PageId } from "../nav"

type Props = { page: PageId; onNavigate: (page: PageId) => void }

export function AppSidebar({ page, onNavigate }: Props) {
  const { toggleSidebar, isMobile, setOpenMobile } = useSidebar()
  const { profile, logout } = useAuth()
  const settings = useStoreSettings()
  const [open, setOpen] = useState<Set<string>>(() => new Set(ancestorsOf(page) ?? []))

  // Ao navegar, abre os acordeões que contêm a página (sem fechar os outros).
  useEffect(() => {
    const trail = ancestorsOf(page) ?? []
    setOpen((prev) => (trail.every((id) => prev.has(id)) ? prev : new Set([...prev, ...trail])))
  }, [page])

  const go = (p: PageId) => {
    onNavigate(p)
    if (isMobile) setOpenMobile(false)
  }
  const toggle = (id: string, value: boolean) =>
    setOpen((prev) => {
      const next = new Set(prev)
      if (value) next.add(id)
      else next.delete(id)
      return next
    })

  function renderSub(nodes: NavNode[]) {
    return nodes.map((node) => {
      if (node.kind === "label") return null
      if (node.kind === "page") {
        return (
          <SidebarMenuSubItem key={node.page}>
            <SidebarMenuSubButton asChild isActive={node.page === page} className="data-[active=true]:bg-card data-[active=true]:font-semibold data-[active=true]:shadow-sm data-[active=true]:[&>svg]:text-primary">
              <button type="button" onClick={() => go(node.page)}>
                <node.icon />
                <span>{node.label}</span>
              </button>
            </SidebarMenuSubButton>
          </SidebarMenuSubItem>
        )
      }
      return (
        <Collapsible key={node.id} open={open.has(node.id)} onOpenChange={(v) => toggle(node.id, v)} asChild>
          <SidebarMenuSubItem>
            <CollapsibleTrigger asChild>
              <SidebarMenuSubButton asChild>
                <button type="button" className="group/sub">
                  <node.icon />
                  <span>{node.label}</span>
                  <ChevronDownIcon className="ml-auto transition-transform group-data-[state=open]/sub:rotate-180" />
                </button>
              </SidebarMenuSubButton>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarMenuSub>{renderSub(node.children)}</SidebarMenuSub>
            </CollapsibleContent>
          </SidebarMenuSubItem>
        </Collapsible>
      )
    })
  }

  return (
    <Sidebar collapsible="icon" data-print-hide>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-1 py-1.5 group-data-[collapsible=icon]:justify-center">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground group-data-[collapsible=icon]:hidden">
            <PrinterIcon />
          </div>
          <span className="text-xl font-black tracking-tight group-data-[collapsible=icon]:hidden">VELO</span>
          <Button variant="ghost" size="icon-sm" className="ml-auto group-data-[collapsible=icon]:ml-0" onClick={toggleSidebar} aria-label="Recolher menu">
            <MenuIcon />
          </Button>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            {NAV.map((node) => {
              if (node.kind === "label") {
                return (
                  <SidebarGroupLabel key={node.label} className="mt-2">
                    {node.label}
                  </SidebarGroupLabel>
                )
              }
              if (node.kind === "page") {
                return (
                  <SidebarMenuItem key={node.page}>
                    <SidebarMenuButton isActive={node.page === page} tooltip={node.label} onClick={() => go(node.page)} className="data-[active=true]:bg-card data-[active=true]:font-semibold data-[active=true]:shadow-sm data-[active=true]:[&>svg]:text-primary">
                      <node.icon />
                      <span>{node.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              }
              return (
                <Collapsible key={node.id} open={open.has(node.id)} onOpenChange={(v) => toggle(node.id, v)} asChild className="group/collapsible">
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton tooltip={node.label}>
                        <node.icon />
                        <span>{node.label}</span>
                        <ChevronDownIcon className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-180" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>{renderSub(node.children)}</SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              )
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <div className="flex items-center gap-3 rounded-lg border bg-card p-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:border-0 group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:p-0">
          <Avatar className="group-data-[collapsible=icon]:hidden">
            <AvatarFallback>{(profile?.username ?? "G").slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="flex min-w-0 flex-col group-data-[collapsible=icon]:hidden">
            <span className="truncate text-sm font-bold">Modo Gestor</span>
            <span className="truncate text-xs text-muted-foreground">
              Online | v{settings.data?.currentVersion ?? "1.0.0"}
            </span>
          </div>
          <Button variant="outline" size="icon-sm" className="ml-auto rounded-full group-data-[collapsible=icon]:ml-0" onClick={() => void logout()} aria-label="Sair">
            <PowerIcon />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
