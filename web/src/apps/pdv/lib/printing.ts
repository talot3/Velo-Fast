/**
 * Impressão do caixa. Na maquininha (app nativo) cada comprovante vai para
 * `printPagSeguro` nos formatos do PDV antigo; sem o app nativo (ou se o
 * handler não existir), vai para a fila de impressão na nuvem (ponte local).
 */
import { printCashClosing, printCashMovement, printSaleItems } from "@/data/pdv"
import type { Printer, RecentItem, Terminal } from "@/data/types"
import { errorMessage, isNetworkError } from "@/lib/errors"
import { pendingCount } from "@/lib/offline-queue"

import { isNativeHost, nativePrint, type NativeFechamento } from "../native"
import { nativeReprint, nativeSaleTicket, nativeSangria, type Sangria } from "./receipts"
import { flushPending } from "./sync"
import { NO_PRINTER, printerKeyFor } from "./terminal"
import type { TicketTx } from "./types"

export type PrintContext = {
  storeId: string
  terminal: Terminal | null
  terminalId: string
  operator: string
  printers: Printer[]
}

export const OFFLINE_PRINT = "⚠️ Sem conexão — impressão indisponível."

/** Nome do caixa usado nas mensagens de impressão (antigo: terminal.name || terminalId). */
export const terminalLabel = (ctx: PrintContext) => ctx.terminal?.name || ctx.terminalId

async function offlineNow(error?: unknown) {
  if (!navigator.onLine) return true
  if (error !== undefined && isNetworkError(error)) return true
  // A venda ainda está na fila (não chegou ao servidor): conta como sem conexão.
  return (await pendingCount().catch(() => ({ pending: 0 }))).pending > 0
}

export type TicketPrintOutcome = { kind: "ok"; printers: string[] } | { kind: "fail" } | { kind: "offline" }

/** "Imprimir Tickets": uma ficha por chamada, em sequência (regra antiga). */
export async function printTickets(ctx: PrintContext, txs: TicketTx[]): Promise<TicketPrintOutcome> {
  let ok = true
  const names: string[] = []
  const addName = (n: string | null | undefined) => {
    if (n && !names.includes(n)) names.push(n)
  }
  const cloudIds: string[] = []

  if (isNativeHost()) {
    const byPrinter = new Map<string, TicketTx[]>()
    for (const tx of txs) {
      const pid = printerKeyFor(ctx.terminal, ctx.printers, tx.printerId)
      byPrinter.set(pid, [...(byPrinter.get(pid) ?? []), tx])
    }
    for (const [pid, list] of byPrinter) {
      if (pid === NO_PRINTER && !window.isPagSeguroTerminal) {
        ok = false
        continue
      }
      for (const tx of list) {
        const res = await nativePrint(nativeSaleTicket(pid, ctx.terminalId, ctx.operator, tx))
        if (res.success) addName(res.printerName)
        else if (res.fallbackToHttp) cloudIds.push(tx.id)
        else ok = false
      }
    }
  } else {
    cloudIds.push(...txs.map((t) => t.id))
  }

  if (cloudIds.length) {
    // A venda pode estar na fila offline: envia antes de imprimir.
    if (!(await flushPending())) return { kind: "offline" }
    try {
      const result = await printSaleItems(ctx.storeId, cloudIds)
      result.printers.forEach(addName)
      if (result.unprinted.length > 0 || result.jobs === 0) ok = false
    } catch (error) {
      if (await offlineNow(error)) return { kind: "offline" }
      ok = false
    }
  }
  return ok ? { kind: "ok", printers: names } : { kind: "fail" }
}

export function ticketPrintMessage(ctx: PrintContext, outcome: TicketPrintOutcome) {
  if (outcome.kind === "offline") return OFFLINE_PRINT
  if (outcome.kind === "fail") return `⚠️ Falha ao imprimir em [${terminalLabel(ctx)}]. Verifique a impressora no portal.`
  return outcome.printers.length
    ? `🖨 [${terminalLabel(ctx)}] Enviado para fila de impressão: ${outcome.printers.join(", ")}`
    : "🖨 Tickets enviados para a fila de impressão!"
}

/** Reimpressão de uma ficha. Devolve o texto do aviso (mesmos do antigo). */
export async function reprintItem(ctx: PrintContext, item: RecentItem): Promise<string> {
  if (isNativeHost()) {
    const res = await nativePrint(nativeReprint(item, ctx.terminalId, ctx.operator))
    if (res.success) return `✅ Enviado para a fila de impressão: ${res.printerName}`
    if (!res.fallbackToHttp) return `❌ Falha: ${res.error || "erro desconhecido"}`
  }
  try {
    const result = await printSaleItems(ctx.storeId, [item.id], true)
    if (result.unprinted.length > 0 || result.jobs === 0) return "❌ Falha: Nenhuma impressora disponível. Configure no portal."
    return `✅ Enviado para a fila de impressão: ${result.printers[0] || "impressora"}`
  } catch (error) {
    if (await offlineNow(error)) return "❌ Erro ao conectar com o servidor."
    return `❌ Falha: ${errorMessage(error, "erro desconhecido")}`
  }
}

/** Comprovante de sangria. */
export async function printSangria(ctx: PrintContext, sangria: Sangria): Promise<{ ok: boolean; message: string }> {
  if (isNativeHost()) {
    const res = await nativePrint(nativeSangria(sangria))
    if (res.success) return { ok: true, message: `🖨 Comprovante na fila de impressão: ${res.printerName}` }
    if (!res.fallbackToHttp) return { ok: false, message: `❌ Falha: ${res.error || "erro desconhecido"}` }
  }
  try {
    if (!(await flushPending())) return { ok: false, message: "❌ Erro ao conectar com o servidor." }
    const result = await printCashMovement(ctx.storeId, sangria.id)
    return { ok: true, message: `🖨 Comprovante na fila de impressão: ${result.printer_name || "impressora"}` }
  } catch (error) {
    if (await offlineNow(error)) return { ok: false, message: "❌ Erro ao conectar com o servidor." }
    return { ok: false, message: `❌ Falha: ${errorMessage(error, "erro desconhecido")}` }
  }
}

/** Relatório de fechamento (antes de encerrar o caixa). */
export async function printFechamento(ctx: PrintContext, sessionId: string, payload: NativeFechamento): Promise<string> {
  if (isNativeHost()) {
    const res = await nativePrint(payload)
    if (res.success) return `🖨 Relatório na fila de impressão: ${res.printerName}`
    if (!res.fallbackToHttp) return `⚠️ Impressão falhou: ${res.error}`
  }
  try {
    const result = await printCashClosing(ctx.storeId, sessionId)
    return `🖨 Relatório na fila de impressão: ${result.printer_name || "impressora"}`
  } catch (error) {
    if (await offlineNow(error)) return "⚠️ Impressora não disponível — encerrando mesmo assim."
    return `⚠️ Impressão falhou: ${errorMessage(error)}`
  }
}
