/**
 * Impressão nativa na maquininha (app Flutter "Moderninha Smart 2").
 *
 * O app hospedeiro injeta `window.isPagSeguroTerminal` e o plugin
 * `window.flutter_inappwebview.callHandler`. O handler é SEMPRE
 * "printPagSeguro" com UM argumento, em um dos quatro formatos abaixo —
 * idênticos aos do PDV antigo (pdv/app.js), porque o app nativo distingue
 * os comprovantes pelo formato. Não mude nomes de campos.
 */

type FlutterBridge = { callHandler: (name: string, ...args: unknown[]) => Promise<unknown> }

declare global {
  interface Window {
    isPagSeguroTerminal?: boolean
    flutter_inappwebview?: FlutterBridge
  }
}

export const NATIVE_PRINTER_NAME = "Moderninha Smart 2"

export function isNativeHost(): boolean {
  return Boolean(window.isPagSeguroTerminal || window.flutter_inappwebview?.callHandler)
}

/** 1) Ficha de venda (uma chamada por ficha, em sequência). */
export type NativeSaleTicket = {
  printerId: string
  terminalId: string
  operator: string
  transactions: {
    id: string
    productId: string | null
    productName: string
    price: number
    printerId: string | null
    paymentMethod: string
    terminalId: string
    operator: string
    timestamp: string
  }[]
}

/** 2) Reimpressão (sem printerId). */
export type NativeReprint = {
  terminalId: string
  operator: string
  transactions: { productName: string; paymentMethod: string; terminalId: string; timestamp: string }[]
}

/** 3) Comprovante de sangria. */
export type NativeSangria = {
  id: string
  valor: number
  motivo: string
  operador: string
  terminal: string
  timestamp: string
}

/** 4) Relatório de fechamento. */
export type NativeFechamento = {
  terminal: string
  operador: string
  dtAbertura: string
  dtFechamento: string
  suprimento: number
  totalVendas: number
  totalSangrias: number
  totalLiquido: number
  byMethod: Record<string, { total: number; qty: number }>
  sangrias: NativeSangria[]
  qtdTransacoes: number
}

export type NativePayload = NativeSaleTicket | NativeReprint | NativeSangria | NativeFechamento

export type NativeResult = { success: true; printerName: string } | { success: false; error: string; fallbackToHttp?: boolean }

/**
 * Chama a impressora nativa. Igual ao antigo: sucesso se a resposta existir e
 * `success !== false`; se o handler não existir/lançar erro, sinaliza para
 * seguir pelo caminho da nuvem.
 */
export async function nativePrint(payload: NativePayload): Promise<NativeResult> {
  try {
    const res = (await window.flutter_inappwebview!.callHandler("printPagSeguro", payload)) as
      | { success?: boolean; error?: string }
      | null
      | undefined
    if (res && res.success !== false) return { success: true, printerName: NATIVE_PRINTER_NAME }
    return { success: false, error: res?.error || "Erro na impressora Moderninha" }
  } catch {
    return { success: false, error: "Impressora nativa indisponível.", fallbackToHttp: true }
  }
}
