const { setCors, getSupabase, readBody, handleError } = require('../../lib/supabase');
const { requireAdmin } = require('../../lib/auth');
const { generateBridgeKey } = require('../../lib/bridge-auth');
const bcrypt = require('bcryptjs');

module.exports = async function handler(req, res) {
    setCors(res);
    if (req.method === 'OPTIONS') return res.status(204).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

    try {
        requireAdmin(req); // criar chave de ponte exige admin
        const { storeId, name } = await readBody(req);
        if (!storeId) return res.status(400).json({ error: 'storeId é obrigatório.' });

        const apiKey = generateBridgeKey();
        const apiKeyHash = await bcrypt.hash(apiKey, 10);

        const supabase = getSupabase();
        const { data: store } = await supabase.from('stores').select('id').eq('id', storeId).maybeSingle();
        if (!store) return res.status(404).json({ error: 'Loja não encontrada.' });

        const { error } = await supabase.from('printer_bridges').insert({
            store_id: storeId,
            name: name || `Ponte ${storeId}`,
            api_key_hash: apiKeyHash,
            active: true
        });
        if (error) throw new Error(error.message);

        // A chave só é retornada aqui, nesta única vez — não fica salva em
        // texto puro em lugar nenhum. Guarde-a com segurança.
        res.status(200).json({ success: true, apiKey, storeId });
    } catch (e) {
        handleError(res, e, 400, 'Erro em /api/master/create-bridge:');
    }
};
