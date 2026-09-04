const { setCors, getStoreId, readBody, handleError } = require('../lib/supabase');
const { verifyCredentials, issueToken } = require('../lib/auth');

module.exports = async function handler(req, res) {
    setCors(res);
    if (req.method === 'OPTIONS') return res.status(204).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

    try {
        const storeId = getStoreId(req);
        const { username, password } = await readBody(req);
        if (!username || !password) {
            return res.status(400).json({ error: 'Usuário e senha são obrigatórios.' });
        }

        const user = await verifyCredentials(storeId, username, password);
        if (!user) {
            return res.status(401).json({ error: 'Usuário ou senha inválidos.' });
        }

        const token = issueToken(user);
        res.status(200).json({
            success: true,
            token,
            user: { username: user.username, role: user.role }
        });
    } catch (e) {
        handleError(res, e, 500, 'Erro em /api/login:');
    }
};
