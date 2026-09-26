/**
 * Planilha de produtos: modelo para download ("Ver Modelo Excel") e
 * importação ("Importar Planilha"), com as mesmas regras do sistema antigo.
 * As bibliotecas de Excel só são baixadas quando usadas.
 */
import { newId } from "@/data/catalog"
import type { Group, Printer, Product, Subgroup } from "@/data/types"

import { intOrZero, moneyOrZero } from "./lib"

export const TEMPLATE_FILE_NAME = "modelo_importacao_produtos.xlsx"

export const TEMPLATE_HEADERS = [
  "Codigo",
  "Nome",
  "PrecoVenda",
  "Custo",
  "Ordem",
  "Estoque",
  "Grupo",
  "Subgrupo",
  "Impressora",
  "UsarNomeNoImpresso",
  "Descricao",
] as const

type TemplateHeader = (typeof TEMPLATE_HEADERS)[number]

const TEMPLATE_INSTRUCTIONS =
  "INSTRUÇÕES: Preencha a partir da linha 3. Não altere os cabeçalhos da linha 2. Campos obrigatórios: Nome e Grupo. UsarNomeNoImpresso: Sim ou Não. Estoque: deixe vazio se não controlar."

const TEMPLATE_EXAMPLES: Record<TemplateHeader, string | number>[] = [
  {
    Codigo: "101",
    Nome: "Heineken Long Neck",
    PrecoVenda: 12.0,
    Custo: 6.5,
    Ordem: 1,
    Estoque: 100,
    Grupo: "BEBIDAS",
    Subgrupo: "Cervejas e Refris",
    Impressora: "IMPRESSORA BAR",
    UsarNomeNoImpresso: "Sim",
    Descricao: "Cerveja gelada long neck 330ml",
  },
  {
    Codigo: "102",
    Nome: "Coca-Cola 350ml",
    PrecoVenda: 6.0,
    Custo: 2.8,
    Ordem: 2,
    Estoque: 200,
    Grupo: "BEBIDAS",
    Subgrupo: "Cervejas e Refris",
    Impressora: "IMPRESSORA BAR",
    UsarNomeNoImpresso: "Sim",
    Descricao: "Refrigerante lata",
  },
  {
    Codigo: "201",
    Nome: "X-Burguer Artesanal",
    PrecoVenda: 28.0,
    Custo: 12.0,
    Ordem: 1,
    Estoque: 50,
    Grupo: "COMIDA",
    Subgrupo: "Lanches e Porções",
    Impressora: "IMPRESSORA COZINHA",
    UsarNomeNoImpresso: "Sim",
    Descricao: "Hambúrguer artesanal 180g",
  },
  {
    Codigo: "301",
    Nome: "Suco de Laranja Natural",
    PrecoVenda: 9.0,
    Custo: 3.5,
    Ordem: 3,
    Estoque: "",
    Grupo: "BEBIDAS",
    Subgrupo: "Sucos Naturais",
    Impressora: "IMPRESSORA BAR",
    UsarNomeNoImpresso: "Sim",
    Descricao: "Suco natural 300ml sem açúcar",
  },
]

/** Larguras das colunas do modelo (em caracteres), iguais às do antigo. */
const TEMPLATE_WIDTHS = [10, 30, 14, 12, 8, 10, 20, 22, 22, 20, 35]

/** Gera e baixa modelo_importacao_produtos.xlsx (aba "Produtos"). */
export async function downloadProductTemplate(): Promise<void> {
  const { default: writeXlsxFile } = await import("write-excel-file/browser")
  const instructions = [
    { value: TEMPLATE_INSTRUCTIONS, columnSpan: TEMPLATE_HEADERS.length },
    ...TEMPLATE_HEADERS.slice(1).map(() => null),
  ]
  const headers = TEMPLATE_HEADERS.map((h) => h as string)
  const examples = TEMPLATE_EXAMPLES.map((row) => TEMPLATE_HEADERS.map((h) => (row[h] === "" ? null : row[h])))
  await writeXlsxFile([instructions, headers, ...examples], {
    sheet: "Produtos",
    columns: TEMPLATE_WIDTHS.map((width) => ({ width })),
  }).toFile(TEMPLATE_FILE_NAME)
}

// ─── Leitura ────────────────────────────────────────────────────────

export type SheetCell = string | number | boolean | Date | null

/** Lê a primeira aba de um .xlsx, ou um .csv (separador , ; ou tab). */
export async function readSpreadsheet(file: File): Promise<SheetCell[][]> {
  if (/\.csv$/i.test(file.name) || file.type === "text/csv") {
    return parseCsv(await readText(file))
  }
  const { readSheet } = await import("read-excel-file/browser")
  const rows = await readSheet(file)
  return rows as unknown as SheetCell[][]
}

/** UTF-8; se não for (CSV salvo pelo Excel em ANSI), lê como Windows-1252. */
async function readText(file: File): Promise<string> {
  const buffer = await file.arrayBuffer()
  let text = new TextDecoder("utf-8").decode(buffer)
  if (text.includes("�")) text = new TextDecoder("windows-1252").decode(buffer)
  return text.replace(/^﻿/, "")
}

function detectDelimiter(firstLine: string): string {
  let best = ","
  let bestCount = 0
  for (const candidate of [";", ",", "\t"]) {
    let count = 0
    let quoted = false
    for (const ch of firstLine) {
      if (ch === '"') quoted = !quoted
      else if (!quoted && ch === candidate) count++
    }
    if (count > bestCount) {
      best = candidate
      bestCount = count
    }
  }
  return best
}

/** CSV simples (RFC 4180): aspas, aspas duplicadas, quebras CRLF/LF, linha "sep=;". */
export function parseCsv(input: string): string[][] {
  let text = input
  let delimiter: string
  const sep = /^sep=(.)\r?\n/i.exec(text)
  if (sep) {
    delimiter = sep[1]
    text = text.slice(sep[0].length)
  } else {
    delimiter = detectDelimiter(text.split(/\r?\n/, 1)[0] ?? "")
  }
  const rows: string[][] = []
  let row: string[] = []
  let field = ""
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++
        } else quoted = false
      } else field += ch
    } else if (ch === '"') {
      quoted = true
    } else if (ch === delimiter) {
      row.push(field)
      field = ""
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++
      row.push(field)
      rows.push(row)
      row = []
      field = ""
    } else {
      field += ch
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  return rows
}

// ─── Linhas da planilha ─────────────────────────────────────────────

export type ImportRow = { line: number; data: Record<string, SheetCell> }

function cellText(cell: SheetCell | undefined): string {
  if (cell === null || cell === undefined) return ""
  if (cell instanceof Date) return cell.toISOString().slice(0, 10)
  return String(cell)
}

/**
 * Localiza o cabeçalho (primeira linha que tenha "Nome" e "PrecoVenda") e
 * transforma as linhas seguintes em objetos pelo nome da coluna.
 */
export function extractRows(sheet: SheetCell[][]): { headerFound: boolean; rows: ImportRow[] } {
  const headerIndex = sheet.findIndex((row) => {
    const cells = (row ?? []).map((c) => cellText(c).trim().toLowerCase())
    return cells.includes("nome") && cells.includes("precovenda")
  })
  if (headerIndex === -1) return { headerFound: false, rows: [] }

  const header = sheet[headerIndex].map((c) => cellText(c).trim())
  const rows: ImportRow[] = []
  for (let i = headerIndex + 1; i < sheet.length; i++) {
    const row = sheet[i] ?? []
    if (row.every((c) => cellText(c).trim() === "")) continue
    const data: Record<string, SheetCell> = {}
    header.forEach((name, j) => {
      if (name && !(name in data)) data[name] = row[j] ?? null
    })
    rows.push({ line: i + 1, data })
  }
  return { headerFound: true, rows }
}

// ─── Regras de importação ───────────────────────────────────────────

/** Cores dadas em sequência aos subgrupos criados pela importação. */
const IMPORT_SUBGROUP_COLORS = ["#3b82f6", "#f97316", "#22c55e", "#6366f1", "#ec4899", "#f59e0b", "#ef4444"]

export type ImportPlan = {
  novos: number
  atualizados: number
  erros: string[]
  newGroups: Group[]
  newSubgroups: Subgroup[]
  /** Produtos novos e atualizados (para gravar). */
  products: Product[]
}

type Catalog = { products: Product[]; groups: Group[]; subgroups: Subgroup[]; printers: Printer[] }

/** Primeiro valor preenchido entre os nomes de coluna aceitos. */
function pick(data: Record<string, SheetCell>, ...keys: string[]): SheetCell | undefined {
  for (const key of keys) {
    const v = data[key]
    if (v !== undefined && v !== null && !(typeof v === "string" && v.trim() === "")) return v
  }
  return undefined
}

const text = (v: SheetCell | undefined) => cellText(v ?? null).trim()
const money = (v: SheetCell | undefined) => (typeof v === "number" ? v : moneyOrZero(text(v)))

/**
 * Aplica as regras do sistema antigo:
 * - Nome e Grupo obrigatórios (linha ignorada, com aviso);
 * - Grupo em MAIÚSCULAS, criado se não existir (ordem = total + 1);
 * - Subgrupo procurado no grupo, depois em qualquer grupo; criado se não existir;
 * - Impressora pelo nome, senão a primeira cadastrada;
 * - Produto com o mesmo Código é atualizado; os demais são criados (ícone "package").
 */
export function planImport(rows: ImportRow[], catalog: Catalog): ImportPlan {
  const produtos = [...catalog.products]
  const grupos = [...catalog.groups]
  const subgrupos = [...catalog.subgroups]
  const newGroups: Group[] = []
  const newSubgroups: Subgroup[] = []
  const touched = new Set<string>()
  const erros: string[] = []
  let novos = 0
  let atualizados = 0

  for (const { line, data } of rows) {
    const nome = text(pick(data, "Nome", "nome", "NOME"))
    const grupoNome = text(pick(data, "Grupo", "grupo", "GRUPO")).toUpperCase()
    const subgrupoNome = text(pick(data, "Subgrupo", "subgrupo", "SUBGRUPO"))

    if (!nome) {
      erros.push(`Linha ${line}: campo "Nome" está vazio. Linha ignorada.`)
      continue
    }
    if (!grupoNome) {
      erros.push(`Linha ${line} ("${nome}"): campo "Grupo" está vazio. Linha ignorada.`)
      continue
    }

    // Grupo
    let grupo = grupos.find((g) => g.name.toUpperCase() === grupoNome)
    if (!grupo) {
      grupo = { id: newId(), name: grupoNome, order: grupos.length + 1 }
      grupos.push(grupo)
      newGroups.push(grupo)
    }

    // Subgrupo
    let subgrupo: Subgroup | null = null
    if (subgrupoNome) {
      const wanted = subgrupoNome.toUpperCase()
      const groupId = grupo.id
      subgrupo =
        subgrupos.find((sg) => sg.name.toUpperCase() === wanted && sg.groupId === groupId) ??
        subgrupos.find((sg) => sg.name.toUpperCase() === wanted) ??
        null
      if (!subgrupo) {
        subgrupo = {
          id: newId(),
          groupId,
          name: subgrupoNome,
          buttonColor: IMPORT_SUBGROUP_COLORS[subgrupos.length % IMPORT_SUBGROUP_COLORS.length],
          textColor: "#ffffff",
          order: 0,
        }
        subgrupos.push(subgrupo)
        newSubgroups.push(subgrupo)
      }
    }

    // Impressora
    const impressoraNome = text(pick(data, "Impressora", "impressora", "IMPRESSORA")).toUpperCase()
    const impressora = catalog.printers.find((p) => p.name.toUpperCase() === impressoraNome) ?? catalog.printers[0] ?? null

    const codigo = text(pick(data, "Codigo", "codigo", "CODIGO", "Código"))
    const ordemRaw = pick(data, "Ordem", "ordem")
    const estoqueRaw = pick(data, "Estoque", "estoque")
    const usarRaw = pick(data, "UsarNomeNoImpresso", "usarnomenoimpresso")
    const usarTexto = text(usarRaw).toLowerCase()

    const fields = {
      name: nome,
      code: codigo,
      price: money(pick(data, "PrecoVenda", "precovenda", "PRECOVENDA", "Preço")),
      cost: money(pick(data, "Custo", "custo")),
      order: typeof ordemRaw === "number" ? Math.trunc(ordemRaw) : intOrZero(text(ordemRaw)),
      stock: estoqueRaw === undefined ? null : money(estoqueRaw),
      subgroupId: subgrupo?.id ?? null,
      printerId: impressora?.id ?? null,
      useNameOnPrint: typeof usarRaw === "boolean" ? usarRaw : usarTexto !== "não" && usarTexto !== "nao",
      description: text(pick(data, "Descricao", "descricao", "Descrição")),
    }

    // Atualiza pelo código (se existir) ou cria.
    if (codigo) {
      const idx = produtos.findIndex((p) => (p.code || "").trim() === codigo)
      if (idx !== -1) {
        produtos[idx] = { ...produtos[idx], ...fields }
        touched.add(produtos[idx].id)
        atualizados++
        continue
      }
    }
    const created: Product = { id: newId(), ...fields, icon: "package", unit: "UNID", active: true, pricing: null }
    produtos.push(created)
    touched.add(created.id)
    novos++
  }

  return { novos, atualizados, erros, newGroups, newSubgroups, products: produtos.filter((p) => touched.has(p.id)) }
}
