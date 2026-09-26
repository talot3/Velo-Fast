// Testes de ponta a ponta do backend (Supabase local + funções /api no Vite).
// Pré-requisitos: `npx supabase start` (banco zerado com `npx supabase db reset`)
// e `npm run dev` rodando. Execute: node --test tests/backend.test.mjs
import assert from "node:assert/strict"
import { randomUUID } from "node:crypto"
import { after, before, describe, test } from "node:test"
import { createClient } from "@supabase/supabase-js"

import { adminClient, upsertAppUser } from "../scripts/lib/admin-users.mjs"

const SUPABASE_URL = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321"
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU"
const ANON_KEY = process.env.SUPABASE_PUBLISHABLE_KEY ?? "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0"
const APP_URL = process.env.APP_URL ?? "http://127.0.0.1:5173"

const admin = adminClient(SUPABASE_URL, SERVICE_KEY)
const RUN = Date.now().toString().slice(-6)
const A = `T${RUN}A`
const B = `T${RUN}B`
const EXPIRED = `T${RUN}C`
const BLOCKED = `T${RUN}D`

async function api(path, body, token) {
  const res = await fetch(`${APP_URL}/api/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  })
  return { status: res.status, body: await res.json() }
}

/** Faz login pela API e devolve um cliente Supabase com a sessão. */
async function loginAs(storeId, username, password, scope = "store") {
  const { status, body } = await api("auth/login", { storeId, username, password, scope })
  assert.equal(status, 200, `login ${username}@${storeId}: ${JSON.stringify(body)}`)
  const client = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
  const { error } = await client.auth.setSession(body.session)
  assert.ifError(error)
  return { client, token: body.session.access_token, user: body.user }
}

function saleItem(productId, price) {
  return { id: randomUUID(), product_id: productId, product_name: "X", unit_price: price }
}

let op, sup, adm, bob, master
/** Lojas criadas durante os testes (além de A, B, EXPIRED e BLOCKED). */
const extraStores = []

// Cada execução apaga o que criou: lojas (em cascata: catálogo, vendas,
// fila…) e os usuários do Auth dessas lojas e o master do teste.
after(async () => {
  const stores = [A, B, EXPIRED, BLOCKED, ...extraStores]
  const { data: storeUsers } = await admin.from("profiles").select("user_id").in("store_id", stores)
  const { data: masters } = await admin.from("profiles").select("user_id").is("store_id", null).eq("username", `root${RUN}`)
  for (const { user_id } of [...(storeUsers ?? []), ...(masters ?? [])]) await admin.auth.admin.deleteUser(user_id)
  const { error } = await admin.from("stores").delete().in("id", stores)
  assert.ifError(error)
})

before(async () => {
  const today = new Date()
  const yesterday = new Date(today.getTime() - 86400000).toISOString().slice(0, 10)
  const { error } = await admin.from("stores").insert([
    { id: A, name: "LOJA A" },
    { id: B, name: "LOJA B" },
    { id: EXPIRED, name: "LOJA VENCIDA", expire_date: yesterday },
    { id: BLOCKED, name: "LOJA BLOQUEADA", active: false },
  ], { defaultToNull: false })
  assert.ifError(error)
  await admin.from("store_settings").insert([{ store_id: A, ticket_config: { titleTicket: "TICKET 1-A-1", titleFicha: "ficha" } }, { store_id: B }], { defaultToNull: false })

  await upsertAppUser(admin, { storeId: A, username: "Operador Um", role: "operador", password: "1111" })
  await upsertAppUser(admin, { storeId: A, username: "sup", role: "supervisor", password: "4321" })
  await upsertAppUser(admin, { storeId: A, username: "ana", role: "admin", password: "1234" })
  await upsertAppUser(admin, { storeId: B, username: "bob", role: "operador", password: "2222" })
  await upsertAppUser(admin, { storeId: EXPIRED, username: "cris", role: "operador", password: "3333" })
  await upsertAppUser(admin, { storeId: BLOCKED, username: "dan", role: "operador", password: "5555" })
  await upsertAppUser(admin, { storeId: null, username: `root${RUN}`, role: "master", password: "master-pass" })

  // Catálogo mínimo nas duas lojas.
  await admin.from("printers").insert([
    { store_id: A, id: "1", name: "BAR", ip: "192.168.1.50" },
    { store_id: A, id: "2", name: "COZINHA", ip: "192.168.1.51" },
    { store_id: B, id: "1", name: "B-PRN", ip: "10.0.0.2" },
  ], { defaultToNull: false })
  await admin.from("terminals").insert([
    { store_id: A, id: "CX001", name: "CAIXA 1", cash_number: 1 },
    { store_id: A, id: "CX002", name: "CAIXA 2", cash_number: 2, printer_id: "2" },
  ], { defaultToNull: false })
  await admin.from("payment_methods").insert([
    { store_id: A, id: "1", name: "DINHEIRO" },
    { store_id: A, id: "2", name: "PIX" },
  ], { defaultToNull: false })
  await admin.from("product_groups").insert({ store_id: A, id: "1", name: "BEBIDAS" })
  await admin.from("product_subgroups").insert({ store_id: A, id: "11", group_id: "1", name: "SUCOS", button_color: "#22c55e" })
  await admin.from("products").insert([
    { store_id: A, id: "101", subgroup_id: "11", printer_id: "1", name: "SUCO", price: 12, stock: 10 },
    { store_id: A, id: "102", subgroup_id: "11", printer_id: "1", name: "AGUA", price: 4.5, stock: null },
    { store_id: B, id: "101", name: "PRODUTO B", price: 99 },
  ], { defaultToNull: false })

  op = await loginAs(A, "operador um", "1111")
  sup = await loginAs(A, "sup", "4321")
  adm = await loginAs(A, "ana", "1234")
  bob = await loginAs(B, "bob", "2222")
  master = await loginAs(null, `root${RUN}`, "master-pass", "master")
})

describe("login", () => {
  test("senha errada é recusada sem revelar se o usuário existe", async () => {
    const wrong = await api("auth/login", { storeId: A, username: "sup", password: "0000" })
    const missing = await api("auth/login", { storeId: A, username: "ninguem", password: "0000" })
    assert.equal(wrong.status, 401)
    assert.equal(missing.status, 401)
    assert.equal(wrong.body.error, missing.body.error)
  })

  test("licença vencida ou bloqueada impede o login", async () => {
    const expired = await api("auth/login", { storeId: EXPIRED, username: "cris", password: "3333" })
    assert.equal(expired.status, 403)
    assert.match(expired.body.error, /vencida/)
    const blocked = await api("auth/login", { storeId: BLOCKED, username: "dan", password: "5555" })
    assert.equal(blocked.status, 403)
    assert.match(blocked.body.error, /bloqueada/)
  })

  test("usuário de loja não entra no painel master e operador não autoriza", async () => {
    const r = await api("auth/login", { username: "ana", password: "1234", scope: "master" })
    assert.equal(r.status, 401) // admin de loja nem é encontrado no escopo master
    const elev = await api("auth/login", { storeId: A, username: "operador um", password: "1111", scope: "elevate" })
    assert.equal(elev.status, 403)
  })

  test("usuário do mesmo nome em outra loja não loga na loja errada", async () => {
    const r = await api("auth/login", { storeId: A, username: "bob", password: "2222" })
    assert.equal(r.status, 401)
  })
})

describe("isolamento entre lojas (RLS)", () => {
  test("operador da loja A não vê produtos da loja B", async () => {
    const { data, error } = await op.client.from("products").select("id, store_id")
    assert.ifError(error)
    assert.ok(data.length >= 2)
    assert.ok(data.every((p) => p.store_id === A))
    const { data: other } = await op.client.from("products").select("id").eq("store_id", B)
    assert.equal(other.length, 0)
  })

  test("RPC em outra loja é negada", async () => {
    const { error } = await op.client.rpc("pdv_bootstrap", { p_store_id: B })
    assert.equal(error?.code, "42501")
    const { error: saleErr } = await op.client.rpc("register_sale", {
      p_sale: { id: randomUUID(), store_id: B, items: [saleItem("101", 99)], payments: [{ method_name: "PIX", amount: 99 }] },
    })
    assert.equal(saleErr?.code, "42501")
  })

  test("operador não altera catálogo; supervisor sim", async () => {
    const { error } = await op.client.from("products").update({ price: 1 }).eq("store_id", A).eq("id", "101").select()
    const { data: still } = await admin.from("products").select("price").eq("store_id", A).eq("id", "101").single()
    assert.equal(Number(still.price), 12, `operador alterou o preço (${error?.message})`)
    const { data, error: supErr } = await sup.client.from("products").update({ description: "gelado" }).eq("store_id", A).eq("id", "101").select()
    assert.ifError(supErr)
    assert.equal(data.length, 1)
  })

  test("anônimo não lê nada", async () => {
    const anon = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } })
    const { data } = await anon.from("products").select("id")
    assert.equal(data?.length ?? 0, 0)
    const { data: stores } = await anon.from("stores").select("id")
    assert.equal(stores?.length ?? 0, 0)
  })

  test("usuário desativado perde acesso na hora, mesmo com sessão válida", async () => {
    const tmp = await upsertAppUser(admin, { storeId: A, username: "temp", role: "operador", password: "9999" })
    const s = await loginAs(A, "temp", "9999")
    const before = await s.client.from("products").select("id")
    assert.ok(before.data.length > 0)
    await admin.from("profiles").update({ active: false }).eq("user_id", tmp)
    const after = await s.client.from("products").select("id")
    assert.equal(after.data.length, 0)
  })
})

describe("vendas", () => {
  test("registra venda com preço do catálogo, baixa estoque e não duplica no reenvio", async () => {
    const id = randomUUID()
    const sale = {
      id,
      store_id: A,
      terminal_id: "CX001",
      sold_at: new Date().toISOString(),
      items: [saleItem("101", 1.0), saleItem("101", 12), saleItem("102", 4.5)],
      payments: [{ method_id: "1", method_name: "DINHEIRO", amount: 50 }],
    }
    const { data, error } = await op.client.rpc("register_sale", { p_sale: sale })
    assert.ifError(error)
    assert.equal(data.status, "created")
    assert.equal(Number(data.total), 28.5) // 12 + 12 + 4,50: preço adulterado (1,00) ignorado
    assert.equal(data.price_mismatch.length, 1)

    const again = await op.client.rpc("register_sale", { p_sale: sale })
    assert.equal(again.data.status, "duplicate")

    const { data: p } = await admin.from("products").select("stock").eq("store_id", A).eq("id", "101").single()
    assert.equal(Number(p.stock), 8)
    const { data: s } = await admin.from("sales").select("change_total, payment_label, operator_name").eq("id", id).single()
    assert.equal(Number(s.change_total), 21.5)
    assert.equal(s.payment_label, "DINHEIRO")
    assert.equal(s.operator_name, "Operador Um")
  })

  test("troco só em dinheiro e pagamento insuficiente é recusado", async () => {
    const pix = await op.client.rpc("register_sale", {
      p_sale: { id: randomUUID(), store_id: A, items: [saleItem("102", 4.5)], payments: [{ method_name: "PIX", amount: 10 }] },
    })
    assert.match(pix.error?.message ?? "", /Troco/)
    const short = await op.client.rpc("register_sale", {
      p_sale: { id: randomUUID(), store_id: A, items: [saleItem("101", 12)], payments: [{ method_name: "PIX", amount: 5 }] },
    })
    assert.match(short.error?.message ?? "", /insuficiente/)
  })

  test("estorno exige supervisor e devolve o estoque", async () => {
    const refund = {
      id: randomUUID(),
      store_id: A,
      kind: "refund",
      terminal_id: "CX001",
      operator_name: "Operador Um",
      items: [saleItem("101", -12)],
      payments: [],
    }
    const denied = await op.client.rpc("register_sale", { p_sale: refund })
    assert.equal(denied.error?.code, "42501")
    const ok = await sup.client.rpc("register_sale", { p_sale: refund })
    assert.ifError(ok.error)
    assert.equal(Number(ok.data.total), -12)
    const { data: p } = await admin.from("products").select("stock").eq("store_id", A).eq("id", "101").single()
    assert.equal(Number(p.stock), 9)
    const { data: s } = await admin.from("sales").select("operator_name, authorized_by_name, payment_label").eq("id", refund.id).single()
    assert.deepEqual(s, { operator_name: "Operador Um", authorized_by_name: "sup", payment_label: "ESTORNO DINHEIRO" })
  })

  test("cancelamento de ficha exige supervisor, devolve estoque e não repete", async () => {
    const id = randomUUID()
    const item = saleItem("101", 12)
    await op.client.rpc("register_sale", {
      p_sale: { id, store_id: A, terminal_id: "CX001", items: [item], payments: [{ method_name: "PIX", amount: 12 }] },
    })
    const denied = await op.client.rpc("cancel_sale_items", { p_store_id: A, p_item_ids: [item.id] })
    assert.equal(denied.error?.code, "42501")
    const ok = await sup.client.rpc("cancel_sale_items", { p_store_id: A, p_item_ids: [item.id], p_reason: "cliente desistiu" })
    assert.ifError(ok.error)
    assert.equal(ok.data.cancelled, 1)
    const twice = await sup.client.rpc("cancel_sale_items", { p_store_id: A, p_item_ids: [item.id] })
    assert.ok(twice.error)
    const { data: p } = await admin.from("products").select("stock").eq("store_id", A).eq("id", "101").single()
    assert.equal(Number(p.stock), 9)
  })

  test("duas vendas simultâneas não perdem baixa de estoque", async () => {
    const { data: before } = await admin.from("products").select("stock").eq("store_id", A).eq("id", "101").single()
    await Promise.all(
      Array.from({ length: 8 }, () =>
        op.client.rpc("register_sale", {
          p_sale: { id: randomUUID(), store_id: A, items: [saleItem("101", 12)], payments: [{ method_name: "PIX", amount: 12 }] },
        })
      )
    )
    const { data: after } = await admin.from("products").select("stock").eq("store_id", A).eq("id", "101").single()
    assert.equal(Number(after.stock), Number(before.stock) - 8)
  })
})

describe("caixa", () => {
  test("abre, registra sangria, resume por forma de pagamento e fecha", async () => {
    const sessionId = randomUUID()
    const opened = await op.client.rpc("open_cash_session", {
      p_store_id: A, p_session_id: sessionId, p_terminal_id: "CX002", p_opening_amount: 100,
    })
    assert.ifError(opened.error)
    assert.equal(opened.data.status, "created")

    // Outro operador no mesmo terminal herda o caixa aberto.
    const again = await sup.client.rpc("open_cash_session", {
      p_store_id: A, p_session_id: randomUUID(), p_terminal_id: "CX002", p_opening_amount: 0,
    })
    assert.equal(again.data.status, "already_open")
    assert.equal(again.data.session.id, sessionId)

    // R$ 90 cartão + R$ 10 dinheiro (antes era rateado 50/50) e uma venda
    // de R$ 24 paga com R$ 50 em dinheiro (troco R$ 26).
    await op.client.rpc("register_sale", {
      p_sale: {
        id: randomUUID(), store_id: A, terminal_id: "CX002",
        items: Array.from({ length: 8 }, () => saleItem("101", 12)).concat([saleItem("102", 4.5)]).slice(0, 8),
        payments: [{ method_name: "CARTÃO", amount: 86 }, { method_name: "DINHEIRO", amount: 10 }],
      },
    })
    await op.client.rpc("register_sale", {
      p_sale: { id: randomUUID(), store_id: A, terminal_id: "CX002", items: [saleItem("101", 12), saleItem("101", 12)], payments: [{ method_name: "DINHEIRO", amount: 50 }] },
    })
    const mov = await op.client.rpc("add_cash_movement", {
      p_store_id: A, p_movement: { id: randomUUID(), terminal_id: "CX002", kind: "sangria", amount: 30, reason: "troco" },
    })
    assert.ifError(mov.error)

    const { data: summary, error } = await op.client.rpc("cash_session_summary", { p_store_id: A, p_session_id: sessionId })
    assert.ifError(error)
    const byMethod = Object.fromEntries(summary.by_method.map((m) => [m.method, Number(m.total)]))
    assert.equal(Number(summary.total_vendas), 120)
    assert.equal(byMethod["CARTÃO"], 86)
    assert.equal(byMethod["DINHEIRO"], 34) // 10 + (50 − 26 de troco)
    assert.equal(Number(summary.total_sangrias), 30)
    assert.equal(Number(summary.dinheiro_em_caixa), 104) // 100 + 34 − 30
    assert.equal(Number(summary.qtd_transacoes), 10)

    const closed = await op.client.rpc("close_cash_session", { p_store_id: A, p_session_id: sessionId })
    assert.equal(closed.data.status, "closed")
    const { data: row } = await admin.from("cash_sessions").select("status, closing").eq("id", sessionId).single()
    assert.equal(row.status, "closed")
    assert.equal(Number(row.closing.dinheiro_em_caixa), 104)
  })
})

describe("impressão e ponte", () => {
  test("fichas vão para a impressora do terminal, a ponte busca e confirma", async () => {
    const { data: bridge, error: bErr } = await adm.client.rpc("create_printer_bridge", { p_store_id: A, p_name: "Ponte teste" })
    assert.ifError(bErr)
    assert.match(bridge.api_key, /^vfb_[0-9a-f]{48}$/)

    const item1 = saleItem("101", 12)
    const item2 = saleItem("102", 4.5)
    await op.client.rpc("register_sale", {
      p_sale: { id: randomUUID(), store_id: A, terminal_id: "CX002", items: [item1, item2], payments: [{ method_name: "PIX", amount: 16.5 }] },
    })
    const printed = await op.client.rpc("print_sale_items", { p_store_id: A, p_item_ids: [item1.id, item2.id] })
    assert.ifError(printed.error)
    assert.equal(printed.data.jobs, 1) // terminal CX002 tem impressora própria (COZINHA)
    assert.deepEqual(printed.data.printers, ["COZINHA"])

    const bridgeClient = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } })
    const wrong = await bridgeClient.rpc("bridge_claim_jobs", { p_key: "vfb_errada" })
    assert.ok(wrong.error)

    const claimed = await bridgeClient.rpc("bridge_claim_jobs", { p_key: bridge.api_key })
    assert.ifError(claimed.error)
    const job = claimed.data.find((j) => j.kind === "ficha")
    assert.ok(job)
    assert.equal(job.data.printer.name, "COZINHA")
    assert.equal(job.data.fichas.length, 2)
    assert.equal(job.data.ticket.titleFicha, "ficha")

    // Uma segunda consulta não devolve o mesmo trabalho (sem impressão duplicada).
    const second = await bridgeClient.rpc("bridge_claim_jobs", { p_key: bridge.api_key })
    assert.ok(!second.data.some((j) => j.id === job.id))

    const ack = await bridgeClient.rpc("bridge_ack_job", { p_key: bridge.api_key, p_job_id: job.id, p_ok: true })
    assert.ifError(ack.error)
    const { data: row } = await admin.from("print_jobs").select("status").eq("id", job.id).single()
    assert.equal(row.status, "done")

    // Outra loja não enxerga a fila.
    const { data: bobJobs } = await bob.client.from("print_jobs").select("id")
    assert.equal(bobJobs.length, 0)
    // O hash da chave nunca é legível.
    const { error: hashErr } = await adm.client.from("printer_bridges").select("key_hash")
    assert.ok(hashErr)
  })
})

describe("revogar chave da ponte", () => {
  test("chave revogada não busca mais a fila; operador não revoga", async () => {
    const { data: bridge, error } = await adm.client.rpc("create_printer_bridge", { p_store_id: A, p_name: "Ponte a revogar" })
    assert.ifError(error)
    const bridgeClient = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } })
    const before = await bridgeClient.rpc("bridge_claim_jobs", { p_key: bridge.api_key, p_limit: 1 })
    assert.ifError(before.error)

    const byOperator = await op.client.rpc("revoke_printer_bridge", { p_store_id: A, p_bridge_id: bridge.id })
    assert.equal(byOperator.error?.code, "42501")

    const revoked = await adm.client.rpc("revoke_printer_bridge", { p_store_id: A, p_bridge_id: bridge.id })
    assert.ifError(revoked.error)
    assert.equal(revoked.data, true)
    const after = await bridgeClient.rpc("bridge_claim_jobs", { p_key: bridge.api_key, p_limit: 1 })
    assert.equal(after.error?.code, "28000")

    const { data: listed } = await adm.client.from("printer_bridges").select("name, active, key_prefix").eq("id", bridge.id).single()
    assert.equal(listed.active, false)
    assert.ok(bridge.api_key.startsWith(listed.key_prefix))
  })
})

describe("painel master", () => {
  test("só o master lista e cria lojas, com código sequencial", async () => {
    const denied = await adm.client.rpc("master_list_stores")
    assert.equal(denied.error?.code, "42501")

    const created = await master.client.rpc("master_create_store", { p_name: "restaurante teste", p_cnpj: "12.345.678/0001-90" })
    assert.ifError(created.error)
    assert.equal(created.data.name, "RESTAURANTE TESTE")
    assert.ok(Number(created.data.id) > 16000)
    extraStores.push(created.data.id)

    const updated = await master.client.rpc("master_update_store", { p_store_id: created.data.id, p_active: false, p_terminals_allowed: 3 })
    assert.equal(updated.data.active, false)
    assert.equal(updated.data.terminalsAllowed, 3)
    // Bloquear/liberar sem informar o limite não pode mexer nele.
    const toggled = await master.client.rpc("master_update_store", { p_store_id: created.data.id, p_active: true })
    assert.ifError(toggled.error)
    assert.equal(toggled.data.active, true)
    assert.equal(toggled.data.terminalsAllowed, 3)

    // Ponte que nunca se conectou aparece como offline (false, não null).
    const { error: bridgeError } = await admin.from("printer_bridges").insert(
      { store_id: B, name: "Nunca vista", key_prefix: `vfb_${RUN}nv`, key_hash: randomUUID() },
      { defaultToNull: false }
    )
    assert.ifError(bridgeError)
    const withBridge = await master.client.rpc("master_list_stores")
    assert.equal(withBridge.data.find((s) => s.id === B)?.bridge?.online, false)

    const list = await master.client.rpc("master_list_stores")
    assert.ok(list.data.some((s) => s.id === A && s.bridge?.name === "Ponte teste"))
  })
})

describe("usuários (/api/users)", () => {
  test("admin cria usuário na própria loja, não em outra; operador não cria", async () => {
    const ok = await api("users", { action: "create", storeId: A, username: "Novo Caixa", password: "7777", role: "operador" }, adm.token)
    assert.equal(ok.status, 200, JSON.stringify(ok.body))
    const other = await api("users", { action: "create", storeId: B, username: "intruso", password: "7777", role: "admin" }, adm.token)
    assert.equal(other.status, 403)
    const byOp = await api("users", { action: "create", storeId: A, username: "x", password: "7777", role: "operador" }, op.token)
    assert.equal(byOp.status, 403)
    const dup = await api("users", { action: "create", storeId: A, username: "novo caixa", password: "7777", role: "operador" }, adm.token)
    assert.equal(dup.status, 409)

    const s = await loginAs(A, "novo caixa", "7777")
    assert.equal(s.user.role, "operador")
  })

  test("admin não reduz o próprio nível de acesso", async () => {
    const r = await api("users", { action: "update", userId: adm.user.id, role: "operador" }, adm.token)
    assert.equal(r.status, 400, JSON.stringify(r.body))
    const same = await api("users", { action: "update", userId: adm.user.id, role: "admin", displayName: "Ana" }, adm.token)
    assert.equal(same.status, 200, JSON.stringify(same.body))
  })

  test("supervisor não promove ninguém a admin", async () => {
    const r = await api("users", { action: "create", storeId: A, username: "chefe", password: "7777", role: "admin" }, sup.token)
    assert.equal(r.status, 403)
  })
})

describe("relatórios", () => {
  test("vendas por produto descontam estorno e ignoram fichas canceladas", async () => {
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date())
    const { data, error } = await sup.client.rpc("report_sales_by_product", { p_store_id: B === "x" ? B : A, p_from: today, p_to: today })
    assert.ifError(error)
    const suco = data.rows.find((r) => r.product_name === "SUCO")
    assert.ok(suco)
    // Soma direta das fichas ativas de SUCO hoje, para conferir o relatório.
    const { data: items } = await admin
      .from("sale_items")
      .select("unit_price, status")
      .eq("store_id", A)
      .eq("product_id", "101")
    const active = items.filter((i) => i.status === "active")
    const expectedQty = active.reduce((n, i) => n + (Number(i.unit_price) >= 0 ? 1 : -1), 0)
    const expectedTotal = active.reduce((n, i) => n + Number(i.unit_price), 0)
    assert.equal(Number(suco.qty), expectedQty)
    assert.equal(Number(suco.total), expectedTotal)
  })

  test("operador não acessa relatórios; outra loja também não", async () => {
    const today = new Date().toISOString().slice(0, 10)
    const byOp = await op.client.rpc("report_dashboard", { p_store_id: A })
    assert.equal(byOp.error?.code, "42501")
    const other = await sup.client.rpc("report_sales_by_terminal", { p_store_id: B, p_from: today, p_to: today })
    assert.equal(other.error?.code, "42501")
  })

  test("fechamento por caixa usa o dinheiro real (troco descontado) e sangrias do banco", async () => {
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date())
    const { data, error } = await sup.client.rpc("report_cash_closing", { p_store_id: A, p_from: today, p_to: today })
    assert.ifError(error)
    const cx2 = data.rows.find((r) => r.terminal_id === "CX002")
    assert.ok(cx2)
    assert.equal(Number(cx2.sangrias), 30)
    assert.equal(Number(cx2.suprimento), 100)
    assert.equal(Number(cx2.saldo_gaveta), Number(cx2.suprimento) + Number(cx2.dinheiro) - Number(cx2.sangrias))
    const dash = await sup.client.rpc("report_dashboard", { p_store_id: A })
    assert.ifError(dash.error)
    assert.ok(Number(dash.data.faturamento_bruto) > 0)
    assert.ok(dash.data.by_payment.some((m) => m.name === "DINHEIRO"))
  })
})
