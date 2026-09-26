const { createClient } = require('@supabase/supabase-js');

let client = null;

/**
 * Cliente Supabase com a service role key.
 * NUNCA exponha essa chave no frontend — ela só deve existir
 * como variável de ambiente do lado do servidor (funções /api).
 */
function getSupabase() {
    if (!client) {
        const url = process.env.SUPABASE_URL;
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!url || !key) {
            throw new Error(
                'SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY não configuradas. ' +
                'Defina essas variáveis de ambiente no projeto Vercel.'
            );
        }
        client = createClient(url, key, {
            auth: { persistSession: false }
        });
    }
    return client;
}

/** Loja padrão usada quando o cliente não informa store_id. */
const DEFAULT_STORE_ID = process.env.DEFAULT_STORE_ID || 'DEMO';

function getStoreId(req) {
    return (
        (req.headers && req.headers['x-store-id']) ||
        (req.query && req.query.store) ||
        DEFAULT_STORE_ID
    );
}

function setCors(res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Store-Id');
}

/** Responde um erro capturado respeitando e.statusCode (ex.: 401/403 do requireAuth). */
function handleError(res, e, fallbackStatus, context) {
    if (context) console.error(context, e);
    res.status(e.statusCode || fallbackStatus || 500).json({ error: e.message || 'Erro inesperado.' });
}

async function readBody(req) {
    if (req.body !== undefined && req.body !== null) {
        // Vercel já faz o parse de JSON quando o Content-Type é application/json
        return typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body;
    }
    return new Promise((resolve, reject) => {
        let raw = '';
        req.on('data', (chunk) => (raw += chunk));
        req.on('end', () => {
            try {
                resolve(raw ? JSON.parse(raw) : {});
            } catch (e) {
                reject(e);
            }
        });
        req.on('error', reject);
    });
}

module.exports = { getSupabase, getStoreId, setCors, handleError, readBody, DEFAULT_STORE_ID };
