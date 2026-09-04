const { setCors, getStoreId, readBody, handleError } = require('../lib/supabase');
const { readState, writeState } = require('../lib/state');
const { requireAuth } = require('../lib/auth');

module.exports = async function handler(req, res) {
    setCors(res);
    if (req.method === 'OPTIONS') return res.status(204).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

    try {
        requireAuth(req);
        const storeId = getStoreId(req);
        const newSales = await readBody(req);
        const currentData = await readState(storeId);
        const products = currentData.products || [];

        const validatedSales = [];
        const rejected = [];

        newSales.forEach((sale) => {
            const isEstorno = Number(sale.price) < 0;
            const product = products.find((p) => String(p.id) === String(sale.productId));

            if (!product) {
                rejected.push({ sale, reason: 'Produto não encontrado no catálogo.' });
                return;
            }

            // O preço é sempre o do catálogo no servidor — nunca o que o
            // cliente mandou. Isso impede registrar venda com valor adulterado.
            const officialPrice = isEstorno ? -Math.abs(Number(product.price)) : Math.abs(Number(product.price));
            const safeSale = { ...sale, price: officialPrice, productName: product.name };

            if (product.stock !== null && product.stock !== undefined && product.stock !== '') {
                const qty = Number(product.stock);
                product.stock = isEstorno ? qty + 1 : Math.max(0, qty - 1);
            }

            validatedSales.push({ ...safeSale, synchronized: 0 });
        });

        currentData.sales = [...(currentData.sales || []), ...validatedSales];
        await writeState(storeId, currentData);

        res.status(200).json({ success: true, count: validatedSales.length, rejected });
    } catch (e) {
        handleError(res, e, 400, 'Erro em /api/push-sales:');
    }
};
