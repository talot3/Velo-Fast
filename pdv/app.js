/* ═══════════════════════════════════════════════════════
   TicketPro PDV — app.js  v3
   Fluxo: Login → Suprimento → Vendas → Pagamento → Cupom
═══════════════════════════════════════════════════════ */

// ── ESTADO GLOBAL ────────────────────────────────────────
let db = { products: [], groups: [], subgroups: [], paymentMethods: [], printers: [], terminals: [], users: [], ticketConfig: null };

let session = { loggedIn: false, operator: '', terminalId: '', suprimento: 0 };

let order    = [];   // [{ uid, productId, name, price, printerId, qty }]
let payments = [];   // [{ method, amount }]
let pendingTransactions = []; // para impressão

let activeSubgroup = null;
let numpadStr      = '';
let supStr         = '';    // numpad do suprimento
let searchQuery    = '';

// ── INICIALIZAÇÃO ────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    startClock();
    restoreSession();
    setupSwipeToClose('itens-drawer', fecharItens);
    setupSwipeToClose('menu-drawer', fecharMenuOpcoes);
    setupSwipeToClose('reimp-drawer', fecharReimpressao);
    setupSwipeToClose('cancel-drawer', fecharCancelamento);
});

// ── RELÓGIO ──────────────────────────────────────────────
function startClock() {
    const tick = () => {
        const el = document.getElementById('pdv-clock');
        if (el) el.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };
    tick(); setInterval(tick, 1000);
}

// ── SINCRONIZAÇÃO ────────────────────────────────────────
function syncData() {
    return fetch('/api/data', { headers: VeloAuth.authHeaders() })
        .then(r => r.json())
        .then(data => {
            if (data.products)       db.products       = data.products;
            if (data.groups)         db.groups         = data.groups;
            if (data.subgroups)      db.subgroups      = data.subgroups;
            if (data.paymentMethods) db.paymentMethods = data.paymentMethods;
            if (data.printers)       db.printers       = data.printers;
            if (data.terminals)      db.terminals      = data.terminals;
            if (data.users)          db.users          = data.users;
            if (data.ticketConfig)   db.ticketConfig   = data.ticketConfig;
            db.versions       = data.versions || [];
            db.currentVersion = data.currentVersion || '1.0.0';

            // Salva TUDO no cache local (funciona offline)
            localStorage.setItem('tp_products',    JSON.stringify(db.products));
            localStorage.setItem('tp_subgroups',   JSON.stringify(db.subgroups));
            localStorage.setItem('tp_groups',      JSON.stringify(db.groups));
            localStorage.setItem('tp_pay_methods', JSON.stringify(db.paymentMethods));
            localStorage.setItem('tp_printers',    JSON.stringify(db.printers));
            localStorage.setItem('tp_terminals',   JSON.stringify(db.terminals));
            localStorage.setItem('tp_users',       JSON.stringify(db.users));
            localStorage.setItem('tp_ticketConfig',JSON.stringify(db.ticketConfig));
            localStorage.setItem('tp_versions',    JSON.stringify(db.versions));
            localStorage.setItem('tp_currentVersion', db.currentVersion);

            applyTerminalConfig();
            renderProducts();
            renderPayMethods();
            applyVersionDisplay();
            return data;
        })
        .catch(() => {
            // Modo offline: usa cache local
            db.products       = JSON.parse(localStorage.getItem('tp_products')    || '[]');
            db.subgroups      = JSON.parse(localStorage.getItem('tp_subgroups')   || '[]');
            db.groups         = JSON.parse(localStorage.getItem('tp_groups')      || '[]');
            db.paymentMethods = JSON.parse(localStorage.getItem('tp_pay_methods') || '[]');
            db.printers       = JSON.parse(localStorage.getItem('tp_printers')    || '[]');
            db.terminals      = JSON.parse(localStorage.getItem('tp_terminals')   || '[]');
            db.users          = JSON.parse(localStorage.getItem('tp_users')       || '[]');
            db.ticketConfig   = JSON.parse(localStorage.getItem('tp_ticketConfig')|| 'null');
            db.versions       = JSON.parse(localStorage.getItem('tp_versions')    || '[]');
            db.currentVersion = localStorage.getItem('tp_currentVersion') || '1.0.0';
            applyTerminalConfig();
            renderProducts();
            renderPayMethods();
            applyVersionDisplay();
        });
}

function applyVersionDisplay() {
    const ver = db.currentVersion || '1.0.0';
    
    const loginVer = document.getElementById('login-version-label');
    if (loginVer) loginVer.textContent = ver;
    
    const hdrVer = document.getElementById('hdr-version-label');
    if (hdrVer) hdrVer.textContent = ver;
    
    const menuVer = document.getElementById('menu-version-label');
    if (menuVer) menuVer.textContent = ver;
}

function setupSwipeToClose(drawerId, closeFn) {
    const drawer = document.getElementById(drawerId);
    if (!drawer) return;
    const panel = drawer.querySelector('.itens-panel') || drawer.querySelector('.menu-panel');
    if (!panel) return;

    let touchStartX = 0;
    let touchStartY = 0;
    let touchEndX = 0;
    let touchEndY = 0;

    panel.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
        touchStartY = e.changedTouches[0].screenY;
    }, { passive: true });

    panel.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        touchEndY = e.changedTouches[0].screenY;
        
        const diffX = touchEndX - touchStartX;
        const diffY = touchEndY - touchStartY;
        
        // Se deslizou mais de 80px para a direita com variação vertical aceitável (menor que horizontal)
        if (diffX > 80 && Math.abs(diffY) < diffX * 0.6) {
            closeFn();
        }
    }, { passive: true });
}

/**
 * Busca flexível de terminal por ID, nome, cashNumber ou números correspondentes.
 */
function findTerminalFlex(terminals, terminalIdOrInput) {
    if (!terminalIdOrInput || !Array.isArray(terminals) || terminals.length === 0) return null;
    const inputUpper = String(terminalIdOrInput).trim().toUpperCase();
    const inputDigits = inputUpper.replace(/\D/g, '');

    // 1. Tenta correspondência exata por ID
    let found = terminals.find(t => String(t.id).toUpperCase() === inputUpper);
    if (found) return found;

    // 2. Tenta correspondência exata por Nome
    found = terminals.find(t => String(t.name).toUpperCase() === inputUpper);
    if (found) return found;

    // 3. Tenta correspondência numérica com o cashNumber
    if (inputDigits !== '') {
        found = terminals.find(t => String(t.cashNumber) === inputDigits);
        if (found) return found;
    }

    // 4. Tenta correspondência flexível removendo caracteres não-alfanuméricos
    const cleanInput = inputUpper.replace(/[^A-Z0-9]/g, '');
    if (cleanInput !== '') {
        found = terminals.find(t => {
            const cleanId = String(t.id).toUpperCase().replace(/[^A-Z0-9]/g, '');
            const cleanName = String(t.name).toUpperCase().replace(/[^A-Z0-9]/g, '');
            return cleanId === cleanInput || cleanName === cleanInput || cleanId.includes(cleanInput) || cleanName.includes(cleanInput);
        });
        if (found) return found;
    }

    return null;
}

/**
 * Aplica configurações do terminal cadastrado no portal ao session.
 * Busca pelo terminalId digitado no login (campo id ou name do terminal).
 */
function applyTerminalConfig() {
    if (!session.terminalId || !db.terminals.length) return;

    const t = findTerminalFlex(db.terminals, session.terminalId);
    if (!t) return;

    // Aplica configurações do portal
    session.terminalName = t.name  || session.terminalId;
    session.printerId    = t.printerId || null;
    saveSession();

    // Atualiza header com o nome do terminal
    const hdr = document.getElementById('hdr-terminal');
    if (hdr) hdr.textContent = session.terminalName || session.terminalId;
}


// ════════════════════════════════════════════════════════
// SESSÃO / PERSISTÊNCIA
// ════════════════════════════════════════════════════════
function restoreSession() {
    const saved = JSON.parse(localStorage.getItem('tp_session') || 'null');
    if (saved && saved.loggedIn) {
        session = saved;
        order   = JSON.parse(localStorage.getItem('tp_order') || '[]');
        VeloAuth.requireLogin('operador', () => { showPDV(); syncData(); });
    } else {
        const tid = new URLSearchParams(location.search).get('tid')
                    || localStorage.getItem('tp_tid') || 'CX001';
        const srv = localStorage.getItem('tp_server') || location.host;
        document.getElementById('login-terminal').value = tid;
        document.getElementById('login-server').value   = srv;

        // Mostra dica se o caixa ainda está aberto
        const msg = document.getElementById('login-msg');
        if (msg && localStorage.getItem('tp_caixa_aberto') === 'true') {
            msg.textContent = 'Caixa já aberto — informe o operador para entrar direto.';
            msg.style.color = 'var(--success, #16a34a)';
        }
        showLogin();
    }
}

function saveSession() { localStorage.setItem('tp_session', JSON.stringify(session)); }
function saveOrderLocal() { localStorage.setItem('tp_order', JSON.stringify(order)); }

// ════════════════════════════════════════════════════════
// TELAS — NAVEGAÇÃO
// ════════════════════════════════════════════════════════
function showLogin() {
    // Fecha qualquer modal/drawer aberto antes de voltar ao login
    document.getElementById('login-screen').classList.remove('hidden');
    document.getElementById('pdv-screen').classList.add('hidden');
    document.getElementById('suprimento-modal').classList.add('hidden');
    document.getElementById('sangria-modal')?.classList.add('hidden');
    document.getElementById('menu-drawer')?.classList.remove('open');
    document.getElementById('itens-drawer')?.classList.remove('open');
    document.getElementById('reimp-drawer')?.classList.remove('open');
    document.body.style.overflow = '';
    // Pré-preenche o terminal salvo
    const tid = localStorage.getItem('tp_tid') || 'CX001';
    const srv = localStorage.getItem('tp_server') || location.host;
    const opEl = document.getElementById('login-operator');
    if (opEl) opEl.value = '';
    const tidEl = document.getElementById('login-terminal');
    if (tidEl) tidEl.value = tid;
    const srvEl = document.getElementById('login-server');
    if (srvEl) srvEl.value = srv;
}

function showSuprimento() {
    supStr = '';
    document.getElementById('sup-value').textContent = 'R$ 0,00';
    document.getElementById('suprimento-modal').classList.remove('hidden');
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function showPDV() {
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('pdv-screen').classList.remove('hidden');
    document.getElementById('suprimento-modal').classList.add('hidden');
    document.getElementById('hdr-operator').textContent = session.operator.toUpperCase();
    document.getElementById('hdr-terminal').textContent = session.terminalId;
    renderProducts();
    renderCart();
    renderPayMethods();
}

// ════════════════════════════════════════════════════════
// LOGIN
// ════════════════════════════════════════════════════════
window.doLogin = async function() {
    const operator = document.getElementById('login-operator').value.trim();
    const password = document.getElementById('login-password').value;
    const terminal = document.getElementById('login-terminal').value.trim() || 'CX001';
    const server   = document.getElementById('login-server').value.trim();
    const msg      = document.getElementById('login-msg');
    const btn      = document.getElementById('btn-acessar');

    if (!operator) {
        msg.textContent = 'Informe o nome do usuário.';
        document.getElementById('login-operator').focus();
        return;
    }

    // Autenticação real no servidor (a senha nunca fica só no navegador)
    msg.textContent = '⟳ Autenticando...';
    msg.style.color = 'var(--text-sub)';
    if (btn) { btn.disabled = true; btn.textContent = 'Aguarde...'; }
    try {
        await VeloAuth.login(operator, password);
    } catch (e) {
        if (btn) { btn.disabled = false; btn.textContent = 'ACESSAR CAIXA'; }
        msg.style.color = '';
        msg.textContent = e.message || 'Usuário ou senha inválidos.';
        return;
    }
    if (btn) { btn.disabled = false; btn.textContent = 'ACESSAR CAIXA'; }
    msg.style.color = '';
    msg.textContent = '';

    session.operator   = operator;
    session.terminalId = terminal.toUpperCase();
    session.loggedIn   = true;

    localStorage.setItem('tp_tid',    terminal.toUpperCase());
    localStorage.setItem('tp_server', server);

    document.getElementById('login-screen').classList.add('hidden');
    syncData();

    // Se o caixa já foi aberto (suprimento feito), pula direto para o PDV
    if (localStorage.getItem('tp_caixa_aberto') === 'true') {
        session.suprimento = parseFloat(localStorage.getItem('tp_suprimento_valor') || '0');
        saveSession();
        showPDV();
        toast('Bem-vindo, ' + operator.toUpperCase() + '! Caixa já aberto.');
    } else {
        showSuprimento();
    }
};

window.doLogout = function() {
    // Encerra apenas a sessão do operador.
    // NÃO remove tp_caixa_aberto — o caixa continua aberto para o próximo login.
    VeloAuth.clearSession();
    session  = { loggedIn: false, operator: '', terminalId: '', suprimento: 0 };
    order    = []; payments = [];
    localStorage.removeItem('tp_session');
    localStorage.removeItem('tp_order');
    showLogin();
    toast('Sessão encerrada. Caixa permanece aberto.');
};

window.doSyncLogin = function() {
    const btn = document.querySelector('.btn-sincronizar') || document.querySelector('.btn-sincronizar-modern');
    if (btn) {
        btn.textContent = 'Sincronizando...';
        btn.disabled    = true;
    }
    syncData()
        .then(() => toast('Sincronização concluída!'))
        .catch(() => toast('Falha na sincronização.'))
        .finally(() => { 
            if (btn) {
                btn.innerHTML = '<i data-lucide="refresh-cw"></i> Sincronizar Dados'; 
                btn.disabled = false; 
                if (typeof lucide !== 'undefined') lucide.createIcons();
            }
        });
};

// ════════════════════════════════════════════════════════
// SUPRIMENTO DE CAIXA
// ════════════════════════════════════════════════════════
window.supNp = function(key) {
    if (key === 'DEL') {
        supStr = supStr.slice(0, -1);
    } else if (key === '00') {
        supStr += '00';
    } else {
        supStr += key;
    }
    // Formata como centavos → reais
    const cents = parseInt(supStr || '0', 10);
    const value = cents / 100;
    document.getElementById('sup-value').textContent = 'R$ ' + value.toFixed(2).replace('.', ',');
};

window.confirmarSuprimento = function(pular) {
    const cents = parseInt(supStr || '0', 10);
    session.suprimento = pular ? 0 : (cents / 100);
    saveSession();

    // Marca o caixa como aberto (persistente até o Fechamento de Caixa)
    localStorage.setItem('tp_caixa_aberto',    'true');
    localStorage.setItem('tp_suprimento_valor', String(session.suprimento));
    localStorage.setItem('tp_abertura_dt', new Date().toLocaleString('pt-BR'));
    // Limpa vendas e sangrias da sessão anterior
    localStorage.removeItem('tp_session_sales');
    localStorage.removeItem('tp_sangrias');

    toast(pular
        ? 'Caixa aberto sem suprimento.'
        : `Caixa aberto com suprimento de R$ ${session.suprimento.toFixed(2).replace('.', ',')}`
    );
    showPDV();
};

// ════════════════════════════════════════════════════════
// PRODUTOS — Ícones Lucide flat
// ════════════════════════════════════════════════════════
const ICON_MAP = {
    beer:          'beer',
    'cup-soda':    'cup-soda',
    coffee:        'coffee',
    utensils:      'utensils',
    pizza:         'pizza',
    sandwich:      'sandwich',
    soup:          'soup',
    cookie:        'cookie',
    wine:          'wine',
    'glass-water': 'glass-water',
    package:       'package',
    tag:           'tag',
    ticket:        'ticket',
    'shopping-cart':'shopping-cart',
    receipt:       'receipt',
    gift:          'gift',
    flame:         'flame',
    // Fallbacks para compatibilidade com dados existentes:
    droplet:       'glass-water',
    cake:          'cookie',
    candy:         'cookie',
    apple:         'utensils',
    fish:          'utensils',
    star:          'tag',
    heart:         'gift',
    zap:           'flame',
    default:       'package'
};

function lucideIcon(name) {
    const icon = ICON_MAP[name] || ICON_MAP.default;
    return `<i data-lucide="${icon}"></i>`;
}

function renderProducts() {
    const tabs = document.getElementById('subgroup-tabs');
    const grid = document.getElementById('product-grid');
    if (!tabs || !grid) return;

    if (!db.subgroups.length && !db.products.length) {
        grid.innerHTML = '<div class="loading-products">Nenhum produto cadastrado.</div>';
        return;
    }

    // Monta abas
    const isAllActive = activeSubgroup === null;
    const allStyle = isAllActive
        ? `background: #000000; color: #ffffff; border-color: #000000;`
        : `color: #000000; border-color: var(--border-med);`;
        
    const allTabHtml = `
        <button class="tab-btn ${isAllActive ? 'active' : ''}" style="${allStyle}"
                onclick="setSubgroup(null)">
            Todos
        </button>
    `;

    tabs.innerHTML = allTabHtml + db.subgroups.map(sg => {
        const isActive = activeSubgroup == sg.id;
        const bg = sg.buttonColor || 'var(--brand)';
        const text = sg.textColor || '#ffffff';
        const style = isActive 
            ? `background: ${bg}; color: ${text}; border-color: ${bg};` 
            : `color: ${bg}; border-color: var(--border-med);`;
            
        return `
        <button class="tab-btn ${isActive ? 'active' : ''}" style="${style}"
                onclick="setSubgroup(${sg.id})">
            ${sg.name}
        </button>
        `;
    }).join('');

    // Filtra
    let filtered = db.products;
    if (activeSubgroup) filtered = filtered.filter(p => p.subgroupId == activeSubgroup);
    if (searchQuery)    filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!filtered.length) {
        grid.innerHTML = '<div class="loading-products">Nenhum produto encontrado.</div>';
        return;
    }

    grid.innerHTML = filtered.map(p => {
        const sg = db.subgroups.find(s => s.id == p.subgroupId);
        let cardStyle = '';
        
        if (sg && sg.buttonColor) {
            cardStyle = `border-left: 4px solid ${sg.buttonColor};`;
        }
        
        return `
        <div class="product-card" onclick="addToOrder(${p.id})" id="pc-${p.id}" style="${cardStyle}">
            <div class="product-icon">${lucideIcon(p.icon)}</div>
            <div class="product-name">${p.name}</div>
            <div class="product-price">R$ ${Number(p.price).toFixed(2)}</div>
        </div>
        `;
    }).join('');

    if (typeof lucide !== 'undefined') lucide.createIcons();
}

window.setSubgroup = function(id) { activeSubgroup = id; renderProducts(); };

window.filterProducts = function(q) { searchQuery = q; renderProducts(); };

window.clearSearch = function() {
    searchQuery = '';
    document.getElementById('search-input').value = '';
    renderProducts();
};

// ════════════════════════════════════════════════════════
// DRAWER LATERAL — CARRINHO DE ITENS
// ════════════════════════════════════════════════════════

window.abrirItens = function() {
    renderDrawerCart();
    document.getElementById('itens-drawer').classList.add('open');
    document.body.style.overflow = 'hidden';
};

window.fecharItens = function() {
    document.getElementById('itens-drawer').classList.remove('open');
    document.body.style.overflow = '';
};

/** Renderiza o carrinho dentro do drawer lateral */
function renderDrawerCart() {
    const list    = document.getElementById('drawer-cart-list');
    const badge   = document.getElementById('drawer-badge');
    const payBtn  = document.getElementById('drawer-pay-btn');
    if (!list) return;

    const count = order.reduce((s, i) => s + i.qty, 0);
    if (badge)  badge.textContent = count;
    if (payBtn) payBtn.disabled   = order.length === 0;

    // Badge no botão ITENS da barra
    const btnBadge = document.querySelector('.itens-count-badge');
    if (btnBadge) {
        btnBadge.textContent   = count;
        btnBadge.style.display = count > 0 ? 'flex' : 'none';
    }

    if (!order.length) {
        list.innerHTML = `
            <div class="drawer-empty">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24"
                     fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"
                     stroke-linejoin="round" opacity=".3">
                    <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
                    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
                </svg>
                <p>Nenhum item adicionado</p>
                <small>Adicione produtos pelo grid de vendas</small>
            </div>`;
        return;
    }

    list.innerHTML = order.map((item, idx) => {
        const isNeg = Number(item.price) < 0;
        const itemClass = isNeg ? 'drawer-item drawer-item-negative' : 'drawer-item';
        const priceLabel = isNeg ? `- R$ ${Math.abs(item.price).toFixed(2)} un.` : `R$ ${item.price.toFixed(2)} un.`;
        
        return `
            <div class="${itemClass}">
                <span class="drawer-item-num">${idx + 1}.</span>
                <div class="drawer-item-info">
                    <div class="drawer-item-name">${item.name}</div>
                    <div class="drawer-item-unit">${priceLabel}</div>
                </div>
                <div class="drawer-item-qty">
                    <button class="drawer-qty-btn" onclick="drawerChangeQty(${item.uid}, -1)">−</button>
                    <span class="drawer-qty-val">${item.qty}</span>
                    <button class="drawer-qty-btn" onclick="drawerChangeQty(${item.uid}, 1)">+</button>
                </div>
                <button class="drawer-item-del" onclick="drawerRemove(${item.uid})">✕</button>
            </div>
        `;
    }).join('');
}


window.drawerChangeQty = function(uid, delta) {
    changeQty(uid, delta);   // reutiliza lógica do cart
    renderDrawerCart();
};

window.drawerRemove = function(uid) {
    removeFromOrder(uid);    // reutiliza lógica do cart
    renderDrawerCart();
};


// ════════════════════════════════════════════════════════
// CARRINHO
// ════════════════════════════════════════════════════════
window.addToOrder = function(productId) {
    const p = db.products.find(x => x.id == productId);
    if (!p) return;

    const qty = parseFloat(numpadStr) || 1;
    const existing = order.find(x => x.productId == productId);
    if (existing) { existing.qty += qty; }
    else {
        order.push({ uid: Date.now() + Math.random(), productId: p.id,
            name: p.name, price: Number(p.price), printerId: p.printerId, qty });
    }

    numpadStr = '';
    document.getElementById('numpad-value').textContent = '—';

    // Animação no card
    const card = document.getElementById('pc-' + productId);
    if (card) {
        card.style.transform = 'scale(0.93)';
        setTimeout(() => { card.style.transform = ''; }, 150);
    }

    renderCart(); saveOrderLocal();
    toast('+ ' + p.name);
};

window.removeFromOrder = function(uid) {
    order = order.filter(x => x.uid !== uid);
    renderCart(); saveOrderLocal();
};

window.changeQty = function(uid, delta) {
    const item = order.find(x => x.uid == uid);
    if (!item) return;
    item.qty = Math.max(1, item.qty + delta);
    renderCart(); saveOrderLocal();
};

window.novaVenda = function() {
    if (order.length && !confirm('Iniciar nova venda? O pedido atual será cancelado.')) return;
    order = []; payments = []; numpadStr = '';
    document.getElementById('numpad-value').textContent = '—';
    renderCart(); saveOrderLocal();
};

window.cancelarItem = function() {
    if (!order.length) return;
    const last = order[order.length - 1];
    toast('Removido: ' + last.name);
    order.pop(); renderCart(); saveOrderLocal();
};

function renderCart() {
    // Atualiza badge no botão ITENS
    const count    = order.reduce((s, i) => s + i.qty, 0);
    const btnBadge = document.querySelector('.itens-count-badge');
    if (btnBadge) {
        btnBadge.textContent   = count;
        btnBadge.style.display = count > 0 ? 'flex' : 'none';
    }

    // Sincroniza o drawer se estiver aberto
    if (document.getElementById('itens-drawer')?.classList.contains('open')) {
        renderDrawerCart();
    }

    const list = document.getElementById('cart-list');
    if (!list) return;
    // cart-list está oculto pelo CSS (display:none), mas mantemos a lógica de totais

    if (!order.length) {
        list.innerHTML = '<div class="cart-empty"><i data-lucide="shopping-cart" style="width: 36px; height: 36px; opacity: 0.3; margin-bottom: 8px;"></i><p>Carrinho vazio</p></div>';
        updateTotals(0); return;
    }

    const total = order.reduce((s, i) => s + i.price * i.qty, 0);

    list.innerHTML = order.map((item, idx) => `
        <div class="cart-item">
            <span class="cart-item-num">${idx + 1}.</span>
            <div class="cart-item-info">
                <div class="cart-item-name">${item.name}</div>
                <div class="cart-item-price">R$ ${(item.price * item.qty).toFixed(2)}</div>
            </div>
            <div class="cart-item-qty">
                <button class="cart-qty-btn" onclick="changeQty(${item.uid}, -1)">−</button>
                <span class="cart-qty-val">${item.qty}</span>
                <button class="cart-qty-btn" onclick="changeQty(${item.uid}, 1)">+</button>
            </div>
            <button class="cart-item-del" onclick="removeFromOrder(${item.uid})">✕</button>
        </div>
    `).join('');

    updateTotals(total);
}

function updateTotals(total) {
    const count = order.reduce((s, i) => s + i.qty, 0);
    document.getElementById('order-count-label').textContent = `VENDA ATUAL: ${count} Item(s)`;
    document.getElementById('order-total-label').textContent = `TOTAL: R$ ${total.toFixed(2)}`;
    document.getElementById('r-subtotal').textContent        = `R$ ${total.toFixed(2)}`;
    document.getElementById('r-total').textContent           = `R$ ${total.toFixed(2)}`;
    const btn = document.getElementById('btn-pagamento');
    if (btn) btn.disabled = order.length === 0;
}

// ════════════════════════════════════════════════════════
// NUMPAD DO PDV
// ════════════════════════════════════════════════════════
let payNumpadStr = '';

window.np = function(key) {
    if (key === 'DEL') numpadStr = numpadStr.slice(0, -1);
    else if (key === '.' && numpadStr.includes('.')) return;
    else numpadStr += key;
    document.getElementById('numpad-value').textContent = numpadStr || '—';
};

window.npPay = function(val) {
    if (val === 'del') {
        payNumpadStr = payNumpadStr.slice(0, -1);
    } else {
        if (payNumpadStr.length < 8) payNumpadStr += val;
    }
    const num = parseInt(payNumpadStr || '0');
    if (num > 0) {
        document.getElementById('pay-numpad-value').textContent = 'R$ ' + (num / 100).toFixed(2).replace('.', ',');
    } else {
        document.getElementById('pay-numpad-value').textContent = '—';
    }
};

window.setFastCash = function(value) {
    if (value === 'exact') {
        const total = order.reduce((s, i) => s + i.price * i.qty, 0);
        const paid  = payments.reduce((s, p) => s + p.amount, 0);
        const rest  = Math.max(0, total - paid);
        payNumpadStr = Math.round(rest * 100).toString();
    } else {
        payNumpadStr = (value * 100).toString();
    }
    
    const num = parseInt(payNumpadStr || '0');
    if (num > 0) {
        document.getElementById('pay-numpad-value').textContent = 'R$ ' + (num / 100).toFixed(2).replace('.', ',');
    } else {
        document.getElementById('pay-numpad-value').textContent = '—';
    }
};

// ════════════════════════════════════════════════════════
// MÓDULO DE DEVOLUÇÕES E CRÉDITO DE TROCA
// ════════════════════════════════════════════════════════
let devolucaoCart = [];
let devolucaoQuery = '';

window.abrirDevolucoes = function() {
    devolucaoCart = [];
    devolucaoQuery = '';
    const searchInput = document.getElementById('devolucao-search');
    if (searchInput) searchInput.value = '';
    
    document.getElementById('devolucao-drawer').classList.add('open');
    document.body.style.overflow = 'hidden';
    
    renderProdutosDevolucao();
    renderDevolucaoCart();
};

window.fecharDevolucoes = function() {
    document.getElementById('devolucao-drawer').classList.remove('open');
    document.body.style.overflow = '';
};

window.filtrarProdutosDevolucao = function(value) {
    devolucaoQuery = value.toLowerCase();
    renderProdutosDevolucao();
};

function renderProdutosDevolucao() {
    const grid = document.getElementById('devolucao-produtos-grid');
    if (!grid) return;
    
    const activeProducts = (db.products || []).filter(p => {
        const matchesQuery = !devolucaoQuery || p.name.toLowerCase().includes(devolucaoQuery);
        return matchesQuery && Number(p.price) > 0;
    });
    
    if (activeProducts.length === 0) {
        grid.innerHTML = '<div style="grid-column: span 2; text-align: center; font-size: 11px; padding: 10px; color: var(--text-sub);">Nenhum produto encontrado</div>';
        return;
    }
    
    grid.innerHTML = activeProducts.map(p => `
        <button class="devolucao-prod-btn" onclick="adicionarProdutoDevolucao(${p.id})">
            <span class="prod-name" title="${p.name}">${p.name}</span>
            <span class="prod-price">R$ ${Number(p.price).toFixed(2)}</span>
        </button>
    `).join('');
}

window.adicionarProdutoDevolucao = function(productId) {
    const p = db.products.find(x => x.id == productId);
    if (!p) return;
    
    const existing = devolucaoCart.find(x => x.productId == productId);
    if (existing) {
        existing.qty += 1;
    } else {
        devolucaoCart.push({
            productId: p.id,
            name: p.name,
            price: Number(p.price),
            printerId: p.printerId,
            qty: 1
        });
    }
    
    renderDevolucaoCart();
};

window.devolucaoChangeQty = function(productId, delta) {
    const item = devolucaoCart.find(x => x.productId == productId);
    if (!item) return;
    
    item.qty += delta;
    if (item.qty <= 0) {
        devolucaoCart = devolucaoCart.filter(x => x.productId != productId);
    }
    
    renderDevolucaoCart();
};

window.devolucaoRemove = function(productId) {
    devolucaoCart = devolucaoCart.filter(x => x.productId != productId);
    renderDevolucaoCart();
};

function renderDevolucaoCart() {
    const list = document.getElementById('devolucao-cart-list');
    const totalVal = document.getElementById('devolucao-total-val');
    const btnEstornar = document.getElementById('btn-estornar-dinheiro');
    const btnCredito = document.getElementById('btn-gerar-credito');
    
    if (!list) return;
    
    if (devolucaoCart.length === 0) {
        list.innerHTML = `
            <div class="drawer-empty" style="padding: 20px 10px;">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24"
                     fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"
                     stroke-linejoin="round" opacity=".3">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
                </svg>
                <p style="font-size: 13px;">Nenhuma ficha selecionada</p>
                <small style="font-size: 11px;">Selecione um produto acima para iniciar a devolução</small>
            </div>`;
        if (totalVal) totalVal.textContent = 'R$ 0,00';
        if (btnEstornar) btnEstornar.disabled = true;
        if (btnCredito) btnCredito.disabled = true;
        return;
    }
    
    const total = devolucaoCart.reduce((s, i) => s + i.price * i.qty, 0);
    if (totalVal) totalVal.textContent = `R$ ${total.toFixed(2)}`;
    if (btnEstornar) btnEstornar.disabled = false;
    if (btnCredito) btnCredito.disabled = false;
    
    list.innerHTML = devolucaoCart.map((item, idx) => `
        <div class="drawer-item drawer-item-negative" style="padding: 10px 12px;">
            <span class="drawer-item-num">${idx + 1}.</span>
            <div class="drawer-item-info">
                <div class="drawer-item-name" style="font-size:13px;">${item.name}</div>
                <div class="drawer-item-unit" style="font-size:11px;">R$ ${item.price.toFixed(2)} un.</div>
            </div>
            <div class="drawer-item-qty">
                <button class="drawer-qty-btn" onclick="devolucaoChangeQty(${item.productId}, -1)">−</button>
                <span class="drawer-qty-val" style="font-size:14px; min-width:18px;">${item.qty}</span>
                <button class="drawer-qty-btn" onclick="devolucaoChangeQty(${item.productId}, 1)">+</button>
            </div>
            <button class="drawer-item-del" onclick="devolucaoRemove(${item.productId})">✕</button>
        </div>
    `).join('');
    
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

window.executarEstornoDinheiro = async function() {
    const total = devolucaoCart.reduce((s, i) => s + i.price * i.qty, 0);
    if (total <= 0) return;
    
    if (!confirm(`Confirmar o ESTORNO EM DINHEIRO no valor de R$ ${total.toFixed(2)}?\nIsso reajustará o estoque físico e registrará uma saída (estorno) de caixa.`)) {
        return;
    }
    
    const btnEstornar = document.getElementById('btn-estornar-dinheiro');
    const oldText = btnEstornar.innerHTML;
    btnEstornar.disabled = true;
    btnEstornar.textContent = 'Processando...';
    
    const timestamp = new Date().toISOString();
    
    const transactions = [];
    devolucaoCart.forEach(item => {
        for (let q = 0; q < item.qty; q++) {
            transactions.push({
                id: Date.now() + Math.random(),
                productId: item.productId,
                productName: "[ESTORNO] " + item.name,
                price: -Number(item.price), 
                printerId: item.printerId,
                paymentMethod: "ESTORNO DINHEIRO",
                terminalId: session.terminalId,
                operator: session.operator,
                timestamp
            });
        }
    });
    
    try {
        const res = await VeloAuth.postJSON('/api/push-sales', transactions);
        const data = res.data;
        if (res.queued) {
            toast('Sem conexão — estorno será enviado automaticamente quando a rede voltar.');
        }

        if (data.success || res.queued) {
            const sessionSales = JSON.parse(localStorage.getItem('tp_session_sales') || '[]');
            transactions.forEach(tx => sessionSales.push(tx));
            localStorage.setItem('tp_session_sales', JSON.stringify(sessionSales));
            
            pendingTransactions = transactions;
            
            devolucaoCart = [];
            renderDevolucaoCart();
            fecharDevolucoes();
            
            toast('✅ Estorno concluído com sucesso!');
            mostrarTicket(transactions);
        } else {
            alert('Falha ao processar estorno no servidor: ' + (data.error || 'Erro desconhecido'));
        }
    } catch (e) {
        console.error('Erro ao estornar:', e);
        alert('Erro de conexão com o servidor ao realizar o estorno.');
    } finally {
        btnEstornar.disabled = false;
        btnEstornar.innerHTML = oldText;
    }
};

window.executarGerarCredito = function() {
    if (devolucaoCart.length === 0) return;
    
    devolucaoCart.forEach(item => {
        const uid = Date.now() + Math.random();
        order.push({
            uid,
            productId: item.productId,
            name: "[DEVOLUÇÃO] " + item.name,
            price: -Number(item.price), 
            printerId: item.printerId,
            qty: item.qty
        });
    });
    
    saveOrderLocal();
    renderCart();
    fecharDevolucoes();
    
    toast('✅ Crédito para troca inserido no carrinho!');
    abrirItens();
};

// ════════════════════════════════════════════════════════
// PAGAMENTO
// ════════════════════════════════════════════════════════
function renderPayMethods() {
    const grid = document.getElementById('pay-methods-grid');
    if (!grid || !db.paymentMethods.length) return;
    grid.innerHTML = db.paymentMethods.map(pm => {
        let iconName = 'credit-card';
        const nameUpper = pm.name.toUpperCase();
        if (nameUpper.includes('DINHEIRO')) {
            iconName = 'banknote';
        } else if (nameUpper.includes('PIX')) {
            iconName = 'qr-code';
        }
        
        return `
        <button class="pay-method-btn" onclick="selectPayMethod(${pm.id})">
            <span style="display:flex;align-items:center;gap:12px;">
                <i data-lucide="${iconName}" style="width:18px;height:18px;opacity:0.85;"></i>
                <span>${pm.name}</span>
            </span>
            <i data-lucide="chevron-right" style="width:16px;height:16px;opacity:0.4;"></i>
        </button>
        `;
    }).join('');
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

window.abrirPagamento = function() {
    if (!order.length) return;
    const total = order.reduce((s, i) => s + i.price * i.qty, 0);
    if (total < 0) {
        alert('O carrinho possui saldo negativo. Para estornar o valor total ao cliente, utilize a opção "Estornar Valor" diretamente no menu de Devoluções.');
        return;
    }
    payments = [];
    payNumpadStr = ''; // Reset do numpad de pagamento
    document.getElementById('pay-numpad-value').textContent = '—';
    renderPayMethods();
    updatePayStatus();
    document.getElementById('payment-modal').classList.remove('hidden');
};

window.fecharPagamento = function() {
    document.getElementById('payment-modal').classList.add('hidden');
};

window.selectPayMethod = function(id) {
    const pm    = db.paymentMethods.find(x => x.id == id);
    const total = order.reduce((s, i) => s + i.price * i.qty, 0);
    const paid  = payments.reduce((s, p) => s + p.amount, 0);
    const rest  = total - paid;
    if (!pm || rest <= 0) return;

    // Converte o valor digitado no teclado de pagamento
    const custom = payNumpadStr.length > 0 ? (parseInt(payNumpadStr) / 100) : 0;
    
    // Se digitou algo válido, usa. Se não, usa o restante.
    // Se o digitado for maior que o restante e não for dinheiro, talvez restrinja, 
    // mas se for dinheiro (ex: nota de 50 para conta de 20), permite para calcular troco.
    let amount = custom > 0 ? custom : rest;
    
    // Se o método não for Dinheiro (geralmente id = dinheiro/cash, mas podemos olhar pelo nome) e o custom for maior que o resto, 
    // trava no restante para não dar troco no cartão.
    if (custom > rest + 0.001 && pm.name.toLowerCase().indexOf('dinheiro') === -1 && pm.name.toLowerCase().indexOf('cash') === -1) {
        amount = rest;
    }

    payments.push({ method: pm.name, amount });
    
    // Limpa o numpad
    payNumpadStr = '';
    document.getElementById('pay-numpad-value').textContent = '—';
    
    updatePayStatus();
};

function updatePayStatus() {
    const total   = order.reduce((s, i) => s + i.price * i.qty, 0);
    const paid    = payments.reduce((s, p) => s + p.amount, 0);
    const balance = total - paid;
    const change  = paid - total;

    document.getElementById('pay-big-total').textContent   = `R$ ${total.toFixed(2)}`;
    document.getElementById('ps-total').textContent        = `R$ ${total.toFixed(2)}`;
    document.getElementById('ps-paid').textContent         = `R$ ${paid.toFixed(2)}`;
    document.getElementById('ps-balance').textContent      = `R$ ${Math.max(0, balance).toFixed(2)}`;
    document.getElementById('ps-change').textContent       = `R$ ${Math.max(0, change).toFixed(2)}`;

    const settled = balance <= 0.001;
    document.getElementById('pr-balance').classList.toggle('hidden', settled);
    document.getElementById('pr-change').classList.toggle('hidden', !settled);
    document.getElementById('btn-finalizar').classList.toggle('hidden', !settled);

    document.getElementById('pay-applied').innerHTML = payments.map((p, idx) => `
        <div class="applied-chip">
            <span>${p.method}</span>
            <div style="display: flex; align-items: center; gap: 8px;">
                <span>R$ ${p.amount.toFixed(2)}</span>
                <button class="applied-chip-del" onclick="removerPagamento(${idx})">✕</button>
            </div>
        </div>
    `).join('');
}

window.removerPagamento = function(idx) {
    payments.splice(idx, 1);
    updatePayStatus();
};

// ════════════════════════════════════════════════════════
// FINALIZAR VENDA → mostra prévia do cupom
// ════════════════════════════════════════════════════════
window.finalizarVenda = async function() {
    const btn = document.getElementById('btn-finalizar');
    btn.disabled    = true;
    btn.textContent = 'Processando...';

    const payMethodName = payments.map(p => p.method).join(' + ');
    const timestamp     = new Date().toISOString();

    // Monta transações (1 por unidade de cada item)
    const transactions = [];
    order.forEach(item => {
        for (let q = 0; q < item.qty; q++) {
            transactions.push({
                id:            Date.now() + Math.random(),
                productId:     item.productId,
                productName:   item.name,
                price:         item.price,
                printerId:     item.printerId,
                paymentMethod: payMethodName,
                terminalId:    session.terminalId,
                operator:      session.operator,
                timestamp,
            });
        }
    });

    // Salva no servidor — se falhar, entra na fila e é reenviado sozinho
    // assim que a rede voltar (a venda não fica "perdida" sem aviso).
    const pushResult = await VeloAuth.postJSON('/api/push-sales', transactions);
    if (pushResult.queued) {
        toast('⚠️ Sem conexão — venda será sincronizada automaticamente.');
    } else if (!pushResult.ok) {
        console.warn('Falha ao salvar vendas:', pushResult.data && pushResult.data.error);
    }

    pendingTransactions = transactions;

    // Acumula vendas da sessão para o relatório de fechamento
    const sessionSales = JSON.parse(localStorage.getItem('tp_session_sales') || '[]');
    transactions.forEach(tx => sessionSales.push(tx));
    localStorage.setItem('tp_session_sales', JSON.stringify(sessionSales));

    // Limpa venda
    order = []; payments = [];
    saveOrderLocal(); renderCart();
    fecharPagamento();

    btn.disabled    = false;
    btn.textContent = '✔ FINALIZAR VENDA';

    // Abre prévia do cupom
    mostrarTicket(transactions);
};

// ════════════════════════════════════════════════════════
// PRÉVIA DO CUPOM
// ════════════════════════════════════════════════════════
function mostrarTicket(transactions) {
    const paper = document.getElementById('ticket-paper');
    const now   = new Date();
    const dt    = now.toLocaleDateString('pt-BR') + ' '
                + now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    // Linha de ======
    const eq  = '='.repeat(54);
    // Linha de ------
    const dsh = '-'.repeat(54);

    const ticketConfig = db?.ticketConfig || { titleTicket: 'TICKET 1-A-1', titleFicha: 'ficha' };
    const titleFicha = ticketConfig.titleFicha || 'ficha';
    const titleTicket = ticketConfig.titleTicket || 'TICKET 1-A-1';

    paper.innerHTML = transactions.map((tx, idx) => {
        const isEstorno = Number(tx.price) < 0;
        const title = isEstorno ? "COMPROVANTE DE ESTORNO" : titleFicha;
        const borderStyle = isEstorno ? 'style="border: 2px dashed var(--danger);"' : '';
        const borderLine = isEstorno ? '*'.repeat(54) : eq;
        
        return `
            <div class="ticket-stub">
                <div class="ticket-stub-inner" ${borderStyle}>
                    <div class="ticket-border-line">${borderLine}</div>

                    <div class="ticket-stub-title" ${isEstorno ? 'style="color: var(--danger); font-size:16px; font-weight: 900;"' : ''}>${title}</div>
                    <div class="ticket-stub-unit">${titleTicket} &mdash; ${session.terminalId}</div>
                    <div class="ticket-stub-meta">#${String(idx + 1).padStart(2,'0')} &mdash; ${dt}</div>

                    <div class="ticket-sep-line">${dsh}</div>

                    <div class="ticket-stub-product" ${isEstorno ? 'style="color: var(--danger); font-weight: 800;"' : ''}>${tx.productName}</div>
                    
                    ${isEstorno ? `
                    <div class="ticket-sep-line">${dsh}</div>
                    <div class="ticket-stub-value" style="text-align: center; font-size: 16px; font-weight: 900; color: var(--danger); margin: 8px 0;">VALOR ESTORNADO: R$ ${Math.abs(tx.price).toFixed(2)}</div>
                    ` : ''}

                    <div class="ticket-border-line">${borderLine}</div>
                    <div class="ticket-stub-op">OP: ${session.operator.toUpperCase()} &nbsp;|&nbsp; ${tx.paymentMethod}</div>
                </div>
            </div>
        `;
    }).join('');

    document.getElementById('ticket-modal').classList.remove('hidden');
    if (typeof lucide !== 'undefined') lucide.createIcons();
}


window.fecharTicket = function() {
    document.getElementById('ticket-modal').classList.add('hidden');
    toast('✅ Venda concluída!');
};

/** Função utilitária para envio de impressões (Moderninha Smart 2 ou Servidor) */
async function enviarImpressao(endpoint, payload) {
    if (window.isPagSeguroTerminal || (window.flutter_inappwebview && window.flutter_inappwebview.callHandler)) {
        try {
            console.log('🖨 Disparando impressão via Moderninha Smart 2 (PlugPag)...');
            const res = await window.flutter_inappwebview.callHandler('printPagSeguro', payload);
            if (res && res.success !== false) {
                return { success: true, printerName: 'Moderninha Smart 2' };
            } else {
                return { success: false, error: res?.error || 'Erro na impressora Moderninha' };
            }
        } catch (err) {
            console.error('Erro no manipulador nativo da Moderninha:', err);
        }
    }

    const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    return await res.json();
}

window.executarImpressao = async function() {
    const btn = document.querySelector('.btn-imprimir');
    btn.innerHTML = '<i data-lucide="loader"></i> Enviando...';
    btn.disabled  = true;
    if (typeof lucide !== 'undefined') lucide.createIcons();

    // ─── PRIORIDADE: Impressora vinculada ao CAIXA/TERMINAL ───────────────────
    // A impressora do terminal tem prioridade TOTAL sobre a do produto.
    // Cada caixa imprime sempre na sua própria impressora configurada no portal.
    const terminal       = findTerminalFlex(db.terminals, session.terminalId);
    const termPrinterId  = terminal?.printerId ?? null;
    const termPrinterExists = termPrinterId && db.printers.some(p => String(p.id) === String(termPrinterId));

    // Se o caixa tem impressora vinculada e ela existe → usa SEMPRE ela
    // Caso contrário → usa a impressora do produto (fallback)
    const byPrinter = {};
    pendingTransactions.forEach(tx => {
        let effectivePid;
        if (termPrinterExists) {
            // Impressora do caixa tem prioridade máxima
            effectivePid = termPrinterId;
        } else {
            // Fallback: impressora do produto se existir, senão 'sem-impressora'
            const prodPrinterExists = db.printers.some(p => String(p.id) === String(tx.printerId));
            effectivePid = prodPrinterExists ? tx.printerId : 'sem-impressora';
        }
        if (!byPrinter[effectivePid]) byPrinter[effectivePid] = [];
        byPrinter[effectivePid].push(tx);
    });

    let ok = true;
    let printerUsed = '';

    for (const pid in byPrinter) {
        if (pid === 'sem-impressora' && !window.isPagSeguroTerminal) {
            ok = false;
            console.warn('Sem impressora configurada para o caixa ou produto.');
            continue;
        }
        for (const tx of byPrinter[pid]) {
            try {
                const json = await enviarImpressao('/api/print', {
                    printerId:    pid,
                    terminalId:   session.terminalId,
                    operator:     session.operator,
                    transactions: [tx],
                });
                if (json.success) {
                    printerUsed = json.printerName || '';
                } else {
                    ok = false;
                    console.warn('Erro ao imprimir:', json.error);
                }
            } catch (e) {
                ok = false;
                console.warn('Impressão falhou:', tx.productName, e.message);
            }
        }
    }

    btn.innerHTML = '<i data-lucide="printer"></i> Imprimir Tickets';
    btn.disabled  = false;
    if (typeof lucide !== 'undefined') lucide.createIcons();

    fecharTicket();

    if (ok) {
        // ─── Salva no histórico de reimpressão ───
        registrarImpressao(pendingTransactions);

        const termName = terminal?.name || session.terminalId;
        toast(printerUsed
            ? `🖨 [${termName}] Impresso em: ${printerUsed}`
            : '🖨 Tickets enviados para impressão!');
    } else {
        const termName = terminal?.name || session.terminalId;
        toast(`⚠️ Falha ao imprimir em [${termName}]. Verifique a impressora no portal.`);
    }
};



// ════════════════════════════════════════════════════════
// TOAST
// ════════════════════════════════════════════════════════
let toastTimer = null;
function toast(msg, dur = 2800) {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.add('hidden'), dur);
}

// ════════════════════════════════════════════════════════
// HISTÓRICO DE IMPRESSÃO (Reimpressão)
// Guarda os últimos 50 tickets no localStorage
// ════════════════════════════════════════════════════════
const REIMP_MAX = 50;
const REIMP_KEY = 'tp_print_history';

/** Lê o histórico do localStorage */
function lerHistoricoImpressao() {
    try { return JSON.parse(localStorage.getItem(REIMP_KEY) || '[]'); }
    catch { return []; }
}

/** Salva o histórico no localStorage */
function salvarHistoricoImpressao(hist) {
    localStorage.setItem(REIMP_KEY, JSON.stringify(hist.slice(0, REIMP_MAX)));
}

/**
 * Registra transações no histórico após uma impressão bem-sucedida.
 * Chamada internamente por executarImpressao().
 */
function registrarImpressao(transactions) {
    const hist = lerHistoricoImpressao();
    const now  = new Date().toISOString();
    transactions.forEach(tx => {
        hist.unshift({
            id:            tx.id || `${Date.now()}-${Math.random().toString(36).slice(2,7)}`,
            productName:   tx.productName,
            paymentMethod: tx.paymentMethod,
            operator:      tx.operator,
            terminalId:    tx.terminalId,
            timestamp:     tx.timestamp || now,
        });
    });
    salvarHistoricoImpressao(hist);
}

// ── Drawer de Reimpressão ─────────────────────────────
let reimp_filterStr = '';

window.abrirReimpressao = function() {
    reimp_filterStr = '';
    const inp = document.getElementById('reimp-search');
    if (inp) inp.value = '';
    renderReimpressao(lerHistoricoImpressao());
    document.getElementById('reimp-drawer').classList.add('open');
    document.body.style.overflow = 'hidden';
};

window.fecharReimpressao = function() {
    document.getElementById('reimp-drawer').classList.remove('open');
    document.body.style.overflow = '';
};

window.filtrarReimpressao = function(q) {
    reimp_filterStr = q.toLowerCase();
    let hist = lerHistoricoImpressao();
    if (reimp_filterStr) {
        hist = hist.filter(h =>
            h.productName.toLowerCase().includes(reimp_filterStr) ||
            (h.operator || '').toLowerCase().includes(reimp_filterStr) ||
            (h.paymentMethod || '').toLowerCase().includes(reimp_filterStr)
        );
    }
    renderReimpressao(hist);
};

window.limparHistoricoImpressao = function() {
    if (!confirm('Limpar todo o histórico de vendas/impressões?')) return;
    salvarHistoricoImpressao([]);
    renderReimpressao([]);
    if (typeof filtrarCancelamento === 'function') {
        filtrarCancelamento('');
    }
};

/** Renderiza a lista de histórico no drawer */
function renderReimpressao(hist) {
    const list  = document.getElementById('reimp-list');
    const count = document.getElementById('reimp-count');
    const total = lerHistoricoImpressao().length;
    if (count) count.textContent = `${total} registro${total !== 1 ? 's' : ''}`;
    if (!list)  return;

    if (!hist.length) {
        list.innerHTML = `
            <div class="drawer-empty">
                <svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 24 24"
                     fill="none" stroke="currentColor" stroke-width="1.3"
                     stroke-linecap="round" stroke-linejoin="round" opacity=".3">
                    <polyline points="1 4 1 10 7 10"/>
                    <path d="M3.51 15a9 9 0 1 0 .49-3.57"/>
                </svg>
                <p>${reimp_filterStr ? 'Nenhum resultado encontrado' : 'Nenhum ticket impresso ainda'}</p>
                <small>${reimp_filterStr ? 'Tente outro termo de busca' : 'Os tickets impressos aparecerão aqui'}</small>
            </div>`;
        return;
    }

    list.innerHTML = hist.map((h, idx) => {
        const dt  = new Date(h.timestamp).toLocaleString('pt-BR', {
            day: '2-digit', month: '2-digit', year: '2-digit',
            hour: '2-digit', minute: '2-digit',
        });
        return `
        <div class="reimp-item">
            <span class="reimp-item-num">${idx + 1}</span>
            <div class="reimp-item-info">
                <div class="reimp-item-name">${h.productName}</div>
                <div class="reimp-item-meta">
                    <span>${dt}</span>
                    ${h.paymentMethod ? `<span>${h.paymentMethod}</span>` : ''}
                    ${h.operator      ? `<span>${h.operator}</span>`      : ''}
                </div>
            </div>
            <button class="btn-reimp" onclick="reimprimirItem('${h.id}')">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                     stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="1 4 1 10 7 10"/>
                    <path d="M3.51 15a9 9 0 1 0 .49-3.57"/>
                </svg>
                Reimprimir
            </button>
        </div>`;
    }).join('');
}

/** Reenvia um ticket específico do histórico para a impressora */
window.reimprimirItem = async function(id) {
    const hist = lerHistoricoImpressao();
    const h    = hist.find(x => x.id === id);
    if (!h) { toast('⚠️ Registro não encontrado.'); return; }

    toast('🖨 Reenviando para impressora...');

    try {
        const json = await enviarImpressao('/api/print', {
            terminalId:   h.terminalId || session.terminalId,
            operator:     h.operator   || session.operator,
            transactions: [{
                productName:   h.productName,
                paymentMethod: h.paymentMethod,
                terminalId:    h.terminalId || session.terminalId,
                timestamp:     h.timestamp,
            }],
        });
        if (json.success) {
            toast(`✅ Reimpresso em: ${json.printerName || 'impressora'}`);
        } else {
            toast(`❌ Falha: ${json.error || 'erro desconhecido'}`);
        }
    } catch (e) {
        toast('❌ Erro ao conectar com o servidor.');
    }
};

// ════════════════════════════════════════════════════════
// CANCELAMENTO — Últimas 50 vendas
// ════════════════════════════════════════════════════════
let cancel_filterStr = '';

window.abrirCancelamento = function() {
    cancel_filterStr = '';
    const input = document.getElementById('cancel-search');
    if (input) input.value = '';
    filtrarCancelamento('');
    document.getElementById('cancel-drawer').classList.add('open');
    document.body.style.overflow = 'hidden';
};

window.fecharCancelamento = function() {
    document.getElementById('cancel-drawer').classList.remove('open');
    document.body.style.overflow = '';
};

window.filtrarCancelamento = function(term) {
    cancel_filterStr = term.trim().toLowerCase();
    let hist = lerHistoricoImpressao();
    if (cancel_filterStr) {
        hist = hist.filter(h => 
            (h.productName || '').toLowerCase().includes(cancel_filterStr) ||
            (h.operator || '').toLowerCase().includes(cancel_filterStr) ||
            (h.paymentMethod || '').toLowerCase().includes(cancel_filterStr)
        );
    }
    renderCancelamento(hist);
};

function renderCancelamento(hist) {
    const list  = document.getElementById('cancel-list');
    const count = document.getElementById('cancel-count');
    const total = lerHistoricoImpressao().length;
    if (count) count.textContent = `${total} registro${total !== 1 ? 's' : ''}`;
    if (!list) return;

    if (!hist.length) {
        list.innerHTML = `
            <div class="drawer-empty">
                <i data-lucide="inbox" style="width: 44px; height: 44px; opacity: 0.3;"></i>
                <p>${cancel_filterStr ? 'Nenhum resultado encontrado' : 'Nenhuma venda registrada'}</p>
                <small>${cancel_filterStr ? 'Tente outro termo de busca' : 'As últimas vendas aparecerão aqui'}</small>
            </div>`;
        lucide.createIcons();
        return;
    }

    list.innerHTML = hist.map((h, idx) => {
        const dt  = new Date(h.timestamp).toLocaleString('pt-BR', {
            day: '2-digit', month: '2-digit', year: '2-digit',
            hour: '2-digit', minute: '2-digit',
        });
        return `
        <div class="reimp-item">
            <span class="reimp-item-num">${idx + 1}</span>
            <div class="reimp-item-info">
                <div class="reimp-item-name">${h.productName}</div>
                <div class="reimp-item-meta">
                    <span>${dt}</span>
                    ${h.paymentMethod ? `<span>${h.paymentMethod}</span>` : ''}
                    ${h.operator      ? `<span>${h.operator}</span>`      : ''}
                </div>
            </div>
            <button class="btn-reimp" style="background: rgba(239,68,68,0.1); color: #ef4444;" onclick="cancelarVenda('${h.id}')">
                <i data-lucide="trash-2" style="width: 16px;"></i>
                Cancelar
            </button>
        </div>`;
    }).join('');
    lucide.createIcons();
}

window.cancelarVenda = async function(id) {
    if (!confirm('Deseja realmente cancelar esta venda? Esta ação não pode ser desfeita.')) return;

    // Cancelamento exige autorização de um supervisor/admin — não é mais
    // liberado para qualquer operador só com essa confirmação.
    let supervisorToken;
    try {
        supervisorToken = await VeloAuth.elevate('supervisor');
    } catch (e) {
        return; // autorização cancelada pelo usuário
    }

    try {
        toast('⏳ Cancelando venda...');
        const res = await fetch('/api/cancel-sale', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + supervisorToken },
            body: JSON.stringify({ id })
        });
        
        const json = await res.json();
        
        if (json.success) {
            // Remove do histórico local (localStorage das últimas impressões)
            let hist = lerHistoricoImpressao();
            hist = hist.filter(h => String(h.id) !== String(id));
            salvarHistoricoImpressao(hist);
            
            // Remove da sessão (que é usada no Fechamento de Caixa)
            let sessionSales = JSON.parse(localStorage.getItem('tp_session_sales') || '[]');
            sessionSales = sessionSales.filter(tx => String(tx.id) !== String(id));
            localStorage.setItem('tp_session_sales', JSON.stringify(sessionSales));
            
            // Recarrega os dados do estoque e re-renderiza os produtos na tela
            try {
                await syncData();
                renderProducts();
            } catch (e) {
                console.warn('Erro ao sincronizar estoque pós-cancelamento:', e);
            }
            
            toast('✅ Venda cancelada com sucesso!');
            filtrarCancelamento(cancel_filterStr); // Atualiza lista
        } else {
            toast('❌ Erro: ' + (json.error || 'Falha ao cancelar venda.'));
        }
    } catch(e) {
        toast('❌ Erro ao conectar com o servidor.');
    }
};

// ════════════════════════════════════════════════════════
// DRAWER SLIM DE MENU (⋮) — Sangria / Fechamento / Sair
// ════════════════════════════════════════════════════════
window.abrirMenuOpcoes = function() {
    // Atualiza labels com dados da sessão
    const termEl = document.getElementById('menu-terminal-label');
    const opEl   = document.getElementById('menu-operator-label');
    if (termEl) termEl.textContent = session.terminalId || 'CAIXA';
    if (opEl)   opEl.textContent   = session.operator   || '—';

    document.getElementById('menu-drawer').classList.add('open');
    document.body.style.overflow = 'hidden';
};

window.fecharMenuOpcoes = function() {
    document.getElementById('menu-drawer').classList.remove('open');
    document.body.style.overflow = '';
};

// ════════════════════════════════════════════════════════
// SANGRIA — Modal com numpad + comprovante
// ════════════════════════════════════════════════════════
let sangriaStr = '';
let sangriaAtual = null;   // objeto da sangria registrada

window.abrirSangria = function() {
    sangriaStr = '';
    sangriaAtual = null;
    document.getElementById('sangria-value').textContent = 'R$ 0,00';
    document.getElementById('sangria-motivo').value = '';
    document.getElementById('sangria-form').classList.remove('hidden');
    document.getElementById('sangria-preview').classList.add('hidden');
    document.getElementById('sangria-modal').classList.remove('hidden');
};

window.fecharSangria = function() {
    document.getElementById('sangria-modal').classList.add('hidden');
};

window.sangriaNumpad = function(key) {
    if (key === 'DEL') {
        sangriaStr = sangriaStr.slice(0, -1);
    } else if (key === '00') {
        sangriaStr += '00';
    } else {
        sangriaStr += key;
    }
    const cents = parseInt(sangriaStr || '0', 10);
    const value = cents / 100;
    document.getElementById('sangria-value').textContent =
        'R$ ' + value.toFixed(2).replace('.', ',');
};

window.confirmarSangria = function() {
    const cents = parseInt(sangriaStr || '0', 10);
    const valor = cents / 100;
    if (valor <= 0) { toast('⚠️ Informe um valor para a sangria.'); return; }

    const motivo = document.getElementById('sangria-motivo').value.trim()
                   || 'Sangria de caixa';

    sangriaAtual = {
        id:        Date.now(),
        valor,
        motivo,
        operador:  session.operator,
        terminal:  session.terminalId,
        timestamp: new Date().toISOString(),
    };

    // Persiste no histórico de sangrias
    const sangrias = JSON.parse(localStorage.getItem('tp_sangrias') || '[]');
    sangrias.push(sangriaAtual);
    localStorage.setItem('tp_sangrias', JSON.stringify(sangrias));

    // Monta pré-visualização do comprovante
    const dt  = new Date(sangriaAtual.timestamp).toLocaleString('pt-BR');
    const eq  = '═'.repeat(32);
    const dsh = '─'.repeat(32);

    document.getElementById('sangria-paper').innerHTML = `
        <div class="ticket-stub">
            <div class="ticket-stub-inner" style="font-family:monospace;font-size:13px;line-height:1.7;white-space:pre;">
<span style="font-weight:900;font-size:15px;">${eq}</span>
<span style="font-weight:900;font-size:17px;display:block;text-align:center;">SANGRIA DE CAIXA</span>
<span>${dsh}</span>
Terminal : ${sangriaAtual.terminal}
Operador : ${sangriaAtual.operador.toUpperCase()}
Data/Hora: ${dt}
<span>${dsh}</span>
<span style="font-weight:900;">Motivo:</span>
${motivo}
<span>${dsh}</span>
<span style="font-size:20px;font-weight:900;color:var(--danger);">Valor: R$ ${valor.toFixed(2).replace('.', ',')}</span>
<span style="font-weight:900;font-size:15px;">${eq}</span>
            </div>
        </div>`;

    document.getElementById('sangria-form').classList.add('hidden');
    document.getElementById('sangria-preview').classList.remove('hidden');
};

/** Imprime o comprovante de sangria via /api/print */
window.imprimirSangria = async function() {
    if (!sangriaAtual) return;
    const btn = document.querySelector('#sangria-preview .btn-imprimir');
    btn.disabled = true;
    btn.textContent = 'Enviando...';

    try {
        const json = await enviarImpressao('/api/print-sangria', sangriaAtual);
        if (json.success) {
            toast(`🖨 Comprovante impresso em: ${json.printerName || 'impressora'}`);
            fecharSangria();
        } else {
            toast(`❌ Falha: ${json.error || 'erro desconhecido'}`);
        }
    } catch (e) {
        toast('❌ Erro ao conectar com o servidor.');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg> Imprimir Comprovante';
    }
};

// ════════════════════════════════════════════════════════
// FECHAMENTO DE CAIXA — Modal com relatório e impressão
// ════════════════════════════════════════════════════════
let fechamentoData = null;

window.fecharCaixa = function() {
    // Compila os dados do turno
    const sales      = JSON.parse(localStorage.getItem('tp_session_sales') || '[]');
    const sangrias   = JSON.parse(localStorage.getItem('tp_sangrias')      || '[]');
    const suprimento = parseFloat(localStorage.getItem('tp_suprimento_valor') || '0');
    const dtAbertura = localStorage.getItem('tp_abertura_dt') || '—';
    const dtFecha    = new Date().toLocaleString('pt-BR');

    // Agrupa vendas por forma de pagamento
    const byMethod = {};
    sales.forEach(tx => {
        const m = tx.paymentMethod || 'N/D';
        if (!byMethod[m]) byMethod[m] = { total: 0, qty: 0 };
        byMethod[m].total += tx.price;
        byMethod[m].qty   += 1;
    });

    const totalVendas   = sales.reduce((s, tx) => s + tx.price, 0);
    const totalSangrias = sangrias.reduce((s, x) => s + (x.valor || 0), 0);
    const totalLiquido  = suprimento + totalVendas - totalSangrias;

    fechamentoData = {
        terminal:    session.terminalId,
        operador:    session.operator,
        dtAbertura,
        dtFechamento: dtFecha,
        suprimento,
        totalVendas,
        totalSangrias,
        totalLiquido,
        byMethod,
        sangrias,
        qtdTransacoes: sales.length,
    };

    // Renderiza preview do relatório
    const eq  = '═'.repeat(32);
    const dsh = '─'.repeat(32);

    const metodosHtml = Object.entries(byMethod).map(([m, v]) => {
        const label = m.padEnd(16, ' ');
        const val   = ('R$ ' + v.total.toFixed(2).replace('.', ',')).padStart(10, ' ');
        return `<span>${label}${val} (${v.qty}x)</span>`;
    }).join('\n');

    const sangriasHtml = sangrias.length
        ? sangrias.map(s =>
            `<span>${s.motivo.substring(0,16).padEnd(16)} R$ ${s.valor.toFixed(2).replace('.',',')}</span>`
          ).join('\n')
        : '<span>Nenhuma sangria registrada</span>';

    document.getElementById('fechamento-paper').innerHTML = `
        <div class="ticket-stub">
            <div class="ticket-stub-inner" style="font-family:monospace;font-size:12px;line-height:1.8;white-space:pre;">
<span style="font-weight:900;font-size:14px;">${eq}</span>
<span style="font-weight:900;font-size:15px;display:block;text-align:center;"> FECHAMENTO DE CAIXA </span>
<span style="font-weight:900;font-size:14px;">${eq}</span>
Terminal  : ${fechamentoData.terminal}
Operador  : ${fechamentoData.operador.toUpperCase()}
Abertura  : ${dtAbertura}
Fechamento: ${dtFecha}
<span>${dsh}</span>
<span style="font-weight:900;">SUPRIMENTO INICIAL</span>
<span style="font-size:15px;font-weight:900;">R$ ${suprimento.toFixed(2).replace('.',',')}</span>
<span>${dsh}</span>
<span style="font-weight:900;">VENDAS POR PAGAMENTO (${sales.length} transações)</span>
${metodosHtml || '<span>Nenhuma venda registrada</span>'}
<span>${dsh}</span>
<span style="font-weight:900;">Total Bruto:</span>
<span style="font-size:15px;font-weight:900;">R$ ${totalVendas.toFixed(2).replace('.',',')}</span>
<span>${dsh}</span>
<span style="font-weight:900;">SANGRIAS</span>
${sangriasHtml}
<span>Total Sangrias: R$ ${totalSangrias.toFixed(2).replace('.',',')}</span>
<span>${dsh}</span>
<span style="font-weight:900;font-size:15px;">TOTAL LÍQUIDO EM CAIXA</span>
<span style="font-weight:900;font-size:18px;"> R$ ${totalLiquido.toFixed(2).replace('.',',')} </span>
<span style="font-weight:900;font-size:14px;">${eq}</span>
            </div>
        </div>`;

    document.getElementById('fechamento-modal').classList.remove('hidden');
};

window.fecharFechamentoModal = function() {
    document.getElementById('fechamento-modal').classList.add('hidden');
};

window.confirmarFechamentoCaixa = async function(imprimir = true) {
    const btn = document.querySelector('#fechamento-modal .btn-imprimir');
    
    if (imprimir) {
        if (btn) { btn.disabled = true; btn.textContent = 'Imprimindo...'; }
        // Tenta imprimir antes de encerrar
        try {
            const json = await enviarImpressao('/api/print-fechamento', fechamentoData);
            if (json.success) toast(`🖨 Relatório impresso em: ${json.printerName}`);
            else              toast(`⚠️ Impressão falhou: ${json.error}`);
        } catch (e) {
            toast('⚠️ Impressora não disponível — encerrando mesmo assim.');
        }
    }

    // Encerra o caixa de fato
    localStorage.removeItem('tp_caixa_aberto');
    localStorage.removeItem('tp_suprimento_valor');
    localStorage.removeItem('tp_session_sales');
    localStorage.removeItem('tp_sangrias');
    localStorage.removeItem('tp_abertura_dt');

    order = []; payments = [];
    saveOrderLocal();
    session = { loggedIn: false, operator: '', terminalId: '', suprimento: 0 };
    localStorage.removeItem('tp_session');
    localStorage.removeItem('tp_order');

    document.getElementById('fechamento-modal').classList.add('hidden');
    toast('🏁 Caixa encerrado com sucesso!');
    setTimeout(() => showLogin(), 1800);
};

if (typeof lucide !== 'undefined') {
    lucide.createIcons();
}
