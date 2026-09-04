const { setCors, getSupabase, readBody, handleError } = require('../../lib/supabase');
const { requireAdmin } = require('../../lib/auth');

module.exports = async function handler(req, res) {
    setCors(res);
    if (req.method === 'OPTIONS') return res.status(204).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

    try {
        requireAdmin(req); // painel master exige admin
        const { storeId, active, expireDate } = await readBody(req);
        const supabase = getSupabase();

        const { data: store } = await supabase.from('stores').select('*').eq('id', storeId).maybeSingle();
        if (!store) return res.status(404).json({ error: 'Loja não encontrada.' });

        const patch = {};
        if (active !== undefined) patch.active = !!active;
        if (expireDate !== undefined) patch.expire_date = expireDate;

        const { data: updated, error } = await supabase
            .from('stores')
            .update(patch)
            .eq('id', storeId)
            .select()
            .single();
        if (error) throw new Error(error.message);

        res.status(200).json({
            success: true,
            store: {
                id: updated.id,
                name: updated.name,
                cnpj: updated.cnpj,
                phone: updated.phone,
                active: updated.active,
                expireDate: updated.expire_date,
                terminalsAllowed: updated.terminals_allowed,
                activeTerminals: updated.active_terminals
            }
        });
    } catch (e) {
        handleError(res, e, 400, 'Erro em /api/master/toggle-license:');
    }
};
