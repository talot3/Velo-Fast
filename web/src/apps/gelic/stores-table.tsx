import { Fragment, type ReactNode } from "react"
import {
  CheckIcon,
  DatabaseIcon,
  HashIcon,
  LogInIcon,
  MonitorIcon,
  PenLineIcon,
  SearchIcon,
  StoreIcon,
  TriangleAlertIcon,
} from "lucide-react"

import { EmptyState } from "@/components/app/empty-state"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import type { StoreInfo } from "@/data/types"
import { formatCNPJ, formatDateBR, formatDateTimeBR } from "@/lib/format"
import { cn } from "@/lib/utils"

import { expiryStatus, storeInitials } from "./stores"

const COLUMNS = 9

// Sem larguras fixas: as colunas seguem o conteúdo (sem quebrar CNPJ, datas e
// botões) e a razão social fica com o espaço que sobra. Títulos longos quebram
// em duas linhas, como no sistema anterior.
const HEAD = "h-auto whitespace-normal px-2.5 py-3 text-[11px] font-bold uppercase leading-tight tracking-wide text-muted-foreground"
const CELL = "px-2.5 py-3.5 text-[13px]"

/** Pílula de status com o ponto colorido (Liberado/Bloqueado, Online/Offline). */
const TONE = {
  success: "border-success/20 bg-success/10 text-success",
  danger: "border-destructive/20 bg-destructive/10 text-destructive",
  warning: "border-warning/20 bg-warning/10 text-warning",
} as const

function Dot() {
  return <span aria-hidden className="size-1.5 rounded-full bg-current" />
}

function Hint({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

export type StoreRowActions = {
  /** Loja escolhida neste dispositivo ("Ativa no Servidor" / "Ir ao Portal"). */
  currentStoreId: string | null
  onToggle: (store: StoreInfo) => void
  onEnter: (store: StoreInfo) => void
  onEdit: (store: StoreInfo) => void
  isBusy: (storeId: string, action: "toggle" | "enter") => boolean
}

type StoresTableProps = StoreRowActions & {
  stores: StoreInfo[]
  loading: boolean
  /** Erro ao carregar a lista (só quando não há dados para mostrar). */
  loadError: { title: string; description?: string; onRetry: () => void } | null
  search: string
  onClearSearch: () => void
}

export function StoresTable({ stores, loading, loadError, search, onClearSearch, ...actions }: StoresTableProps) {
  const searching = search.trim().length > 0
  return (
    <div className="overflow-hidden rounded-lg border bg-muted/40">
      <Table>
        <TableHeader>
          <TableRow className="bg-accent hover:bg-accent">
            <TableHead className={HEAD}>Código / ID</TableHead>
            <TableHead className={HEAD}>Razão Social / Filial</TableHead>
            <TableHead className={HEAD}>CNPJ</TableHead>
            <TableHead className={HEAD}>Telefone</TableHead>
            <TableHead className={cn(HEAD, "text-center")}>Limite PDVs</TableHead>
            <TableHead className={HEAD}>Data Expiração</TableHead>
            <TableHead className={cn(HEAD, "text-center")}>Status</TableHead>
            <TableHead className={cn(HEAD, "text-center")}>Ponte</TableHead>
            <TableHead className={cn(HEAD, "text-right")}>Ações de Controle</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <LoadingRows />
          ) : loadError ? (
            <MessageRow>
              <EmptyState
                icon={TriangleAlertIcon}
                title={loadError.title}
                description={loadError.description}
                action={
                  <Button size="sm" onClick={loadError.onRetry}>
                    Tentar novamente
                  </Button>
                }
              />
            </MessageRow>
          ) : stores.length === 0 ? (
            <MessageRow>
              <EmptyState
                icon={searching ? SearchIcon : StoreIcon}
                title={searching ? "Nenhuma loja encontrada" : "Nenhuma loja cadastrada ainda"}
                description={
                  searching
                    ? `Sem resultados para "${search}".`
                    : 'Clique em "Novo Cliente / Loja" para cadastrar a primeira.'
                }
                action={
                  searching ? (
                    <Button
                      size="sm"
                      className="border border-primary bg-card font-extrabold text-primary hover:bg-primary/10"
                      onClick={onClearSearch}
                    >
                      Limpar busca
                    </Button>
                  ) : undefined
                }
              />
            </MessageRow>
          ) : (
            stores.map((store) => <StoreRow key={store.id} store={store} {...actions} />)
          )}
        </TableBody>
      </Table>
    </div>
  )
}

function MessageRow({ children }: { children: ReactNode }) {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell colSpan={COLUMNS} className="whitespace-normal p-0">
        {children}
      </TableCell>
    </TableRow>
  )
}

function LoadingRows() {
  return Array.from({ length: 3 }, (_, row) => (
    <TableRow key={row} className="hover:bg-transparent">
      {Array.from({ length: COLUMNS }, (_, col) => (
        <TableCell key={col} className={CELL}>
          <Skeleton className={cn("h-4", col === 1 ? "w-40" : "w-full")} />
        </TableCell>
      ))}
    </TableRow>
  ))
}

function StoreRow({ store, currentStoreId, onToggle, onEnter, onEdit, isBusy }: StoreRowActions & { store: StoreInfo }) {
  const isCurrent = store.id === currentStoreId
  const expiry = expiryStatus(store.expireDate)
  const toggling = isBusy(store.id, "toggle")
  const entering = isBusy(store.id, "enter")

  return (
    <TableRow data-current={isCurrent || undefined} className={cn("hover:bg-accent", isCurrent && "bg-primary/5")}>
      {/* Código / ID */}
      <TableCell className={CELL}>
        <span className="flex items-center gap-1.5 font-mono text-sm font-bold text-primary">
          <HashIcon aria-hidden className="size-3 opacity-50" />
          {store.id}
        </span>
      </TableCell>

      {/* Razão Social / Filial */}
      <TableCell className={cn(CELL, "whitespace-normal")}>
        <div className="flex items-center gap-3">
          <span
            aria-hidden
            className={cn(
              "flex size-8 shrink-0 items-center justify-center rounded-md border text-[12.5px] font-extrabold",
              isCurrent ? "border-primary bg-primary text-primary-foreground" : "border-primary/15 bg-primary/10 text-primary"
            )}
          >
            {storeInitials(store.name)}
          </span>
          <div className="flex min-w-0 flex-col gap-0.5">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-bold">
              <span>{store.name}</span>
              {isCurrent ? (
                <Badge variant="outline" className={cn("rounded-sm px-1.5 py-0 text-[9px] font-bold", TONE.success)}>
                  <CheckIcon />
                  Ativa no Servidor
                </Badge>
              ) : null}
            </div>
            <span className="flex items-start gap-1 text-[11px] text-muted-foreground">
              <DatabaseIcon aria-hidden className="mt-0.5 size-2.5 shrink-0" />
              Banco na nuvem · loja{" "}{store.id}
            </span>
          </div>
        </div>
      </TableCell>

      {/* CNPJ */}
      <TableCell className={cn(CELL, "font-mono font-semibold")}>{formatCNPJ(store.cnpj) || "N/A"}</TableCell>

      {/* Telefone (quebra só nos espaços, nunca no meio do número) */}
      <TableCell className={cn(CELL, "whitespace-normal text-muted-foreground")}>
        {(store.phone || "N/A").split(" ").map((part, i) => (
          <Fragment key={i}>
            {i > 0 ? " " : null}
            <span className="whitespace-nowrap">{part}</span>
          </Fragment>
        ))}
      </TableCell>

      {/* Limite PDVs */}
      <TableCell className={cn(CELL, "text-center")}>
        <span className="rounded-md border bg-foreground/5 px-2 py-1 text-sm font-bold tabular-nums">
          {store.terminalsAllowed || 5}
        </span>
      </TableCell>

      {/* Data Expiração */}
      <TableCell className={CELL}>
        <div
          className={cn(
            "flex flex-col items-start gap-1 tabular-nums",
            expiry.kind === "expired" ? "font-bold text-destructive" : expiry.kind === "soon" ? "font-bold text-warning" : "font-semibold"
          )}
        >
          <span>{formatDateBR(store.expireDate)}</span>
          {expiry.kind === "expired" ? (
            <Badge variant="outline" className={cn("rounded-sm px-1.5 py-0 text-[9px] font-bold", TONE.danger)}>
              Expirado
            </Badge>
          ) : expiry.kind === "soon" ? (
            <Badge variant="outline" className={cn("rounded-sm px-1.5 py-0 text-[9px] font-bold", TONE.warning)}>
              {expiry.days === 0 ? "Vence hoje" : `Vence em ${expiry.days}d`}
            </Badge>
          ) : null}
        </div>
      </TableCell>

      {/* Status (clique para bloquear/liberar) */}
      <TableCell className={cn(CELL, "text-center")}>
        <Hint label={store.active ? "Clique para Bloquear Licença" : "Clique para Liberar Licença"}>
          <Badge
            asChild
            variant="outline"
            className={cn(
              "cursor-pointer gap-1 rounded-full px-3 py-1 text-[10.5px] font-bold transition-transform hover:scale-105 disabled:cursor-wait disabled:opacity-70",
              store.active ? TONE.success : TONE.danger
            )}
          >
            <button
              type="button"
              disabled={toggling}
              aria-label={store.active ? "Liberado — clique para bloquear a licença" : "Bloqueado — clique para liberar a licença"}
              onClick={() => onToggle(store)}
            >
              {toggling ? <Spinner aria-label="Salvando" /> : <Dot />}
              {store.active ? "Liberado" : "Bloqueado"}
            </button>
          </Badge>
        </Hint>
      </TableCell>

      {/* Ponte de impressão */}
      <TableCell className={cn(CELL, "text-center")}>
        {store.bridge ? (
          <Hint
            label={`${store.bridge.online ? "Ponte ativa" : "Sem sinal há mais de 30s"}${
              store.bridge.lastSeenAt ? ` — última vez: ${formatDateTimeBR(store.bridge.lastSeenAt)}` : ""
            }`}
          >
            <Badge
              variant="outline"
              className={cn("gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold", store.bridge.online ? TONE.success : TONE.danger)}
            >
              <Dot />
              {store.bridge.online ? "Online" : "Offline"}
            </Badge>
          </Hint>
        ) : (
          <Hint label="Nenhuma ponte configurada para esta loja">
            <span className="text-[10px] font-bold text-muted-foreground">— não config.</span>
          </Hint>
        )}
      </TableCell>

      {/* Ações de Controle */}
      <TableCell className={cn(CELL, "text-right")}>
        <div className="inline-flex items-center gap-2">
          <Hint
            label={
              isCurrent
                ? "Loja já selecionada. Clique para acessar o Portal."
                : "Trocar banco ativo do servidor e acessar esta loja."
            }
          >
            <Button
              size="sm"
              disabled={entering}
              onClick={() => onEnter(store)}
              className={cn(
                "border text-xs font-bold",
                isCurrent
                  ? "border-success bg-success/10 text-success hover:bg-success/15"
                  : "border-input bg-card text-foreground hover:border-primary hover:bg-accent hover:text-primary"
              )}
            >
              {entering ? <Spinner data-icon="inline-start" /> : isCurrent ? <MonitorIcon data-icon="inline-start" /> : <LogInIcon data-icon="inline-start" />}
              {isCurrent ? "Ir ao Portal" : "Entrar"}
            </Button>
          </Hint>
          <Hint label="Editar Licença, Validade e Terminais">
            <Button
              size="icon-sm"
              aria-label="Editar Licença, Validade e Terminais"
              onClick={() => onEdit(store)}
              className="border border-input bg-card text-foreground hover:border-primary hover:bg-accent hover:text-primary"
            >
              <PenLineIcon />
            </Button>
          </Hint>
        </div>
      </TableCell>
    </TableRow>
  )
}
