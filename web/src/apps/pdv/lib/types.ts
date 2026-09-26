/** Linha do pedido em andamento (vira uma ficha por unidade ao finalizar). */
export type OrderLine = {
  uid: string
  productId: string
  name: string
  /** Negativo nas linhas de crédito de troca ("[DEVOLUÇÃO] ..."). */
  price: number
  printerId: string | null
  /** Sempre inteiro ≥ 1. */
  qty: number
  /** Linha de crédito de troca: nunca soma com itens novos. */
  credit?: boolean
}

/** Pagamento aplicado, exatamente como o operador lançou. */
export type AppliedPayment = { method_id: string | null; method_name: string; amount: number }

/**
 * Ficha para prévia/impressão — mesmos campos das transações do PDV antigo
 * (e do formato 1 da impressão nativa).
 */
export type TicketTx = {
  id: string
  productId: string | null
  productName: string
  price: number
  printerId: string | null
  paymentMethod: string
  terminalId: string
  operator: string
  timestamp: string
}

/** Sobreposições do caixa (uma por vez, como no antigo). */
export type Overlay = "items" | "payment" | "ticket" | "menu" | "sangria" | "fechamento" | "reimp" | "cancel" | "devolucao"

/** Item do carrinho de devolução. */
export type ReturnLine = { productId: string; name: string; price: number; printerId: string | null; qty: number }
