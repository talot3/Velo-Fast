import { useState, type ChangeEvent } from "react"

import { parseMoneyBR } from "@/lib/format"

import { numberInput } from "./lib"

/**
 * Campo numérico digitado no padrão brasileiro ("150,50", "1.234,56").
 * Guarda o texto enquanto a pessoa digita (a vírgula não some) e entrega o
 * número já convertido; ao sair do campo, o texto é normalizado.
 */
export function useDecimalField(
  value: number,
  onValueChange: (value: number) => void,
  format: (value: number) => string = numberInput
) {
  const [text, setText] = useState(() => format(value))
  const [synced, setSynced] = useState(value)

  // Valor mudou por fora (ex.: outra aba edita a mesma margem): reflete no texto.
  if (!Object.is(value, synced)) {
    setSynced(value)
    setText(format(value))
  }

  return {
    value: text,
    inputMode: "decimal" as const,
    autoComplete: "off",
    onChange(e: ChangeEvent<HTMLInputElement>) {
      const raw = e.target.value
      const parsed = parseMoneyBR(raw)
      const next = Number.isFinite(parsed) ? parsed : 0
      setText(raw)
      setSynced(next)
      if (!Object.is(next, value)) onValueChange(next)
    },
    onBlur() {
      setText(format(synced))
    },
  }
}
