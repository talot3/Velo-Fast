const { setCors, getStoreId, readBody } = require('../lib/supabase');
const { readState } = require('../lib/state');
const { buildEscPos, printNetworkRaw } = require('../lib/print');

module.exports = async function handler(req, res) {
    setCors(res);
    if (req.method === 'OPTIONS') return res.status(204).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

    try {
        const storeId = getStoreId(req);
        const { printerId } = await readBody(req);
        const data = await readState(storeId);
        const printer = (data.printers || []).find((p) => String(p.id) === String(printerId));

        if (!printer) return res.status(404).json({ error: 'Impressora não encontrada.' });

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

        if (printer.useWindowsPrinter) {
            return res.status(501).json({ error: 'Impressão via driver do Windows não é suportada na nuvem.' });
        }
        if (!printer.ip) {
            return res.status(400).json({ error: 'Sem IP configurado para esta impressora.' });
        }

        await printNetworkRaw(printer, printData);
        res.status(200).json({ success: true, printerName: printer.name });
    } catch (e) {
        console.error('Erro no teste de impressão:', e);
        res.status(500).json({ error: e.message });
    }
};
