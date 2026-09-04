const { setCors, getStoreId, handleError } = require('../lib/supabase');
const { readState } = require('../lib/state');
const { requireAuth } = require('../lib/auth');

module.exports = async function handler(req, res) {
    setCors(res);
    if (req.method === 'OPTIONS') return res.status(204).end();
    if (req.method !== 'GET') return res.status(405).json({ error: 'Método não permitido' });

    try {
        requireAuth(req);
        const storeId = getStoreId(req);
        const data = await readState(storeId);
        // Defesa extra: usuários/senhas nunca devem sair por aqui, mesmo que
        // algum dado antigo ainda tenha o campo "users" no blob de estado.
        const { users, ...safeData } = data;
        res.status(200).json(safeData);
    } catch (e) {
        handleError(res, e, 500, 'Erro em /api/data:');
    }
};
