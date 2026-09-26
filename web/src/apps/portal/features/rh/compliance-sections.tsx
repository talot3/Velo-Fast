/**
 * Seções da tela de Compliance (portal/app.js:9770-10081): Canal de
 * Denúncias & Ouvidoria, Due Diligence de Terceiros e Trilha de
 * Conscientização & Capacitação.
 */
import { useMemo, useState, type CSSProperties } from "react"
import {
  BookOpenIcon,
  MegaphoneIcon,
  PlusIcon,
  ScaleIcon,
  ShieldIcon,
  TriangleAlertIcon,
  UsersRoundIcon,
  type LucideIcon,
} from "lucide-react"
import { toast } from "sonner"

import { useConfirm } from "@/components/app/confirm-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Item, ItemContent, ItemDescription, ItemFooter, ItemHeader, ItemTitle } from "@/components/ui/item"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useRemoveRecords } from "@/data/records"
import { errorMessage } from "@/lib/errors"
import { formatDateBR } from "@/lib/format"
import { cn } from "@/lib/utils"

import { DenunciaDialog, DueDiligenceDialog } from "./compliance-dialogs"
import { useDenuncias, useFornecedores, useTreinamentos } from "./data"
import {
  DeleteButton,
  EmptyMessage,
  EmptyRow,
  FilterBar,
  LoadError,
  RhPanel,
  RiskBadge,
  riscoTone,
  SkeletonRows,
  StatusPill,
  statusTone,
  TableScroll,
  TD,
  TH,
  type FilterOption,
} from "./kit"
import { filtrarDenuncias, filtrarFornecedores, sortById, TODOS } from "./logic"
import type { Denuncia, DueDiligence, Treinamento } from "./types"

// ─── Canal de Denúncias & Ouvidoria ─────────────────────────────────

const STATUS_DENUNCIA: FilterOption[] = [
  { value: TODOS, label: "Todos os Status" },
  { value: "Em Análise", label: "Em Análise" },
  { value: "Mitigado", label: "Mitigado" },
  { value: "Resolvido", label: "Resolvido" },
]

export function DenunciasPanel() {
  const query = useDenuncias()
  const [busca, setBusca] = useState("")
  const [status, setStatus] = useState(TODOS)
  const [selecionada, setSelecionada] = useState<Denuncia | null>(null)
  const [aberto, setAberto] = useState(false)
  const lista = useMemo(() => filtrarDenuncias(query.data?.items ?? [], busca, status), [query.data, busca, status])

  function abrir(d: Denuncia) {
    setSelecionada(d)
    setAberto(true)
  }

  return (
    <RhPanel
      fixed
      icon={MegaphoneIcon}
      iconTone="danger"
      title="Canal de Denúncias & Ouvidoria"
      subtitle="Hotline interna para desvios de conduta, assédio e infrações"
    >
      <FilterBar
        search={busca}
        onSearch={setBusca}
        placeholder="Buscar por ID ou descrição..."
        filter={status}
        onFilter={setStatus}
        filterLabel="Filtrar relatos por status"
        options={STATUS_DENUNCIA}
      />
      <div className="-mr-1 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1 [scrollbar-width:thin]">
        {query.isPending ? (
          Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-[110px] w-full shrink-0 rounded-lg" />)
        ) : query.isError ? (
          <LoadError error={query.error} onRetry={() => void query.refetch()} />
        ) : lista.length === 0 ? (
          <EmptyMessage className="py-12">Nenhum relato encontrado com os filtros aplicados.</EmptyMessage>
        ) : (
          lista.map((d) => <DenunciaItem key={d.id} denuncia={d} onOpen={() => abrir(d)} />)
        )}
      </div>
      <DenunciaDialog denuncia={selecionada} open={aberto} onOpenChange={setAberto} />
    </RhPanel>
  )
}

function DenunciaItem({ denuncia: d, onOpen }: { denuncia: Denuncia; onOpen: () => void }) {
  return (
    <Item
      asChild
      variant="outline"
      className="shrink-0 cursor-pointer gap-1.5 bg-background text-left transition-[translate,box-shadow,border-color] duration-200 hover:translate-x-0.5 hover:border-input hover:shadow-sm"
    >
      <button type="button" onClick={onOpen}>
        <ItemHeader>
          <ItemTitle className="text-[13px] font-extrabold">{d.tipo}</ItemTitle>
          <StatusPill tone={statusTone(d.status)}>{d.status}</StatusPill>
        </ItemHeader>
        <ItemContent className="basis-full">
          <ItemDescription className="text-xs leading-snug">{d.descricao}</ItemDescription>
        </ItemContent>
        <ItemFooter className="mt-1 text-[11px] font-semibold text-muted-foreground">
          <span className="font-mono text-xs font-extrabold">{d.id}</span>
          <span>Entrada: {formatDateBR(d.data)}</span>
        </ItemFooter>
      </button>
    </Item>
  )
}

// ─── Due Diligence de Terceiros ─────────────────────────────────────

const RISCO_FILTRO: FilterOption[] = [
  { value: TODOS, label: "Todos os Riscos" },
  { value: "Baixo", label: "Risco Baixo" },
  { value: "Médio", label: "Risco Médio" },
  { value: "Alto", label: "Risco Alto" },
]

export function DueDiligencePanel() {
  const query = useFornecedores()
  const remove = useRemoveRecords("compliance_fornecedores")
  const confirm = useConfirm()
  const [busca, setBusca] = useState("")
  const [risco, setRisco] = useState(TODOS)
  const [novaAberta, setNovaAberta] = useState(false)
  const lista = useMemo(() => filtrarFornecedores(query.data?.items ?? [], busca, risco), [query.data, busca, risco])

  async function excluir(f: DueDiligence) {
    const ok = await confirm("Tem certeza que deseja excluir esta análise de Due Diligence?", { destructive: true, confirmLabel: "Excluir" })
    if (!ok) return
    try {
      await remove.mutateAsync(f.id)
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }

  return (
    <RhPanel
      fixed
      icon={ScaleIcon}
      iconTone="brand"
      title="Due Diligence de Terceiros"
      subtitle="Homologação de riscos fiscais, trabalhistas, reputacionais e LGPD"
      action={
        <Button size="sm" className="rounded-full font-bold" onClick={() => setNovaAberta(true)}>
          <PlusIcon data-icon="inline-start" />+ Conduzir Due Diligence
        </Button>
      }
    >
      <FilterBar
        search={busca}
        onSearch={setBusca}
        placeholder="Buscar por fornecedor..."
        filter={risco}
        onFilter={setRisco}
        filterLabel="Filtrar por nível de risco"
        options={RISCO_FILTRO}
      />
      <TableScroll>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead scope="col" className={TH}>Fornecedor</TableHead>
              <TableHead scope="col" className={TH}>Análise</TableHead>
              <TableHead scope="col" className={cn(TH, "text-center")}>Nível Risco</TableHead>
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
              <EmptyRow colSpan={5}>Nenhum fornecedor localizado com os critérios informados.</EmptyRow>
            ) : (
              lista.map((f) => (
                <TableRow key={f.id}>
                  <TableCell className={cn(TD, "min-w-[130px] text-[13px] font-extrabold whitespace-normal")}>{f.fornecedor}</TableCell>
                  <TableCell className={cn(TD, "text-xs font-bold text-muted-foreground")}>{f.tipo}</TableCell>
                  <TableCell className={cn(TD, "text-center")}>
                    <RiskBadge value={f.risco} tone={riscoTone(f.risco)} />
                  </TableCell>
                  <TableCell className={cn(TD, "text-center")}>
                    <StatusPill tone={statusTone(f.status)}>{f.status}</StatusPill>
                  </TableCell>
                  <TableCell className={cn(TD, "py-1.5 text-right")}>
                    <DeleteButton label="Excluir Diligence" onClick={() => void excluir(f)} disabled={remove.isPending} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableScroll>
      <DueDiligenceDialog open={novaAberta} onOpenChange={setNovaAberta} />
    </RhPanel>
  )
}

// ─── Trilha de Conscientização & Capacitação ────────────────────────

/** Ícones lucide dos treinamentos (mesmos nomes do sistema antigo). */
const TREINAMENTO_ICONS: Record<string, LucideIcon> = {
  shield: ShieldIcon,
  "users-2": UsersRoundIcon,
  scale: ScaleIcon,
  "alert-triangle": TriangleAlertIcon,
}

export function TreinamentosSection() {
  const query = useTreinamentos()
  const itens = useMemo(() => sortById(query.data?.items ?? []), [query.data])

  return (
    <RhPanel
      icon={BookOpenIcon}
      iconTone="brand"
      title="Trilha de Conscientização & Capacitação"
      subtitle="Acompanhamento de adesão aos treinamentos periódicos obrigatórios"
    >
      {query.isError ? (
        <LoadError error={query.error} onRetry={() => void query.refetch()} />
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {query.isPending
            ? Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[120px] rounded-xl" />)
            : itens.map((t) => <TreinamentoCard key={t.id} treinamento={t} />)}
        </div>
      )}
    </RhPanel>
  )
}

function TreinamentoCard({ treinamento: t }: { treinamento: Treinamento }) {
  const Icon = TREINAMENTO_ICONS[t.icone] ?? BookOpenIcon
  const pct = Math.max(0, Math.min(100, Number(t.concluido) || 0))
  return (
    <Card className="gap-3.5 bg-background py-[18px] shadow-xs">
      <CardHeader className="flex items-center gap-3 px-[18px]">
        {/* Cor do treinamento vem dos dados. */}
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full shadow-sm" style={{ backgroundColor: t.cor, color: "#fff" }}>
          <Icon className="size-4" aria-hidden />
        </span>
        <CardTitle className="text-[13px] leading-snug font-extrabold">{t.nome}</CardTitle>
      </CardHeader>
      <CardContent className="px-[18px]">
        <Progress
          value={pct}
          aria-label={`Conclusão: ${t.concluido}%`}
          className="h-1.5 bg-accent [&>[data-slot=progress-indicator]]:bg-(--cor)"
          style={{ "--cor": t.cor } as CSSProperties}
        />
      </CardContent>
      <CardFooter className="justify-between gap-2 px-[18px] text-[11px] font-bold text-muted-foreground">
        <span>Conclusão: {t.concluido}%</span>
        <span>Carga: {t.duracao}</span>
      </CardFooter>
    </Card>
  )
}
