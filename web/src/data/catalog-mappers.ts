/**
 * Conversões linha do banco ⇄ objeto de domínio do catálogo. Sem React nem
 * cache de dados: o PDV usa daqui sem baixar a biblioteca de cache do portal.
 */
import type { Database, Json } from "@/data/database.types"
import type { Group, PaymentMethod, PricingData, Printer, Product, Subgroup, Terminal } from "@/data/types"

type Tables = Database["public"]["Tables"]
export type Row<T extends keyof Tables> = Tables[T]["Row"]
export type Insert<T extends keyof Tables> = Tables[T]["Insert"]

export const newId = () => crypto.randomUUID()

// ─── Conversões linha ⇄ domínio ─────────────────────────────────────
export function toProduct(r: Row<"products">): Product {
  return {
    id: r.id,
    code: r.code ?? "",
    name: r.name,
    order: r.sort_order,
    cost: r.cost === null ? null : Number(r.cost),
    price: Number(r.price),
    stock: r.stock === null ? null : Number(r.stock),
    subgroupId: r.subgroup_id,
    printerId: r.printer_id,
    useNameOnPrint: r.use_name_on_print,
    description: r.description ?? "",
    icon: r.icon ?? "package",
    unit: r.unit ?? "UNID",
    active: r.active,
    pricing: (r.pricing as PricingData | null) ?? null,
    createdAt: r.created_at,
  }
}

export function fromProduct(storeId: string, p: Product): Insert<"products"> {
  return {
    store_id: storeId,
    id: p.id,
    code: p.code || null,
    name: p.name,
    sort_order: p.order || 0,
    cost: p.cost,
    price: p.price,
    stock: p.stock,
    subgroup_id: p.subgroupId,
    printer_id: p.printerId,
    use_name_on_print: p.useNameOnPrint,
    description: p.description || null,
    icon: p.icon || "package",
    unit: p.unit || "UNID",
    active: p.active,
    pricing: (p.pricing as unknown as Json) ?? null,
  }
}

export function toGroup(r: Row<"product_groups">): Group {
  return { id: r.id, name: r.name, order: r.sort_order, createdAt: r.created_at }
}

export function fromGroup(storeId: string, g: Group): Insert<"product_groups"> {
  return { store_id: storeId, id: g.id, name: g.name, sort_order: g.order || 0 }
}

export function toSubgroup(r: Row<"product_subgroups">): Subgroup {
  return {
    id: r.id,
    groupId: r.group_id,
    name: r.name,
    buttonColor: r.button_color,
    textColor: r.text_color,
    order: r.sort_order,
    createdAt: r.created_at,
  }
}

export function fromSubgroup(storeId: string, s: Subgroup): Insert<"product_subgroups"> {
  return {
    store_id: storeId,
    id: s.id,
    group_id: s.groupId,
    name: s.name,
    button_color: s.buttonColor,
    text_color: s.textColor,
    sort_order: s.order || 0,
  }
}

export function toPaymentMethod(r: Row<"payment_methods">): PaymentMethod {
  return {
    id: r.id,
    code: r.code ?? "",
    order: r.sort_order,
    name: r.name,
    buttonColor: r.button_color,
    textColor: r.text_color,
    active: r.active,
    createdAt: r.created_at,
  }
}

export function fromPaymentMethod(storeId: string, m: PaymentMethod): Insert<"payment_methods"> {
  return {
    store_id: storeId,
    id: m.id,
    code: m.code || null,
    sort_order: m.order || 0,
    name: m.name,
    button_color: m.buttonColor,
    text_color: m.textColor,
    active: m.active,
  }
}

export function toPrinter(r: Row<"printers">): Printer {
  return {
    id: r.id,
    name: r.name,
    model: r.model,
    useWindowsPrinter: r.use_windows_printer,
    systemName: r.system_name,
    ip: r.ip,
    port: r.port,
    paperWidth: r.paper_width,
    activeCut: r.active_cut,
    linesBefore: r.lines_before,
    linesAfter: r.lines_after,
    alignSpacing: r.align_spacing,
    blackBackground: r.black_background,
    printServer: r.print_server,
    order: r.sort_order,
    createdAt: r.created_at,
  }
}

export function fromPrinter(storeId: string, p: Printer): Insert<"printers"> {
  return {
    store_id: storeId,
    id: p.id,
    name: p.name,
    model: p.model,
    use_windows_printer: p.useWindowsPrinter,
    system_name: p.useWindowsPrinter ? p.systemName || null : null,
    ip: p.useWindowsPrinter ? null : p.ip || null,
    port: p.port || 9100,
    paper_width: p.paperWidth || 48,
    active_cut: p.activeCut,
    lines_before: p.linesBefore,
    lines_after: p.linesAfter,
    align_spacing: p.alignSpacing,
    black_background: p.useWindowsPrinter ? false : p.blackBackground,
    print_server: p.useWindowsPrinter ? false : p.printServer,
    sort_order: p.order || 0,
  }
}

export function toTerminal(r: Row<"terminals">): Terminal {
  return {
    id: r.id,
    cashNumber: r.cash_number,
    name: r.name,
    layout: r.layout as Terminal["layout"],
    font: r.font,
    fontSize: r.font_size as Terminal["fontSize"],
    printerId: r.printer_id,
    active: r.active,
    order: r.sort_order,
    createdAt: r.created_at,
  }
}

export function fromTerminal(storeId: string, t: Terminal): Insert<"terminals"> {
  return {
    store_id: storeId,
    id: t.id,
    cash_number: t.cashNumber,
    name: t.name,
    layout: t.layout,
    font: t.font,
    font_size: t.fontSize,
    printer_id: t.printerId,
    active: t.active,
    sort_order: t.order || 0,
  }
}

// ─── Fábrica de hooks por tabela ────────────────────────────────────
