/**
 * Relatório para impressão/PDF em janela separada (A4), como o sistema
 * antigo — mas com todo texto escapado (sem risco de script em nomes).
 */
import { formatDateBR, formatDateTimeBR } from "@/lib/format"

export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

export type PrintReportSpec = {
  /** Título da janela e do cabeçalho (ex.: "Relatório de Vendas por Produto"). */
  title: string
  /** Período exibido no cabeçalho ("YYYY-MM-DD"). */
  period?: { from: string; to: string }
  summary?: { label: string; value: string }[]
  columns: string[]
  rows: (string | number)[][]
  /** Linha de TOTAL no rodapé da tabela. */
  footer?: (string | number)[]
  /** Alinhamento por coluna ("left" padrão). */
  align?: ("left" | "right" | "center")[]
}

export function renderReportHtml(spec: PrintReportSpec): string {
  const align = (i: number) => spec.align?.[i] ?? "left"
  const head = spec.columns.map((c, i) => `<th style="text-align:${align(i)}">${escapeHtml(c)}</th>`).join("")
  const body = spec.rows
    .map((r) => `<tr>${r.map((v, i) => `<td style="text-align:${align(i)}">${escapeHtml(v)}</td>`).join("")}</tr>`)
    .join("")
  const foot = spec.footer
    ? `<tfoot><tr>${spec.footer.map((v, i) => `<td style="text-align:${align(i)}">${escapeHtml(v)}</td>`).join("")}</tr></tfoot>`
    : ""
  const summary = spec.summary?.length
    ? `<div class="cards">${spec.summary
        .map((s) => `<div class="card"><div class="lbl">${escapeHtml(s.label)}</div><div class="val">${escapeHtml(s.value)}</div></div>`)
        .join("")}</div>`
    : ""
  const period = spec.period ? ` | Período: ${formatDateBR(spec.period.from)} até ${formatDateBR(spec.period.to)}` : ""
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${escapeHtml(spec.title)}</title>
<style>
@page{size:A4;margin:14mm}
body{font-family:Outfit,Segoe UI,Arial,sans-serif;color:#1c1c1e;margin:0}
.hdr{background:#800020;color:#fff;padding:18px 22px;border-radius:8px}
.hdr h1{margin:0 0 4px;font-size:20px}.hdr p{margin:2px 0;font-size:12px;opacity:.9}
.cards{display:flex;gap:10px;margin:16px 0;flex-wrap:wrap}
.card{flex:1;min-width:140px;border:1px solid #e3e1da;border-radius:8px;padding:10px 12px}
.lbl{font-size:11px;color:#7a7975;text-transform:uppercase}.val{font-size:18px;font-weight:700;margin-top:4px}
table{width:100%;border-collapse:collapse;font-size:12px;margin-top:10px}
th{background:#f4f3f0;text-align:left;padding:8px;border-bottom:2px solid #d5d3ca;font-size:11px;text-transform:uppercase}
td{padding:7px 8px;border-bottom:1px solid #eee}
tfoot td{font-weight:800;border-top:2px solid #1c1c1e;background:#faf9f7}
.foot{margin-top:18px;font-size:11px;color:#7a7975;text-align:center}
</style></head><body>
<div class="hdr"><h1>${escapeHtml(spec.title)}</h1><p>TicketPro Portal de Gestão</p><p>Emitido em: ${escapeHtml(formatDateTimeBR(new Date()))}${escapeHtml(period)}</p></div>
${summary}
<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody>${foot}</table>
<div class="foot">TicketPro Sistema de Gestão - Relatório gerado automaticamente</div>
</body></html>`
}

/** Abre a janela de impressão (o usuário escolhe imprimir ou salvar PDF). */
export function printReport(spec: PrintReportSpec) {
  const win = window.open("", "_blank", "noopener=no")
  if (!win) {
    alert("O navegador bloqueou a janela de impressão. Permita pop-ups para este site.")
    return
  }
  win.document.open()
  win.document.write(renderReportHtml(spec))
  win.document.close()
  win.focus()
  setTimeout(() => win.print(), 500)
}
