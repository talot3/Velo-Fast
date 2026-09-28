import {
  BarChart2Icon,
  BoxIcon,
  ChevronRightIcon,
  DollarSignIcon,
  LayersIcon,
  PieChartIcon,
  SettingsIcon,
  UsersIcon,
  type LucideIcon,
} from "lucide-react"

import { greetingFor } from "../features/dashboard/greeting"
import type { PageId } from "../nav"
import { preloadPage } from "../page-outlet"
import { usePortalNav } from "../portal-context"

// Atalhos da tela inicial — mesmos módulos, textos e destinos do sistema anterior.
const SHORTCUTS: { page: PageId; icon: LucideIcon; label: string; desc: string }[] = [
  { page: "dashboard", icon: PieChartIcon, label: "Dashboard", desc: "Painel analítico de vendas" },
  { page: "users", icon: UsersIcon, label: "Cadastros", desc: "Operadores e usuários" },
  { page: "products", icon: LayersIcon, label: "Catálogo", desc: "Produtos, grupos e subgrupos" },
  { page: "paymentMethods", icon: DollarSignIcon, label: "Financeiro", desc: "Formas de pagamento" },
  { page: "inventory", icon: BoxIcon, label: "Estoque", desc: "Inventário e controle" },
  { page: "reportSalesByProduct", icon: BarChart2Icon, label: "Relatórios", desc: "Vendas, fechamentos e sangrias" },
  { page: "terminals", icon: SettingsIcon, label: "Ajustes", desc: "Terminais, impressoras e ticket" },
]

/** Iniciar — primeira tela após o login: saudação e atalhos para os módulos. */
export default function HomePage() {
  const { navigate } = usePortalNav()

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1 border-b pb-6">
        <h2 className="text-[17px] font-bold tracking-tight md:text-xl">
          {greetingFor()}, <strong>Gestor</strong>
        </h2>
        <p className="text-[13px] text-muted-foreground">Selecione um módulo para começar</p>
      </div>

      {/* Grade com divisórias de 1px: cada célula desenha sua linha à direita e abaixo (sombra no vão). */}
      <div className="@container">
        <nav
          aria-label="Módulos"
          className="grid grid-cols-1 gap-px overflow-hidden rounded-lg border bg-card @min-[37.5rem]:grid-cols-2 @min-[56.25rem]:grid-cols-3 @min-[75rem]:grid-cols-4 @min-[93.75rem]:grid-cols-5"
        >
          {SHORTCUTS.map(({ page, icon: Icon, label, desc }) => (
            <button
              key={page}
              type="button"
              className="group/shortcut flex w-full min-w-0 items-center gap-3 bg-card px-4.5 py-4 text-left shadow-[1px_0_0_0_var(--border),0_1px_0_0_var(--border),1px_1px_0_0_var(--border)] outline-none transition-colors hover:bg-accent focus-visible:inset-ring-[3px] focus-visible:inset-ring-ring/50 active:bg-border"
              onClick={() => navigate(page)}
              onPointerEnter={() => preloadPage(page)}
              onFocus={() => preloadPage(page)}
            >
              <span className="flex size-8 shrink-0 items-center justify-center text-muted-foreground transition-colors group-hover/shortcut:text-primary">
                <Icon className="size-[18px]" />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-px">
                <span className="truncate text-[13px] font-semibold">{label}</span>
                <span className="truncate text-xs text-muted-foreground">{desc}</span>
              </span>
              <ChevronRightIcon className="size-3.5 shrink-0 text-muted-foreground opacity-30" />
            </button>
          ))}
        </nav>
      </div>
    </div>
  )
}
