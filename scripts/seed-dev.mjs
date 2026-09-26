#!/usr/bin/env node
// Dados de desenvolvimento para o Supabase LOCAL (nunca rode em produção).
// Cria a loja DEMO com catálogo, usuários (senha 1234), um master
// (master / master123) e 30 dias de vendas, caixas e sangrias.
// Uso: node scripts/seed-dev.mjs
import { randomUUID } from "node:crypto"
import { createClient } from "@supabase/supabase-js"

import { adminClient, upsertAppUser } from "./lib/admin-users.mjs"

const url = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321"
if (!/127\.0\.0\.1|localhost/.test(url)) {
  console.error("seed-dev só roda no Supabase local.")
  process.exit(1)
}
const admin = adminClient(
  url,
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU"
)

const S = "DEMO"
const must = ({ error }) => {
  if (error) throw error
}

must(await admin.from("stores").upsert({ id: S, name: "LOJA DEMONSTRAÇÃO", cnpj: "12345678000190", phone: "(84) 99999-8888", terminals_allowed: 5, expire_date: "2027-12-31" }))
must(
  await admin.from("store_settings").upsert({
    store_id: S,
    ticket_config: { titleTicket: "TICKET 1-A-1", titleFicha: "ficha" },
    current_version: "1.0.0",
    versions: [{ id: 1, version: "1.0.0", date: new Date().toISOString(), description: "Versão inicial de lançamento do sistema VELO com controle de vendas e impressão de cupom." }],
  })
)

await upsertAppUser(admin, { storeId: S, username: "admin", role: "admin", password: "1234" })
await upsertAppUser(admin, { storeId: S, username: "sup", role: "supervisor", password: "1234" })
await upsertAppUser(admin, { storeId: S, username: "caixa1", role: "operador", password: "1234" })
await upsertAppUser(admin, { storeId: null, username: "master", role: "master", password: "master123" })

const base = Date.parse("2026-01-01T12:00:00Z")
const at = (i) => new Date(base + i * 1000).toISOString()

must(await admin.from("printers").upsert([
  { store_id: S, id: "1", name: "BAR - EPSON TM-T20", model: "Epson TM-T20", ip: "192.168.1.50", port: 9100, created_at: at(1) },
  { store_id: S, id: "2", name: "COZINHA - ELGIN I9", model: "Elgin i9", ip: "192.168.1.51", port: 9100, created_at: at(2) },
], { defaultToNull: false }))
must(await admin.from("terminals").upsert([
  { store_id: S, id: "CX1", cash_number: 1, name: "Caixa 01 - Recepção", printer_id: "1", created_at: at(1) },
  { store_id: S, id: "CX2", cash_number: 2, name: "Caixa 02 - Bar", printer_id: null, created_at: at(2) },
], { defaultToNull: false }))
must(await admin.from("payment_methods").upsert([
  { store_id: S, id: "1", code: "01", sort_order: 1, name: "DINHEIRO", button_color: "#16a34a", text_color: "#ffffff", created_at: at(1) },
  { store_id: S, id: "2", code: "02", sort_order: 2, name: "PIX", button_color: "#0ea5e9", text_color: "#ffffff", created_at: at(2) },
  { store_id: S, id: "3", code: "03", sort_order: 3, name: "CARTÃO DE CRÉDITO", button_color: "#f3f4f6", text_color: "#000000", created_at: at(3) },
  { store_id: S, id: "4", code: "04", sort_order: 4, name: "CARTÃO DE DÉBITO", button_color: "#f3f4f6", text_color: "#000000", created_at: at(4) },
], { defaultToNull: false }))
must(await admin.from("product_groups").upsert([
  { store_id: S, id: "1", name: "SANDUÍCHES", sort_order: 1, created_at: at(1) },
  { store_id: S, id: "2", name: "BEBIDAS", sort_order: 2, created_at: at(2) },
], { defaultToNull: false }))
must(await admin.from("product_subgroups").upsert([
  { store_id: S, id: "11", group_id: "1", name: "ACOMPANHAMENTOS HAMBURGUERES SECOS", button_color: "#2563eb", text_color: "#ffffff", created_at: at(1) },
  { store_id: S, id: "12", group_id: "1", name: "ADICIONAIS", button_color: "#f97316", text_color: "#ffffff", created_at: at(2) },
  { store_id: S, id: "21", group_id: "2", name: "SUCOS NATURAIS", button_color: "#22c55e", text_color: "#ffffff", created_at: at(3) },
  { store_id: S, id: "22", group_id: "2", name: "REFRIGERANTES", button_color: "#3b82f6", text_color: "#ffffff", created_at: at(4) },
], { defaultToNull: false }))
const products = [
  { id: "101", code: "98766", name: "PRESUNTO SECO", price: 9, cost: 4.5, sort_order: 1, stock: 150, subgroup_id: "11", printer_id: "1", icon: "sandwich", description: "Presunto seco de alta qualidade" },
  { id: "102", code: "87669", name: "TOMATE SECO", price: 9, cost: 3.5, sort_order: 2, stock: 200, subgroup_id: "11", printer_id: "1", icon: "sandwich", description: "Tomate seco artesanal" },
  { id: "103", code: "103", name: "MONTE SEU SECO", price: 15, cost: 6, sort_order: 3, stock: 4, subgroup_id: "11", printer_id: "1", icon: "sandwich", description: "Lanche personalizado seco" },
  { id: "120", code: "120", name: "BACON EXTRA", price: 4, cost: 1.5, sort_order: 1, stock: null, subgroup_id: "12", printer_id: "2", icon: "flame", description: "" },
  { id: "201", code: "66542", name: "SUCO DE LARANJA 300ml", price: 12, cost: 4, sort_order: 1, stock: 300, subgroup_id: "21", printer_id: "2", icon: "cup-soda", description: "Suco de laranja natural e fresco" },
  { id: "202", code: "55431", name: "COCA COLA LATA 350ml", price: 6.5, cost: 2.8, sort_order: 1, stock: 0, subgroup_id: "22", printer_id: "2", icon: "cup-soda", description: "Coca Cola lata 350ml" },
]
must(await admin.from("products").upsert(products.map((p, i) => ({ store_id: S, unit: "UNID", use_name_on_print: true, created_at: at(i + 1), ...p })), { defaultToNull: false }))

// Vendas dos últimos 30 dias (se ainda não houver).
const { count } = await admin.from("sales").select("id", { count: "exact", head: true }).eq("store_id", S)
if (!count) {
  const { data: users } = await admin.from("profiles").select("user_id, username").eq("store_id", S)
  const op = users.find((u) => u.username === "caixa1")
  const methods = [["DINHEIRO"], ["PIX"], ["CARTÃO DE CRÉDITO"], ["CARTÃO DE DÉBITO"], ["DINHEIRO", "PIX"]]
  const sales = []
  const items = []
  const payments = []
  const sessions = []
  const moves = []
  for (let d = 30; d >= 0; d--) {
    const day = new Date(Date.now() - d * 86400000)
    for (const term of ["CX1", "CX2"]) {
      const sessionId = randomUUID()
      const opened = new Date(day)
      opened.setUTCHours(11, 0, 0, 0)
      sessions.push({ id: sessionId, store_id: S, terminal_id: term, operator_id: op.user_id, operator_name: op.username, opened_at: opened.toISOString(), opening_amount: 100, status: d === 0 ? "open" : "closed", closed_at: d === 0 ? null : new Date(opened.getTime() + 10 * 3600000).toISOString() })
      moves.push({ id: randomUUID(), store_id: S, session_id: sessionId, terminal_id: term, kind: "sangria", amount: 50, reason: "Sangria de caixa", operator_id: op.user_id, operator_name: op.username, occurred_at: new Date(opened.getTime() + 5 * 3600000).toISOString() })
      const n = 3 + ((d * 7 + term.length) % 6)
      for (let k = 0; k < n; k++) {
        const saleId = randomUUID()
        const soldAt = new Date(opened.getTime() + (k + 1) * 45 * 60000).toISOString()
        const units = 1 + ((k + d) % 3)
        let total = 0
        for (let u = 0; u < units; u++) {
          const p = products[(k + u + d) % products.length]
          total += p.price
          items.push({ id: randomUUID(), sale_id: saleId, store_id: S, line_no: u + 1, product_id: p.id, product_name: p.name, unit_price: p.price, printer_id: p.printer_id, status: k === 0 && u === 0 && d % 5 === 0 ? "cancelled" : "active" })
        }
        const m = methods[(k + d) % methods.length]
        const split = m.length === 1 ? [total] : [Math.round(total * 60) / 100, total - Math.round(total * 60) / 100]
        const change = m[0] === "DINHEIRO" && m.length === 1 ? Math.ceil(total / 10) * 10 - total : 0
        m.forEach((name, idx) => payments.push({ sale_id: saleId, store_id: S, line_no: idx + 1, method_name: name, amount: idx === 0 ? split[0] + change : split[idx] }))
        sales.push({ id: saleId, store_id: S, kind: "sale", terminal_id: term, terminal_name: term === "CX1" ? "Caixa 01 - Recepção" : "Caixa 02 - Bar", operator_id: op.user_id, operator_name: op.username, cash_session_id: sessionId, total, paid_total: total + change, change_total: change, payment_label: m.join(" + "), sold_at: soldAt })
      }
    }
  }
  must(await admin.from("cash_sessions").insert(sessions))
  must(await admin.from("cash_movements").insert(moves))
  for (let i = 0; i < sales.length; i += 500) must(await admin.from("sales").insert(sales.slice(i, i + 500)))
  for (let i = 0; i < items.length; i += 500) must(await admin.from("sale_items").insert(items.slice(i, i + 500)))
  for (let i = 0; i < payments.length; i += 500) must(await admin.from("sale_payments").insert(payments.slice(i, i + 500)))
  console.log(`${sales.length} vendas, ${items.length} fichas, ${sessions.length} caixas.`)
}

// Caixas já fechados ganham o mesmo resumo que o PDV grava ao fechar
// (cash_session_summary), para a conciliação mostrar os valores do sistema.
// Só preenche o que falta: rodar de novo não muda nada.
{
  const { data: pending } = await admin.from("cash_sessions").select("id, operator_id, operator_name")
    .eq("store_id", S).eq("status", "closed").is("closing", null)
  if (pending?.length) {
    const { data: op } = await admin.from("profiles").select("user_id, username").eq("store_id", S).eq("username", "caixa1").single()
    const { data: user } = await admin.auth.admin.getUserById(op.user_id)
    const { data: link, error: linkError } = await admin.auth.admin.generateLink({ type: "magiclink", email: user.user.email })
    if (linkError) throw linkError
    const anonKey = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0"
    const asOperator = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } })
    must(await asOperator.auth.verifyOtp({ token_hash: link.properties.hashed_token, type: "magiclink" }))
    for (const s of pending) {
      const { data: summary, error } = await asOperator.rpc("cash_session_summary", { p_store_id: S, p_session_id: s.id })
      if (error) throw error
      delete summary.session
      must(await admin.from("cash_sessions").update({ closing: summary, closed_by: s.operator_id, closed_by_name: s.operator_name }).eq("id", s.id))
    }
    await asOperator.auth.signOut()
    console.log(`${pending.length} caixa(s) fechado(s) com resumo de fechamento.`)
  }
}

console.log("Loja DEMO pronta. Usuários: admin, sup, caixa1 (senha 1234); master / master123.")
console.log("Abra: http://127.0.0.1:5173/portal/?store=DEMO  ·  /pdv/?store=DEMO&tid=CX1  ·  /gelic/")
