const net = require('net');

function findTerminalFlex(terminals, terminalIdOrInput) {
    if (!terminalIdOrInput || !Array.isArray(terminals) || terminals.length === 0) return null;
    const inputUpper = String(terminalIdOrInput).trim().toUpperCase();
    const inputDigits = inputUpper.replace(/\D/g, '');

    let found = terminals.find((t) => String(t.id).toUpperCase() === inputUpper);
    if (found) return found;

    found = terminals.find((t) => String(t.name).toUpperCase() === inputUpper);
    if (found) return found;

    if (inputDigits !== '') {
        found = terminals.find((t) => String(t.cashNumber) === inputDigits);
        if (found) return found;
    }

    const cleanInput = inputUpper.replace(/[^A-Z0-9]/g, '');
    if (cleanInput !== '') {
        found = terminals.find((t) => {
            const cleanId = String(t.id).toUpperCase().replace(/[^A-Z0-9]/g, '');
            const cleanName = String(t.name).toUpperCase().replace(/[^A-Z0-9]/g, '');
            return cleanId === cleanInput || cleanName === cleanInput || cleanId.includes(cleanInput) || cleanName.includes(cleanInput);
        });
        if (found) return found;
    }

    return null;
}

// ─── Gera bytes ESC/POS no estilo FICHA (idêntico ao server.js original) ───
function buildEscPos(txs, operator, terminalId, printer, db) {
    const ESC = '\x1b';
    const GS = '\x1d';
    const LF = '\n';

    const INIT = ESC + '@';
    const CENTER = ESC + 'a\x01';
    const LEFT = ESC + 'a\x00';
    const BOLD_ON = ESC + 'E\x01';
    const BOLD_OFF = ESC + 'E\x00';
    const NORM = GS + '!\x00';
    const SIZE_2X2 = GS + '!\x11';

    const activeCut = printer.activeCut !== false;
    const linesBefore = Math.max(0, parseInt(printer.linesBefore ?? 4));
    const linesAfter = Math.max(0, parseInt(printer.linesAfter ?? 0));
    const alignSpacing = Math.max(0, parseInt(printer.alignSpacing ?? 2));

    const CUT = GS + 'V\x01';

    const cols = parseInt(printer.paperWidth ?? 48);
    const border = '='.repeat(cols);
    const sep = '-'.repeat(cols);

    const ticketConfig = (db && db.ticketConfig) || {};
    const titleTicket = ticketConfig.titleTicket ?? 'TICKET 1-A-1';
    const titleFicha = ticketConfig.titleFicha ?? 'ficha';

    let out = INIT;

    txs.forEach((tx, idx) => {
        const product = tx.productName ?? 'PRODUTO';
        const tid = String(terminalId ?? tx.terminalId ?? 'PDV').toUpperCase();
        const dt = new Date(tx.timestamp ?? Date.now()).toLocaleString('pt-BR');
        const op = String(operator ?? tx.operator ?? 'N/A').toUpperCase();
        const method = String(tx.paymentMethod ?? '').toUpperCase();
        const num = String(idx + 1).padStart(2, '0');

        if (idx > 0 && alignSpacing > 0) {
            out += LF.repeat(alignSpacing);
        }

        out += CENTER;
        out += NORM + border + LF;
        out += SIZE_2X2 + BOLD_ON + titleFicha + BOLD_OFF + LF;
        out += NORM;
        out += `${titleTicket}  -  ${tid}` + LF;
        out += `#${num}  -  ${dt}` + LF;
        out += sep + LF;
        out += SIZE_2X2 + BOLD_ON + product + BOLD_OFF + LF;
        out += NORM;
        out += `OP: ${op}  |  ${method}` + LF;
        out += border + LF;

        if (linesBefore > 0) out += LF.repeat(linesBefore);
        if (activeCut) out += CUT;
        if (linesAfter > 0) out += LF.repeat(linesAfter);

        out += LEFT;
    });

    return out;
}

// Envia bytes ESC/POS via TCP direto para a impressora de rede.
// ATENÇÃO: só funciona se a impressora tiver IP acessível publicamente
// (ou via VPN) a partir da internet — a maioria das impressoras de balcão
// está numa rede local e NÃO é alcançável por uma função da Vercel.
// Para impressão local real, use uma ponte local (ex.: o VeloSync existente)
// que consulta /api/data periodicamente e imprime na rede do estabelecimento.
function printNetworkRaw(printer, data) {
    return new Promise((resolve, reject) => {
        const client = new net.Socket();
        client.setTimeout(5000);

        client.connect(printer.port || 9100, printer.ip, () => {
            const buf = Buffer.from(data, 'binary');
            client.write(buf, () => {
                client.destroy();
                resolve(true);
            });
        });

        client.on('error', (err) => {
            client.destroy();
            reject(err);
        });
        client.on('timeout', () => {
            client.destroy();
            reject(new Error('Timeout ao conectar à impressora'));
        });
    });
}

module.exports = { findTerminalFlex, buildEscPos, printNetworkRaw };
