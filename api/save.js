const { setCors, getStoreId, readBody, handleError } = require('../lib/supabase');
const { readState, writeState } = require('../lib/state');
const { requireAuth } = require('../lib/auth');

module.exports = async function handler(req, res) {
    setCors(res);
    if (req.method === 'OPTIONS') return res.status(204).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

    try {
        // Alterar configuração (produtos, preços, impressoras etc.) exige
        // no mínimo papel de supervisor.
        requireAuth(req, 'supervisor');
        const storeId = getStoreId(req);
        const newData = await readBody(req);
        delete newData.users; // usuários não são gerenciados por aqui
        const currentData = await readState(storeId);
        const updatedData = { ...currentData, ...newData };
        await writeState(storeId, updatedData);
        res.status(200).json({ success: true });
    } catch (e) {
        handleError(res, e, 400, 'Erro em /api/save:');
    }
};
