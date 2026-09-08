#!/usr/bin/env node
/**
 * VELO FAST — Ponte de impressão local
 * ────────────────────────────────────
 * Roda num computador ligado na mesma rede das impressoras da loja.
 * Busca a fila de impressão na nuvem e imprime localmente via TCP.
 *
 * Uso:
 *   1. Instale o Node.js (https://nodejs.org) no computador da loja.
 *   2. Copie este arquivo e o .env (veja velo-bridge.env.example).
 *   3. Rode: node velo-bridge.js
 *   4. Deixe essa janela aberta (ou configure para iniciar com o Windows —
 *      veja instruções no README-bridge.md).
 */

const net = require('net');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { exec } = require('child_process');

// ─── Configuração ──────────────────────────────────────────────
function loadEnv() {
    const envPath = path.join(__dirname, '.env');
    const config = { VELO_URL: '', VELO_BRIDGE_KEY: '', POLL_INTERVAL_MS: '3000' };
    if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf-8');
        content.split('\n').forEach((line) => {
            const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
            if (m) config[m[1]] = m[2].replace(/^["']|["']$/g, '');
        });
    }
    // Variáveis de ambiente reais têm prioridade sobre o .env
    for (const key of Object.keys(config)) {
        if (process.env[key]) config[key] = process.env[key];
    }
    return config;
}

const config = loadEnv();
const POLL_INTERVAL_MS = parseInt(config.POLL_INTERVAL_MS, 10) || 3000;

if (!config.VELO_URL || !config.VELO_BRIDGE_KEY) {
    console.error('❌ Configure VELO_URL e VELO_BRIDGE_KEY no arquivo .env (veja velo-bridge.env.example).');
    process.exit(1);
}

function log(msg) {
    console.log(`[${new Date().toLocaleString('pt-BR')}] ${msg}`);
}

// ─── Envia os bytes ESC/POS para a impressora via TCP ──────────
function printRaw(ip, port, base64Payload) {
    return new Promise((resolve, reject) => {
        const buf = Buffer.from(base64Payload, 'base64');
        const client = new net.Socket();
        client.setTimeout(5000);

        client.connect(port || 9100, ip, () => {
            client.write(buf, () => {
                client.end();
            });
        });
        client.on('close', () => resolve(true));
        client.on('error', (err) => { client.destroy(); reject(err); });
        client.on('timeout', () => { client.destroy(); reject(new Error('Timeout ao conectar à impressora')); });
    });
}

// ─── Envia os bytes ESC/POS para uma impressora compartilhada do Windows ──
// sharePath: nome local da impressora (ex.: "EPSON TM-T20") OU caminho de
// rede completo (ex.: "\\COMPUTADOR-BAR\EPSON-TM20") se estiver instalada
// e compartilhada em outro computador da rede.
function printWindowsShared(sharePath, base64Payload) {
    return new Promise((resolve, reject) => {
        if (process.platform !== 'win32') {
            return reject(new Error('Impressão via Windows Spooler só funciona rodando a ponte em um computador Windows.'));
        }
        const buf = Buffer.from(base64Payload, 'base64');
        const tmpFile = path.join(os.tmpdir(), `velo-print-${Date.now()}.prn`);
        fs.writeFile(tmpFile, buf, (err) => {
            if (err) return reject(err);
            // copy /b envia os bytes em modo binário (RAW), sem reinterpretar
            // como texto — necessário para os comandos ESC/POS funcionarem.
            const cmd = `copy /b "${tmpFile}" "${sharePath}"`;
            exec(cmd, { windowsHide: true }, (error, stdout, stderr) => {
                fs.unlink(tmpFile, () => {}); // limpeza best-effort
                if (error) return reject(new Error(stderr || error.message));
                resolve(true);
            });
        });
    });
}

// ─── Requisições HTTP simples (sem dependências externas) ──────
async function apiGet(pathName) {
    const res = await fetch(config.VELO_URL + pathName, {
        headers: { 'X-Bridge-Key': config.VELO_BRIDGE_KEY }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    return res.json();
}

async function apiPost(pathName, body) {
    const res = await fetch(config.VELO_URL + pathName, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Bridge-Key': config.VELO_BRIDGE_KEY },
        body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    return res.json();
}

// ─── Loop principal ─────────────────────────────────────────────
async function tick() {
    try {
        const { jobs, storeId } = await apiGet('/api/bridge/pending');
        if (jobs.length > 0) log(`Loja ${storeId}: ${jobs.length} impressão(ões) pendente(s).`);

        for (const job of jobs) {
            const isWindows = job.printer_type === 'windows_shared';
            if (isWindows && !job.printer_share_path) {
                log(`⚠️  Job #${job.id}: impressora sem nome/caminho configurado — marcando como falha.`);
                await apiPost('/api/bridge/ack', { id: job.id, status: 'failed', error: 'Nome da impressora Windows não configurado.' });
                continue;
            }
            if (!isWindows && !job.printer_ip) {
                log(`⚠️  Job #${job.id}: impressora sem IP configurado — marcando como falha.`);
                await apiPost('/api/bridge/ack', { id: job.id, status: 'failed', error: 'Impressora sem IP configurado.' });
                continue;
            }
            try {
                if (isWindows) {
                    await printWindowsShared(job.printer_share_path, job.payload);
                    log(`✅ Job #${job.id} impresso em "${job.printer_name}" (Windows: ${job.printer_share_path}).`);
                } else {
                    await printRaw(job.printer_ip, job.printer_port, job.payload);
                    log(`✅ Job #${job.id} impresso em "${job.printer_name}" (${job.printer_ip}).`);
                }
                await apiPost('/api/bridge/ack', { id: job.id, status: 'done' });
            } catch (err) {
                await apiPost('/api/bridge/ack', { id: job.id, status: 'failed', error: err.message });
                log(`❌ Job #${job.id} falhou: ${err.message}`);
            }
        }
    } catch (err) {
        log(`⚠️  Erro ao consultar a fila: ${err.message}`);
    }
}

log(`🖨️  Ponte VELO FAST iniciada — consultando ${config.VELO_URL} a cada ${POLL_INTERVAL_MS / 1000}s.`);
tick();
setInterval(tick, POLL_INTERVAL_MS);
