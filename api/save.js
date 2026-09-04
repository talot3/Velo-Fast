const { setCors, getStoreId, readBody } = require('../lib/supabase');
const { readState, writeState } = require('../lib/state');

module.exports = async function handler(req, res) {
    setCors(res);
    if (req.method === 'OPTIONS') return res.status(204).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

    try {
        const storeId = getStoreId(req);
        const newData = await readBody(req);
        const currentData = await readState(storeId);
        const updatedData = { ...currentData, ...newData };
        await writeState(storeId, updatedData);
        res.status(200).json({ success: true });
    } catch (e) {
        console.error('Erro em /api/save:', e);
        res.status(400).json({ error: e.message || 'Invalid JSON' });
    }
};
