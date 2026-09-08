const { setCors, getStoreId, readBody, handleError } = require('../lib/supabase');
const { readState } = require('../lib/state');
const { buildEscPos } = require('../lib/print');
const { resolvePrinter, validatePrinterConfig, enqueuePrintJob } = require('../lib/print-queue');
const { requireAuth } = require('../lib/auth');

module.exports = async function handler(req, res) {
    setCors(res);
    if (req.method === 'OPTIONS') return res.status(204).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

    try {
        requireAuth(req);
        const storeId = getStoreId(req);
        const payload = await readBody(req);
        const data = await readState(storeId);

        let printer = null;
        if (payload.printerId != null) {
            printer = (data.printers || []).find((p) => String(p.id) === String(payload.printerId)) || null;
        }
        if (!printer) {
            printer = resolvePrinter(data, payload.terminalId);
        }

        const configError = validatePrinterConfig(printer);
        if (configError) {
            return res.status(printer ? 400 : 404).json({ error: configError });
        }

        let printData;
        if (Array.isArray(payload.transactions) && payload.transactions.length > 0) {
            printData = buildEscPos(payload.transactions, payload.operator || 'N/A', payload.terminalId || 'PDV', printer, data);
        } else if (typeof payload.text === 'string') {
            printData = payload.text;
        } else {
            return res.status(400).json({ error: 'Sem dados para imprimir (transactions ou text).' });
        }

        // A nuvem nunca imprime direto (não alcança impressoras na rede local
        // da loja). Em vez disso, grava um job na fila — a ponte local
        // (velo-bridge) busca e imprime de dentro da rede da loja.
        await enqueuePrintJob(storeId, printer, printData);

        res.status(200).json({
            success: true,
            queued: true,
            printerName: printer.name,
            message: 'Impressão enfileirada — será impressa pela ponte local em instantes.'
        });
    } catch (e) {
        handleError(res, e, 500, 'Erro de impressão:');
    }
};
