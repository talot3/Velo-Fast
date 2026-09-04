const { setCors, getSupabase, handleError } = require('../../lib/supabase');
const { readState } = require('../../lib/state');
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

        const dashboard = await Promise.all(
            (stores || []).map(async (store) => {
                try {
                    const data = await readState(store.id);
                    const sales = data.sales || [];
                    return {
                        storeId: store.id,
                        storeName: store.name,
                        salesCount: sales.length,
                        salesSum: sales.reduce((sum, s) => sum + (Number(s.price) || 0), 0),
                        productsCount: (data.products || []).length,
                        terminalsCount: (data.terminals || []).length,
                        active: store.active
                    };
                } catch (err) {
                    return {
                        storeId: store.id,
                        storeName: store.name,
                        salesCount: 0,
                        salesSum: 0,
                        productsCount: 0,
                        terminalsCount: 0,
                        error: true
                    };
                }
            })
        );

        res.status(200).json({ success: true, dashboard });
    } catch (e) {
        handleError(res, e, 500, 'Erro em /api/master/dashboard:');
    }
};
