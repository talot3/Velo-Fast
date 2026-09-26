/**
 * Modal "Nova Trilha de Aperfeiçoamento" da Gestão de Skills
 * (portal/app.js:11298-11389).
 */
import { useState, type FormEvent } from "react"
import { GraduationCapIcon } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import { newNumericId, useSaveRecords } from "@/data/records"
import { errorMessage } from "@/lib/errors"
import { parseMoneyBR } from "@/lib/format"

import type { Trilha, TrilhaStatus } from "./types"

const STATUS: TrilhaStatus[] = ["Planejado", "Em Andamento", "Concluído"]

export function TrilhaDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] gap-0 overflow-y-auto p-0 sm:max-w-[480px]">
        {/* O formulário remonta a cada abertura, com os valores padrão. */}
        <TrilhaForm onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  )
}

/** "Progresso Inicial (%)": inteiro entre 0 e 100 (vazio = 0). */
function lerProgresso(valor: string): number {
  const n = parseMoneyBR(valor)
  return Number.isFinite(n) ? Math.min(100, Math.max(0, Math.trunc(n))) : 0
}

function TrilhaForm({ onDone }: { onDone: () => void }) {
  const [nome, setNome] = useState("")
  const [publico, setPublico] = useState("")
  const [skill, setSkill] = useState("")
  const [progresso, setProgresso] = useState("0")
  const [status, setStatus] = useState<TrilhaStatus>("Planejado")
  const [invalid, setInvalid] = useState({ nome: false, publico: false, skill: false })
  const save = useSaveRecords<Trilha>("skills_capacitacao")

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    const trilha = { nome: nome.trim(), publico: publico.trim(), skill: skill.trim() }
    const next = { nome: !trilha.nome, publico: !trilha.publico, skill: !trilha.skill }
    setInvalid(next)
    if (next.nome || next.publico || next.skill) return
    try {
      await save.mutateAsync({ id: newNumericId(), ...trilha, progresso: lerProgresso(progresso), status })
      onDone()
    } catch (err) {
      toast.error(errorMessage(err))
    }
  }

  return (
    <form onSubmit={onSubmit}>
      <DialogHeader className="border-b bg-muted/40 px-6 py-4 text-left">
        <DialogTitle className="flex items-center gap-2 font-black tracking-tight">
          <GraduationCapIcon className="size-[18px] text-success" aria-hidden />
          Nova Trilha de Aperfeiçoamento
        </DialogTitle>
        <DialogDescription className="sr-only">Cadastro de uma nova trilha do Plano de Capacitação & Upskilling.</DialogDescription>
      </DialogHeader>
      <FieldGroup className="gap-4 p-6">
        <Field data-invalid={invalid.nome || undefined} className="gap-2">
          <FieldLabel htmlFor="modal-sc-nome">Nome da Trilha / Treinamento</FieldLabel>
          <Input
            id="modal-sc-nome"
            required
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Ex: Treinamento Liderança Dinâmica..."
            aria-invalid={invalid.nome || undefined}
          />
        </Field>
        <Field data-invalid={invalid.publico || undefined} className="gap-2">
          <FieldLabel htmlFor="modal-sc-publico">Público-Alvo</FieldLabel>
          <Input
            id="modal-sc-publico"
            required
            value={publico}
            onChange={(e) => setPublico(e.target.value)}
            placeholder="Ex: Gestores e Business Partners..."
            aria-invalid={invalid.publico || undefined}
          />
        </Field>
        <Field data-invalid={invalid.skill || undefined} className="gap-2">
          <FieldLabel htmlFor="modal-sc-skill">Competência Sócioemocional Focada</FieldLabel>
          <Input
            id="modal-sc-skill"
            required
            value={skill}
            onChange={(e) => setSkill(e.target.value)}
            placeholder="Ex: Resiliência / Inteligência Emocional..."
            aria-invalid={invalid.skill || undefined}
          />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field className="gap-2">
            <FieldLabel htmlFor="modal-sc-progresso">Progresso Inicial (%)</FieldLabel>
            <Input
              id="modal-sc-progresso"
              type="number"
              inputMode="numeric"
              min={0}
              max={100}
              required
              value={progresso}
              onChange={(e) => setProgresso(e.target.value)}
            />
          </Field>
          <Field className="gap-2">
            <FieldLabel htmlFor="modal-sc-status">Status</FieldLabel>
            <Select value={status} onValueChange={(v) => setStatus(v as TrilhaStatus)}>
              <SelectTrigger id="modal-sc-status" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {STATUS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
        </div>
      </FieldGroup>
      <DialogFooter className="border-t bg-muted/40 px-6 py-3.5">
        <Button type="button" variant="outline" onClick={onDone}>
          Cancelar
        </Button>
        <Button type="submit" disabled={save.isPending}>
          {save.isPending ? <Spinner data-icon="inline-start" /> : null}
          Criar Trilha
        </Button>
      </DialogFooter>
    </form>
  )
}
