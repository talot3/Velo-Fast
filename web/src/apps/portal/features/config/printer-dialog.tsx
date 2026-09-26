import { useState, type ChangeEvent, type FormEvent } from "react"
import { PrinterIcon } from "lucide-react"
import { toast } from "sonner"

import { CrudDialog } from "@/components/app/crud-dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldContent, FieldDescription, FieldGroup, FieldLabel, FieldTitle } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { NativeSelect, NativeSelectOptGroup, NativeSelectOption } from "@/components/ui/native-select"
import { Spinner } from "@/components/ui/spinner"
import { newId, useSavePrinters } from "@/data/catalog"
import type { Printer } from "@/data/types"
import { errorMessage } from "@/lib/errors"
import { formatDateBR, formatTimeBR, todayBR } from "@/lib/format"

import { DEFAULT_PRINTER_MODEL, isKnownPrinterModel, PRINTER_MODELS, WINDOWS_PRINTER_NAME } from "./printer-models"
import { FormStrip, SectionLabel } from "./ui"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** null = nova impressora. */
  printer: Printer | null
  onTest: (printerId: string) => void
  testing: boolean
}

type RangeField = "port" | "linesBefore" | "linesAfter" | "alignSpacing"
type FieldKey = "name" | "systemName" | RangeField

const RANGE_MESSAGE: Record<RangeField, string> = {
  port: "A Porta TCP deve ser um número inteiro entre 1 e 65535.",
  linesBefore: "Linhas antes do corte: informe um número inteiro de 0 a 20.",
  linesAfter: "Linhas após o corte: informe um número inteiro de 0 a 20.",
  alignSpacing: "Espaço alinhamento: informe um número inteiro de 0 a 10.",
}

/** Lê um inteiro do campo; vazio usa o padrão; fora da faixa devolve null. */
function readInt(value: string, fallback: number, min: number, max: number): number | null {
  const n = value.trim() === "" ? fallback : parseInt(value, 10)
  if (Number.isNaN(n)) return fallback
  return n < min || n > max ? null : n
}

/** Formulário "Nova Impressora" / "Editar Impressora". */
export function PrinterDialog({ open, onOpenChange, printer, onTest, testing }: Props) {
  const save = useSavePrinters()
  const [name, setName] = useState(printer?.name ?? "")
  const [model, setModel] = useState(isKnownPrinterModel(printer?.model) ? (printer?.model as string) : DEFAULT_PRINTER_MODEL)
  const [useWindows, setUseWindows] = useState(printer?.useWindowsPrinter ?? false)
  const [systemName, setSystemName] = useState(printer?.systemName ?? "")
  const [blackBackground, setBlackBackground] = useState(printer?.blackBackground ?? false)
  const [ip, setIp] = useState(printer?.ip ?? "")
  const [port, setPort] = useState(String(printer?.port || 9100))
  const [printServer, setPrintServer] = useState(printer?.printServer ?? false)
  const [activeCut, setActiveCut] = useState(printer ? printer.activeCut !== false : true)
  const [linesBefore, setLinesBefore] = useState(String(printer?.linesBefore ?? 4))
  const [linesAfter, setLinesAfter] = useState(String(printer?.linesAfter ?? 0))
  const [alignSpacing, setAlignSpacing] = useState(String(printer?.alignSpacing ?? 2))
  const [invalid, setInvalid] = useState<FieldKey | null>(null)
  const [openedAt] = useState(() => new Date())

  function fail(field: FieldKey, message: string) {
    setInvalid(field)
    toast.error(message)
  }

  async function submit() {
    const trimmed = name.trim()
    if (!trimmed) return fail("name", "Nome da impressora é obrigatório.")
    const system = systemName.trim()
    if (useWindows) {
      if (!system) return fail("systemName", "Informe o nome exato da impressora do Windows (ou o caminho de rede).")
      if (!WINDOWS_PRINTER_NAME.test(system)) {
        return fail(
          "systemName",
          "Nome da impressora do Windows inválido: use só letras sem acento, números, espaço e os caracteres . _ - ( ) \\ $ (até 128 caracteres)."
        )
      }
    }
    const portNumber = useWindows ? (printer?.port ?? 9100) : readInt(port, 9100, 1, 65535)
    if (portNumber === null) return fail("port", RANGE_MESSAGE.port)
    const before = readInt(linesBefore, 4, 0, 20)
    if (before === null) return fail("linesBefore", RANGE_MESSAGE.linesBefore)
    const after = readInt(linesAfter, 0, 0, 20)
    if (after === null) return fail("linesAfter", RANGE_MESSAGE.linesAfter)
    const align = readInt(alignSpacing, 2, 0, 10)
    if (align === null) return fail("alignSpacing", RANGE_MESSAGE.alignSpacing)

    try {
      await save.mutateAsync({
        id: printer?.id ?? newId(),
        name: trimmed,
        model,
        useWindowsPrinter: useWindows,
        systemName: useWindows ? system : null,
        ip: useWindows ? null : ip.trim(),
        port: portNumber,
        paperWidth: printer?.paperWidth ?? 48,
        activeCut,
        linesBefore: before,
        linesAfter: after,
        alignSpacing: align,
        // Fundo preto e print server só existem no modo rede.
        blackBackground: useWindows ? false : blackBackground,
        printServer: useWindows ? false : printServer,
        order: printer?.order ?? 0,
      })
      onOpenChange(false)
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }

  const isInvalid = (field: FieldKey) => invalid === field || undefined
  const edit = (field: FieldKey, set: (v: string) => void) => (e: ChangeEvent<HTMLInputElement>) => {
    set(e.target.value)
    if (invalid === field) setInvalid(null)
  }
  // Fora de min/max o navegador bloqueia o envio: troca o balão nativo pelo
  // mesmo aviso das outras validações.
  const outOfRange = (field: RangeField) => (e: FormEvent<HTMLInputElement>) => {
    e.preventDefault()
    fail(field, RANGE_MESSAGE[field])
  }

  return (
    <CrudDialog
      open={open}
      onOpenChange={onOpenChange}
      title={printer ? "Editar Impressora" : "Nova Impressora"}
      onSubmit={submit}
      submitting={save.isPending}
      extraActions={
        printer ? (
          <Button
            type="button"
            variant="ghost"
            className="border border-primary text-primary hover:text-primary"
            disabled={testing}
            onClick={() => onTest(printer.id)}
          >
            {testing ? <Spinner data-icon="inline-start" /> : <PrinterIcon data-icon="inline-start" />}
            {testing ? "Enviando..." : "Testar Impressão"}
          </Button>
        ) : null
      }
    >
      <div className="flex flex-col gap-5">
        <FormStrip id={printer?.id ?? "NOVA"} date={`${formatDateBR(todayBR())} ${formatTimeBR(openedAt)}`} />

        <SectionLabel>Detalhes da impressora</SectionLabel>
        <FieldGroup className="grid gap-4 md:grid-cols-2">
          <Field data-invalid={isInvalid("name")}>
            <FieldLabel htmlFor="frm-pr-name">Nome</FieldLabel>
            <Input
              id="frm-pr-name"
              value={name}
              placeholder="Ex: CAIXA - ELGIN I9 - REDE"
              aria-invalid={isInvalid("name")}
              onChange={edit("name", setName)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="frm-pr-model">Modelo</FieldLabel>
            <NativeSelect id="frm-pr-model" value={model} onChange={(e) => setModel(e.target.value)}>
              {PRINTER_MODELS.map((brand) => (
                <NativeSelectOptGroup key={brand.brand} label={brand.brand}>
                  {brand.models.map((m) => (
                    <NativeSelectOption key={m} value={m}>
                      {m}
                    </NativeSelectOption>
                  ))}
                </NativeSelectOptGroup>
              ))}
            </NativeSelect>
          </Field>
        </FieldGroup>

        <FieldLabel htmlFor="frm-pr-windows">
          <Field orientation="horizontal" className="p-3!">
            <Checkbox id="frm-pr-windows" checked={useWindows} onCheckedChange={(v) => setUseWindows(v === true)} />
            <FieldContent>
              <FieldTitle>Usar impressora do Windows (Spooler)</FieldTitle>
            </FieldContent>
          </Field>
        </FieldLabel>

        {useWindows ? (
          <Field id="windows-config-section" data-invalid={isInvalid("systemName")}>
            <FieldLabel htmlFor="frm-pr-systemname">Nome Exato da Impressora (ou caminho de rede)</FieldLabel>
            <Input
              id="frm-pr-systemname"
              value={systemName}
              placeholder={"Ex: EPSON TM-T20  ou  \\\\COMPUTADOR-BAR\\EPSON-TM20"}
              aria-invalid={isInvalid("systemName")}
              onChange={edit("systemName", setSystemName)}
            />
            <FieldDescription className="text-xs">
              Se a impressora está instalada e compartilhada em <strong>outro computador</strong> da rede, use o caminho
              completo: <code className="font-mono">{"\\\\NOME-DO-COMPUTADOR\\NomeCompartilhado"}</code> (veja em
              &apos;Impressoras e Scanners&apos; → propriedades do compartilhamento, no computador onde ela está instalada).
            </FieldDescription>
          </Field>
        ) : (
          <div id="network-config-section" className="flex flex-col gap-4">
            <FieldGroup className="grid gap-4 md:grid-cols-12">
              <Field orientation="horizontal" className="self-end md:col-span-2 md:h-9">
                <Checkbox id="frm-pr-blackbg" checked={blackBackground} onCheckedChange={(v) => setBlackBackground(v === true)} />
                <FieldLabel htmlFor="frm-pr-blackbg">Fundo preto</FieldLabel>
              </Field>
              <Field className="md:col-span-6">
                <FieldLabel htmlFor="frm-pr-ip">IP</FieldLabel>
                <Input id="frm-pr-ip" value={ip} placeholder="192.168.1.10" onChange={(e) => setIp(e.target.value)} />
              </Field>
              <Field className="md:col-span-4" data-invalid={isInvalid("port")}>
                <FieldLabel htmlFor="frm-pr-port">Porta TCP</FieldLabel>
                <Input
                  id="frm-pr-port"
                  type="number"
                  min={1}
                  max={65535}
                  value={port}
                  aria-invalid={isInvalid("port")}
                  onInvalid={outOfRange("port")}
                  onChange={edit("port", setPort)}
                />
              </Field>
            </FieldGroup>
            <Field orientation="horizontal">
              <Checkbox id="frm-pr-server" checked={printServer} onCheckedChange={(v) => setPrintServer(v === true)} />
              <FieldLabel htmlFor="frm-pr-server">
                Print server
                <span className="text-xs font-normal text-muted-foreground">(incompatível com modo Windows)</span>
              </FieldLabel>
            </Field>
          </div>
        )}

        <SectionLabel>Configurações de Papel</SectionLabel>
        <FieldGroup className="grid gap-4 md:grid-cols-12">
          <FieldLabel htmlFor="frm-pr-cut" className="md:col-span-4">
            <Field orientation="horizontal" className="p-3!">
              <Checkbox id="frm-pr-cut" checked={activeCut} onCheckedChange={(v) => setActiveCut(v === true)} />
              <FieldContent>
                <FieldTitle>Ativar corte</FieldTitle>
                <FieldDescription className="text-xs">
                  Recomendável sempre ativado. Corta o papel nas linhas certas do sistema.
                </FieldDescription>
              </FieldContent>
            </Field>
          </FieldLabel>
          <Field className="md:col-span-4" data-invalid={isInvalid("linesBefore")}>
            <FieldLabel htmlFor="frm-pr-linesbefore">Linhas antes do corte</FieldLabel>
            <Input
              id="frm-pr-linesbefore"
              type="number"
              min={0}
              max={20}
              value={linesBefore}
              aria-invalid={isInvalid("linesBefore")}
              onInvalid={outOfRange("linesBefore")}
              onChange={edit("linesBefore", setLinesBefore)}
            />
            <FieldDescription className="text-xs">Espaço inferior do impresso antes do corte.</FieldDescription>
          </Field>
          <Field className="md:col-span-4" data-invalid={isInvalid("linesAfter")}>
            <FieldLabel htmlFor="frm-pr-linesafter">Linhas após o corte</FieldLabel>
            <Input
              id="frm-pr-linesafter"
              type="number"
              min={0}
              max={20}
              value={linesAfter}
              aria-invalid={isInvalid("linesAfter")}
              onInvalid={outOfRange("linesAfter")}
              onChange={edit("linesAfter", setLinesAfter)}
            />
            <FieldDescription className="text-xs">Espaço superior do próximo impresso.</FieldDescription>
          </Field>
        </FieldGroup>
        <FieldGroup className="grid gap-4 md:grid-cols-12">
          <Field className="md:col-span-4" data-invalid={isInvalid("alignSpacing")}>
            <FieldLabel htmlFor="frm-pr-align">Espaço alinhamento</FieldLabel>
            <Input
              id="frm-pr-align"
              type="number"
              min={0}
              max={10}
              value={alignSpacing}
              aria-invalid={isInvalid("alignSpacing")}
              onInvalid={outOfRange("alignSpacing")}
              onChange={edit("alignSpacing", setAlignSpacing)}
            />
            <FieldDescription className="text-xs">Linhas de espaço entre cada produto impresso.</FieldDescription>
          </Field>
        </FieldGroup>
      </div>
    </CrudDialog>
  )
}
