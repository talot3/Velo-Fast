const { getSupabase } = require('./supabase');

const INITIAL_DATA = {
    products: [],
    groups: [],
    subgroups: [],
    paymentMethods: [],
    printers: [],
    terminals: [],
    sales: [],
    cash: { isOpen: false, sales: [] },
    versions: [
        {
            id: 1,
            version: '1.0.0',
            date: new Date().toISOString(),
            description: 'Versão inicial de lançamento do sistema VELO com controle de vendas e impressão de cupom.'
        }
    ],
    currentVersion: '1.0.0'
};

/** Lê o estado completo da loja (equivalente a readData() no server.js original). */
async function readState(storeId) {
    const supabase = getSupabase();
    const { data, error } = await supabase
        .from('system_data')
        .select('value')
        .eq('store_id', storeId)
        .eq('key', 'state')
        .maybeSingle();

    if (error) throw new Error(`Erro ao ler estado da loja ${storeId}: ${error.message}`);

    if (data && data.value) {
        return data.value;
    }

    // Loja nova: garante que a loja existe na tabela stores e grava estado inicial
    await ensureStoreExists(storeId);
    await writeState(storeId, INITIAL_DATA);
    return INITIAL_DATA;
}

/** Grava o estado completo da loja (equivalente a writeData() no server.js original). */
async function writeState(storeId, value) {
    const supabase = getSupabase();
    const { error } = await supabase
        .from('system_data')
        .upsert({ store_id: storeId, key: 'state', value }, { onConflict: 'store_id,key' });

    if (error) throw new Error(`Erro ao gravar estado da loja ${storeId}: ${error.message}`);
}

async function ensureStoreExists(storeId) {
    const supabase = getSupabase();
    const { data } = await supabase.from('stores').select('id').eq('id', storeId).maybeSingle();
    if (!data) {
        await supabase.from('stores').insert({
            id: storeId,
            name: `LOJA ${storeId}`,
            active: true,
            terminals_allowed: 1,
            active_terminals: 0
        });
    }
}

module.exports = { readState, writeState, INITIAL_DATA };
