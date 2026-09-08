const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { getSupabase } = require('./supabase');

/** Gera uma nova chave de ponte (mostrada uma única vez ao usuário). */
function generateBridgeKey() {
    return 'vfb_' + crypto.randomBytes(24).toString('hex'); // vfb = Velo Fast Bridge
}

/** Verifica a chave enviada pela ponte local e retorna a loja associada. */
async function verifyBridgeKey(req) {
    const header = req.headers && (req.headers['x-bridge-key'] || req.headers['X-Bridge-Key']);
    if (!header) {
        const err = new Error('Chave de ponte ausente.');
        err.statusCode = 401;
        throw err;
    }

    const supabase = getSupabase();
    const { data: bridges, error } = await supabase
        .from('printer_bridges')
        .select('*')
        .eq('active', true);
    if (error) throw new Error(error.message);

    for (const bridge of bridges || []) {
        const ok = await bcrypt.compare(header, bridge.api_key_hash);
        if (ok) {
            await supabase
                .from('printer_bridges')
                .update({ last_seen_at: new Date().toISOString() })
                .eq('id', bridge.id);
            return bridge;
        }
    }

    const err = new Error('Chave de ponte inválida.');
    err.statusCode = 401;
    throw err;
}

module.exports = { generateBridgeKey, verifyBridgeKey };
