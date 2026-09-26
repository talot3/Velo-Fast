/**
 * Loja e terminal deste dispositivo. Igual ao sistema anterior: definidos
 * uma vez pela URL (?store=15521&tid=CX001) e lembrados no navegador. Para
 * usuários de loja, o login confirma a loja real (vinda do banco).
 */
const STORE_KEY = "velofast_store_id"
const TERMINAL_KEY = "tp_tid"

function readParam(name: string): string | null {
  const value = new URLSearchParams(window.location.search).get(name)
  return value && value.trim() ? value.trim() : null
}

;(function captureFromUrl() {
  const store = readParam("store")
  if (store) localStorage.setItem(STORE_KEY, store)
  const tid = readParam("tid")
  if (tid) localStorage.setItem(TERMINAL_KEY, tid.toUpperCase())
})()

export function getStoreId(): string | null {
  return localStorage.getItem(STORE_KEY)
}

export function setStoreId(storeId: string) {
  localStorage.setItem(STORE_KEY, storeId)
}

export function getTerminalId(): string {
  return localStorage.getItem(TERMINAL_KEY) || "CX001"
}

export function setTerminalId(terminalId: string) {
  localStorage.setItem(TERMINAL_KEY, terminalId.toUpperCase())
}
