import { useCallback, useState } from "react"

type FormState<TItem, TDraft> = {
  open: boolean
  /** Item em edição (null = novo). */
  editing: TItem | null
  draft: TDraft
  /** Já tentou gravar (para destacar os campos obrigatórios vazios). */
  attempted: boolean
}

/**
 * Estado do modal de cadastro: abre com o rascunho do item (ou vazio) e
 * mantém o conteúdo ao fechar, para a animação de saída não "piscar".
 */
export function useFormDialog<TItem, TDraft>(toDraft: (item: TItem | null) => TDraft) {
  const [state, setState] = useState<FormState<TItem, TDraft>>(() => ({
    open: false,
    editing: null,
    draft: toDraft(null),
    attempted: false,
  }))

  const openWith = useCallback(
    (item: TItem | null) => setState({ open: true, editing: item, draft: toDraft(item), attempted: false }),
    [toDraft]
  )
  const setOpen = useCallback((open: boolean) => setState((s) => ({ ...s, open })), [])
  const set = useCallback(<K extends keyof TDraft>(key: K, value: TDraft[K]) => {
    setState((s) => ({ ...s, draft: { ...s.draft, [key]: value } }))
  }, [])
  const markAttempted = useCallback(() => setState((s) => ({ ...s, attempted: true })), [])

  return { ...state, openWith, setOpen, set, markAttempted }
}
