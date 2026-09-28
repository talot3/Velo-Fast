import { useState } from "react"
import { SearchIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { DATE_PRESETS, presetRange, type DatePreset } from "@/lib/format"
import type { DateRange } from "@/data/reports"

type DateRangeFilterProps = {
  value: DateRange
  onChange: (range: DateRange) => void
  /** Prefixo dos ids dos campos (ex.: "prod" → prod-start / prod-end). */
  idPrefix: string
  searchLabel?: string
  /** Atalho que corresponde ao período inicial (fica destacado ao abrir, como no sistema antigo). */
  defaultPreset?: DatePreset
}

/**
 * Filtro "De / Até" com os 8 atalhos de período do sistema antigo. Datas
 * digitadas só valem ao clicar em buscar; atalhos aplicam na hora.
 */
export function DateRangeFilter({ value, onChange, idPrefix, searchLabel = "Buscar", defaultPreset }: DateRangeFilterProps) {
  const [draft, setDraft] = useState(value)
  const [preset, setPreset] = useState<DatePreset | "">(defaultPreset ?? "")

  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end gap-3">
          <Field className="w-auto">
            <FieldLabel htmlFor={`${idPrefix}-start`}>De</FieldLabel>
            <Input
              id={`${idPrefix}-start`}
              type="date"
              value={draft.from}
              onChange={(e) => {
                setPreset("")
                setDraft((d) => ({ ...d, from: e.target.value }))
              }}
            />
          </Field>
          <Field className="w-auto">
            <FieldLabel htmlFor={`${idPrefix}-end`}>Até</FieldLabel>
            <Input
              id={`${idPrefix}-end`}
              type="date"
              value={draft.to}
              onChange={(e) => {
                setPreset("")
                setDraft((d) => ({ ...d, to: e.target.value }))
              }}
            />
          </Field>
          <Button type="button" onClick={() => onChange(draft)} disabled={!draft.from || !draft.to}>
            <SearchIcon data-icon="inline-start" />
            {searchLabel}
          </Button>
        </div>
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          className="flex-wrap"
          value={preset}
          onValueChange={(v) => {
            if (!v) return
            const range = presetRange(v as DatePreset)
            setPreset(v as DatePreset)
            setDraft(range)
            onChange(range)
          }}
        >
          {DATE_PRESETS.map((p) => (
            <ToggleGroupItem key={p.id} value={p.id}>
              {p.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </CardContent>
    </Card>
  )
}
