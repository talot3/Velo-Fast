const { setCors, getStoreId, readBody } = require('../lib/supabase');
const { readState, writeState } = require('../lib/state');

module.exports = async function handler(req, res) {
    setCors(res);
    if (req.method === 'OPTIONS') return res.status(204).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

    try {
        const storeId = getStoreId(req);
        const newSales = await readBody(req);
        const currentData = await readState(storeId);

        // Dá baixa no estoque de produtos controlados ao vender ou devolve ao estornar
        if (Array.isArray(currentData.products)) {
            newSales.forEach((sale) => {
                const product = currentData.products.find((p) => String(p.id) === String(sale.productId));
                if (product && product.stock !== null && product.stock !== undefined && product.stock !== '') {
                    const qty = Number(product.stock);
                    if (Number(sale.price) < 0) {
                        product.stock = qty + 1; // devolução/estorno: volta ao estoque
                    } else {
                        product.stock = Math.max(0, qty - 1); // venda normal: reduz estoque
                    }
                }
            });
        }

        const salesWithSyncState = newSales.map((s) => ({ ...s, synchronized: 0 }));
        currentData.sales = [...(currentData.sales || []), ...salesWithSyncState];
        await writeState(storeId, currentData);

        res.status(200).json({ success: true, count: newSales.length });
    } catch (e) {
        console.error('Erro em /api/push-sales:', e);
        res.status(400).json({ error: e.message || 'Invalid JSON' });
    }
};
