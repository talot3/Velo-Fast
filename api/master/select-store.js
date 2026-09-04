const { setCors, getSupabase, readBody } = require('../../lib/supabase');

module.exports = async function handler(req, res) {
    setCors(res);
    if (req.method === 'OPTIONS') return res.status(204).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

    try {
        const { storeId } = await readBody(req);
        const supabase = getSupabase();

        const { data: store } = await supabase.from('stores').select('*').eq('id', storeId).maybeSingle();
        if (!store) return res.status(404).json({ error: 'Loja não encontrada.' });

        const { error } = await supabase
            .from('app_settings')
            .upsert({ key: 'current_store_id', value: storeId }, { onConflict: 'key' });
        if (error) throw new Error(error.message);

        res.status(200).json({ success: true, currentStoreId: storeId, storeName: store.name });
    } catch (e) {
        console.error('Erro em /api/master/select-store:', e);
        res.status(400).json({ error: e.message || 'JSON inválido' });
    }
};
