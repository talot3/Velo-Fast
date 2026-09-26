import { useCallback, useState } from "react"

/**
 * Estado de um formulário em diálogo. `key` muda a cada abertura, então o
 * formulário recomeça com os dados do item (ou vazio para "novo") sem
 * perder a animação de fechamento.
 */
export function useEditor<T>() {
  const [state, setState] = useState<{ open: boolean; item: T | null; key: number }>({ open: false, item: null, key: 0 })
  const open = useCallback((item: T | null = null) => setState((s) => ({ open: true, item, key: s.key + 1 })), [])
  const setOpen = useCallback((value: boolean) => setState((s) => ({ ...s, open: value })), [])
  return { ...state, openEditor: open, setOpen }
}
