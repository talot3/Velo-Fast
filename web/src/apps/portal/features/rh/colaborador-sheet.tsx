/**
 * Painel lateral "Diagnóstico Científico" da Gestão de Skills
 * (portal/app.js:10935-10974 e 11210-11295): iniciais, nome, cargo |
 * departamento, skills e o radar Big Five (0-100).
 */
import { useRef } from "react"
import { ShieldCheckIcon } from "lucide-react"
import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart } from "recharts"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"

import { DetailLabel, Tag, type Tone } from "./kit"
import { iniciais } from "./logic"
import type { Colaborador } from "./types"

/** Eixos do radar, na ordem de `pontuacoes`. */
const EIXOS = ["Extroversão", "Conscienciosidade", "Estabilidade", "Amabilidade", "Abertura"] as const

const chartConfig = {
  valor: { label: "Atributos Big Five", color: "var(--chart-5)" },
} satisfies ChartConfig

export function ColaboradorSheet({
  colaborador,
  open,
  onOpenChange,
}: {
  colaborador: Colaborador | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const contentRef = useRef<HTMLDivElement>(null)
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        ref={contentRef}
        side="right"
        className="w-full gap-0 bg-card p-6 outline-none sm:max-w-[450px]"
        // Foco no painel ao abrir: o gráfico (navegável pelo teclado) não
        // recebe o foco inicial, que abriria a dica dele sozinha.
        onOpenAutoFocus={(e) => {
          e.preventDefault()
          contentRef.current?.focus()
        }}
      >
        {colaborador ? <Diagnostico colaborador={colaborador} /> : null}
      </SheetContent>
    </Sheet>
  )
}

function SkillList({ label, items, tone }: { label: string; items: string[]; tone: Tone }) {
  return (
    <div className="flex flex-col gap-1.5">
      <DetailLabel>{label}</DetailLabel>
      <div className="flex flex-wrap gap-1">
        {items.map((s, i) => (
          <Tag key={`${i}-${s}`} tone={tone}>
            {s}
          </Tag>
        ))}
      </div>
    </div>
  )
}

function Diagnostico({ colaborador: c }: { colaborador: Colaborador }) {
  const data = EIXOS.map((eixo, i) => ({ eixo, valor: Number(c.pontuacoes?.[i]) || 0 }))
  return (
    <>
      <SheetHeader className="border-b p-0 pr-8 pb-3.5">
        <SheetTitle className="flex items-center gap-2 font-black tracking-tight">
          <ShieldCheckIcon className="size-[18px] text-primary" aria-hidden />
          Diagnóstico Científico
        </SheetTitle>
      </SheetHeader>
      <div className="-mr-2 flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pt-5 pr-2 [scrollbar-width:thin]">
        <div className="flex flex-col items-center border-b pb-3.5 text-center">
          <Avatar className="mb-3 size-16 shadow-sm">
            <AvatarFallback className="bg-primary text-2xl font-black text-primary-foreground">{iniciais(c.nome)}</AvatarFallback>
          </Avatar>
          <h4 className="text-base font-black tracking-tight">{c.nome}</h4>
          <SheetDescription className="mt-1 text-xs font-semibold">
            {c.cargo} | {c.depto}
          </SheetDescription>
        </div>

        <SkillList label="Hard Skills Principais" items={c.hardSkills ?? []} tone="blue" />
        <SkillList label="Soft Skills Mapeadas" items={c.softSkills ?? []} tone="info" />

        <div className="mt-2 flex flex-col gap-3">
          <DetailLabel>Mapeamento comportamental Big Five</DetailLabel>
          <div className="flex min-h-[240px] items-center justify-center rounded-xl border bg-background p-4">
            <ChartContainer
              config={chartConfig}
              className="aspect-auto h-[260px] w-full [&_.recharts-polar-angle-axis-tick_text]:fill-muted-foreground"
            >
              {/* Raio fixo: sobra espaço para "Conscienciosidade" sem cortar. */}
              <RadarChart data={data} outerRadius={80}>
                <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                <PolarGrid />
                <PolarAngleAxis dataKey="eixo" tick={{ fontSize: 10, fontWeight: 700 }} />
                <PolarRadiusAxis domain={[0, 100]} tickCount={6} tick={false} axisLine={false} />
                <Radar
                  dataKey="valor"
                  fill="var(--color-valor)"
                  fillOpacity={0.16}
                  stroke="var(--color-valor)"
                  strokeWidth={2}
                  dot={{ r: 3, fillOpacity: 1 }}
                />
              </RadarChart>
            </ChartContainer>
          </div>
          <span className="block text-center text-[10px] font-semibold text-muted-foreground">
            Eixo 0-100 para correspondência de fit de competência corporativa
          </span>
        </div>
      </div>
    </>
  )
}
