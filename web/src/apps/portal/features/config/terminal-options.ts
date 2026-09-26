import type { TerminalFontSize, TerminalLayout } from "@/data/types"

export const LAYOUT_LABEL: Record<TerminalLayout, string> = { horizontal: "Horizontal", vertical: "Vertical" }

export const FONT_OPTIONS: { value: string; label: string; family: string }[] = [
  { value: "Outfit", label: "Outfit (Padrao)", family: "'Outfit Variable', Outfit, sans-serif" },
  { value: "Inter", label: "Inter", family: "Inter, sans-serif" },
  { value: "Roboto", label: "Roboto", family: "Roboto, sans-serif" },
  { value: "monospace", label: "Monospace", family: "monospace" },
]

export const FONT_SIZE_OPTIONS: { value: TerminalFontSize; label: string; px: string }[] = [
  { value: "small", label: "Pequeno (13px)", px: "13px" },
  { value: "medium", label: "Medio (15px)", px: "15px" },
  { value: "large", label: "Grande (17px)", px: "17px" },
  { value: "xlarge", label: "Extra Grande (20px)", px: "20px" },
]

export function fontLabel(font: string): string {
  return FONT_OPTIONS.find((f) => f.value === font)?.label ?? font
}

export function fontSizeLabel(size: string): string {
  return FONT_SIZE_OPTIONS.find((s) => s.value === size)?.label ?? size
}
