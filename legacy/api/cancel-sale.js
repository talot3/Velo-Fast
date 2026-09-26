const { setCors, getStoreId, readBody, handleError } = require('../lib/supabase');
const { readState, writeState } = require('../lib/state');
const { requireAuth } = require('../lib/auth');

module.exports = async function handler(req, res) {
    setCors(res);
    if (req.method === 'OPTIONS') return res.status(204).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

    try {
        // Cancelamento de venda exige autorização de supervisor ou admin —
        // não é mais liberado para qualquer operador com um simples confirm().
        requireAuth(req, 'supervisor');
        const storeId = getStoreId(req);
        const payload = await readBody(req);
        if (!payload || !payload.id) {
            return res.status(400).json({ error: 'JSON inválido ou ID de venda ausente.' });
        }

        const saleId = payload.id;
        const currentData = await readState(storeId);

        if (!Array.isArray(currentData.sales)) {
            return res.status(200).json({ success: false, error: 'Nenhuma venda encontrada' });
        }

        const saleToCancel = currentData.sales.find((s) => String(s.id) === String(saleId));
        if (!saleToCancel) {
            return res.status(200).json({ success: false, error: 'Venda não encontrada' });
        }

        if (Array.isArray(currentData.products)) {
            const product = currentData.products.find((p) => String(p.id) === String(saleToCancel.productId));
            if (product && product.stock !== null && product.stock !== undefined && product.stock !== '') {
                const qty = Number(product.stock);
                if (Number(saleToCancel.price) < 0) {
                    product.stock = Math.max(0, qty - 1); // cancelar devolução: retira do estoque
                } else {
                    product.stock = qty + 1; // cancelar venda normal: devolve ao estoque
                }
            }
        }

        currentData.sales = currentData.sales.filter((s) => String(s.id) !== String(saleId));
        await writeState(storeId, currentData);

        res.status(200).json({ success: true });
    } catch (e) {
        handleError(res, e, 500, 'Erro em /api/cancel-sale:');
    }
};
