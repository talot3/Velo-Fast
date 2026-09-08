const { setCors, getStoreId, readBody, handleError } = require('../lib/supabase');
const { readState } = require('../lib/state');
const { buildSangriaReceipt } = require('../lib/print');
const { resolvePrinter, validatePrinterConfig, enqueuePrintJob } = require('../lib/print-queue');
const { requireAuth } = require('../lib/auth');

module.exports = async function handler(req, res) {
    setCors(res);
    if (req.method === 'OPTIONS') return res.status(204).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

    try {
        requireAuth(req);
        const storeId = getStoreId(req);
        const sangria = await readBody(req);
        const data = await readState(storeId);

        const printer = resolvePrinter(data, sangria.terminal);
        const configError = validatePrinterConfig(printer);
        if (configError) {
            return res.status(printer ? 400 : 404).json({ error: configError });
        }

        const printData = buildSangriaReceipt(sangria, printer);
        await enqueuePrintJob(storeId, printer, printData);

        res.status(200).json({ success: true, queued: true, printerName: printer.name });
    } catch (e) {
        handleError(res, e, 500, 'Erro ao imprimir sangria:');
    }
};
