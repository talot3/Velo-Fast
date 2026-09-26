import type { Printer, Terminal } from "@/data/types"

/**
 * Busca flexível do terminal (mesma regra do PDV antigo, pdv/app.js
 * findTerminalFlex): id exato → nome exato → número do caixa → id/nome sem
 * pontuação iguais ou contendo o texto informado.
 */
export function findTerminalFlex(terminals: Terminal[], input: string | null | undefined): Terminal | null {
  if (!input || !terminals.length) return null
  const inputUpper = String(input).trim().toUpperCase()
  const inputDigits = inputUpper.replace(/\D/g, "")

  let found = terminals.find((t) => String(t.id).toUpperCase() === inputUpper)
  if (found) return found

  found = terminals.find((t) => String(t.name).toUpperCase() === inputUpper)
  if (found) return found

  if (inputDigits !== "") {
    found = terminals.find((t) => t.cashNumber !== null && String(t.cashNumber) === inputDigits)
    if (found) return found
  }

  const clean = (v: unknown) =>
    String(v ?? "")
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
  const cleanInput = clean(inputUpper)
  if (cleanInput !== "") {
    found = terminals.find((t) => {
      const cleanId = clean(t.id)
      const cleanName = clean(t.name)
      return cleanId === cleanInput || cleanName === cleanInput || cleanId.includes(cleanInput) || cleanName.includes(cleanInput)
    })
    if (found) return found
  }
  return null
}

export const NO_PRINTER = "sem-impressora"

/**
 * Impressora de uma ficha (regra antiga): a do terminal, se existir no
 * cadastro; senão a do produto; senão "sem-impressora".
 */
export function printerKeyFor(terminal: Terminal | null, printers: Printer[], productPrinterId: string | null): string {
  const exists = (id: string | null | undefined) => Boolean(id) && printers.some((p) => String(p.id) === String(id))
  if (exists(terminal?.printerId)) return String(terminal!.printerId)
  if (exists(productPrinterId)) return String(productPrinterId)
  return NO_PRINTER
}
