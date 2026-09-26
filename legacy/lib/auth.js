const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { getSupabase } = require('./supabase');

function getJwtSecret() {
    const secret = process.env.AUTH_JWT_SECRET;
    if (!secret) {
        throw new Error('AUTH_JWT_SECRET não configurada nas variáveis de ambiente.');
    }
    return secret;
}

/** Verifica usuário/senha contra a tabela app_users (hash bcrypt). */
async function verifyCredentials(storeId, username, password) {
    const supabase = getSupabase();
    const { data: user, error } = await supabase
        .from('app_users')
        .select('*')
        .eq('store_id', storeId)
        .eq('username', username)
        .eq('active', true)
        .maybeSingle();

    if (error) throw new Error(error.message);
    if (!user) return null;

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return null;

    return { id: user.id, username: user.username, role: user.role, storeId: user.store_id };
}

/**
 * Verificação global — usada pelo painel master (gelic), que gerencia
 * todas as empresas e não pertence a uma loja específica. Procura o
 * usuário em QUALQUER empresa e só aceita se o papel for admin.
 */
async function verifyGlobalAdminCredentials(username, password) {
    const supabase = getSupabase();
    const { data: candidates, error } = await supabase
        .from('app_users')
        .select('*')
        .eq('username', username)
        .eq('role', 'admin')
        .eq('active', true);

    if (error) throw new Error(error.message);
    if (!candidates || candidates.length === 0) return null;

    for (const user of candidates) {
        const ok = await bcrypt.compare(password, user.password_hash);
        if (ok) {
            return { id: user.id, username: user.username, role: user.role, storeId: user.store_id };
        }
    }
    return null;
}

function issueToken(user) {
    return jwt.sign(
        { sub: user.username, role: user.role, storeId: user.storeId },
        getJwtSecret(),
        { expiresIn: '12h' }
    );
}

/**
 * Exige um Bearer token válido. Retorna o payload decodificado ou lança erro.
 * minRole (opcional): 'supervisor' ou 'admin' — exige esse nível ou superior.
 */
const ROLE_LEVEL = { operador: 1, supervisor: 2, admin: 3 };

function requireAuth(req, minRole) {
    const header = req.headers && (req.headers.authorization || req.headers.Authorization);
    if (!header || !header.startsWith('Bearer ')) {
        const err = new Error('Não autenticado. Faça login novamente.');
        err.statusCode = 401;
        throw err;
    }
    const token = header.slice('Bearer '.length);
    let payload;
    try {
        payload = jwt.verify(token, getJwtSecret());
    } catch (e) {
        const err = new Error('Sessão expirada ou inválida. Faça login novamente.');
        err.statusCode = 401;
        throw err;
    }

    if (minRole && (ROLE_LEVEL[payload.role] || 0) < ROLE_LEVEL[minRole]) {
        const err = new Error('Permissão insuficiente para esta ação.');
        err.statusCode = 403;
        throw err;
    }

    return payload;
}

function requireAdmin(req) {
    return requireAuth(req, 'admin');
}

module.exports = { verifyCredentials, verifyGlobalAdminCredentials, issueToken, requireAuth, requireAdmin, getJwtSecret };
