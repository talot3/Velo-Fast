/**
 * Modais da tela de Compliance: "Investigação de Relato" (detalhe da
 * denúncia com troca de status) e "Nova Due Diligence".
 */
import { useState, type FormEvent, type ReactNode } from "react"
import { ScaleIcon, ShieldAlertIcon, UserIcon } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import { newNumericId, useSaveRecords } from "@/data/records"
import { errorMessage } from "@/lib/errors"
import { formatDateBR, todayBR } from "@/lib/format"
import { cn } from "@/lib/utils"

import { DetailLabel, prioridadeTone, RiskBadge, TONE_TEXT, toneStyle } from "./kit"
import type { Denuncia, DenunciaStatus, DueDiligence, Risco, StatusCertificacao, TipoHomologacao } from "./types"

const DENUNCIA_STATUS: DenunciaStatus[] = ["Em Análise", "Mitigado", "Resolvido"]

const TIPOS_HOMOLOGACAO: { value: TipoHomologacao; label: string }[] = [
  { value: "Fiscal/Trabalhista", label: "Fiscal e Trabalhista (Fundamentos Decreto 11129/22)" },
  { value: "LGPD/Segurança", label: "Segurança da Informação e LGPD" },
  { value: "Reputacional", label: "Integridade Reputacional e Anticorrupção" },
]
const RISCOS: { value: Risco; label: string }[] = [
  { value: "Baixo", label: "Baixo Risco" },
  { value: "Médio", label: "Médio Risco" },
  { value: "Alto", label: "Alto Risco" },
]
const STATUS_CERTIFICACAO: { value: StatusCertificacao; label: string }[] = [
  { value: "Certificado", label: "Homologado e Certificado" },
  { value: "Pendente", label: "Em Análise / Pendente" },
  { value: "Rejeitado", label: "Rejeitado (Bloqueado)" },
]

const HEADER = "border-b bg-muted/40 px-6 py-4 text-left"
const FOOTER = "border-t bg-muted/40 px-6 py-3.5"
const TITLE = "flex items-center gap-2 font-black tracking-tight"
const LABEL = "text-[11px] font-extrabold text-muted-foreground uppercase"

// ─── Investigação de Relato ─────────────────────────────────────────

export function DenunciaDialog({
  denuncia,
  open,
  onOpenChange,
}: {
  denuncia: Denuncia | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] gap-0 overflow-y-auto p-0 sm:max-w-[580px]">
        {/* O conteúdo remonta a cada abertura: o status volta ao gravado. */}
        {denuncia ? <DenunciaDetalhe key={denuncia.id} denuncia={denuncia} onClose={() => onOpenChange(false)} /> : null}
      </DialogContent>
    </Dialog>
  )
}

function Detalhe({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <dt>
        <DetailLabel>{label}</DetailLabel>
      </dt>
      <dd className="text-[13px] leading-snug font-semibold">{children}</dd>
    </div>
  )
}

function DenunciaDetalhe({ denuncia: d, onClose }: { denuncia: Denuncia; onClose: () => void }) {
  const [status, setStatus] = useState<DenunciaStatus>(d.status)
  const save = useSaveRecords<Denuncia>("compliance_denuncias")

  async function gravar() {
    try {
      await save.mutateAsync({ ...d, status })
      onClose()
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }

  return (
    <>
      <DialogHeader className={HEADER}>
        <DialogTitle className={TITLE}>
          <ShieldAlertIcon className="size-[18px] text-destructive" aria-hidden />
          Investigação de Relato
        </DialogTitle>
        <DialogDescription className="sr-only">Relato {d.id}</DialogDescription>
      </DialogHeader>
      <div className="flex flex-col gap-5 p-6">
        <dl className="grid grid-cols-2 gap-4">
          <Detalhe label="ID Relato">
            <span className="font-mono font-extrabold">{d.id}</span>
          </Detalhe>
          <Detalhe label="Data de Entrada">{formatDateBR(d.data)}</Detalhe>
          <Detalhe label="Tipo de Ocorrência">
            <span style={toneStyle("brand")} className={cn("font-extrabold", TONE_TEXT)}>
              {d.tipo}
            </span>
          </Detalhe>
          <Detalhe label="Prioridade Corporativa">
            <RiskBadge value={d.prioridade} tone={prioridadeTone(d.prioridade)} className="text-xs" />
          </Detalhe>
        </dl>
        <dl>
          <Detalhe label="Conteúdo do Relato (Anonimizado)">
            <div className="rounded-lg border bg-muted/50 p-3.5 text-[12.5px] leading-relaxed font-medium">{d.descricao}</div>
          </Detalhe>
        </dl>
        <div className="grid grid-cols-2 items-end gap-4">
          <dl>
            <Detalhe label="Analista Responsável">
              <span className="flex items-center gap-1 font-bold">
                <UserIcon className="size-3.5 shrink-0" aria-hidden />
                {d.responsavel}
              </span>
            </Detalhe>
          </dl>
          <Field className="gap-1.5">
            <FieldLabel htmlFor="modal-denuncia-status-select" className={LABEL}>
              Status da Investigação
            </FieldLabel>
            <Select value={status} onValueChange={(v) => setStatus(v as DenunciaStatus)}>
              <SelectTrigger id="modal-denuncia-status-select" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {DENUNCIA_STATUS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
        </div>
      </div>
      <DialogFooter className={FOOTER}>
        <Button type="button" variant="outline" onClick={onClose}>
          Fechar
        </Button>
        <Button type="button" onClick={gravar} disabled={save.isPending}>
          {save.isPending ? <Spinner data-icon="inline-start" /> : null}
          Gravar Alterações
        </Button>
      </DialogFooter>
    </>
  )
}

// ─── Nova Due Diligence ─────────────────────────────────────────────

export function DueDiligenceDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] gap-0 overflow-y-auto p-0 sm:max-w-[500px]">
        {/* O formulário remonta a cada abertura, com os valores padrão. */}
        <DueDiligenceForm onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  )
}

function DueDiligenceForm({ onDone }: { onDone: () => void }) {
  const [fornecedor, setFornecedor] = useState("")
  const [tipo, setTipo] = useState<TipoHomologacao>("Fiscal/Trabalhista")
  const [risco, setRisco] = useState<Risco>("Baixo")
  const [status, setStatus] = useState<StatusCertificacao>("Certificado")
  const [analista, setAnalista] = useState("Gestor Velo")
  const [invalid, setInvalid] = useState({ fornecedor: false, analista: false })
  const save = useSaveRecords<DueDiligence>("compliance_fornecedores")

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    const nome = fornecedor.trim()
    const responsavel = analista.trim()
    const next = { fornecedor: !nome, analista: !responsavel }
    setInvalid(next)
    if (next.fornecedor || next.analista) return
    try {
      await save.mutateAsync({ id: newNumericId(), fornecedor: nome, tipo, risco, status, analista: responsavel, dataAnalise: todayBR() })
      onDone()
    } catch (err) {
      toast.error(errorMessage(err))
    }
  }

  return (
    <form onSubmit={onSubmit}>
      <DialogHeader className={HEADER}>
        <DialogTitle className={TITLE}>
          <ScaleIcon className="size-[18px] text-primary" aria-hidden />
          Nova Due Diligence
        </DialogTitle>
        <DialogDescription className="sr-only">Cadastro de uma nova análise de Due Diligence de terceiros.</DialogDescription>
      </DialogHeader>
      <FieldGroup className="gap-4 p-6">
        <Field data-invalid={invalid.fornecedor || undefined} className="gap-2">
          <FieldLabel htmlFor="modal-dd-fornecedor">Razão Social / Parceiro Comercial</FieldLabel>
          <Input
            id="modal-dd-fornecedor"
            required
            value={fornecedor}
            onChange={(e) => setFornecedor(e.target.value)}
            placeholder="Ex: TecnoClean Prestadora de Serviços Ltda..."
            aria-invalid={invalid.fornecedor || undefined}
          />
        </Field>
        <Field className="gap-2">
          <FieldLabel htmlFor="modal-dd-tipo">Tipo de Homologação</FieldLabel>
          <Select value={tipo} onValueChange={(v) => setTipo(v as TipoHomologacao)}>
            <SelectTrigger id="modal-dd-tipo" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {TIPOS_HOMOLOGACAO.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field className="gap-2">
            <FieldLabel htmlFor="modal-dd-risco">Nível de Risco Identificado</FieldLabel>
            <Select value={risco} onValueChange={(v) => setRisco(v as Risco)}>
              <SelectTrigger id="modal-dd-risco" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {RISCOS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
          <Field className="gap-2">
            <FieldLabel htmlFor="modal-dd-status">Status da Certificação</FieldLabel>
            <Select value={status} onValueChange={(v) => setStatus(v as StatusCertificacao)}>
              <SelectTrigger id="modal-dd-status" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {STATUS_CERTIFICACAO.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
        </div>
        <Field data-invalid={invalid.analista || undefined} className="gap-2">
          <FieldLabel htmlFor="modal-dd-analista">Analista Responsável</FieldLabel>
          <Input
            id="modal-dd-analista"
            required
            value={analista}
            onChange={(e) => setAnalista(e.target.value)}
            aria-invalid={invalid.analista || undefined}
          />
        </Field>
      </FieldGroup>
      <DialogFooter className={FOOTER}>
        <Button type="button" variant="outline" onClick={onDone}>
          Cancelar
        </Button>
        <Button type="submit" disabled={save.isPending}>
          {save.isPending ? <Spinner data-icon="inline-start" /> : null}
          Conduzir & Gravar
        </Button>
      </DialogFooter>
    </form>
  )
}
