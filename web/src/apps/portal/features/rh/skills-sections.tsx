/**
 * Seções da Gestão de Skills (portal/app.js:10786-10933 e 11071-11207):
 * Matriz de Competências Atuais, Plano de Capacitação & Upskilling e
 * Pipeline de Talentos & Sucessão Estratégica.
 */
import { useMemo, useState, type KeyboardEvent } from "react"
import { GitBranchIcon, GraduationCapIcon, PlusIcon, UsersRoundIcon } from "lucide-react"
import { toast } from "sonner"

import { useConfirm } from "@/components/app/confirm-dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Item, ItemContent, ItemMedia, ItemTitle } from "@/components/ui/item"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useRemoveRecords } from "@/data/records"
import { errorMessage } from "@/lib/errors"
import { cn } from "@/lib/utils"

import { ColaboradorSheet } from "./colaborador-sheet"
import { useCapacitacao, useColaboradores, usePipeline } from "./data"
import {
  DeleteButton,
  EmptyMessage,
  EmptyRow,
  FilterBar,
  LoadError,
  RhPanel,
  SkeletonRows,
  statusTone,
  TableScroll,
  Tag,
  TD,
  TH,
  type FilterOption,
  type Tone,
} from "./kit"
import { filtrarColaboradores, filtrarTrilhas, iniciais, NIVEIS, nivelGeral, sortById, TODOS } from "./logic"
import { TrilhaDialog } from "./trilha-dialog"
import type { Colaborador, Estagio, Talento, Trilha } from "./types"

function SkillTags({ items, tone }: { items: string[]; tone: Tone }) {
  return (
    <div className="flex max-w-[250px] flex-wrap gap-1">
      {items.map((s, i) => (
        <Tag key={`${i}-${s}`} tone={tone}>
          {s}
        </Tag>
      ))}
    </div>
  )
}

// ─── Matriz de Competências Atuais ──────────────────────────────────

const NIVEL_FILTRO: FilterOption[] = [{ value: TODOS, label: "Todos os Níveis" }, ...NIVEIS.map((n) => ({ value: n, label: n }))]

export function MatrizPanel() {
  const query = useColaboradores()
  const [busca, setBusca] = useState("")
  const [nivel, setNivel] = useState(TODOS)
  const [colaborador, setColaborador] = useState<Colaborador | null>(null)
  const [aberto, setAberto] = useState(false)
  const lista = useMemo(() => filtrarColaboradores(query.data?.items ?? [], busca, nivel), [query.data, busca, nivel])

  function abrir(c: Colaborador) {
    setColaborador(c)
    setAberto(true)
  }

  function onRowKey(e: KeyboardEvent, c: Colaborador) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      abrir(c)
    }
  }

  return (
    <RhPanel
      fixed
      icon={UsersRoundIcon}
      iconTone="brand"
      title="Matriz de Competências Atuais"
      subtitle="Profissionais homologados. Clique na linha para abrir o Gráfico de Radar (Big Five)"
    >
      <FilterBar
        search={busca}
        onSearch={setBusca}
        placeholder="Buscar colaborador ou departamento..."
        filter={nivel}
        onFilter={setNivel}
        filterLabel="Filtrar por nível"
        options={NIVEL_FILTRO}
      />
      <TableScroll className="rounded-lg border bg-background">
        <Table className="min-w-[650px]">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead scope="col" className={TH}>Colaborador</TableHead>
              <TableHead scope="col" className={TH}>Departamento</TableHead>
              <TableHead scope="col" className={TH}>Nível</TableHead>
              <TableHead scope="col" className={TH}>Hard Skills Principais</TableHead>
              <TableHead scope="col" className={TH}>Soft Skills Mapeadas</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {query.isPending ? (
              <SkeletonRows colSpan={5} />
            ) : query.isError ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={5} className="whitespace-normal">
                  <LoadError error={query.error} onRetry={() => void query.refetch()} />
                </TableCell>
              </TableRow>
            ) : lista.length === 0 ? (
              <EmptyRow colSpan={5}>Nenhum colaborador localizado com os critérios informados.</EmptyRow>
            ) : (
              lista.map((c) => (
                <TableRow
                  key={c.id}
                  tabIndex={0}
                  onClick={() => abrir(c)}
                  onKeyDown={(e) => onRowKey(e, c)}
                  className="cursor-pointer outline-none focus-visible:bg-muted/50 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:ring-inset"
                >
                  <TableCell className={cn(TD, "min-w-[110px] text-[13px] font-extrabold whitespace-normal")}>{c.nome}</TableCell>
                  <TableCell className={cn(TD, "min-w-[130px] text-xs font-bold whitespace-normal text-muted-foreground")}>
                    {c.depto} <span className="text-[11px] font-medium">({c.cargo})</span>
                  </TableCell>
                  <TableCell className={TD}>
                    <Tag tone="neutral" className="font-black">
                      {nivelGeral(c.cargo)}
                    </Tag>
                  </TableCell>
                  <TableCell className={TD}>
                    <SkillTags items={c.hardSkills ?? []} tone="blue" />
                  </TableCell>
                  <TableCell className={TD}>
                    <SkillTags items={c.softSkills ?? []} tone="info" />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableScroll>
      <ColaboradorSheet colaborador={colaborador} open={aberto} onOpenChange={setAberto} />
    </RhPanel>
  )
}

// ─── Plano de Capacitação & Upskilling ──────────────────────────────

const STATUS_TRILHA: FilterOption[] = [
  { value: TODOS, label: "Todos os Status" },
  { value: "Planejado", label: "Planejado" },
  { value: "Em Andamento", label: "Em Andamento" },
  { value: "Concluído", label: "Concluído" },
]

export function CapacitacaoPanel() {
  const query = useCapacitacao()
  const remove = useRemoveRecords("skills_capacitacao")
  const confirm = useConfirm()
  const [busca, setBusca] = useState("")
  const [status, setStatus] = useState(TODOS)
  const [novaAberta, setNovaAberta] = useState(false)
  const lista = useMemo(() => filtrarTrilhas(query.data?.items ?? [], busca, status), [query.data, busca, status])

  async function excluir(t: Trilha) {
    const ok = await confirm("Deseja excluir permanentemente esta trilha de desenvolvimento?", { destructive: true, confirmLabel: "Excluir" })
    if (!ok) return
    try {
      await remove.mutateAsync(t.id)
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }

  return (
    <RhPanel
      fixed
      icon={GraduationCapIcon}
      iconTone="success"
      title="Plano de Capacitação & Upskilling"
      subtitle="Renovação estratégica e desenvolvimento de Capacidades Dinâmicas"
      action={
        <Button size="sm" className="rounded-full font-bold" onClick={() => setNovaAberta(true)}>
          <PlusIcon data-icon="inline-start" />+ Criar Trilha
        </Button>
      }
    >
      <FilterBar
        search={busca}
        onSearch={setBusca}
        placeholder="Buscar por treinamento ou depto..."
        filter={status}
        onFilter={setStatus}
        filterLabel="Filtrar trilhas por status"
        options={STATUS_TRILHA}
      />
      <TableScroll>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead scope="col" className={TH}>Trilha / Treinamento</TableHead>
              <TableHead scope="col" className={TH}>Skill Focada</TableHead>
              <TableHead scope="col" className={TH}>Progresso Turma</TableHead>
              <TableHead scope="col" className={cn(TH, "text-center")}>Status</TableHead>
              <TableHead scope="col" className={cn(TH, "w-10")}>
                <span className="sr-only">Ações</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {query.isPending ? (
              <SkeletonRows colSpan={5} />
            ) : query.isError ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={5} className="whitespace-normal">
                  <LoadError error={query.error} onRetry={() => void query.refetch()} />
                </TableCell>
              </TableRow>
            ) : lista.length === 0 ? (
              <EmptyRow colSpan={5}>Nenhuma trilha de capacitação localizada.</EmptyRow>
            ) : (
              lista.map((t) => {
                const pct = Math.max(0, Math.min(100, Number(t.progresso) || 0))
                return (
                  <TableRow key={t.id}>
                    <TableCell className={cn(TD, "min-w-[150px] text-[13px] font-extrabold whitespace-normal")}>
                      {t.nome}
                      <span className="mt-0.5 block text-[10px] font-medium text-muted-foreground">Público: {t.publico}</span>
                    </TableCell>
                    <TableCell className={cn(TD, "min-w-[90px] text-xs font-bold whitespace-normal text-muted-foreground")}>{t.skill}</TableCell>
                    <TableCell className={cn(TD, "w-[120px] min-w-[120px]")}>
                      <div className="flex items-center gap-2">
                        <Progress value={pct} aria-label={`Progresso da turma: ${t.progresso}%`} className="h-1.5 flex-1" />
                        <span className="min-w-7 text-right font-mono text-[11px] font-bold">{t.progresso}%</span>
                      </div>
                    </TableCell>
                    <TableCell className={cn(TD, "text-center")}>
                      <Tag tone={statusTone(t.status)}>{t.status}</Tag>
                    </TableCell>
                    <TableCell className={cn(TD, "py-1.5 text-right")}>
                      <DeleteButton label="Excluir Trilha" onClick={() => void excluir(t)} disabled={remove.isPending} />
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </TableScroll>
      <TrilhaDialog open={novaAberta} onOpenChange={setNovaAberta} />
    </RhPanel>
  )
}

// ─── Pipeline de Talentos & Sucessão Estratégica ────────────────────

const ESTAGIOS: { id: Estagio; titulo: string }[] = [
  { id: "mapeamento", titulo: "Mapeamento Inicial" },
  { id: "avaliacao", titulo: "Avaliação Comportamental" },
  { id: "mentoria", titulo: "Trilha de Mentorias" },
  { id: "pronto", titulo: "Pronto para Promoção" },
]

export function PipelineSection() {
  const query = usePipeline()
  const itens = useMemo(() => sortById(query.data?.items ?? []), [query.data])

  return (
    <RhPanel
      icon={GitBranchIcon}
      iconTone="brand"
      title="Pipeline de Talentos & Sucessão Estratégica"
      subtitle="Esteira de atração, lapidação comportamental e mentoria de talentos internos e externos"
    >
      {query.isError ? (
        <LoadError error={query.error} onRetry={() => void query.refetch()} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {ESTAGIOS.map((e) => (
            <KanbanColumn key={e.id} titulo={e.titulo} itens={itens.filter((p) => p.estagio === e.id)} loading={query.isPending} />
          ))}
        </div>
      )}
    </RhPanel>
  )
}

function KanbanColumn({ titulo, itens, loading }: { titulo: string; itens: Talento[]; loading: boolean }) {
  return (
    <section aria-label={titulo} className="flex min-h-[220px] flex-col gap-3.5 rounded-xl border bg-background p-4">
      <div className="flex items-center justify-between gap-2 border-b pb-2">
        <h4 className="text-[11px] font-extrabold tracking-wider text-muted-foreground uppercase">{titulo}</h4>
        {loading ? null : (
          <Badge variant="secondary" className="px-1.5 text-[10px] font-black tabular-nums">
            {itens.length}
          </Badge>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2.5">
        {loading ? (
          <Skeleton className="h-16 w-full rounded-lg" />
        ) : itens.length === 0 ? (
          <EmptyMessage className="flex-none rounded-lg border border-dashed">Nenhum talento</EmptyMessage>
        ) : (
          itens.map((p) => <TalentoCard key={p.id} talento={p} />)
        )}
      </div>
    </section>
  )
}

function TalentoCard({ talento: p }: { talento: Talento }) {
  return (
    <Item variant="outline" size="sm" className="flex-nowrap gap-3 bg-card p-3 shadow-xs">
      <ItemMedia>
        {/* Fotos externas podem estar bloqueadas: as iniciais aparecem no lugar. */}
        <Avatar className="size-9 border">
          <AvatarImage src={p.avatar} alt={p.nome} className="object-cover" />
          <AvatarFallback className="text-xs font-bold">{iniciais(p.nome)}</AvatarFallback>
        </Avatar>
      </ItemMedia>
      <ItemContent className="min-w-0 gap-0.5">
        <ItemTitle className="text-[12.5px] leading-tight font-extrabold">{p.nome}</ItemTitle>
        <span className="text-[10px] leading-tight font-semibold text-muted-foreground">{p.cargo}</span>
        <Tag tone="brand" className="mt-0.5 max-w-full justify-start px-1.5 text-left text-[9px] tracking-normal whitespace-normal normal-case">
          {p.skill}
        </Tag>
      </ItemContent>
    </Item>
  )
}
