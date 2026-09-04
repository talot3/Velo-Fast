const { setCors, getSupabase, handleError } = require('../../lib/supabase');
const { requireAdmin } = require('../../lib/auth');

module.exports = async function handler(req, res) {
    setCors(res);
    if (req.method === 'OPTIONS') return res.status(204).end();
    if (req.method !== 'GET') return res.status(405).json({ error: 'Método não permitido' });

    try {
        requireAdmin(req); // painel master exige admin
        const supabase = getSupabase();
        const { data: stores, error } = await supabase.from('stores').select('*').order('id');
        if (error) throw new Error(error.message);

        const { data: setting } = await supabase
            .from('app_settings')
            .select('value')
            .eq('key', 'current_store_id')
            .maybeSingle();

        res.status(200).json({
            success: true,
            currentStoreId: setting ? setting.value : 'DEMO',
            stores: (stores || []).map((s) => ({
                id: s.id,
                name: s.name,
                cnpj: s.cnpj,
                phone: s.phone,
                active: s.active,
                expireDate: s.expire_date,
                terminalsAllowed: s.terminals_allowed,
                activeTerminals: s.active_terminals
            }))
        });
    } catch (e) {
        handleError(res, e, 500, 'Erro em /api/master/stores:');
    }
};
