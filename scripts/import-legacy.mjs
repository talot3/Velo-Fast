#!/usr/bin/env node
/**
 * Importa os dados do VELO FAST v1 para o schema novo (v2).
 *
 * Origem (uma das três):
 *   --source same-db                  tabelas da v1 movidas para o schema "legacy" do MESMO projeto
 *                                     (migração 20260926115900_legacy_quarantine.sql)
 *   --source supabase --source-url URL --source-key SERVICE_KEY
 *                                     projeto Supabase antigo (tabelas stores, app_users, system_data)
 *   --source file --file data.json --store ID [--store-name "NOME"]
 *                                     arquivo de estado do servidor local antigo (um arquivo por loja)
 * Destino: SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY (projeto novo).
 * Opções: --store ID (repetível; filtra lojas)  --dry-run (só mostra o que faria)
 *
 * Pode rodar quantas vezes precisar: os IDs gerados são estáveis e tudo é
 * gravado com upsert (não duplica). Estoque e vendas vêm como estavam.
 */
import { createHash } from "node:crypto"
import { readFileSync } from "node:fs"
import bcrypt from "bcryptjs"
import { createClient } from "@supabase/supabase-js"

import { adminClient, upsertAppUser } from "./lib/admin-users.mjs"

// ─── Argumentos ─────────────────────────────────────────────────────
const argv = process.argv.slice(2)
const opt = (name) => {
  const i = argv.indexOf(`--${name}`)
  return i >= 0 ? argv[i + 1] : undefined
}
const opts = {
  source: opt("source"),
  sourceUrl: opt("source-url"),
  sourceKey: opt("source-key"),
  file: opt("file"),
  storeName: opt("store-name"),
  stores: argv.flatMap((a, i) => (a === "--store" ? [argv[i + 1]] : [])),
  dryRun: argv.includes("--dry-run"),
}
if (!["same-db", "supabase", "file"].includes(opts.source)) {
  console.error("Informe --source same-db | supabase | file (veja o cabeçalho do script).")
  process.exit(1)
}

const target = adminClient()
const warnings = []
const warn = (store, msg) => warnings.push(`[${store}] ${msg}`)

// ─── Utilidades ─────────────────────────────────────────────────────
/** UUID estável a partir de um texto (reimportar gera o mesmo id). */
function stableUuid(...parts) {
  const h = createHash("sha256").update(parts.join("|")).digest("hex")
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-${((parseInt(h[16], 16) & 0x3) | 0x8).toString(16)}${h.slice(17, 20)}-${h.slice(20, 32)}`
}
const str = (v) => (v === null || v === undefined || v === "" ? null : String(v))
const num = (v, fallback = null) => {
  if (v === null || v === undefined || v === "") return fallback
  const n = Number(String(v).replace(",", "."))
  return Number.isFinite(n) ? n : fallback
}
const bool = (v, fallback) => (v === undefined || v === null ? fallback : Boolean(v))
const int = (v, fallback, min, max) => {
  const n = Math.round(num(v, fallback))
  return Math.min(max, Math.max(min, Number.isFinite(n) ? n : fallback))
}
// Preserva a ordem de exibição do PDV antigo (ordem dos arrays).
const orderStamp = (i) => new Date(Date.UTC(2020, 0, 1) + i * 1000).toISOString()
const SYSTEM_NAME_RE = /^[A-Za-z0-9 ._()\\$-]{1,128}$/

async function upsertBatches(table, rows, onConflict) {
  if (opts.dryRun || rows.length === 0) return
  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await target.from(table).upsert(rows.slice(i, i + 500), { onConflict, defaultToNull: false })
    if (error) throw new Error(`${table}: ${error.message}`)
  }
}

// ─── Leitura da origem ──────────────────────────────────────────────
async function loadSource() {
  if (opts.source === "file") {
    if (!opts.file || opts.stores.length !== 1) {
      console.error("Com --source file informe --file data.json e exatamente um --store ID.")
      process.exit(1)
    }
    const state = JSON.parse(readFileSync(opts.file, "utf8"))
    const id = opts.stores[0]
    return {
      stores: [{ id, name: opts.storeName ?? `LOJA ${id}`, active: true, terminals_allowed: 5 }],
      users: [],
      states: [{ store_id: id, value: state }],
      fileUsers: Array.isArray(state.users) ? state.users : [],
    }
  }
  if (opts.source === "same-db") {
    const { data, error } = await target.rpc("legacy_export_state")
    if (error) throw error
    if (!data?.available) {
      console.error("Não há tabelas da v1 no schema legacy deste projeto.")
      process.exit(1)
    }
    return { stores: data.stores ?? [], users: data.users ?? [], states: data.states ?? [], fileUsers: [] }
  }
  if (!opts.sourceUrl || !opts.sourceKey) {
    console.error("Com --source supabase informe --source-url e --source-key.")
    process.exit(1)
  }
  const src = createClient(opts.sourceUrl, opts.sourceKey, { auth: { persistSession: false } })
  const [stores, users, states] = await Promise.all([
    src.from("stores").select("*"),
    src.from("app_users").select("*"),
    src.from("system_data").select("store_id, value").eq("key", "state"),
  ])
  for (const r of [stores, users, states]) if (r.error) throw r.error
  return { stores: stores.data, users: users.data, states: states.data, fileUsers: [] }
}

// ─── Conversão de uma loja ──────────────────────────────────────────
async function importStore(storeRow, state, legacyUsers, fileUsers) {
  const S = String(storeRow.id)
  const st = state ?? {}
  const counts = {}

  const terminalsIn = Array.isArray(st.terminals) ? st.terminals : []
  const activeTerminals = terminalsIn.filter((t) => t.active !== false).length
  const allowed = Math.max(int(storeRow.terminals_allowed, 5, 1, 999), activeTerminals)
  if (allowed > (storeRow.terminals_allowed ?? 5)) warn(S, `limite de terminais ajustado para ${allowed} (havia ${activeTerminals} ativos)`)

  await upsertBatches(
    "stores",
    [{
      id: S,
      name: String(storeRow.name ?? `LOJA ${S}`),
      cnpj: str(storeRow.cnpj),
      phone: str(storeRow.phone),
      active: bool(storeRow.active, true),
      expire_date: str(storeRow.expire_date),
      terminals_allowed: allowed,
    }],
    "id"
  )

  await upsertBatches(
    "store_settings",
    [{
      store_id: S,
      ticket_config: st.ticketConfig && typeof st.ticketConfig === "object" ? st.ticketConfig : {},
      current_version: str(st.currentVersion) ?? "1.0.0",
      versions: Array.isArray(st.versions) ? st.versions : [],
    }],
    "store_id"
  )

  // Impressoras
  const printers = (Array.isArray(st.printers) ? st.printers : []).map((p, i) => {
    let systemName = str(p.systemName)
    const extra = {}
    if (systemName && !SYSTEM_NAME_RE.test(systemName)) {
      warn(S, `impressora "${p.name}": nome do Windows "${systemName}" tem caracteres não permitidos — revise no portal`)
      extra.legacy_system_name = systemName
      systemName = null
    }
    return {
      store_id: S,
      id: String(p.id),
      name: String(p.name ?? ""),
      model: str(p.model),
      use_windows_printer: bool(p.useWindowsPrinter, false),
      system_name: systemName,
      ip: str(p.ip),
      port: int(p.port, 9100, 1, 65535),
      paper_width: int(p.paperWidth, 48, 16, 96),
      active_cut: p.activeCut !== false,
      lines_before: int(p.linesBefore, 4, 0, 20),
      lines_after: int(p.linesAfter, 0, 0, 20),
      align_spacing: int(p.alignSpacing, 2, 0, 20),
      black_background: bool(p.blackBackground, false),
      print_server: bool(p.printServer, false),
      extra,
      created_at: orderStamp(i),
    }
  })
  const printerIds = new Set(printers.map((p) => p.id))
  await upsertBatches("printers", printers, "store_id,id")
  counts.impressoras = printers.length

  const terminals = terminalsIn.map((t, i) => ({
    store_id: S,
    id: String(t.id ?? `CX${t.cashNumber ?? i + 1}`),
    name: String(t.name ?? ""),
    cash_number: num(t.cashNumber),
    printer_id: t.printerId != null && printerIds.has(String(t.printerId)) ? String(t.printerId) : null,
    layout: t.layout === "vertical" ? "vertical" : "horizontal",
    font: str(t.font) ?? "Outfit",
    font_size: ["small", "medium", "large", "xlarge"].includes(t.fontSize) ? t.fontSize : "medium",
    active: t.active !== false,
    created_at: orderStamp(i),
  }))
  await upsertBatches("terminals", terminals, "store_id,id")
  counts.terminais = terminals.length

  const payments = (Array.isArray(st.paymentMethods) ? st.paymentMethods : []).map((m, i) => ({
    store_id: S,
    id: String(m.id),
    code: str(m.code),
    sort_order: int(m.order, 0, -99999, 99999),
    name: String(m.name ?? ""),
    button_color: str(m.buttonColor),
    text_color: str(m.textColor),
    created_at: orderStamp(i),
  }))
  await upsertBatches("payment_methods", payments, "store_id,id")
  counts.formas_pagamento = payments.length

  const groups = (Array.isArray(st.groups) ? st.groups : []).map((g, i) => ({
    store_id: S,
    id: String(g.id),
    name: String(g.name ?? ""),
    sort_order: int(g.order, 0, -99999, 99999),
    created_at: orderStamp(i),
  }))
  const groupIds = new Set(groups.map((g) => g.id))
  await upsertBatches("product_groups", groups, "store_id,id")
  counts.grupos = groups.length

  const subgroups = (Array.isArray(st.subgroups) ? st.subgroups : []).map((s, i) => ({
    store_id: S,
    id: String(s.id),
    group_id: s.groupId != null && groupIds.has(String(s.groupId)) ? String(s.groupId) : null,
    name: String(s.name ?? ""),
    button_color: str(s.buttonColor),
    text_color: str(s.textColor),
    created_at: orderStamp(i),
  }))
  const subgroupIds = new Set(subgroups.map((s) => s.id))
  await upsertBatches("product_subgroups", subgroups, "store_id,id")
  counts.subgrupos = subgroups.length

  const seenProduct = new Set()
  const products = []
  ;(Array.isArray(st.products) ? st.products : []).forEach((p, i) => {
    const id = String(p.id)
    if (seenProduct.has(id)) return warn(S, `produto com id repetido ${id} ignorado ("${p.name}")`)
    seenProduct.add(id)
    products.push({
      store_id: S,
      id,
      code: str(p.code),
      name: String(p.name ?? "PRODUTO"),
      sort_order: int(p.order, 0, -99999, 99999),
      cost: num(p.cost),
      price: num(p.price, 0),
      stock: num(p.stock),
      subgroup_id: p.subgroupId != null && subgroupIds.has(String(p.subgroupId)) ? String(p.subgroupId) : null,
      printer_id: p.printerId != null && printerIds.has(String(p.printerId)) ? String(p.printerId) : null,
      use_name_on_print: p.useNameOnPrint !== false,
      description: str(p.description),
      icon: str(p.icon) ?? "package",
      unit: str(p.unit) ?? "UNID",
      created_at: orderStamp(i),
    })
  })
  await upsertBatches("products", products, "store_id,id")
  counts.produtos = products.length

  // Módulos do portal → registros por item.
  const recordSources = {
    plano_contas: st.planoConta,
    centros_custo: st.centroCusto,
    contas_financeiras: st.contaFinanceira,
    lancamentos: st.lancamentos,
    cargos: st.cargos,
    dre_lines: st.dreStructure,
    compliance_denuncias: st.compliance_denuncias,
    compliance_fornecedores: st.compliance_fornecedores,
    compliance_treinamentos: st.compliance_treinamentos,
    skills_colaboradores: st.skills_colaboradores,
    skills_capacitacao: st.skills_capacitacao,
    skills_pipeline: st.skills_pipeline,
    // Borderôs antigos eram gerados com valores fictícios; só os já
    // conciliados pelo usuário são trazidos.
    borderos: Array.isArray(st.borderos) ? st.borderos.filter((b) => b.status === "Conciliado").map((b) => ({ ...b, source: "legacy" })) : undefined,
  }
  const records = []
  for (const [collection, list] of Object.entries(recordSources)) {
    if (!Array.isArray(list)) continue
    // A v1 já usava esta coleção (mesmo vazia): marca como usada para as telas
    // não mostrarem os exemplos no lugar dela (ver web/src/data/records.ts).
    records.push({ store_id: S, collection, id: "__init__", data: { initialized: true }, created_at: orderStamp(0) })
    list.forEach((item, i) => {
      if (item?.id === undefined || item?.id === null) return
      records.push({ store_id: S, collection, id: String(item.id), data: item, created_at: orderStamp(i) })
    })
    counts[collection] = list.length
  }
  await upsertBatches("store_records", records, "store_id,collection,id")

  // Usuários (hash bcrypt da v1 é aceito como está).
  let userCount = 0
  const usernames = new Set()
  if (!opts.dryRun) {
    for (const u of legacyUsers) {
      const key = String(u.username ?? "").trim().toLowerCase()
      if (!key || usernames.has(key)) {
        warn(S, `usuário duplicado/sem nome ignorado: "${u.username}"`)
        continue
      }
      usernames.add(key)
      const role = ["operador", "supervisor", "admin"].includes(u.role) ? u.role : "operador"
      await upsertAppUser(target, { storeId: S, username: u.username, role, passwordHash: u.password_hash, active: u.active !== false })
      userCount++
    }
    // Arquivo local: usuários do portal com senha em texto (só se não houver app_users).
    if (legacyUsers.length === 0) {
      for (const u of fileUsers) {
        const key = String(u.username ?? "").trim().toLowerCase()
        if (!key || usernames.has(key) || !u.password) continue
        usernames.add(key)
        await upsertAppUser(target, {
          storeId: S,
          username: u.username,
          role: "operador",
          passwordHash: await bcrypt.hash(String(u.password), 10),
          active: u.ativo !== false,
          extra: { cargoId: u.cargoId ?? null },
        })
        userCount++
        warn(S, `usuário "${u.username}" importado como operador (ajuste o nível no portal)`)
      }
    }
  }
  counts.usuarios = opts.dryRun ? legacyUsers.length : userCount

  // Vendas: a v1 guardava uma transação por unidade. Transações com o mesmo
  // horário, terminal, operador e forma de pagamento formam uma venda.
  const { data: profiles } = opts.dryRun ? { data: [] } : await target.from("profiles").select("user_id, username").eq("store_id", S)
  const operatorIds = new Map((profiles ?? []).map((p) => [p.username.toLowerCase(), p.user_id]))
  const groupsBySale = new Map()
  ;(Array.isArray(st.sales) ? st.sales : []).forEach((tx, idx) => {
    const price = num(tx.price, 0)
    const refund = price < 0 && String(tx.paymentMethod ?? "").toUpperCase() === "ESTORNO DINHEIRO"
    const key = [tx.timestamp ?? "", tx.terminalId ?? "", tx.operator ?? "", tx.paymentMethod ?? "", refund ? "R" : "S"].join("|")
    if (!groupsBySale.has(key)) groupsBySale.set(key, [])
    groupsBySale.get(key).push({ tx, idx, price, refund })
  })

  const sales = []
  const items = []
  const pays = []
  for (const [key, lines] of groupsBySale) {
    const first = lines[0].tx
    const saleId = stableUuid("sale", S, key)
    const refund = lines[0].refund
    const total = Math.round(lines.reduce((a, l) => a + l.price, 0) * 100) / 100
    const soldAt = first.timestamp && !Number.isNaN(Date.parse(first.timestamp)) ? new Date(first.timestamp).toISOString() : new Date(0).toISOString()
    const label = refund ? "ESTORNO DINHEIRO" : String(first.paymentMethod ?? "")
    sales.push({
      id: saleId,
      store_id: S,
      kind: refund ? "refund" : "sale",
      terminal_id: str(first.terminalId),
      operator_id: operatorIds.get(String(first.operator ?? "").toLowerCase()) ?? null,
      operator_name: String(first.operator ?? "N/A"),
      total,
      paid_total: total,
      change_total: 0,
      payment_label: label,
      sold_at: soldAt,
      legacy_id: String(first.id ?? ""),
      meta: { legacy_import: true },
    })
    lines.forEach((l, n) => {
      items.push({
        id: stableUuid("item", S, key, String(l.tx.id ?? ""), String(l.idx)),
        sale_id: saleId,
        store_id: S,
        line_no: n + 1,
        product_id: str(l.tx.productId),
        product_name: String(l.tx.productName ?? "PRODUTO"),
        unit_price: l.price,
        printer_id: str(l.tx.printerId),
        legacy_id: String(l.tx.id ?? ""),
      })
    })
    // A v1 só guardava o texto "A + B"; o valor é repartido igualmente.
    const methods = refund ? ["DINHEIRO"] : label ? label.split(" + ").map((m) => m.trim()).filter(Boolean) : []
    methods.forEach((m, n) => {
      const share = Math.round((total / methods.length) * 100) / 100
      const amount = n === methods.length - 1 ? Math.round((total - share * (methods.length - 1)) * 100) / 100 : share
      pays.push({ id: stableUuid("pay", S, key, String(n)), sale_id: saleId, store_id: S, line_no: n + 1, method_name: m, amount })
    })
  }
  await upsertBatches("sales", sales, "id")
  await upsertBatches("sale_items", items, "id")
  await upsertBatches("sale_payments", pays, "id")
  counts.vendas = sales.length
  counts.fichas = items.length

  return counts
}

// ─── Execução ───────────────────────────────────────────────────────
const source = await loadSource()
const stateByStore = new Map(source.states.map((s) => [String(s.store_id), s.value]))
const storeRows = [...source.stores]
for (const id of stateByStore.keys()) {
  if (!storeRows.some((s) => String(s.id) === id)) storeRows.push({ id, name: `LOJA ${id}`, active: true, terminals_allowed: 5 })
}
const selected = opts.stores.length ? storeRows.filter((s) => opts.stores.includes(String(s.id))) : storeRows

console.log(`${opts.dryRun ? "[SIMULAÇÃO] " : ""}Importando ${selected.length} loja(s) de "${opts.source}"…`)
for (const store of selected) {
  const id = String(store.id)
  const users = source.users.filter((u) => String(u.store_id) === id)
  try {
    const counts = await importStore(store, stateByStore.get(id), users, source.fileUsers ?? [])
    console.log(`✔ ${id} ${store.name ?? ""}:`, Object.entries(counts).map(([k, v]) => `${k}=${v}`).join(" "))
  } catch (e) {
    console.error(`✖ ${id}: ${e.message}`)
    process.exitCode = 1
  }
}
if (warnings.length) {
  console.log("\nAvisos:")
  for (const w of warnings) console.log("  - " + w)
}
console.log("\nConcluído. Rodar de novo é seguro (nada duplica).")
