const { setCors, getSupabase, readBody, handleError } = require('../../lib/supabase');
const { writeState, INITIAL_DATA } = require('../../lib/state');
const { requireAdmin } = require('../../lib/auth');

module.exports = async function handler(req, res) {
    setCors(res);
    if (req.method === 'OPTIONS') return res.status(204).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

    try {
        requireAdmin(req); // painel master exige admin
        const newStore = await readBody(req);
        if (!newStore.name || !newStore.cnpj) {
            return res.status(400).json({ error: 'Nome e CNPJ são obrigatórios.' });
        }

        const supabase = getSupabase();
        const { data: existing } = await supabase.from('stores').select('id');
        const maxId = (existing || []).reduce((max, s) => {
            const n = parseInt(s.id, 10);
            return Number.isFinite(n) ? Math.max(max, n) : max;
        }, 16000);
        const newId = String(maxId + 1);

        const storeObj = {
            id: newId,
            name: String(newStore.name).toUpperCase(),
            cnpj: newStore.cnpj,
            phone: newStore.phone || 'N/A',
            active: true,
            expire_date: newStore.expireDate || '2027-12-31',
            terminals_allowed: parseInt(newStore.terminalsAllowed, 10) || 5,
            active_terminals: 1
        };

        const { error } = await supabase.from('stores').insert(storeObj);
        if (error) throw new Error(error.message);

        await writeState(newId, INITIAL_DATA);

        res.status(200).json({
            success: true,
            store: {
                id: storeObj.id,
                name: storeObj.name,
                cnpj: storeObj.cnpj,
                phone: storeObj.phone,
                active: storeObj.active,
                expireDate: storeObj.expire_date,
                terminalsAllowed: storeObj.terminals_allowed,
                activeTerminals: storeObj.active_terminals
            }
        });
    } catch (e) {
        handleError(res, e, 400, 'Erro em /api/master/create-store:');
    }
};
