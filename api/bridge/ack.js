const { setCors, readBody, handleError, getSupabase } = require('../../lib/supabase');
const { verifyBridgeKey } = require('../../lib/bridge-auth');

module.exports = async function handler(req, res) {
    setCors(res);
    if (req.method === 'OPTIONS') return res.status(204).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

    try {
        const bridge = await verifyBridgeKey(req);
        const { id, status, error: printError } = await readBody(req);
        if (!id || !['done', 'failed'].includes(status)) {
            return res.status(400).json({ error: 'id e status (done|failed) são obrigatórios.' });
        }

        const supabase = getSupabase();
        const { error } = await supabase
            .from('print_jobs')
            .update({
                status,
                error: printError || null,
                printed_at: status === 'done' ? new Date().toISOString() : null
            })
            .eq('id', id)
            .eq('store_id', bridge.store_id); // só confirma jobs da própria loja
        if (error) throw new Error(error.message);

        res.status(200).json({ success: true });
    } catch (e) {
        handleError(res, e, 500, 'Erro em /api/bridge/ack:');
    }
};
