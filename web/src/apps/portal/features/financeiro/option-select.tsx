import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"

export type Option = { value: string; label: string }

// O Radix não aceita item com valor "": a opção "— Selecione —" usa este marcador.
const NONE = "__none__"

type OptionSelectProps = {
  id?: string
  value: string
  onChange: (value: string) => void
  options: Option[]
  /** Primeira opção "vazia" (ex.: "— Selecione —"), que grava "". */
  emptyLabel?: string
  size?: "sm" | "default"
  className?: string
  "aria-label"?: string
}

/** Select do shadcn com lista simples de opções (valores sempre texto). */
export function OptionSelect({ id, value, onChange, options, emptyLabel, size, className, ...aria }: OptionSelectProps) {
  const radixValue = value === "" ? (emptyLabel ? NONE : "") : value
  return (
    <Select value={radixValue} onValueChange={(v) => onChange(v === NONE ? "" : v)}>
      <SelectTrigger id={id} size={size} className={cn("w-full min-w-0", className)} aria-label={aria["aria-label"]}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {emptyLabel ? <SelectItem value={NONE}>{emptyLabel}</SelectItem> : null}
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}

/** Valor efetivo de um select nativo: o salvo, se existir entre as opções; senão a primeira. */
export function resolveOption(value: string | null | undefined, options: Option[]): string {
  const v = value == null ? "" : String(value)
  if (options.some((o) => o.value === v)) return v
  return options[0]?.value ?? ""
}
