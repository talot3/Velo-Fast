const { setCors, getStoreId, readBody } = require('../lib/supabase');
const { readState } = require('../lib/state');
const { findTerminalFlex, buildEscPos, printNetworkRaw } = require('../lib/print');

module.exports = async function handler(req, res) {
    setCors(res);
    if (req.method === 'OPTIONS') return res.status(204).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

    try {
        const storeId = getStoreId(req);
        const payload = await readBody(req);
        const data = await readState(storeId);

        let printer = null;
        if (payload.printerId != null) {
            printer = (data.printers || []).find((p) => String(p.id) === String(payload.printerId)) || null;
        }
        if (!printer && payload.terminalId && Array.isArray(data.terminals)) {
            const term = findTerminalFlex(data.terminals, payload.terminalId);
            if (term && term.printerId) {
                printer = (data.printers || []).find((p) => String(p.id) === String(term.printerId)) || null;
            }
        }
        if (!printer && data.printers && data.printers.length > 0) {
            printer = data.printers[0];
        }
        if (!printer) {
            return res.status(404).json({ error: 'Nenhuma impressora disponível. Configure no portal.' });
        }

        let printData;
        if (Array.isArray(payload.transactions) && payload.transactions.length > 0) {
            printData = buildEscPos(payload.transactions, payload.operator || 'N/A', payload.terminalId || 'PDV', printer, data);
        } else if (typeof payload.text === 'string') {
            printData = payload.text;
        } else {
            return res.status(400).json({ error: 'Sem dados para imprimir (transactions ou text).' });
        }

        if (printer.useWindowsPrinter) {
            return res.status(501).json({
                error:
                    'Impressão via driver do Windows não é suportada na nuvem (Vercel). ' +
                    'Use uma impressora de rede (IP) ou uma ponte local para essa loja.'
            });
        }
        if (!printer.ip) {
            return res.status(400).json({ error: 'Configuração de impressora inválida (sem IP).' });
        }

        await printNetworkRaw(printer, printData);
        res.status(200).json({ success: true, printerName: printer.name });
    } catch (e) {
        console.error('Erro de impressão:', e);
        res.status(500).json({
            error: e.message + ' — se a impressora está em rede local (LAN), a Vercel não consegue alcançá-la diretamente.'
        });
    }
};
