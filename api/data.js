const { setCors, getStoreId } = require('../lib/supabase');
const { readState } = require('../lib/state');

module.exports = async function handler(req, res) {
    setCors(res);
    if (req.method === 'OPTIONS') return res.status(204).end();
    if (req.method !== 'GET') return res.status(405).json({ error: 'Método não permitido' });

    try {
        const storeId = getStoreId(req);
        const data = await readState(storeId);
        res.status(200).json(data);
    } catch (e) {
        console.error('Erro em /api/data:', e);
        res.status(500).json({ error: e.message });
    }
};
