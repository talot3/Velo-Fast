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
// ATENÇÃO: só funciona se a impressora tiver IP acessível a partir de onde
// este código roda. Na Vercel isso nunca alcança impressoras de rede local —
// por isso essa função é usada pela ponte local (bridge/velo-bridge.js),
// não pelas funções /api diretamente.
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

/** Recibo de sangria (retirada de dinheiro do caixa). */
function buildSangriaReceipt(sangria, printer) {
    const ESC = '\x1b', GS = '\x1d';
    const INIT = ESC + '@', CENTER = ESC + 'a\x01', LEFT = ESC + 'a\x00';
    const BOLD_ON = ESC + 'E\x01', BOLD_OFF = ESC + 'E\x00';
    const CUT = GS + 'V\x01';
    const cols = parseInt(printer.paperWidth ?? 48);
    const border = '='.repeat(cols);
    const dt = new Date(sangria.timestamp || Date.now()).toLocaleString('pt-BR');

    let out = INIT + CENTER;
    out += border + '\n';
    out += BOLD_ON + 'COMPROVANTE DE SANGRIA' + BOLD_OFF + '\n';
    out += border + '\n';
    out += LEFT;
    out += `Data: ${dt}\n`;
    out += `Operador: ${String(sangria.operador || '-').toUpperCase()}\n`;
    out += `Terminal: ${String(sangria.terminal || '-').toUpperCase()}\n`;
    out += `Motivo: ${sangria.motivo || '-'}\n`;
    out += CENTER + BOLD_ON + `VALOR: R$ ${Number(sangria.valor || 0).toFixed(2)}` + BOLD_OFF + '\n';
    out += border + '\n';
    out += '\n\n' + CUT;
    return out;
}

/** Relatório de fechamento de caixa. */
function buildFechamentoReceipt(f, printer) {
    const ESC = '\x1b', GS = '\x1d';
    const INIT = ESC + '@', CENTER = ESC + 'a\x01', LEFT = ESC + 'a\x00';
    const BOLD_ON = ESC + 'E\x01', BOLD_OFF = ESC + 'E\x00';
    const CUT = GS + 'V\x01';
    const cols = parseInt(printer.paperWidth ?? 48);
    const border = '='.repeat(cols);
    const dash = '-'.repeat(cols);

    let out = INIT + CENTER;
    out += border + '\n';
    out += BOLD_ON + 'FECHAMENTO DE CAIXA' + BOLD_OFF + '\n';
    out += border + '\n';
    out += LEFT;
    out += `Terminal: ${String(f.terminal || '-').toUpperCase()}\n`;
    out += `Operador: ${String(f.operador || '-').toUpperCase()}\n`;
    out += `Abertura: ${f.dtAbertura || '-'}\n`;
    out += `Fechamento: ${f.dtFechamento || '-'}\n`;
    out += dash + '\n';
    out += `Suprimento inicial: R$ ${Number(f.suprimento || 0).toFixed(2)}\n`;
    out += `Total de vendas: R$ ${Number(f.totalVendas || 0).toFixed(2)}\n`;
    out += `Total de sangrias: R$ ${Number(f.totalSangrias || 0).toFixed(2)}\n`;
    out += BOLD_ON + `Total líquido: R$ ${Number(f.totalLiquido || 0).toFixed(2)}` + BOLD_OFF + '\n';
    out += dash + '\n';
    if (f.byMethod && typeof f.byMethod === 'object') {
        out += BOLD_ON + 'Por forma de pagamento:' + BOLD_OFF + '\n';
        for (const [method, val] of Object.entries(f.byMethod)) {
            out += `  ${method}: R$ ${Number(val || 0).toFixed(2)}\n`;
        }
        out += dash + '\n';
    }
    out += `Transações: ${f.qtdTransacoes || 0}\n`;
    out += border + '\n';
    out += '\n\n' + CUT;
    return out;
}

module.exports = { findTerminalFlex, buildEscPos, buildSangriaReceipt, buildFechamentoReceipt, printNetworkRaw };
