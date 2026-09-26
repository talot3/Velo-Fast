import { useState, type ReactNode } from "react"
import { toast } from "sonner"

import { CrudDialog } from "@/components/app/crud-dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldContent, FieldGroup, FieldLabel, FieldTitle } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useSaveTerminals } from "@/data/catalog"
import type { Printer, Terminal, TerminalFontSize, TerminalLayout } from "@/data/types"
import { errorMessage } from "@/lib/errors"
import { formatDateBR, todayBR } from "@/lib/format"

import { FONT_OPTIONS, FONT_SIZE_OPTIONS } from "./terminal-options"
import { FormStrip, SectionLabel } from "./ui"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** null = novo terminal. */
  terminal: Terminal | null
  terminals: Terminal[]
  printers: Printer[]
}

function LayoutCard({ value, label, children }: { value: TerminalLayout; label: string; children: ReactNode }) {
  const id = `frm-trm-layout-${value}`
  return (
    <FieldLabel
      htmlFor={id}
      className="w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-input px-3 py-4 text-xs font-bold transition-colors hover:bg-accent/50 has-focus-visible:ring-[3px] has-focus-visible:ring-ring/50"
    >
      {children}
      <span>{label}</span>
      <RadioGroupItem value={value} id={id} className="sr-only" />
    </FieldLabel>
  )
}

/** Formulário "Novo Terminal de Caixa" / "Editar Terminal". */
export function TerminalDialog({ open, onOpenChange, terminal, terminals, printers }: Props) {
  const save = useSaveTerminals()
  const linkedPrinter = terminal ? printers.find((p) => p.id === terminal.printerId) : undefined
  // Terminal sem impressora (N/A na lista): o formulário mostra "Nenhuma" em vez
  // de vincular a primeira impressora sem aviso ao gravar outra alteração.
  const offerNone = Boolean(terminal) && !linkedPrinter && printers.length > 0
  const initialPrinter = terminal ? (linkedPrinter?.id ?? "") : (printers[0]?.id ?? "")

  const [cashNumber, setCashNumber] = useState(String(terminal?.cashNumber ?? terminals.length + 1))
  const [name, setName] = useState(terminal?.name ?? "")
  const [printerId, setPrinterId] = useState(initialPrinter)
  const [layout, setLayout] = useState<TerminalLayout>(terminal?.layout === "vertical" ? "vertical" : "horizontal")
  const [font, setFont] = useState(terminal?.font ?? "Outfit")
  const [fontSize, setFontSize] = useState<TerminalFontSize>(terminal?.fontSize ?? "medium")
  const [active, setActive] = useState(terminal ? terminal.active : true)
  const [invalid, setInvalid] = useState<"num" | "name" | null>(null)

  function failNumber() {
    setInvalid("num")
    toast.error("O Numero do Caixa deve ser um número inteiro, 1 ou maior.")
  }

  const previewFamily = FONT_OPTIONS.find((f) => f.value === font)?.family ?? font
  const previewSize = FONT_SIZE_OPTIONS.find((s) => s.value === fontSize)?.px ?? "15px"

  async function submit() {
    const number = parseInt(cashNumber, 10) || 1
    if (number < 1) return failNumber()
    const trimmed = name.trim()
    if (!trimmed) {
      setInvalid("name")
      toast.error("Informe o nome/identificacao do terminal.")
      return
    }
    // O id do terminal é "CX" + número (mantido ao editar). Criar outro com o
    // mesmo número sobrescreveria o existente, então é bloqueado.
    const id = terminal?.id ?? `CX${number}`
    if (!terminal && terminals.some((t) => t.id === id)) {
      toast.error(`Já existe um terminal com o número ${number} (${id}).`)
      return
    }
    try {
      await save.mutateAsync({
        id,
        cashNumber: number,
        name: trimmed,
        layout,
        font,
        fontSize,
        printerId: printerId || null,
        active,
        order: terminal?.order ?? 0,
      })
      onOpenChange(false)
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }

  return (
    <CrudDialog
      open={open}
      onOpenChange={onOpenChange}
      title={terminal ? "Editar Terminal" : "Novo Terminal de Caixa"}
      onSubmit={submit}
      submitting={save.isPending}
    >
      <div className="flex flex-col gap-5">
        <FormStrip id={terminal?.id ?? "NOVO"} date={formatDateBR(todayBR())} />

        <SectionLabel>Identificacao do Terminal</SectionLabel>
        <FieldGroup className="grid gap-4 md:grid-cols-12">
          <Field className="md:col-span-2" data-invalid={invalid === "num" || undefined}>
            <FieldLabel htmlFor="frm-trm-num">Numero do Caixa</FieldLabel>
            <Input
              id="frm-trm-num"
              type="number"
              min={1}
              value={cashNumber}
              aria-invalid={invalid === "num" || undefined}
              onInvalid={(e) => {
                // Sem o balão nativo: mesmo aviso (toast) das outras validações.
                e.preventDefault()
                failNumber()
              }}
              onChange={(e) => {
                setCashNumber(e.target.value)
                if (invalid === "num") setInvalid(null)
              }}
            />
          </Field>
          <Field className="md:col-span-6" data-invalid={invalid === "name" || undefined}>
            <FieldLabel htmlFor="frm-trm-name">Nome / Identificacao</FieldLabel>
            <Input
              id="frm-trm-name"
              value={name}
              placeholder="Ex: Caixa 01 - Recepcao"
              aria-invalid={invalid === "name" || undefined}
              onChange={(e) => {
                setName(e.target.value)
                if (invalid === "name") setInvalid(null)
              }}
            />
          </Field>
          <Field className="md:col-span-4">
            <FieldLabel htmlFor="frm-trm-printer">Impressora Vinculada</FieldLabel>
            <NativeSelect id="frm-trm-printer" value={printerId} onChange={(e) => setPrinterId(e.target.value)}>
              {printers.length === 0 ? <NativeSelectOption value="">Nenhuma cadastrada</NativeSelectOption> : null}
              {offerNone ? <NativeSelectOption value="">Nenhuma</NativeSelectOption> : null}
              {printers.map((p) => (
                <NativeSelectOption key={p.id} value={p.id}>
                  {p.name}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
        </FieldGroup>

        <SectionLabel>Aparencia do PDV</SectionLabel>
        <FieldGroup className="grid gap-4 md:grid-cols-12">
          <Field className="md:col-span-6">
            <FieldLabel id="frm-trm-layout-label">Layout da Tela</FieldLabel>
            <RadioGroup
              value={layout}
              onValueChange={(v) => setLayout(v as TerminalLayout)}
              aria-labelledby="frm-trm-layout-label"
              className="grid grid-cols-2 gap-3"
            >
              <LayoutCard value="horizontal" label="Horizontal">
                <div className="flex h-9 w-15 gap-[3px] rounded border-2 border-current p-1">
                  <div className="flex-1 rounded-sm bg-current opacity-30" />
                  <div className="w-[18px] rounded-sm bg-current opacity-70" />
                </div>
              </LayoutCard>
              <LayoutCard value="vertical" label="Vertical">
                <div className="flex h-15 w-9 flex-col gap-[3px] rounded border-2 border-current p-1">
                  <div className="h-3 rounded-sm bg-current opacity-70" />
                  <div className="flex-1 rounded-sm bg-current opacity-30" />
                </div>
              </LayoutCard>
            </RadioGroup>
          </Field>
          <Field className="md:col-span-3">
            <FieldLabel htmlFor="frm-trm-font">Fonte</FieldLabel>
            <NativeSelect id="frm-trm-font" value={font} onChange={(e) => setFont(e.target.value)}>
              {FONT_OPTIONS.map((f) => (
                <NativeSelectOption key={f.value} value={f.value}>
                  {f.label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
          <Field className="md:col-span-3">
            <FieldLabel htmlFor="frm-trm-size">Tamanho da Fonte</FieldLabel>
            <NativeSelect id="frm-trm-size" value={fontSize} onChange={(e) => setFontSize(e.target.value as TerminalFontSize)}>
              {FONT_SIZE_OPTIONS.map((s) => (
                <NativeSelectOption key={s.value} value={s.value}>
                  {s.label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
        </FieldGroup>

        <div id="font-preview" className="flex flex-col gap-2 rounded-xl border border-input bg-accent p-4">
          <p className="text-[11px] font-extrabold text-muted-foreground uppercase">Preview</p>
          <p id="font-preview-text" className="font-bold" style={{ fontFamily: previewFamily, fontSize: previewSize }}>
            Cerveja Heineken 330ml - R$ 14,50
          </p>
        </div>

        <FieldLabel htmlFor="frm-trm-active">
          <Field orientation="horizontal" className="p-3!">
            <Checkbox id="frm-trm-active" checked={active} onCheckedChange={(v) => setActive(v === true)} />
            <FieldContent>
              <FieldTitle>Terminal Ativo (visivel no PDV)</FieldTitle>
            </FieldContent>
          </Field>
        </FieldLabel>
      </div>
    </CrudDialog>
  )
}
