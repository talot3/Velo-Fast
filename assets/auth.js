/* ═══════════════════════════════════════════════════════
   VELO FAST — cliente de autenticação compartilhado
   Usado por pdv/, portal/ e gelic/.
═══════════════════════════════════════════════════════ */
(function () {
    const STORAGE_KEY = 'velofast_auth';
    const QUEUE_KEY = 'velofast_pending_queue';
    const ROLE_LEVEL = { operador: 1, supervisor: 2, admin: 3 };

    function decodeJwtPayload(token) {
        try {
            return JSON.parse(atob(token.split('.')[1]));
        } catch (e) {
            return null;
        }
    }

    function getSession() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return null;
            const session = JSON.parse(raw);
            if (!session || !session.token) return null;
            const payload = decodeJwtPayload(session.token);
            if (payload && payload.exp && Date.now() >= payload.exp * 1000) {
                localStorage.removeItem(STORAGE_KEY);
                return null;
            }
            return session;
        } catch (e) {
            return null;
        }
    }

    function setSession(session) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    }

    function clearSession() {
        localStorage.removeItem(STORAGE_KEY);
    }

    function authHeaders(extra) {
        const session = getSession();
        const headers = Object.assign({ 'Content-Type': 'application/json' }, extra || {});
        if (session && session.token) headers['Authorization'] = 'Bearer ' + session.token;
        return headers;
    }

    async function login(username, password) {
        const res = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Falha no login');
        setSession({ token: data.token, username: data.user.username, role: data.user.role });
        return data.user;
    }

    function hasRole(role, minRole) {
        if (!minRole) return true;
        return (ROLE_LEVEL[role] || 0) >= ROLE_LEVEL[minRole];
    }

    function buildOverlay(id, zIndex) {
        const overlay = document.createElement('div');
        overlay.id = id;
        overlay.style.cssText =
            'position:fixed;inset:0;z-index:' + zIndex + ';background:rgba(10,10,15,.92);' +
            'display:flex;align-items:center;justify-content:center;font-family:system-ui,-apple-system,sans-serif;';
        return overlay;
    }

    function showLoginOverlay(minRole, onSuccess) {
        if (document.getElementById('velofast-auth-overlay')) return;
        const overlay = buildOverlay('velofast-auth-overlay', 99999);
        overlay.innerHTML =
            '<form id="velofast-auth-form" style="background:#16181d;padding:32px;border-radius:14px;width:min(320px,90vw);box-shadow:0 10px 40px rgba(0,0,0,.5);">' +
            '<h2 style="color:#fff;margin:0 0 4px;font-size:18px;">VELO FAST</h2>' +
            '<p style="color:#9aa0a6;margin:0 0 20px;font-size:13px;">Entre para continuar</p>' +
            '<input id="velofast-auth-user" placeholder="Usuário" autocomplete="username" style="width:100%;padding:10px 12px;margin-bottom:10px;border-radius:8px;border:1px solid #333;background:#0e0f13;color:#fff;box-sizing:border-box;">' +
            '<input id="velofast-auth-pass" type="password" placeholder="Senha" autocomplete="current-password" style="width:100%;padding:10px 12px;margin-bottom:14px;border-radius:8px;border:1px solid #333;background:#0e0f13;color:#fff;box-sizing:border-box;">' +
            '<div id="velofast-auth-error" style="color:#ff6b6b;font-size:12px;min-height:16px;margin-bottom:8px;"></div>' +
            '<button type="submit" style="width:100%;padding:11px;border:0;border-radius:8px;background:#4f7cff;color:#fff;font-weight:600;cursor:pointer;">Entrar</button>' +
            '</form>';
        document.body.appendChild(overlay);

        document.getElementById('velofast-auth-form').addEventListener('submit', async (ev) => {
            ev.preventDefault();
            const user = document.getElementById('velofast-auth-user').value.trim();
            const pass = document.getElementById('velofast-auth-pass').value;
            const errBox = document.getElementById('velofast-auth-error');
            errBox.textContent = '';
            try {
                const loggedUser = await login(user, pass);
                if (!hasRole(loggedUser.role, minRole)) {
                    errBox.textContent = 'Este usuário não tem permissão para acessar esta área.';
                    clearSession();
                    return;
                }
                overlay.remove();
                onSuccess(loggedUser);
            } catch (e) {
                errBox.textContent = e.message;
            }
        });
    }

    function requireLogin(minRole, onReady) {
        const session = getSession();
        if (session && hasRole(session.role, minRole)) {
            onReady(session);
            return;
        }
        showLoginOverlay(minRole, onReady);
    }

    /**
     * Pede login de um usuário com privilégio mais alto (ex.: supervisor)
     * SEM derrubar a sessão atual do operador. Usado para autorizar
     * cancelamentos de venda e outras ações sensíveis.
     * Resolve com um token temporário (não substitui a sessão principal).
     */
    function elevate(minRole) {
        return new Promise((resolve, reject) => {
            const overlay = buildOverlay('velofast-elevate-overlay', 100000);
            overlay.innerHTML =
                '<form id="velofast-elevate-form" style="background:#16181d;padding:28px;border-radius:14px;width:min(300px,90vw);box-shadow:0 10px 40px rgba(0,0,0,.5);">' +
                '<h2 style="color:#fff;margin:0 0 4px;font-size:16px;">Autorização necessária</h2>' +
                '<p style="color:#9aa0a6;margin:0 0 16px;font-size:12px;">Peça a um supervisor ou admin para autorizar esta ação.</p>' +
                '<input id="velofast-elevate-user" placeholder="Usuário" style="width:100%;padding:9px 10px;margin-bottom:8px;border-radius:8px;border:1px solid #333;background:#0e0f13;color:#fff;box-sizing:border-box;">' +
                '<input id="velofast-elevate-pass" type="password" placeholder="Senha" style="width:100%;padding:9px 10px;margin-bottom:12px;border-radius:8px;border:1px solid #333;background:#0e0f13;color:#fff;box-sizing:border-box;">' +
                '<div id="velofast-elevate-error" style="color:#ff6b6b;font-size:12px;min-height:14px;margin-bottom:6px;"></div>' +
                '<div style="display:flex;gap:8px;">' +
                '<button type="button" id="velofast-elevate-cancel" style="flex:1;padding:9px;border:0;border-radius:8px;background:#2a2d34;color:#fff;cursor:pointer;">Cancelar</button>' +
                '<button type="submit" style="flex:1;padding:9px;border:0;border-radius:8px;background:#4f7cff;color:#fff;font-weight:600;cursor:pointer;">Autorizar</button>' +
                '</div></form>';
            document.body.appendChild(overlay);

            document.getElementById('velofast-elevate-cancel').addEventListener('click', () => {
                overlay.remove();
                reject(new Error('Cancelado'));
            });

            document.getElementById('velofast-elevate-form').addEventListener('submit', async (ev) => {
                ev.preventDefault();
                const user = document.getElementById('velofast-elevate-user').value.trim();
                const pass = document.getElementById('velofast-elevate-pass').value;
                const errBox = document.getElementById('velofast-elevate-error');
                try {
                    const res = await fetch('/api/login', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ username: user, password: pass })
                    });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data.error || 'Falha no login');
                    if (!hasRole(data.user.role, minRole)) {
                        throw new Error('Usuário sem permissão suficiente.');
                    }
                    overlay.remove();
                    resolve(data.token);
                } catch (e) {
                    errBox.textContent = e.message;
                }
            });
        });
    }

    // ── Fila de reenvio ──────────────────────────────────────
    // Guarda no localStorage qualquer POST que falhar (rede fora do ar,
    // erro 5xx etc.) e tenta reenviar sozinho quando a conexão voltar,
    // evitando que uma venda "suma" silenciosamente.
    function getQueue() {
        try {
            return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
        } catch (e) {
            return [];
        }
    }

    function setQueue(queue) {
        localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    }

    function enqueue(url, body) {
        const queue = getQueue();
        queue.push({ url, body, ts: Date.now() });
        setQueue(queue);
    }

    async function flushQueue() {
        const queue = getQueue();
        if (queue.length === 0) return;
        const remaining = [];
        for (const item of queue) {
            try {
                const res = await fetch(item.url, {
                    method: 'POST',
                    headers: authHeaders(),
                    body: JSON.stringify(item.body)
                });
                if (!res.ok) remaining.push(item);
            } catch (e) {
                remaining.push(item); // ainda sem conexão, mantém na fila
            }
        }
        setQueue(remaining);
        if (remaining.length < queue.length) {
            document.dispatchEvent(new CustomEvent('velofast-queue-flushed', {
                detail: { sent: queue.length - remaining.length, remaining: remaining.length }
            }));
        }
    }

    /**
     * POST autenticado com fallback de fila. Se a requisição falhar
     * (rede ou erro do servidor), o payload é salvo e reenviado
     * automaticamente depois — a operação NUNCA fica "perdida" sem aviso.
     */
    async function postJSON(url, body) {
        try {
            const res = await fetch(url, { method: 'POST', headers: authHeaders(), body: JSON.stringify(body) });
            if (!res.ok) {
                if (res.status !== 401 && res.status !== 403) enqueue(url, body);
                const data = await res.json().catch(() => ({}));
                return { ok: false, status: res.status, data, queued: res.status !== 401 && res.status !== 403 };
            }
            const data = await res.json().catch(() => ({}));
            return { ok: true, status: res.status, data, queued: false };
        } catch (e) {
            enqueue(url, body);
            return { ok: false, status: 0, data: { error: e.message }, queued: true };
        }
    }

    window.addEventListener('online', flushQueue);
    setInterval(flushQueue, 30000);
    document.addEventListener('DOMContentLoaded', flushQueue);

    window.VeloAuth = {
        getSession, setSession, clearSession, authHeaders, login,
        requireLogin, elevate, postJSON, flushQueue, getQueueLength: () => getQueue().length
    };
})();
