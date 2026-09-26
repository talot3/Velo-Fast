const { setCors, getStoreId, readBody, handleError } = require('../lib/supabase');
const { readState } = require('../lib/state');
const { buildEscPos } = require('../lib/print');
const { validatePrinterConfig, enqueuePrintJob } = require('../lib/print-queue');
const { requireAuth } = require('../lib/auth');

module.exports = async function handler(req, res) {
    setCors(res);
    if (req.method === 'OPTIONS') return res.status(204).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

    try {
        requireAuth(req, 'supervisor');
        const storeId = getStoreId(req);
        const { printerId } = await readBody(req);
        const data = await readState(storeId);
        const printer = (data.printers || []).find((p) => String(p.id) === String(printerId));

        const configError = validatePrinterConfig(printer);
        if (configError) {
            return res.status(printer ? 400 : 404).json({ error: configError });
        }

        const testTx = [
            {
                productName: '*** TESTE DE IMPRESSORA ***',
                paymentMethod: 'TESTE',
                terminalId: 'PORTAL',
                operator: 'ADMIN',
                timestamp: new Date().toISOString()
            }
        ];
        const printData = buildEscPos(testTx, 'ADMIN', 'PORTAL', printer, data);
        await enqueuePrintJob(storeId, printer, printData);

        res.status(200).json({ success: true, queued: true, printerName: printer.name });
    } catch (e) {
        handleError(res, e, 500, 'Erro no teste de impressão:');
    }
};
