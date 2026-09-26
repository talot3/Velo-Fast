import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { useConfirm } from "@/components/app/confirm-dialog"
import { useElevate } from "@/components/app/elevate-dialog"
import { registerRefund, registerSale, type PdvCatalog, type SaleInput } from "@/data/pdv"
import type { Product } from "@/data/types"
import { errorMessage, isNetworkError } from "@/lib/errors"
import { formatBRL, sumMoney } from "@/lib/format"

import { DevolucaoDrawer } from "./components/devolucao-drawer"
import { FechamentoDialog } from "./components/fechamento-dialog"
import { PdvHeader } from "./components/header"
import { HistoryDrawer } from "./components/history-drawer"
import { ItemsDrawer } from "./components/items-drawer"
import { MenuDrawer, type MenuAction } from "./components/menu-drawer"
import { OrderPanel } from "./components/order-panel"
import { PaymentDialog } from "./components/payment-dialog"
import { ProductPanel } from "./components/product-panel"
import { SangriaDialog } from "./components/sangria-dialog"
import { TicketDialog } from "./components/ticket-dialog"
import type { ConnectionState } from "./hooks/use-connection"
import { numpadKey, usePdvKeys } from "./hooks/use-pdv-keys"
import { loadOrder, saveOrder, type LocalSession } from "./lib/device-state"
import { notify } from "./lib/notify"
import { printTickets, ticketPrintMessage, type PrintContext } from "./lib/printing"
import { orderCount, orderTotal } from "./lib/receipts"
import { findTerminalFlex } from "./lib/terminal"
import type { AppliedPayment, OrderLine, Overlay, ReturnLine, TicketTx } from "./lib/types"

/** Limite do servidor: 500 fichas por venda. */
const MAX_UNITS = 500

type PdvScreenProps = {
  storeId: string
  operator: string
  terminalId: string
  catalog: PdvCatalog
  session: LocalSession
  connection: ConnectionState
  refreshCatalog: () => Promise<unknown>
  syncSession: () => Promise<LocalSession>
  onClosed: () => void
  onLogout: () => void
}

/** Tela de vendas do caixa. */
export function PdvScreen(props: PdvScreenProps) {
  const { storeId, operator, terminalId, catalog, session, connection, refreshCatalog } = props
  const confirm = useConfirm()
  const elevate = useElevate()

  const [order, setOrder] = useState<OrderLine[]>(() => loadOrder(storeId, terminalId, operator))
  const [qtyStr, setQtyStr] = useState("")
  const [search, setSearch] = useState("")
  const [activeSubgroup, setActiveSubgroup] = useState<string | null>(null)
  const [numpadOpen, setNumpadOpen] = useState(false)
  const [overlay, setOverlay] = useState<Overlay | null>(null)
  const [ticket, setTicket] = useState<TicketTx[] | null>(null)

  const total = orderTotal(order)
  const count = orderCount(order)
  const terminal = useMemo(() => findTerminalFlex(catalog.terminals, terminalId), [catalog.terminals, terminalId])
  const printCtx: PrintContext = useMemo(
    () => ({ storeId, terminal, terminalId, operator, printers: catalog.printers }),
    [storeId, terminal, terminalId, operator, catalog.printers]
  )

  // O pedido em andamento sobrevive a um recarregamento da página.
  useEffect(() => {
    saveOrder(storeId, terminalId, operator, order)
  }, [storeId, terminalId, operator, order])

  const closeOverlay = (o: boolean) => {
    if (!o) setOverlay(null)
  }

  // ─── Pedido ───────────────────────────────────────────────────────
  const np = (key: string) => {
    if (key === "DEL") setQtyStr((s) => s.slice(0, -1))
    else if (key === ".") notify("⚠️ A quantidade deve ser um número inteiro.")
    else setQtyStr((s) => (s.length < 3 ? s + key : s))
  }

  // Estado mais recente para o toque no produto (callback estável: os cards não re-renderizam a cada item).
  const latest = useRef({ order, qtyStr })
  useEffect(() => {
    latest.current = { order, qtyStr }
  })

  const addProduct = useCallback((p: Product, card: HTMLElement) => {
    if (p.stock !== null && p.stock <= 0) {
      notify(`⚠️ ${p.name} sem estoque disponível.`)
      return
    }
    const { order: current, qtyStr: typed } = latest.current
    const qty = parseInt(typed || "0", 10) || 1
    if (orderCount(current) + qty > MAX_UNITS) {
      notify(`⚠️ Máximo de ${MAX_UNITS} fichas por venda.`)
      return
    }
    // Soma na linha do mesmo produto — nunca numa linha de crédito de troca (negativa).
    const existing = current.find((l) => l.productId === p.id && !l.credit)
    const next = existing
      ? current.map((l) => (l === existing ? { ...l, qty: l.qty + qty } : l))
      : [...current, { uid: crypto.randomUUID(), productId: p.id, name: p.name, price: p.price, printerId: p.printerId, qty }]
    latest.current = { order: next, qtyStr: "" }
    setOrder(next)
    setQtyStr("")
    card.animate?.([{ transform: "scale(0.93)" }, { transform: "scale(1)" }], { duration: 150 })
    notify(`+ ${p.name}`)
  }, [])

  const changeQty = (uid: string, delta: number) => {
    if (delta > 0 && orderCount(order) + delta > MAX_UNITS) {
      notify(`⚠️ Máximo de ${MAX_UNITS} fichas por venda.`)
      return
    }
    setOrder((list) => list.map((l) => (l.uid === uid ? { ...l, qty: Math.max(1, l.qty + delta) } : l)))
  }

  const removeLine = (uid: string) => setOrder((list) => list.filter((l) => l.uid !== uid))

  const novaVenda = async () => {
    if (order.length && !(await confirm("Iniciar nova venda? O pedido atual será cancelado.", { confirmLabel: "Iniciar nova venda" })))
      return
    setOrder([])
    setQtyStr("")
  }

  const cancelarItem = () => {
    if (!order.length) return
    const last = order[order.length - 1]
    notify(`Removido: ${last.name}`)
    setOrder(order.slice(0, -1))
  }

  const openPayment = () => {
    if (!order.length) return
    if (total < 0) {
      notify(
        'O carrinho possui saldo negativo. Para estornar o valor total ao cliente, utilize a opção "Estornar Dinheiro" diretamente no menu de Devoluções.',
        6000
      )
      return
    }
    setOverlay("payment")
  }

  // ─── Venda ────────────────────────────────────────────────────────
  const finalize = async (payments: AppliedPayment[]) => {
    const soldAt = new Date().toISOString()
    const label = payments.map((p) => p.method_name).join(" + ")
    const units = order.flatMap((line) => Array.from({ length: line.qty }, () => ({ id: crypto.randomUUID(), line })))
    const sale: SaleInput = {
      id: crypto.randomUUID(),
      store_id: storeId,
      kind: "sale",
      terminal_id: terminalId,
      terminal_name: terminal?.name ?? null,
      cash_session_id: session.id,
      sold_at: soldAt,
      items: units.map(({ id, line }) => ({
        id,
        product_id: line.productId,
        product_name: line.name,
        unit_price: line.price,
        printer_id: line.printerId,
      })),
      payments: payments.map((p) => ({ method_id: p.method_id, method_name: p.method_name, amount: p.amount })),
    }
    try {
      const res = await registerSale(sale)
      if (res.queued) notify("⚠️ Sem conexão — venda será sincronizada automaticamente.")
      // Estoque controlado mudou no servidor: atualiza os avisos "Últ. N" / "Sem estoque".
      else if (order.some((l) => catalog.products.find((p) => p.id === l.productId)?.stock != null)) void refreshCatalog()
    } catch (error) {
      // Erro de regra (ex.: preço mudou, pagamento insuficiente): a venda continua aberta.
      notify(`⚠️ ${errorMessage(error)}`, 5000)
      void refreshCatalog()
      return false
    }
    setOrder([])
    setQtyStr("")
    setOverlay(null)
    setTicket(
      units.map(({ id, line }) => ({
        id,
        productId: line.productId,
        productName: line.name,
        price: line.price,
        printerId: line.printerId,
        paymentMethod: label,
        terminalId,
        operator,
        timestamp: soldAt,
      }))
    )
    return true
  }

  const closeTicket = () => {
    setTicket(null)
    notify("✅ Venda concluída!")
  }

  const printTicket = async (txs: TicketTx[]) => {
    const outcome = await printTickets(printCtx, txs)
    notify(ticketPrintMessage(printCtx, outcome), outcome.kind === "ok" ? 2800 : 5000)
    if (outcome.kind === "offline") return false
    setTicket(null)
    return true
  }

  // ─── Devoluções ───────────────────────────────────────────────────
  const refund = async (lines: ReturnLine[]) => {
    const value = sumMoney(lines.map((l) => l.price * l.qty))
    if (value <= 0) return false
    const ok = await confirm(
      `Confirmar o ESTORNO EM DINHEIRO no valor de ${formatBRL(value)}? Isso reajustará o estoque físico e registrará uma saída (estorno) de caixa.`,
      { confirmLabel: "Confirmar estorno", destructive: true }
    )
    if (!ok) return false
    if (!navigator.onLine) {
      notify("Erro de conexão com o servidor ao realizar o estorno.", 5000)
      return false
    }
    const sup = await elevate()
    if (!sup) return false
    const soldAt = new Date().toISOString()
    const units = lines.flatMap((line) => Array.from({ length: line.qty }, () => ({ id: crypto.randomUUID(), line })))
    try {
      await registerRefund(sup.client, {
        id: crypto.randomUUID(),
        store_id: storeId,
        kind: "refund",
        terminal_id: terminalId,
        terminal_name: terminal?.name ?? null,
        operator_name: operator,
        cash_session_id: session.id,
        sold_at: soldAt,
        items: units.map(({ id, line }) => ({
          id,
          product_id: line.productId,
          product_name: `[ESTORNO] ${line.name}`,
          unit_price: -Math.abs(line.price),
          printer_id: line.printerId,
        })),
        payments: [],
      })
    } catch (error) {
      notify(
        isNetworkError(error)
          ? "Erro de conexão com o servidor ao realizar o estorno."
          : `Falha ao processar estorno no servidor: ${errorMessage(error, "Erro desconhecido")}`,
        5000
      )
      return false
    } finally {
      await sup.release()
    }
    setOverlay(null)
    notify("✅ Estorno concluído com sucesso!")
    setTicket(
      units.map(({ id, line }) => ({
        id,
        productId: line.productId,
        productName: `[ESTORNO] ${line.name}`,
        price: -Math.abs(line.price),
        printerId: line.printerId,
        paymentMethod: "ESTORNO DINHEIRO",
        terminalId,
        operator,
        timestamp: soldAt,
      }))
    )
    void refreshCatalog()
    return true
  }

  const credit = (lines: ReturnLine[]) => {
    if (!lines.length) return
    setOrder((list) => [
      ...list,
      ...lines.map((l) => ({
        uid: crypto.randomUUID(),
        productId: l.productId,
        name: `[DEVOLUÇÃO] ${l.name}`,
        price: -Math.abs(l.price),
        printerId: l.printerId,
        qty: l.qty,
        credit: true,
      })),
    ])
    notify("✅ Crédito para troca inserido no carrinho!")
    setOverlay("items")
  }

  // ─── Menu ─────────────────────────────────────────────────────────
  const onMenu = (action: MenuAction) => {
    switch (action) {
      case "sangria":
        return setOverlay("sangria")
      case "fechamento":
        return setOverlay("fechamento")
      case "cancelamento":
        return setOverlay("cancel")
      case "devolucoes":
        return setOverlay("devolucao")
      case "sair":
        setOverlay(null)
        return props.onLogout()
    }
  }

  // ─── Teclado ──────────────────────────────────────────────────────
  usePdvKeys(true, (ev) => {
    if (ev.key === "Enter") {
      // Abre o pagamento só com a tela de vendas livre (sem gaveta/modal aberto).
      if (overlay === null && ticket === null && order.length > 0) {
        ev.preventDefault()
        openPayment()
      }
      return
    }
    // Pagamento e sangria cuidam dos próprios teclados; o resto vai para a quantidade.
    if (overlay === "payment" || overlay === "sangria") return
    const key = numpadKey(ev)
    if (key) {
      ev.preventDefault()
      np(key)
    }
  })

  return (
    <div className="pdv-root flex h-svh flex-col overflow-hidden bg-background text-foreground">
      <PdvHeader
        terminalName={terminal?.name || terminalId}
        operator={operator}
        version={catalog.currentVersion}
        connection={connection}
        onReprint={() => setOverlay("reimp")}
        onMenu={() => setOverlay("menu")}
      />
      <div className="flex min-h-0 flex-1 overflow-hidden max-md:flex-col">
        <OrderPanel
          count={count}
          total={total}
          qtyStr={qtyStr}
          search={search}
          numpadOpen={numpadOpen}
          onSearch={setSearch}
          onClearSearch={() => setSearch("")}
          onNumpadKey={np}
          onToggleNumpad={() => setNumpadOpen((o) => !o)}
          onOpenItems={() => setOverlay("items")}
        />
        <ProductPanel
          products={catalog.products}
          subgroups={catalog.subgroups}
          activeSubgroup={activeSubgroup}
          search={search}
          onSubgroup={setActiveSubgroup}
          onClearSearch={() => setSearch("")}
          onProduct={addProduct}
        />
      </div>

      <ItemsDrawer
        open={overlay === "items"}
        onOpenChange={closeOverlay}
        lines={order}
        count={count}
        total={total}
        onChangeQty={changeQty}
        onRemove={removeLine}
        onNewSale={() => void novaVenda()}
        onCancelLast={cancelarItem}
        onPay={openPayment}
      />
      <PaymentDialog
        open={overlay === "payment"}
        onOpenChange={closeOverlay}
        total={total}
        methods={catalog.paymentMethods}
        onFinalize={finalize}
      />
      <TicketDialog
        txs={ticket}
        ticketConfig={catalog.ticketConfig}
        terminalId={terminalId}
        operator={operator}
        onClose={closeTicket}
        onPrint={printTicket}
      />
      <MenuDrawer
        open={overlay === "menu"}
        onOpenChange={closeOverlay}
        terminalId={terminalId}
        operator={operator}
        version={catalog.currentVersion}
        onSelect={onMenu}
      />
      <SangriaDialog open={overlay === "sangria"} onOpenChange={closeOverlay} print={printCtx} />
      <FechamentoDialog
        open={overlay === "fechamento"}
        onOpenChange={closeOverlay}
        print={printCtx}
        syncSession={props.syncSession}
        failedCount={connection.failed}
        onClosed={props.onClosed}
      />
      <HistoryDrawer
        mode="reimp"
        open={overlay === "reimp"}
        onOpenChange={closeOverlay}
        print={printCtx}
        onCancelled={() => void refreshCatalog()}
      />
      <HistoryDrawer
        mode="cancel"
        open={overlay === "cancel"}
        onOpenChange={closeOverlay}
        print={printCtx}
        onCancelled={() => void refreshCatalog()}
      />
      <DevolucaoDrawer
        open={overlay === "devolucao"}
        onOpenChange={closeOverlay}
        products={catalog.products}
        onRefund={refund}
        onCredit={credit}
      />
    </div>
  )
}
