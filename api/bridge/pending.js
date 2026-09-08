const { setCors, handleError, getSupabase } = require('../../lib/supabase');
const { verifyBridgeKey } = require('../../lib/bridge-auth');

module.exports = async function handler(req, res) {
    setCors(res);
    if (req.method === 'OPTIONS') return res.status(204).end();
    if (req.method !== 'GET') return res.status(405).json({ error: 'Método não permitido' });

    try {
        const bridge = await verifyBridgeKey(req);
        const supabase = getSupabase();

        const { data: jobs, error } = await supabase
            .from('print_jobs')
            .select('id, printer_id, printer_type, printer_ip, printer_port, printer_share_path, printer_name, payload, created_at')
            .eq('store_id', bridge.store_id)
            .eq('status', 'pending')
            .order('created_at', { ascending: true })
            .limit(20);
        if (error) throw new Error(error.message);

        res.status(200).json({ success: true, storeId: bridge.store_id, jobs: jobs || [] });
    } catch (e) {
        handleError(res, e, 500, 'Erro em /api/bridge/pending:');
    }
};
