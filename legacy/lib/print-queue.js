const { getSupabase } = require('./supabase');
const { findTerminalFlex } = require('./print');

/** Resolve qual impressora usar: por terminal, ou a primeira cadastrada. */
function resolvePrinter(data, terminalId) {
    let printer = null;
    if (terminalId && Array.isArray(data.terminals)) {
        const term = findTerminalFlex(data.terminals, terminalId);
        if (term && term.printerId) {
            printer = (data.printers || []).find((p) => String(p.id) === String(term.printerId)) || null;
        }
    }
    if (!printer && data.printers && data.printers.length > 0) {
        printer = data.printers[0];
    }
    return printer;
}

/** Valida a configuração da impressora (rede ou Windows compartilhado). */
function validatePrinterConfig(printer) {
    if (!printer) return 'Nenhuma impressora disponível. Configure no portal.';
    if (printer.useWindowsPrinter && !printer.systemName) {
        return 'Configure o "Nome Exato da Impressora" no cadastro desta impressora (modo Windows).';
    }
    if (!printer.useWindowsPrinter && !printer.ip) {
        return 'Configure o IP desta impressora, ou ative o modo Windows.';
    }
    return null;
}

/** Grava o job na fila de impressão (consumida pela ponte local). */
async function enqueuePrintJob(storeId, printer, escPosString) {
    const base64Payload = Buffer.from(escPosString, 'binary').toString('base64');
    const supabase = getSupabase();
    const { error } = await supabase.from('print_jobs').insert({
        store_id: storeId,
        printer_id: String(printer.id),
        printer_type: printer.useWindowsPrinter ? 'windows_shared' : 'network',
        printer_ip: printer.useWindowsPrinter ? null : (printer.ip || null),
        printer_port: printer.useWindowsPrinter ? null : (printer.port || 9100),
        printer_share_path: printer.useWindowsPrinter ? (printer.systemName || null) : null,
        printer_name: printer.name,
        payload: base64Payload,
        status: 'pending'
    });
    if (error) throw new Error(error.message);
}

module.exports = { resolvePrinter, validatePrinterConfig, enqueuePrintJob };
