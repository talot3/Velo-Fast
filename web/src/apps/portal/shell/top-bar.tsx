import { useState } from "react"
import { MoonIcon, RefreshCwIcon, SunIcon } from "lucide-react"
import { useQueryClient } from "@tanstack/react-query"

import { LiveClock } from "@/components/app/live-clock"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { useThemeMode } from "@/lib/theme"
import { cn } from "@/lib/utils"

import { StoreSwitcher } from "./store-switcher"

export function TopBar({ title }: { title: string }) {
  const qc = useQueryClient()
  const { isDark, toggle } = useThemeMode()
  const [syncing, setSyncing] = useState(false)

  async function sync() {
    setSyncing(true)
    await qc.invalidateQueries()
    setTimeout(() => setSyncing(false), 600)
  }

  return (
    <header data-print-hide className="sticky top-0 z-20 flex min-h-16 flex-wrap items-center gap-3 border-b bg-card/95 px-4 py-2 backdrop-blur md:px-6">
      <SidebarTrigger className="md:hidden" />
      <h2 id="page-title" className="min-w-0 flex-1 truncate text-lg font-extrabold tracking-tight md:text-xl">
        {title}
      </h2>
      <StoreSwitcher />
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" onClick={() => void sync()} disabled={syncing} aria-label="Sincronizar com o servidor">
          <RefreshCwIcon className={cn(syncing && "animate-spin")} />
        </Button>
        <Button variant="ghost" size="icon" onClick={toggle} aria-label="Alternar tema">
          {isDark ? <MoonIcon /> : <SunIcon />}
        </Button>
        <Separator orientation="vertical" className="mx-1 h-6" />
        <LiveClock className="w-14 text-center font-bold tabular-nums text-primary" />
      </div>
    </header>
  )
}
