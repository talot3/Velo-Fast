import { useRef } from "react"

import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

/** Cor com amostra clicável + código hex (padrão dos botões do PDV). */
export function ColorField({
  id,
  label,
  value,
  onChange,
}: {
  id: string
  label: string
  value: string
  onChange: (hex: string) => void
}) {
  const picker = useRef<HTMLInputElement>(null)
  return (
    <Field>
      <FieldLabel htmlFor={`${id}-text`}>{label}</FieldLabel>
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label={`Escolher ${label}`}
          className="size-9 shrink-0 rounded-md border"
          style={{ background: value }}
          onClick={() => picker.current?.showPicker?.() ?? picker.current?.click()}
        />
        <Input
          id={`${id}-text`}
          value={value}
          maxLength={7}
          onChange={(e) => {
            const v = e.target.value.trim()
            onChange(v.startsWith("#") ? v : `#${v}`)
          }}
        />
        <input
          ref={picker}
          id={`${id}-color`}
          type="color"
          className="sr-only"
          value={/^#[0-9a-f]{6}$/i.test(value) ? value : "#000000"}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </Field>
  )
}
