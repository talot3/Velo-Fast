// Core Engine - TicketPro
let state = {
    products: [],
    groups: [],
    subgroups: [],
    printers: [],
    paymentMethods: [],
    terminals: [],
    users: [],
    sales: [],
    cash: { isOpen: false, sales: [] },
    ticketConfig: null,
    versions: [],
    currentVersion: '1.0.0'
};

// Date Utility
function getLocalDateString(d = new Date()) {
    const date = typeof d === 'string' || typeof d === 'number' ? new Date(d) : d;
    const yr = date.getFullYear();
    const mo = String(date.getMonth() + 1).padStart(2, '0');
    const da = String(date.getDate()).padStart(2, '0');
    return `${yr}-${mo}-${da}`;
}

// Initial Sync from Server
async function syncFromServer() {
    const isFileProtocol = window.location.protocol === 'file:';
    const baseUrl = isFileProtocol ? 'http://localhost:8080' : '';

    // Fallback data from LocalStorage
    const localData = {
        products: JSON.parse(localStorage.getItem('tp_products')) || [],
        groups: JSON.parse(localStorage.getItem('tp_groups')) || [],
        subgroups: JSON.parse(localStorage.getItem('tp_subgroups')) || [],
        printers: JSON.parse(localStorage.getItem('tp_printers')) || [],
        paymentMethods: JSON.parse(localStorage.getItem('tp_payment_methods')) || [],
        terminals: JSON.parse(localStorage.getItem('tp_terminals')) || [],
        users: JSON.parse(localStorage.getItem('tp_users')) || [],
        sales: JSON.parse(localStorage.getItem('tp_sales')) || [],
        cash: JSON.parse(localStorage.getItem('tp_cash')) || { isOpen: false, sales: [] },
        ticketConfig: JSON.parse(localStorage.getItem('tp_ticketConfig')) || null,
        versions: JSON.parse(localStorage.getItem('tp_versions')) || [],
        currentVersion: localStorage.getItem('tp_currentVersion') || '1.0.0',
        dreStructure: JSON.parse(localStorage.getItem('tp_dre_structure')) || []
    };

    try {
        const res = await fetch(`${baseUrl}/api/data`, { headers: VeloAuth.authHeaders() });
        if (res.ok) {
            const data = await res.json();
            state = { ...state, ...data };
            saveLocalBackup(); // Update local backup with server data
        } else {
            state = localData;
        }
    } catch (e) {
        console.warn('Servidor offline ou protocolo file://, usando dados locais');
        state = localData;
    }
    initApp();
    renderPage('home');

    if (isFileProtocol) {
        setTimeout(() => {
            alert('AVISO: Você abriu o sistema pelo arquivo direto. Para garantir que nada se apague e as impressoras funcionem, use o link: http://localhost:8080');
        }, 1000);
    }
}

// Network Helper
async function pushToServer(partialData) {
    const isFileProtocol = window.location.protocol === 'file:';
    const baseUrl = isFileProtocol ? 'http://localhost:8080' : '';

    // Always save to local backup first to prevent loss
    saveLocalBackup();

    try {
        const result = await VeloAuth.postJSON(`${baseUrl}/api/save`, partialData);
        if (result.queued) {
            console.warn('Sem conexão — alteração será reenviada automaticamente.');
        } else if (!result.ok) {
            console.error('Servidor recusou a alteração:', result.data && result.data.error);
        }
    } catch (e) {
        console.error('Erro ao salvar no servidor:', e);
    }
}

function saveLocalBackup() {
    localStorage.setItem('tp_products', JSON.stringify(state.products));
    localStorage.setItem('tp_groups', JSON.stringify(state.groups));
    localStorage.setItem('tp_subgroups', JSON.stringify(state.subgroups));
    localStorage.setItem('tp_printers', JSON.stringify(state.printers));
    localStorage.setItem('tp_payment_methods', JSON.stringify(state.paymentMethods));
    localStorage.setItem('tp_terminals', JSON.stringify(state.terminals));
    localStorage.setItem('tp_users', JSON.stringify(state.users));
    localStorage.setItem('tp_sales', JSON.stringify(state.sales));
    localStorage.setItem('tp_cash', JSON.stringify(state.cash));
    localStorage.setItem('tp_ticketConfig', JSON.stringify(state.ticketConfig));
    localStorage.setItem('tp_versions', JSON.stringify(state.versions));
    localStorage.setItem('tp_currentVersion', state.currentVersion);
    localStorage.setItem('tp_dre_structure', JSON.stringify(state.dreStructure || []));
}
// Lifecycle
document.addEventListener('DOMContentLoaded', () => {
    VeloAuth.requireLogin('supervisor', () => { syncFromServer(); });
});

function initApp() {
    applyTheme();
    setupNavigation();
    
    // Garantir baseline de versão se não existir
    if (!state.versions || state.versions.length === 0) {
        state.versions = [
            { id: 1, version: "1.0.0", date: new Date().toISOString(), description: "Versão inicial de lançamento do sistema VELO com controle de vendas e impressão de cupom." }
        ];
        state.currentVersion = "1.0.0";
    }
    updateVersionLabels();
    
    // Carrega informações das lojas GELIC para exibir no cabeçalho e seletor multiloja
    loadPortalStoresInfo();
    
    lucide.createIcons();
}

function updateVersionLabels() {
    const ver = state.currentVersion || '1.0.0';
    const sidebarLabel = document.getElementById('sidebar-version-label');
    if (sidebarLabel) {
        sidebarLabel.textContent = ver;
    }
}

// ─── Modern Theme Picker Logic ───
window.toggleThemeMenu = function (event) {
    event.stopPropagation();
    const menu = document.getElementById('theme-dropdown-menu');
    const isShowing = menu.style.display === 'flex';
    menu.style.display = isShowing ? 'none' : 'flex';
};

// Close theme dropdown when clicking outside
document.addEventListener('click', () => {
    const menu = document.getElementById('theme-dropdown-menu');
    if (menu) menu.style.display = 'none';
});

window.setThemeMode = function (mode) {
    localStorage.setItem('tp_theme_mode', mode);
    applyTheme();
};

window.toggleThemeDirect = function () {
    const currentMode = localStorage.getItem('tp_theme_mode') || 'system';
    let newMode = 'dark';
    if (currentMode === 'dark') {
        newMode = 'light';
    } else if (currentMode === 'light') {
        newMode = 'dark';
    } else {
        const isSystemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        newMode = isSystemDark ? 'light' : 'dark';
    }
    localStorage.setItem('tp_theme_mode', newMode);
    applyTheme();
};

window.triggerManualSync = async function () {
    const btn = document.getElementById('btn-sync-server');
    if (btn) {
        btn.classList.add('spinning');
        btn.disabled = true;
    }
    try {
        await syncFromServer();
    } catch (e) {
        console.error('Erro ao sincronizar manualmente:', e);
    } finally {
        setTimeout(() => {
            if (btn) {
                btn.classList.remove('spinning');
                btn.disabled = false;
            }
        }, 800);
    }
};

function applyTheme() {
    const mode = localStorage.getItem('tp_theme_mode') || 'system';
    let isDark = false;

    if (mode === 'dark') {
        isDark = true;
    } else if (mode === 'system') {
        isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    }

    document.body.classList.toggle('dark-mode', isDark);

    // Atualiza o ícone do botão diretamente (sol se estiver escuro para ir pro claro, lua se estiver claro)
    const activeIcon = document.getElementById('theme-active-icon');
    if (activeIcon) {
        activeIcon.setAttribute('data-lucide', isDark ? 'sun' : 'moon');
        if (window.lucide) lucide.createIcons();
    }
}

// Listen for system theme preferences changes
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if ((localStorage.getItem('tp_theme_mode') || 'system') === 'system') {
        applyTheme();
    }
});

function setupNavigation() {
    // Attach click handlers to ALL nav items that have a data-page attribute
    document.querySelectorAll('.nav-item[data-page]').forEach(item => {
        item.addEventListener('click', () => {
            const page = item.getAttribute('data-page');
            setActivePage(page, item);
            renderPage(page);
        });
    });
}

function setActivePage(page, clickedItem) {
    // Remove active from all nav items (including subs)
    document.querySelectorAll('.nav-item[data-page]').forEach(i => i.classList.remove('active'));
    // Mark clicked item as active
    if (clickedItem) clickedItem.classList.add('active');

    // If the active item is inside an accordion, keep the accordion open
    document.querySelectorAll('.accordion-content').forEach(content => {
        const hasActiveChild = content.querySelector('.nav-item.active');
        const btn = content.previousElementSibling;
        if (hasActiveChild) {
            content.classList.add('open');
            if (btn) btn.classList.add('open');
        }
    });
}

function toggleAccordion(btn, contentId) {
    btn.classList.toggle('open');
    document.getElementById(contentId).classList.toggle('open');
}

window.toggleSidebar = function () {
    document.getElementById('app-sidebar').classList.toggle('collapsed');
}

window.toggleSidebarMobile = function () {
    document.getElementById('app-sidebar').classList.toggle('open');
}

function renderPage(page) {
    const stage = document.getElementById('content-area');
    const title = document.getElementById('page-title');

    // Smooth fade out
    stage.style.opacity = '0';

    setTimeout(() => {
        title.innerText = getPageTitle(page);
        switch (page) {
            case 'home': renderHome(stage); break;
            case 'dashboard': renderDashboard(stage); break;
            case 'users': renderUsers(stage); break;
            case 'products': renderCatalogue(stage); break;
            case 'groups': renderGroups(stage); break;
            case 'subgroups': renderSubgroups(stage); break;
            case 'paymentMethods': renderPaymentMethods(stage); break;
            case 'printers': renderPrinters(stage); break;
            case 'terminals': renderTerminals(stage); break;
            case 'inventory': renderInventory(stage); break;
            case 'reportSalesByProduct': renderReportSalesByProduct(stage); break;
            case 'reportDrePersonalizada': renderReportDrePersonalizada(stage); break;
            case 'reportFluxoCaixa': renderReportFluxoCaixa(stage); break;
            case 'reportPontoEquilibrio': renderReportPontoEquilibrio(stage); break;
            case 'reportDreGerencial': renderReportDreGerencial(stage); break;
            case 'reportBalancoPatrimonial': renderReportBalancoPatrimonial(stage); break;
            case 'reportSalesByTerminal': renderReportSalesByTerminal(stage); break;
            case 'reportFechamento': renderReportFechamento(stage); break;
            case 'reportSangrias': renderReportSangrias(stage); break;
            case 'reportSalesByPeriod': renderReportSalesByPeriod(stage); break;
            case 'backup': renderBackup(stage); break;
            case 'ticketConfig': renderTicketConfig(stage); break;
            case 'version-control': renderVersionControl(stage); break;
            case 'planoConta': renderPlanoConta(stage); break;
            case 'centroCusto': renderCentroCusto(stage); break;
            case 'contaFinanceira': renderContaFinanceira(stage); break;
            case 'conciliacaoCaixa': renderConciliacaoCaixa(stage); break;
            case 'receitas': renderReceitas(stage); break;
            case 'despesas': renderDespesas(stage); break;
            case 'cargos': renderCargos(stage); break;
            case 'swot':   renderSwot(stage); break;
            case 'actionPlan': renderActionPlan(stage); break;
            case 'compliance': renderCompliance(stage); break;
            case 'skills': renderSkills(stage); break;
        }
        lucide.createIcons();
        stage.style.opacity = '1';
    }, 150);
}

// ─── Home ──────────────────────────────────────────────────────────────────────
// Analytical Dashboard
function renderHome(container) {
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';

    const shortcuts = [
        { page: 'dashboard',            icon: 'pie-chart',   label: 'Dashboard',  desc: 'Painel analítico de vendas'      },
        { page: 'users',                icon: 'users',       label: 'Cadastros',  desc: 'Operadores e usuários'           },
        { page: 'products',             icon: 'layers',      label: 'Catálogo',   desc: 'Produtos, grupos e subgrupos'    },
        { page: 'paymentMethods',       icon: 'dollar-sign', label: 'Financeiro', desc: 'Formas de pagamento'             },
        { page: 'inventory',            icon: 'box',         label: 'Estoque',    desc: 'Inventário e controle'           },
        { page: 'reportSalesByProduct', icon: 'bar-chart-2', label: 'Relatórios', desc: 'Vendas, fechamentos e sangrias'  },
        { page: 'terminals',            icon: 'settings',    label: 'Ajustes',    desc: 'Terminais, impressoras e ticket' },
    ];

    container.innerHTML = `
        <div class="home-greeting">
            <div>
                <p class="home-greeting-text">${greeting}, <strong>Gestor</strong></p>
                <p class="home-greeting-sub">Selecione um módulo para começar</p>
            </div>
        </div>
        <div class="home-shortcuts-grid home-shortcuts-main">
            ${shortcuts.map(s => `
                <button class="home-shortcut-card home-shortcut-card--main" onclick="goToPage('${s.page}')">
                    <div class="home-shortcut-icon">
                        <i data-lucide="${s.icon}" style="width:18px;height:18px;"></i>
                    </div>
                    <div class="home-shortcut-info">
                        <span class="home-shortcut-label">${s.label}</span>
                        <span class="home-shortcut-desc">${s.desc}</span>
                    </div>
                    <i data-lucide="chevron-right" style="width:13px;height:13px;color:var(--text-sub);opacity:.3;flex-shrink:0;"></i>
                </button>
            `).join('')}
        </div>
    `;
}



window.goToPage = function(page) {
    const navItem = document.querySelector(`.nav-item[data-page="${page}"]`);
    setActivePage(page, navItem);
    renderPage(page);
};


function renderDashboard(container) {
    const sales = state.sales || [];

    // Separa vendas válidas de cancelamentos/estornos
    const validSales = sales.filter(s => s.price >= 0);
    const cancelledSales = sales.filter(s => s.price < 0);

    const totalSalesBruto       = validSales.reduce((acc, s) => acc + s.price, 0);
    const totalCancelledSales   = cancelledSales.reduce((acc, s) => acc + Math.abs(s.price), 0);
    const totalSalesLiquido     = Math.max(0, totalSalesBruto - totalCancelledSales);

    const totalItems            = validSales.length;
    const totalCancelledItems   = cancelledSales.length;
    const avgTicket             = totalItems > 0 ? totalSalesBruto / totalItems : 0;

    // Vendas por produto (top 10) - usa apenas vendas válidas
    const byProduct = {};
    validSales.forEach(s => {
        byProduct[s.productName] = (byProduct[s.productName] || 0) + s.price;
    });
    const productLabels = Object.keys(byProduct).sort((a,b) => byProduct[b]-byProduct[a]).slice(0,10);
    const productData   = productLabels.map(l => byProduct[l]);

    // Vendas por terminal
    const byTerminal = {};
    validSales.forEach(s => {
        const t = s.terminalId || 'N/D';
        byTerminal[t] = (byTerminal[t] || 0) + s.price;
    });
    const terminalLabels = Object.keys(byTerminal).sort((a,b) => byTerminal[b]-byTerminal[a]);
    const terminalData   = terminalLabels.map(l => byTerminal[l]);

    // Vendas por forma de pagamento - separa múltiplos métodos dividindo o valor igualmente
    const byPayment = {};
    validSales.forEach(s => {
        const pms = (s.paymentMethod || 'Dinheiro').split(' + ');
        const dividedPrice = s.price / pms.length;
        pms.forEach(pmRaw => {
            const pm = pmRaw.trim().toUpperCase();
            byPayment[pm] = (byPayment[pm] || 0) + dividedPrice;
        });
    });
    const paymentLabels = Object.keys(byPayment).sort((a,b) => byPayment[b]-byPayment[a]);
    const paymentData   = paymentLabels.map(l => byPayment[l]);

    // Vendas por subgrupo
    const bySubgroup = {};
    validSales.forEach(s => {
        const prod = state.products.find(p => p.id == s.productId);
        const sg   = prod ? state.subgroups.find(x => x.id == prod.subgroupId) : null;
        const name = sg ? sg.name : 'Outros';
        bySubgroup[name] = (bySubgroup[name] || 0) + s.price;
    });
    const subgroupLabels = Object.keys(bySubgroup).sort((a,b) => bySubgroup[b]-bySubgroup[a]);
    const subgroupData   = subgroupLabels.map(l => bySubgroup[l]);

    // Paleta monocromática da marca
    const BRAND   = '#2563eb';
    const PALETTE = ['#2563eb','#3b82f6','#60a5fa','#93c5fd','#bfdbfe','#dbeafe','#eff6ff','#f8fafc'];

    // Custom CSS Styles injected dynamically for ultra-tactile experience
    if (!document.getElementById('tactile-dashboard-css')) {
        const styleEl = document.createElement('style');
        styleEl.id = 'tactile-dashboard-css';
        styleEl.innerHTML = `
            /* Efeito tátil de luxo de gravura / folha metálica */
            .rich-kpi-card {
                background: linear-gradient(135deg, #ffffff 0%, #f6f5f2 100%);
                border: 1px solid #d5d3ca;
                border-bottom: 3.5px solid #b5b3aa;
                border-radius: 14px;
                padding: 18px 20px;
                position: relative;
                overflow: hidden;
                display: flex;
                flex-direction: column;
                justify-content: space-between;
                min-height: 125px;
                box-shadow: 0 4px 6px -1px rgba(0,0,0,0.03), 0 10px 15px -3px rgba(35,34,31,0.08), inset 0 1px 0 rgba(255,255,255,0.9);
                transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
            }
            .rich-kpi-card:hover {
                transform: translateY(-2px);
                box-shadow: 0 8px 16px -2px rgba(35,34,31,0.12), 0 2px 4px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.9);
                border-bottom-width: 4.5px;
            }
            .rich-kpi-title {
                font-family: 'Plus Jakarta Sans', sans-serif;
                font-size: 11px;
                font-weight: 800;
                color: #5a5955;
                text-transform: uppercase;
                letter-spacing: 0.08em;
                margin-bottom: 6px;
            }
            .rich-kpi-value {
                font-family: 'Plus Jakarta Sans', sans-serif;
                font-size: 26px;
                font-weight: 900;
                letter-spacing: -0.05em;
                line-height: 1;
                margin-top: 4px;
            }
            /* Texturas de folha e gravação ricas */
            .rich-kpi-value.green-foil {
                background: linear-gradient(135deg, #15803d 0%, #166534 100%);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                text-shadow: 0.5px 0.5px 0.5px rgba(255,255,255,0.6);
            }
            .rich-kpi-value.red-foil {
                background: linear-gradient(135deg, #b91c1c 0%, #991b1b 100%);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                text-shadow: 0.5px 0.5px 0.5px rgba(255,255,255,0.6);
            }
            .rich-kpi-value.blue-foil {
                background: linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                text-shadow: 0.5px 0.5px 0.5px rgba(255,255,255,0.6);
            }
            
            /* Micro-detalhes de acabamento humano */
            .micro-emboss-stamp {
                position: absolute;
                bottom: 12px;
                right: 14px;
                width: 32px;
                height: 32px;
                opacity: 0.85;
                display: flex;
                align-items: center;
                justify-content: center;
                background: rgba(0,0,0,0.02);
                border: 1px dashed rgba(0,0,0,0.1);
                border-radius: 8px;
                box-shadow: inset 0 1px 1px rgba(0,0,0,0.02);
            }
        `;
        document.head.appendChild(styleEl);
    }

    container.innerHTML = `
        <!-- KPIs com acabamento tátil premium -->
        <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(180px,1fr)); gap:18px; margin-bottom:28px;">
            <div class="rich-kpi-card">
                <span class="rich-kpi-title">Faturamento Bruto</span>
                <span class="rich-kpi-value green-foil">R$ ${totalSalesBruto.toFixed(2)}</span>
                <div class="micro-emboss-stamp" title="Autenticado Velo">
                    <i data-lucide="award" style="width:16px; color:#15803d;"></i>
                </div>
            </div>
            <div class="rich-kpi-card">
                <span class="rich-kpi-title">Valor Cancelado</span>
                <span class="rich-kpi-value red-foil">R$ ${totalCancelledSales.toFixed(2)}</span>
                <div class="micro-emboss-stamp">
                    <i data-lucide="shield-alert" style="width:16px; color:#b91c1c;"></i>
                </div>
            </div>
            <div class="rich-kpi-card">
                <span class="rich-kpi-title">Faturamento Líquido</span>
                <span class="rich-kpi-value blue-foil">R$ ${totalSalesLiquido.toFixed(2)}</span>
                <div class="micro-emboss-stamp">
                    <i data-lucide="wallet" style="width:16px; color:#1d4ed8;"></i>
                </div>
            </div>
            <div class="rich-kpi-card">
                <span class="rich-kpi-title">Tickets Válidos</span>
                <span class="rich-kpi-value" style="color:#2d2c29; text-shadow:0 1px 0 white;">${totalItems}</span>
                <div class="micro-emboss-stamp" style="border-radius:4px;">
                    <i data-lucide="ticket" style="width:16px; color:#5a5955;"></i>
                </div>
            </div>
            <div class="rich-kpi-card">
                <span class="rich-kpi-title">Tickets Cancelados</span>
                <span class="rich-kpi-value" style="color:#b91c1c;">${totalCancelledItems}</span>
                <div class="micro-emboss-stamp">
                    <i data-lucide="ban" style="width:16px; color:#b91c1c;"></i>
                </div>
            </div>
            <div class="rich-kpi-card">
                <span class="rich-kpi-title">Ticket Médio</span>
                <span class="rich-kpi-value" style="color:#2d2c29; font-weight:900;">R$ ${avgTicket.toFixed(2)}</span>
                <div class="micro-emboss-stamp">
                    <i data-lucide="safe" style="width:16px; color:#5a5955;"></i>
                </div>
            </div>
        </div>
        
        <!-- Gráficos -->
        <div class="dash-charts-grid">
            <div class="dash-chart-card dash-chart-wide">
                <p class="dash-chart-title">Vendas por Produto <span>Top 10</span></p>
                <div class="dash-chart-wrap"><canvas id="ch-product"></canvas></div>
            </div>
            <div class="dash-chart-card">
                <p class="dash-chart-title">Por Forma de Pagamento</p>
                <div class="dash-chart-wrap"><canvas id="ch-payment"></canvas></div>
            </div>
            <div class="dash-chart-card">
                <p class="dash-chart-title">Por Terminal de Caixa</p>
                <div class="dash-chart-wrap"><canvas id="ch-terminal"></canvas></div>
            </div>
            <div class="dash-chart-card dash-chart-wide">
                <p class="dash-chart-title">Vendas por Subgrupo</p>
                <div class="dash-chart-wrap"><canvas id="ch-subgroup"></canvas></div>
            </div>
        </div>
    `;

    // Configuração base Chart.js — flat e limpo
    const baseFont   = { family: "'Outfit', sans-serif", size: 12, weight: '500' };
    const gridColor  = 'rgba(0,0,0,0.05)';
    const tickColor  = '#a1a1aa';

    const scaleBase = {
        grid:  { color: gridColor, drawBorder: false },
        ticks: { color: tickColor, font: baseFont, padding: 6 },
        border: { display: false }
    };

    setTimeout(() => {
        // Produto — barras horizontais com textura e luz de azul anodizado
        const c1 = document.getElementById('ch-product');
        if (c1) {
            const ctx1 = c1.getContext('2d');
            
            // Cria gradiente tátil rico imitando o azul anodizado metálico com reflexo
            const gradientBlue = ctx1.createLinearGradient(0, 0, 400, 0);
            gradientBlue.addColorStop(0, '#1e3a8a'); // Azul profundo escovado
            gradientBlue.addColorStop(0.3, '#3b82f6'); // Luz metálica direcional
            gradientBlue.addColorStop(0.7, '#2563eb'); // Azul anodizado central
            gradientBlue.addColorStop(1, '#1d4ed8'); // Sombra de extremidade
            
            new Chart(c1, {
                type: 'bar',
                data: {
                    labels: productLabels,
                    datasets: [{ data: productData, backgroundColor: gradientBlue, borderRadius: 8, borderSkipped: false }]
                },
                options: {
                    indexAxis: 'y',
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { display: false }, tooltip: { callbacks: {
                        label: ctx => ` R$ ${ctx.parsed.x.toFixed(2)}`
                    }}},
                    scales: {
                        x: { ...scaleBase, beginAtZero: true },
                        y: { ...scaleBase, grid: { display: false } }
                    }
                }
            });
        }

        // Pagamento — doughnut
        const c2 = document.getElementById('ch-payment');
        if (c2) new Chart(c2, {
            type: 'doughnut',
            data: {
                labels: paymentLabels,
                datasets: [{ data: paymentData, backgroundColor: PALETTE.slice(0, paymentData.length), borderWidth: 0, hoverOffset: 4 }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                cutout: '65%',
                plugins: {
                    legend: { position: 'bottom', labels: { color: tickColor, font: baseFont, padding: 12, boxWidth: 10, usePointStyle: true } },
                    tooltip: { callbacks: { label: ctx => ` R$ ${ctx.parsed.toFixed(2)}` }}
                }
            }
        });

        // Terminal — doughnut
        const c3 = document.getElementById('ch-terminal');
        if (c3) new Chart(c3, {
            type: 'doughnut',
            data: {
                labels: terminalLabels,
                datasets: [{ data: terminalData, backgroundColor: PALETTE.slice(0, terminalData.length), borderWidth: 0, hoverOffset: 4 }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                cutout: '65%',
                plugins: {
                    legend: { position: 'bottom', labels: { color: tickColor, font: baseFont, padding: 12, boxWidth: 10, usePointStyle: true } },
                    tooltip: { callbacks: { label: ctx => ` R$ ${ctx.parsed.toFixed(2)}` }}
                }
            }
        });

        // Subgrupo — barras verticais
        const c4 = document.getElementById('ch-subgroup');
        if (c4) new Chart(c4, {
            type: 'bar',
            data: {
                labels: subgroupLabels,
                datasets: [{ data: subgroupData, backgroundColor: PALETTE.slice(0, subgroupData.length), borderRadius: 3, borderSkipped: false }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false }, tooltip: { callbacks: {
                    label: ctx => ` R$ ${ctx.parsed.y.toFixed(2)}`
                }}},
                scales: {
                    x: { ...scaleBase, grid: { display: false } },
                    y: { ...scaleBase, beginAtZero: true }
                }
            }
        });
    }, 80);
}


function getPageTitle(page) {
    const titles = {
        'home': 'Início',
        'dashboard': 'Dashboard de Vendas',
        'users': 'Usuários',
        'products': 'Produtos',
        'groups': 'Grupos',
        'subgroups': 'Subgrupos',
        'paymentMethods': 'Formas de Pagamento',
        'printers': 'Impressoras',
        'terminals': 'Terminais',
        'inventory': 'Inventário',
        'reportSalesByProduct': 'Relatórios',
        'reportDrePersonalizada': 'Relatórios / Dem. Resl.(DRE)',
        'reportFluxoCaixa': 'Relatórios / Fluxo de Caixa',
        'reportPontoEquilibrio': 'Relatórios / Ponto de Equilíbrio',
        'reportDreGerencial': 'Relatórios / DRE Gerencial',
        'reportBalancoPatrimonial': 'Relatórios / Balanço Patrimonial',
        'backup': 'Backup do Sistema',
        'planoConta': 'Plano de Contas',
        'centroCusto': 'Centros de Custos',
        'contaFinanceira': 'Contas Financeiras',
        'conciliacaoCaixa': 'Conciliação de Caixa',
        'receitas': 'Gestão de Receitas',
        'despesas': 'Gestão de Despesas',
        'cargos': 'Cargos e Permissões de Acesso',
        'swot': 'Matriz SWOT Dinâmica',
        'compliance': 'Compliance & Integridade (IBGC / Decreto 11.129/22)',
        'skills': 'Gestão de Competências & Talentos (Big Five / Capacidades Dinâmicas)'
    };
    return titles[page] || 'Admin';
}

function renderTicketConfig(container) {
    if (!state.ticketConfig) {
        state.ticketConfig = { titleTicket: 'TICKET 1-A-1', titleFicha: 'ficha' };
    }

    container.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
            <h3 style="font-weight: 800; letter-spacing: -0.03em;">Configurações do Ticket</h3>
        </div>
        <div class="glass-card">
            <div class="form-grid">
                <div class="form-group col-6">
                    <label class="form-label">Nome Principal do Impresso (Ex: TICKET 1-A-1)</label>
                    <input type="text" class="form-control" id="frm-cfg-ticket" value="${state.ticketConfig.titleTicket}">
                </div>
                <div class="form-group col-6">
                    <label class="form-label">Nome do Rodapé/Item (Ex: ficha, senha, etc)</label>
                    <input type="text" class="form-control" id="frm-cfg-ficha" value="${state.ticketConfig.titleFicha}">
                </div>
            </div>
            <div style="margin-top: 24px;">
                <button class="nav-item" style="background: var(--brand); color: white; width: auto; padding: 10px 24px;" onclick="saveTicketConfig()">Salvar Alterações</button>
            </div>
        </div>
    `;
}

window.saveTicketConfig = function () {
    state.ticketConfig.titleTicket = document.getElementById('frm-cfg-ticket').value.trim() || 'TICKET 1-A-1';
    state.ticketConfig.titleFicha = document.getElementById('frm-cfg-ficha').value.trim() || 'ficha';
    pushToServer({ ticketConfig: state.ticketConfig });
    alert('Configurações salvas com sucesso!');
}

// --- CADASTROS ---
function renderUsers(container) {
    if (!state.cargos) state.cargos = [];
    container.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
            <h3 style="font-weight: 800; letter-spacing: -0.03em;">Cadastro de Usuários / Operadores</h3>
            <button class="nav-item" style="background: var(--brand); color: white; width: auto; padding: 10px 20px;" onclick="openUserModal()">+ Novo Usuário</button>
        </div>
        <div class="glass-card" style="padding: 0; overflow: hidden">
            <table class="modern-table" style="margin: 0">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Nome de Usuário</th>
                        <th>Cargo / Permissão</th>
                        <th>Status</th>
                        <th style="width: 100px"></th>
                    </tr>
                </thead>
                <tbody>
                    ${state.users && state.users.length > 0 ? state.users.map(u => {
                        const cargo = state.cargos.find(c => c.id == u.cargoId);
                        const cargoNome = cargo ? cargo.nome.toUpperCase() : 'SEM CARGO';
                        const statusText = u.ativo !== false ? 'ATIVO' : 'INATIVO';
                        const statusColor = u.ativo !== false ? 'var(--success)' : 'var(--danger)';
                        return `
                            <tr>
                                <td style="font-weight: 700; color: var(--text-sub); font-size: 13px;">${u.id}</td>
                                <td style="font-weight: 800">${u.username}</td>
                                <td style="font-weight: 700; color: var(--brand);">${cargoNome}</td>
                                <td style="font-weight: 800; color: ${statusColor};">${statusText}</td>
                                <td>
                                    <div style="display: flex; align-items: center; gap: 12px; justify-content: flex-end;">
                                        <i data-lucide="edit-3" style="width: 18px; color: var(--brand); cursor: pointer" onclick="openUserModal(${u.id})"></i>
                                        <i data-lucide="trash-2" style="width: 18px; color: var(--danger); cursor: pointer" onclick="removeUser(${u.id})"></i>
                                    </div>
                                </td>
                            </tr>
                        `;
                    }).join('') : '<tr><td colspan="5" style="text-align:center; padding: 60px; color: var(--text-sub); font-weight: 600">Nenhum usuário cadastrado.</td></tr>'}
                </tbody>
            </table>
        </div>
    `;
}

let currentEditingUserId = null;

window.openUserModal = function (userId = null) {
    currentEditingUserId = userId;
    const modal = document.getElementById('product-modal');
    const body = document.getElementById('product-form-body');
    const title = document.getElementById('product-modal-title');

    let usr = { username: '', password: '', cargoId: '', ativo: true };

    if (userId) {
        const found = state.users.find(u => u.id === userId);
        if (found) usr = { ...usr, ...found };
        title.innerText = 'Editar Usuário';
    } else {
        title.innerText = 'Novo Usuário';
    }

    if (!state.cargos) state.cargos = [];
    const cargosOpts = state.cargos.map(c => 
        `<option value="${c.id}" ${usr.cargoId == c.id ? 'selected' : ''}>${c.nome.toUpperCase()}</option>`
    ).join('') || `<option value="1">ADMINISTRADOR</option><option value="2">OPERADOR DE CAIXA</option>`;

    body.innerHTML = `
        <div class="form-grid">
            <div class="form-group col-6">
                <label class="form-label">Nome de Usuário (Acesso Caixa)</label>
                <input type="text" class="form-control" id="frm-usr-name" value="${usr.username}" placeholder="Ex: MARIA">
            </div>
            <div class="form-group col-6">
                <label class="form-label">Cargo / Perfil de Acesso</label>
                <select class="form-control" id="frm-usr-cargo">
                    <option value="">— Selecione o Cargo —</option>
                    ${cargosOpts}
                </select>
            </div>
            <div class="form-group col-6">
                <label class="form-label">Senha de Acesso</label>
                <input type="password" class="form-control" id="frm-usr-pass" placeholder="${userId ? 'Deixe em branco para manter a atual' : 'Digite a senha'}">
            </div>
            <div class="form-group col-6">
                <label class="form-label">Confirmar Senha</label>
                <input type="password" class="form-control" id="frm-usr-pass-confirm" placeholder="Repita a senha">
            </div>
            <div class="form-group col-12">
                <label class="form-label">Status do Colaborador</label>
                <select class="form-control" id="frm-usr-ativo">
                    <option value="1" ${usr.ativo ? 'selected' : ''}>ATIVO — HABILITADO PARA TRABALHAR</option>
                    <option value="0" ${!usr.ativo ? 'selected' : ''}>INATIVO — ACESSO BLOQUEADO</option>
                </select>
            </div>
        </div>
    `;

    const footer = document.querySelector('.modal-footer');
    footer.innerHTML = `
        <button class="btn-cancel" onclick="closeProductModal()">Cancelar</button>
        <button class="btn-save" onclick="saveUserForm()">Gravar Registro</button>
    `;

    modal.classList.add('active');
    lucide.createIcons();
}

window.saveUserForm = function () {
    const username = document.getElementById('frm-usr-name').value.trim().toUpperCase();
    const pass = document.getElementById('frm-usr-pass').value;
    const confirmPass = document.getElementById('frm-usr-pass-confirm').value;
    const cargoId = document.getElementById('frm-usr-cargo').value;
    const ativo = document.getElementById('frm-usr-ativo').value === '1';

    if (!username) return alert('O nome de usuário é obrigatório.');
    if (!cargoId) return alert('Por favor, selecione um cargo para definir as permissões.');

    if (!currentEditingUserId && !pass) {
        return alert('Para novos usuários, a senha é obrigatória.');
    }

    if (pass && pass !== confirmPass) {
        return alert('As senhas não coincidem.');
    }

    if (!state.users) state.users = [];

    const exists = state.users.find(u => u.username === username && u.id !== currentEditingUserId);
    if (exists) return alert('Já existe um usuário com esse nome.');

    const newUsr = {
        id: currentEditingUserId || Date.now(),
        username: username,
        cargoId: Number(cargoId),
        ativo: ativo
    };

    if (pass) {
        newUsr.password = pass;
    } else if (currentEditingUserId) {
        // Preserva a senha anterior se não digitada
        const prev = state.users.find(u => u.id === currentEditingUserId);
        if (prev && prev.password) newUsr.password = prev.password;
    }

    if (currentEditingUserId) {
        state.users = state.users.map(u => u.id === currentEditingUserId ? { ...u, ...newUsr } : u);
    } else {
        state.users.push(newUsr);
    }

    pushToServer({ users: state.users });
    renderPage('users');
    closeProductModal();
}

window.removeUser = function (id) {
    if (confirm('Remover este usuário? Ele não poderá mais acessar o PDV.')) {
        state.users = state.users.filter(u => u.id !== id);
        pushToServer({ users: state.users });
        renderPage('users');
    }
}

// --- CATÁLOGO ---
// Estado persistente da Grid do Catálogo
if (!window.catalogueGridState) {
    window.catalogueGridState = {
        groupedBy: ['group', 'subgroup'],
        hiddenColumns: [],
        // Ordem das colunas (arrastar e soltar para reordenar)
        columnOrder: ['group', 'subgroup', 'name', 'code', 'price', 'unit', 'stock', 'printer'],
        filters: {
            group: 'ALL',
            subgroup: '',
            name: '',
            code: '',
            price: '',
            printer: '',
            stock: '',
            unit: 'ALL'
        }
    };
}
// Garantir que o columnOrder exista mesmo em estado já persistido
if (!window.catalogueGridState.columnOrder) {
    window.catalogueGridState.columnOrder = ['group', 'subgroup', 'name', 'code', 'price', 'unit', 'stock', 'printer'];
}
if (window.catalogueGridState.filters && window.catalogueGridState.filters.group === undefined) {
    window.catalogueGridState.filters.group = 'ALL';
    window.catalogueGridState.filters.subgroup = '';
}

function renderCatalogue(container) {
    // Garantir dados estruturados se o catálogo estiver vazio
    if (!state.groups || state.groups.length === 0 || !state.subgroups || state.subgroups.length === 0 || !state.products || state.products.length === 0) {
        state.groups = [
            { id: 1, name: 'SANDUÍCHES', order: 1 },
            { id: 2, name: 'BEBIDAS', order: 2 }
        ];
        state.subgroups = [
            { id: 11, groupId: 1, name: 'ACOMPANHAMENTOS HAMBURGUERES SECOS', buttonColor: '#2563eb', textColor: '#ffffff' },
            { id: 12, groupId: 1, name: 'ADICIONAIS', buttonColor: '#f97316', textColor: '#ffffff' },
            { id: 21, groupId: 2, name: 'SUCOS NATURAIS', buttonColor: '#22c55e', textColor: '#ffffff' },
            { id: 22, groupId: 2, name: 'REFRIGERANTES', buttonColor: '#3b82f6', textColor: '#ffffff' }
        ];
        state.products = [
            { id: 101, code: '98766', name: 'PRESUNTO SECO', price: 9.00, cost: 4.50, order: 1, stock: 150, subgroupId: 11, printerId: 1, useNameOnPrint: true, description: 'Presunto seco de alta qualidade', icon: 'sandwich', unit: 'UNID' },
            { id: 102, code: '87669', name: 'TOMATE SECO', price: 9.00, cost: 3.50, order: 2, stock: 200, subgroupId: 11, printerId: 1, useNameOnPrint: true, description: 'Tomate seco artesanal', icon: 'sandwich', unit: 'UNID' },
            { id: 103, code: '103', name: 'MONTE SEU SECO', price: 15.00, cost: 6.00, order: 3, stock: 50, subgroupId: 11, printerId: 1, useNameOnPrint: true, description: 'Lanche personalizado seco', icon: 'sandwich', unit: 'UNID' },
            { id: 201, code: '66542', name: 'SUCO DE LARANJA 300ml', price: 12.00, cost: 4.00, order: 1, stock: 300, subgroupId: 21, printerId: 2, useNameOnPrint: true, description: 'Suco de laranja natural e fresco', icon: 'cup-soda', unit: 'UNID' },
            { id: 202, code: '55431', name: 'COCA COLA LATA 350ml', price: 6.50, cost: 2.80, order: 1, stock: 500, subgroupId: 22, printerId: 2, useNameOnPrint: true, description: 'Coca Cola lata 350ml', icon: 'cup-soda', unit: 'UNID' }
        ];
        saveData();
    }

    const grid = window.catalogueGridState;

    if (!document.getElementById('tree-catalogue-styles')) {
        const styleEl = document.createElement('style');
        styleEl.id = 'tree-catalogue-styles';
        styleEl.innerHTML = `
            /* Container da Grid de Produtos */
            .grid-card-container {
                border: 1px solid #c8c8c8;
                border-radius: 4px;
                background: #ffffff;
                overflow: hidden;
                box-shadow: 0 2px 8px rgba(0,0,0,0.05);
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            }
            /* Cabeçalho superior Slate Dark */
            .grid-card-title-bar {
                background: #374151; /* Slate/Dark gray idêntico */
                color: #ffffff;
                padding: 10px 14px;
                font-size: 13.5px;
                font-weight: 600;
                display: flex;
                align-items: center;
                gap: 8px;
                border-bottom: 1px solid #1f2937;
                user-select: none;
            }
            .grid-card-title-bar i, .grid-card-title-bar svg {
                width: 16px; height: 16px;
            }
            /* Painel de agrupamento (caixa branca com borda) */
            .grid-group-dropzone {
                background: #f5f5f5;
                border-bottom: 1px solid #dcdcdc;
                padding: 6px 12px;
                display: flex;
                align-items: center;
                gap: 8px;
                min-height: 38px;
            }
            .grid-group-pill {
                background: #ffffff;
                border: 1px solid #d3d3d3;
                border-radius: 2px;
                padding: 4px 10px;
                font-size: 11px;
                font-weight: 500;
                color: #333333;
                display: inline-flex;
                align-items: center;
                gap: 6px;
                cursor: pointer;
                box-shadow: 0 1px 2px rgba(0,0,0,0.03);
                user-select: none;
            }
            .grid-group-pill:hover {
                background: #eaeaea;
            }

            /* Tabela da Grid */
            .tree-table {
                width: 100%;
                border-collapse: collapse;
                background: #ffffff;
            }
            .tree-table th {
                background: #ffffff;
                border: 1px solid #d3d3d3;
                padding: 6px 10px;
                font-size: 12px;
                font-weight: 600;
                color: #333333;
                text-align: left;
                vertical-align: middle;
                user-select: none;
                position: relative;
            }
            .th-content {
                display: flex;
                align-items: center;
                justify-content: space-between;
                width: 100%;
            }
            .th-content span {
                display: inline-flex;
                align-items: center;
                gap: 4px;
            }
            .th-content i, .th-content svg {
                width: 12px; height: 12px;
                color: #8c8c8c;
            }

            /* Botão de ocultar coluna no cabeçalho */
            .col-hide-trigger {
                position: absolute;
                top: 2px; right: 2px;
                cursor: pointer;
                opacity: 0;
                transition: opacity 0.2s;
                color: #a0a0a0;
                font-size: 9px;
                border: none; background: transparent;
                padding: 1px;
                line-height: 1;
            }
            .tree-table th:hover .col-hide-trigger {
                opacity: 1;
            }
            .col-hide-trigger:hover {
                color: #ef4444;
            }

            /* Drag & Drop nos cabeçalhos */
            .tree-table th[draggable='true'] {
                cursor: grab;
            }
            .tree-table th[draggable='true']:active {
                cursor: grabbing;
            }
            .tree-table th.drag-over {
                background: #eff6ff;
                border-left: 3px solid #3b82f6;
                border-right: 3px solid #3b82f6;
            }
            .tree-table th.dragging {
                opacity: 0.4;
                background: #f1f5f9;
            }

            /* Zona de remoção de colunas */
            .col-remove-zone {
                border: 2px dashed #cbd5e1;
                border-radius: 6px;
                padding: 6px 14px;
                font-size: 11px;
                font-weight: 600;
                color: #94a3b8;
                display: inline-flex;
                align-items: center;
                gap: 6px;
                cursor: default;
                transition: all 0.2s;
                user-select: none;
            }
            .col-remove-zone.drag-active {
                border-color: #ef4444;
                background: #fef2f2;
                color: #ef4444;
            }

            /* Linha de Filtros por Coluna */
            .filter-row td {
                background: #ffffff;
                border: 1px solid #d3d3d3;
                padding: 4px 6px;
            }
            .filter-input-wrapper {
                position: relative;
                display: flex;
                align-items: center;
                width: 100%;
            }
            .filter-icon-svg {
                position: absolute;
                left: 6px;
                width: 11px; height: 11px;
                color: #a0a0a0;
                pointer-events: none;
            }
            .grid-filter-input {
                width: 100%;
                border: 1px solid #cccccc;
                border-radius: 2px;
                padding: 3px 6px 3px 20px;
                font-size: 11px;
                font-weight: 500;
                color: #333333;
                outline: none;
                background: #ffffff;
            }
            .grid-filter-input:focus {
                border-color: #3b82f6;
            }
            .grid-filter-select {
                width: 100%;
                border: 1px solid #cccccc;
                border-radius: 2px;
                padding: 3px 20px 3px 6px;
                font-size: 11px;
                font-weight: 500;
                color: #333333;
                outline: none;
                background: #ffffff;
                cursor: pointer;
            }

            /* Linha de Produto (Estilo flat DevExpress de alta fidelidade) */
            .product-row {
                cursor: pointer;
                background: #ffffff;
                color: #333333;
            }
            .product-row:nth-child(even) {
                background: #f9f9f9;
            }
            .product-row td {
                padding: 6px 10px;
                font-size: 11.5px;
                font-weight: 500;
                border: 1px solid #e0e0e0;
                color: #333333;
            }
            
            /* Linha ativa selecionada em azul sólido com texto branco absoluto */
            .product-row:hover, .product-row.selected-row {
                background: #3b82f6 !important;
            }
            .product-row:hover td, .product-row.selected-row td {
                color: #ffffff !important;
                border-color: #3b82f6;
            }
            .product-row:hover a, .product-row.selected-row a {
                color: #ffffff !important;
            }
            
            /* Seletor de colunas flutuante */
            .column-toggles-bar {
                display: flex; gap: 8px; align-items: center; margin-bottom: 12px; flex-wrap: wrap;
            }
            .column-toggle-pill {
                padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 600;
                background: #f3f4f6; border: 1px solid #d1d5db; color: #4b5563; cursor: pointer;
                display: inline-flex; align-items: center; gap: 4px;
            }
            .column-toggle-pill.active {
                background: #eff6ff; color: #1d4ed8; border-color: #93c5fd;
            }
        `;
        document.head.appendChild(styleEl);
    }

    // Filtragem dos produtos
    const filteredProducts = state.products.filter(p => {
        const subgroup = state.subgroups.find(sg => sg.id == p.subgroupId);
        const group = subgroup ? state.groups.find(g => g.id == subgroup.groupId) : null;
        const printerName = state.printers.find(pr => pr.id == p.printerId)?.name || '';

        const groupMatch = !grid.filters.group || grid.filters.group === 'ALL' || (group && String(group.id) === grid.filters.group);
        const subgroupMatch = !grid.filters.subgroup || (subgroup && subgroup.name.toUpperCase().includes(grid.filters.subgroup.toUpperCase()));
        const nameMatch = !grid.filters.name || p.name.toUpperCase().includes(grid.filters.name.toUpperCase());
        const codeMatch = !grid.filters.code || (p.code || '').toUpperCase().includes(grid.filters.code.toUpperCase());
        const priceMatch = !grid.filters.price || String(p.price).includes(grid.filters.price);
        const printerMatch = !grid.filters.printer || printerName.toUpperCase().includes(grid.filters.printer.toUpperCase());
        const stockMatch = !grid.filters.stock || String(p.stock !== null ? p.stock : 'Sem contr.').includes(grid.filters.stock);
        const unitMatch = !grid.filters.unit || grid.filters.unit === 'ALL' || (p.unit || 'UNID').toUpperCase() === grid.filters.unit.toUpperCase();

        return groupMatch && subgroupMatch && nameMatch && codeMatch && priceMatch && printerMatch && stockMatch && unitMatch;
    });

    const isColVisible = (id) => !grid.hiddenColumns.includes(id);

    // Metadados de todas as colunas disponíveis
    const ALL_COLS = [
        { id: 'group',    label: 'Grupo' },
        { id: 'subgroup', label: 'Subgrupo' },
        { id: 'name',     label: 'Nome / Produto' },
        { id: 'code',     label: 'Código' },
        { id: 'price',    label: 'Preço' },
        { id: 'unit',     label: 'Unidade' },
        { id: 'stock',    label: 'Estoque' },
        { id: 'printer',  label: 'Rota' }
    ];

    // Colunas visíveis ordenadas conforme columnOrder
    const orderedVisibleCols = grid.columnOrder
        .filter(id => isColVisible(id))
        .map(id => ALL_COLS.find(c => c.id === id))
        .filter(Boolean);

    const columnTogglesHtml = ALL_COLS
        .map(c => {
            const visible = isColVisible(c.id);
            return `
                <button class="column-toggle-pill ${visible ? 'active' : ''}" onclick="toggleGridColumn('${c.id}')">
                    <i data-lucide="${visible ? 'eye' : 'eye-off'}" style="width:11px;height:11px;"></i>
                    ${c.label}
                </button>
            `;
        }).join('');

    container.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 12px;">
            <div>
                <h3 style="font-weight: 800; letter-spacing: -0.03em;">Catálogo de Itens</h3>
                <p style="font-size: 13px; color: var(--text-sub); margin-top: 4px;">Gerencie seus produtos com a avançada Grid de Dados VELO.</p>
            </div>
            <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                <button class="nav-item" id="btn-download-template"
                    style="background: transparent; color: var(--text-main); width: auto; padding: 9px 16px; border: 1.5px solid var(--border-med); border-radius: 10px; display: flex; align-items: center; gap: 8px; font-weight: 700; font-size: 13px; cursor: pointer; transition: all 0.2s;"
                    onmouseover="this.style.background='var(--surface-light)'" onmouseout="this.style.background='transparent'"
                    onclick="downloadProductTemplate()">
                    <i data-lucide="file-spreadsheet" style="width: 16px; color: #22c55e;"></i>
                    Ver Modelo Excel
                </button>
                <label for="import-excel-file"
                    id="btn-import-excel"
                    style="background: transparent; color: var(--text-main); width: auto; padding: 9px 16px; border: 1.5px solid var(--border-med); border-radius: 10px; display: flex; align-items: center; gap: 8px; font-weight: 700; font-size: 13px; cursor: pointer; transition: all 0.2s;"
                    onmouseover="this.style.background='var(--surface-light)'" onmouseout="this.style.background='transparent'\">
                    <i data-lucide="upload" style="width: 16px; color: #6366f1;"></i>
                    Importar Planilha
                </label>
                <input type="file" id="import-excel-file" accept=".xlsx,.xls,.csv" style="display: none;" onchange="importProductsFromExcel(event)">
                <button class="nav-item" style="background: var(--brand); color: white; width: auto; padding: 9px 20px; border-radius: 10px; display: flex; align-items: center; gap: 8px; font-weight: 700;" onclick="openProductModal()">
                    <i data-lucide="plus" style="width: 16px;"></i>
                    Adicionar Item
                </button>
            </div>
        </div>

        <!-- Seletor de Exibição de Colunas + Zona de Remoção -->
        <div class="column-toggles-bar">
            <span style="font-size: 11px; font-weight: 800; color: var(--text-sub); text-transform: uppercase;">
                Colunas:
            </span>
            ${columnTogglesHtml}
            ${grid.hiddenColumns.length > 0 ? `<button class="column-toggle-pill" style="border-color:var(--brand);color:var(--brand);" onclick="restoreAllGridColumns()"><i data-lucide="rotate-ccw" style="width:10px;height:10px;"></i> Restaurar</button>` : ''}
            <!-- Zona de Drop para REMOVER coluna: arraste o cabeçalho até aqui -->
            <div id="col-remove-zone" class="col-remove-zone"
                ondragover="event.preventDefault(); this.classList.add('drag-active');"
                ondragleave="this.classList.remove('drag-active');"
                ondrop="window.dropRemoveColumn(event); this.classList.remove('drag-active');">
                <i data-lucide="trash-2" style="width:12px;height:12px;"></i>
                Arraste aqui para remover
            </div>
        </div>

        <!-- Estrutura principal da Grid -->
        <div class="grid-card-container">
            
            <!-- Barra superior Slate Dark (Produtos + Ícone de Grid) -->
            <div class="grid-card-title-bar">
                <i data-lucide="table"></i>
                <span>Produtos</span>
            </div>

            <!-- Painel de Agrupamento -->
            <div class="grid-group-dropzone">
                <div class="grid-group-pill">
                    Grupo <i data-lucide="arrow-up" style="width:10px;height:10px;"></i> <i data-lucide="filter" style="width:10px;height:10px;"></i>
                </div>
                <div class="grid-group-pill">
                    Subgrupo <i data-lucide="arrow-up" style="width:10px;height:10px;"></i> <i data-lucide="filter" style="width:10px;height:10px;"></i>
                </div>
            </div>

            <table class="tree-table">
                <thead>
                    <tr id="grid-header-row">
                        ${orderedVisibleCols.map(col => `
                        <th draggable="true"
                            data-col-id="${col.id}"
                            ondragstart="window.startColDrag(event, '${col.id}');"
                            ondragover="event.preventDefault(); window.colDragOver(event, '${col.id}');"
                            ondragleave="window.colDragLeave(event);"
                            ondrop="window.dropColReorder(event, '${col.id}');"
                            ondragend="window.colDragEnd(event);">
                            <div class="th-content">
                                <span>${col.label}</span>
                                <i data-lucide="filter"></i>
                            </div>
                            <button class="col-hide-trigger" onclick="event.stopPropagation(); toggleGridColumn('${col.id}')" title="Ocultar Coluna">✕</button>
                        </th>`).join('')}
                        <th style="width: 60px; text-align: center; cursor: default;">Ações</th>
                    </tr>

                    <!-- Linha de Filtros por Coluna (segue a mesma ordem das colunas) -->
                    <tr class="filter-row">
                        ${orderedVisibleCols.map(col => {
                            if (col.id === 'group') return `
                            <td>
                                <select class="grid-filter-select" onchange="applyGridFilter('group', this.value)">
                                    <option value="ALL" ${grid.filters.group === 'ALL' || !grid.filters.group ? 'selected' : ''}>(Todos)</option>
                                    ${state.groups.map(g => `<option value="${g.id}" ${String(grid.filters.group) === String(g.id) ? 'selected' : ''}>${g.name}</option>`).join('')}
                                </select>
                            </td>`;
                            if (col.id === 'unit') return `
                            <td>
                                <select class="grid-filter-select" onchange="applyGridFilter('unit', this.value)">
                                    <option value="ALL" ${grid.filters.unit === 'ALL' || !grid.filters.unit ? 'selected' : ''}>(Todos)</option>
                                    <option value="UNID" ${grid.filters.unit === 'UNID' ? 'selected' : ''}>UNID</option>
                                    <option value="KG" ${grid.filters.unit === 'KG' ? 'selected' : ''}>KG</option>
                                    <option value="LITRO" ${grid.filters.unit === 'LITRO' ? 'selected' : ''}>LITRO</option>
                                </select>
                            </td>`;
                            return `
                            <td>
                                <div class="filter-input-wrapper">
                                    <i data-lucide="search" class="filter-icon-svg"></i>
                                    <input type="text" class="grid-filter-input" placeholder="Filtrar..." value="${grid.filters[col.id] || ''}" oninput="applyGridFilter('${col.id}', this.value)">
                                </div>
                            </td>`;
                        }).join('')}
                        <td></td>
                    </tr>
                </thead>
                <tbody>
                    ${renderGridBody()}
                </tbody>
            </table>
        </div>
    `;

    function renderGridBody() {
        if (filteredProducts.length === 0) {
            return `<tr><td colspan="10" style="text-align:center; padding: 40px; color: var(--text-sub); font-weight: 600">Nenhum produto atende aos filtros aplicados.</td></tr>`;
        }

        // Renderização Plana — ordem segue columnOrder
        return filteredProducts.slice().sort((a, b) => a.name.localeCompare(b.name)).map(product => {
            const subgroup = state.subgroups.find(sg => sg.id == product.subgroupId);
            const group = subgroup ? state.groups.find(g => g.id == subgroup.groupId) : null;
            const printerName = state.printers.find(pr => pr.id == product.printerId)?.name || 'N/A';
            const stockVal = product.stock !== null && product.stock !== undefined ? product.stock : 'Sem contr.';
            const unitVal = product.unit || 'UNID';

            const cellMap = {
                group:    `<td style="font-weight: 700; color: #475569;">${group ? group.name.toUpperCase() : '-'}</td>`,
                subgroup: `<td style="font-weight: 600; color: #4b5563;">${subgroup ? subgroup.name.toUpperCase() : '-'}</td>`,
                name:     `<td style="font-weight: 700; color: #1e293b;">${product.name}</td>`,
                code:     `<td style="font-family: monospace; font-weight: 700; color: #64748b;">${product.code || '-'}</td>`,
                price:    `<td style="font-weight: 800; color: #2563eb;">R$ ${product.price.toFixed(2)}</td>`,
                unit:     `<td style="font-weight: 700; color: #475569;">${unitVal}</td>`,
                stock:    `<td style="font-weight: 700; color: ${typeof stockVal === 'number' && stockVal <= 10 ? 'var(--danger)' : '#475569'};">${stockVal}</td>`,
                printer:  `<td><span style="padding: 2px 6px; background: #f1f5f9; border-radius: 4px; font-size: 10px; font-weight: 700; color: #475569; border: 1px solid #cbd5e1;">${printerName}</span></td>`
            };

            const cells = orderedVisibleCols.map(col => cellMap[col.id] || '').join('');

            return `
                <tr class="product-row" onclick="openProductModal(${product.id})">
                    ${cells}
                    <td style="text-align: center;" onclick="event.stopPropagation();">
                        <i data-lucide="trash-2" style="width: 14px; color: var(--danger); cursor: pointer;" onclick="removeProduct(${product.id});"></i>
                    </td>
                </tr>
            `;
        }).join('');
    }
}

// ─── Controladores Globais da Grid Avançada ────────────────────────────────

window.toggleGridColumn = function(colId) {
    const hidden = window.catalogueGridState.hiddenColumns;
    if (hidden.includes(colId)) {
        window.catalogueGridState.hiddenColumns = hidden.filter(id => id !== colId);
    } else {
        window.catalogueGridState.hiddenColumns.push(colId);
    }
    renderPage('products');
};

window.restoreAllGridColumns = function() {
    window.catalogueGridState.hiddenColumns = [];
    window.catalogueGridState.columnOrder = ['group', 'subgroup', 'name', 'code', 'price', 'unit', 'stock', 'printer'];
    renderPage('products');
};

// ─── Drag & Drop de Colunas ────────────────────────────────────────────────
let _dragColId = null;

window.startColDrag = function(event, colId) {
    _dragColId = colId;
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', colId);
    setTimeout(() => {
        const th = event.target.closest('th');
        if (th) th.classList.add('dragging');
    }, 0);
};

window.colDragOver = function(event, targetColId) {
    if (!_dragColId || _dragColId === targetColId) return;
    const th = event.target.closest('th');
    // Limpa destaque anterior
    document.querySelectorAll('.tree-table th').forEach(t => t.classList.remove('drag-over'));
    if (th) th.classList.add('drag-over');
};

window.colDragLeave = function(event) {
    const th = event.target.closest('th');
    if (th) th.classList.remove('drag-over');
};

window.dropColReorder = function(event, targetColId) {
    event.preventDefault();
    if (!_dragColId || _dragColId === targetColId) return;
    const order = window.catalogueGridState.columnOrder;
    const fromIdx = order.indexOf(_dragColId);
    const toIdx = order.indexOf(targetColId);
    if (fromIdx === -1 || toIdx === -1) return;
    // Remove a coluna da posição antiga e insere na nova
    order.splice(fromIdx, 1);
    order.splice(toIdx, 0, _dragColId);
    window.catalogueGridState.columnOrder = [...order];
    _dragColId = null;
    renderPage('products');
};

window.dropRemoveColumn = function(event) {
    event.preventDefault();
    const colId = event.dataTransfer.getData('text/plain') || _dragColId;
    if (!colId) return;
    const hidden = window.catalogueGridState.hiddenColumns;
    if (!hidden.includes(colId)) {
        window.catalogueGridState.hiddenColumns = [...hidden, colId];
    }
    _dragColId = null;
    renderPage('products');
};

window.colDragEnd = function(event) {
    _dragColId = null;
    document.querySelectorAll('.tree-table th').forEach(t => {
        t.classList.remove('dragging');
        t.classList.remove('drag-over');
    });
    const zone = document.getElementById('col-remove-zone');
    if (zone) zone.classList.remove('drag-active');
};

window.toggleGridGroup = function(groupType) {
    const grouped = window.catalogueGridState.groupedBy;
    if (grouped.includes(groupType)) {
        window.catalogueGridState.groupedBy = grouped.filter(g => g !== groupType);
    } else {
        window.catalogueGridState.groupedBy.push(groupType);
    }
    renderPage('products');
};

window.applyGridFilter = function(field, val) {
    window.catalogueGridState.filters[field] = val;
    renderPage('products');
};

window.toggleTreeGroup = function(groupId) {
    const icon = document.getElementById(`group-icon-${groupId}`);
    const children = document.querySelectorAll(`.group-child-${groupId}`);
    
    if (icon) {
        icon.classList.toggle('collapsed');
        const isCollapsed = icon.classList.contains('collapsed');
        
        children.forEach(child => {
            if (isCollapsed) {
                child.classList.add('hidden');
                if (child.classList.contains('subgroup-header-row')) {
                    const onclickAttr = child.getAttribute('onclick');
                    if (onclickAttr) {
                        const sgMatch = onclickAttr.match(/toggleTreeSubgroup\((\d+)\)/);
                        if (sgMatch && sgMatch[1]) {
                            const sgId = sgMatch[1];
                            const sgIcon = document.getElementById(`subgroup-icon-${sgId}`);
                            if (sgIcon) sgIcon.classList.add('collapsed');
                            document.querySelectorAll(`.subgroup-child-${sgId}`).forEach(prod => prod.classList.add('hidden'));
                        }
                    }
                }
            } else {
                child.classList.remove('hidden');
            }
        });
    }
    if (window.lucide) lucide.createIcons();
};

window.toggleTreeSubgroup = function(subgroupId) {
    const icon = document.getElementById(`subgroup-icon-${subgroupId}`);
    const children = document.querySelectorAll(`.subgroup-child-${subgroupId}`);
    
    if (icon) {
        icon.classList.toggle('collapsed');
        const isCollapsed = icon.classList.contains('collapsed');
        
        children.forEach(child => {
            if (isCollapsed) {
                child.classList.add('hidden');
            } else {
                child.classList.remove('hidden');
            }
        });
    }
    if (window.lucide) lucide.createIcons();
};

function renderGroups(container) {
    container.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
            <h3 style="font-weight: 800; letter-spacing: -0.03em;">Grupos de Produtos</h3>
            <button class="nav-item" style="background: var(--brand); color: white; width: auto; padding: 10px 20px;" onclick="openGroupModal()">+ Novo Grupo</button>
        </div>
        <div class="glass-card" style="padding: 0; overflow: hidden">
            <table class="modern-table" style="margin: 0">
                <thead>
                    <tr>
                        <th>Ordem</th>
                        <th>Nome do Grupo</th>
                        <th style="width: 100px"></th>
                    </tr>
                </thead>
                <tbody>
                    ${state.groups.length === 0 ? '<tr><td colspan="3" style="text-align:center; padding: 60px; color: var(--text-sub); font-weight: 600">Nenhum grupo cadastrado.</td></tr>' : ''}
                    ${state.groups.sort((a, b) => a.order - b.order).map(g => `
                        <tr>
                            <td style="font-weight: 700">${g.order}</td>
                            <td style="font-weight: 800; color: var(--brand)">${g.name}</td>
                            <td>
                                <div style="display: flex; align-items: center; gap: 12px; justify-content: flex-end;">
                                    <i data-lucide="edit-3" style="width: 18px; color: var(--brand); cursor: pointer" onclick="openGroupModal(${g.id})"></i>
                                    <i data-lucide="trash-2" style="width: 18px; color: var(--danger); cursor: pointer" onclick="removeGroup(${g.id})"></i>
                                </div>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function renderSubgroups(container) {
    container.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
            <h3 style="font-weight: 800; letter-spacing: -0.03em;">Subgrupos e Cores</h3>
            <button class="nav-item" style="background: var(--brand); color: white; width: auto; padding: 10px 20px;" onclick="openSubgroupModal()">+ Novo Subgrupo</button>
        </div>
        <div class="glass-card" style="padding: 0; overflow: hidden">
            <table class="modern-table" style="margin: 0">
                <thead>
                    <tr>
                        <th>Grupo</th>
                        <th>Subgrupo</th>
                        <th>Aparência (Botão PDV)</th>
                        <th style="width: 100px"></th>
                    </tr>
                </thead>
                <tbody>
                    ${state.subgroups.length === 0 ? '<tr><td colspan="4" style="text-align:center; padding: 60px; color: var(--text-sub); font-weight: 600">Nenhum subgrupo cadastrado.</td></tr>' : ''}
                    ${state.subgroups.map(sg => {
        const groupName = state.groups.find(g => g.id == sg.groupId)?.name || 'N/A';
        return `
                        <tr>
                            <td style="font-weight: 700">${groupName}</td>
                            <td style="font-weight: 800;">${sg.name}</td>
                            <td>
                                <div style="display: inline-flex; align-items: center; justify-content: center; padding: 8px 16px; background: ${sg.buttonColor}; color: ${sg.textColor}; border-radius: 8px; font-size: 13px; font-weight: 700; cursor: pointer; box-shadow: var(--shadow-soft);" onclick="openSubgroupModal(${sg.id})">
                                    ${sg.name}
                                </div>
                            </td>
                            <td>
                                <div style="display: flex; align-items: center; gap: 12px; justify-content: flex-end;">
                                    <i data-lucide="edit-3" style="width: 18px; color: var(--brand); cursor: pointer" onclick="openSubgroupModal(${sg.id})"></i>
                                    <i data-lucide="trash-2" style="width: 18px; color: var(--danger); cursor: pointer" onclick="removeSubgroup(${sg.id})"></i>
                                </div>
                            </td>
                        </tr>`;
    }).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function renderPaymentMethods(container) {
    container.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
            <h3 style="font-weight: 800; letter-spacing: -0.03em;">Formas de Pagamento</h3>
            <button class="nav-item" style="background: var(--brand); color: white; width: auto; padding: 10px 20px;" onclick="openPaymentModal()">+ Nova Forma</button>
        </div>
        <div class="glass-card" style="padding: 0; overflow: hidden">
            <table class="modern-table" style="margin: 0">
                <thead>
                    <tr>
                        <th>Código</th>
                        <th>Ordem</th>
                        <th>Nome</th>
                        <th>Aparência (Botão PDV)</th>
                        <th style="width: 100px"></th>
                    </tr>
                </thead>
                <tbody>
                    ${state.paymentMethods.length === 0 ? '<tr><td colspan="5" style="text-align:center; padding: 60px; color: var(--text-sub); font-weight: 600">Nenhuma forma de pagamento cadastrada.</td></tr>' : ''}
                    ${state.paymentMethods.sort((a, b) => a.order - b.order).map(pm => `
                        <tr>
                            <td style="font-weight: 800; color: var(--text-sub);">${pm.code}</td>
                            <td style="font-weight: 700">${pm.order}</td>
                            <td style="font-weight: 800">${pm.name}</td>
                            <td>
                                <div style="display: inline-flex; align-items: center; justify-content: center; padding: 6px 12px; background: ${pm.buttonColor}; color: ${pm.textColor}; border-radius: 8px; font-size: 12px; font-weight: 700; cursor: pointer; box-shadow: var(--shadow-soft);" onclick="openPaymentModal(${pm.id})">
                                    Editar Cor
                                </div>
                            </td>
                            <td>
                                <div style="display: flex; align-items: center; gap: 12px; justify-content: flex-end;">
                                    <i data-lucide="edit-3" style="width: 18px; color: var(--brand); cursor: pointer" onclick="openPaymentModal(${pm.id})"></i>
                                    <i data-lucide="trash-2" style="width: 18px; color: var(--danger); cursor: pointer" onclick="removePaymentMethod(${pm.id})"></i>
                                </div>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// --- CRUD Catálogo ---
let currentEditingProductId = null;

function updateSubgroupDropdown(groupId, selectedSubgroupId = '') {
    const subgroupSelect = document.getElementById('frm-subgroup');
    if (!subgroupSelect) return;
    const filtered = state.subgroups.filter(sg => sg.groupId == groupId);
    subgroupSelect.innerHTML = '<option value="">Selecione o Subgrupo...</option>' + filtered.map(sg =>
        `<option value="${sg.id}" ${sg.id == selectedSubgroupId ? 'selected' : ''}>${sg.name}</option>`
    ).join('');
}

function openProductModal(productId = null) {
    currentEditingProductId = productId;
    const modal = document.getElementById('product-modal');
    const body = document.getElementById('product-form-body');
    const title = document.getElementById('product-modal-title');

    let prod = { name: '', price: 0, cost: 0, code: '', order: 0, stock: '', printerId: state.printers[0]?.id || 1, subgroupId: '', useNameOnPrint: true, description: '' };

    if (productId) {
        const found = state.products.find(p => p.id === productId);
        if (found) prod = { ...prod, ...found };
        title.innerText = 'Editar Produto';
    } else {
        title.innerText = 'Novo Produto';
    }

    let initialGroupId = '';
    if (prod.subgroupId) {
        const sg = state.subgroups.find(s => s.id == prod.subgroupId);
        if (sg) initialGroupId = sg.groupId;
    }

    const groupsOptions = '<option value="">Selecione o Grupo...</option>' + state.groups.map(g =>
        `<option value="${g.id}" ${g.id == initialGroupId ? 'selected' : ''}>${g.name}</option>`
    ).join('');

    const printersOptions = state.printers.map(pr =>
        `<option value="${pr.id}" ${pr.id == prod.printerId ? 'selected' : ''}>${pr.name}</option>`
    ).join('');

    body.innerHTML = `
        <div style="display: flex; justify-content: space-between; margin-bottom: 24px; padding-bottom: 12px; border-bottom: 1px dashed var(--border-med);">
            <span style="font-weight: 800; font-size: 14px; color: var(--text-sub);"># ${productId || 'NOVO'}</span>
            <span style="font-size: 12px; color: var(--text-sub); font-weight: 600;">Data: ${new Date().toLocaleDateString()}</span>
            <label style="font-size: 12px; font-weight: 800; display: flex; align-items: center; gap: 8px;">
                Controlar estoque? <input type="checkbox" id="frm-control-stock" ${prod.stock !== '' && prod.stock !== null ? 'checked' : ''} onchange="document.getElementById('frm-stock').disabled = !this.checked">
            </label>
        </div>
        <div class="form-grid">
            <div class="form-group col-2">
                <label class="form-label">Código</label>
                <input type="text" class="form-control" id="frm-code" value="${prod.code || ''}">
            </div>
            <div class="form-group col-8">
                <label class="form-label">Nome</label>
                <input type="text" class="form-control" id="frm-name" value="${prod.name}">
            </div>
            <div class="form-group col-2">
                <label class="form-label">Ordem</label>
                <input type="number" class="form-control" id="frm-order" value="${prod.order || 0}">
            </div>
        </div>
        <div class="form-grid">
            <div class="form-group col-4">
                <label class="form-label">$ Última Compra (UNID)</label>
                <div style="position:relative;">
                    <span style="position:absolute; left:12px; top:10px; color:var(--text-sub); font-size:14px; font-weight:600;">R$</span>
                    <input type="number" step="0.01" class="form-control" id="frm-cost" value="${prod.cost || ''}" style="padding-left:36px; width:100%;">
                </div>
            </div>
            <div class="form-group col-4">
                <label class="form-label">$ Venda</label>
                <div style="position:relative;">
                    <span style="position:absolute; left:12px; top:10px; color:var(--text-sub); font-size:14px; font-weight:600;">R$</span>
                    <input type="number" step="0.01" class="form-control" id="frm-price" value="${prod.price ? prod.price.toFixed(2) : ''}" style="padding-left:36px; width:100%;">
                </div>
            </div>
            <div class="form-group col-4">
                <label class="form-label">Estoque</label>
                <input type="number" class="form-control" id="frm-stock" value="${prod.stock !== null ? prod.stock : ''}" ${prod.stock !== '' && prod.stock !== null ? '' : 'disabled'}>
            </div>
        </div>

        <div class="form-grid">
            <div class="form-group col-4">
                <label class="form-label">Grupo</label>
                <select class="form-control" id="frm-group" onchange="updateSubgroupDropdown(this.value)">
                    ${groupsOptions}
                </select>
            </div>
            <div class="form-group col-4">
                <label class="form-label">Subgrupo</label>
                <select class="form-control" id="frm-subgroup">
                    <option value="">Selecione o Grupo primeiro...</option>
                </select>
            </div>
            <div class="form-group col-4">
                <label class="form-label">Local Impressão</label>
                <select class="form-control" id="frm-printer">
                    ${printersOptions}
                </select>
            </div>
        </div>
        <div class="form-group" style="margin-bottom: 16px;">
            <label style="display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; cursor: pointer;">
                <input type="checkbox" id="frm-usename" ${prod.useNameOnPrint !== false ? 'checked' : ''}>
                Usar nome do produto no impresso
            </label>
        </div>
        <div class="form-group col-12">
            <label class="form-label">Descrição</label>
            <textarea class="form-control" id="frm-desc" rows="2">${prod.description || ''}</textarea>
        </div>
    `;

    // ─── Módulo de Precificação ────────────────────────────────────────────
    // Remove módulo anterior se existir
    const oldPrec = document.getElementById('prec-module-host');
    if (oldPrec) oldPrec.remove();
    const oldDivider = document.getElementById('prec-divider-sep');
    if (oldDivider) oldDivider.remove();

    // Separador visual
    const precDivider = document.createElement('div');
    precDivider.id = 'prec-divider-sep';
    precDivider.style.cssText = 'margin: 12px 0 0; height: 1.5px; background: linear-gradient(to right, transparent, var(--border-med, #e3e1da) 30%, var(--border-med, #e3e1da) 70%, transparent); opacity: 0.9;';
    body.appendChild(precDivider);

    // Container do módulo de precificação
    const precHost = document.createElement('div');
    precHost.id = 'prec-module-host';
    body.appendChild(precHost);
    // ──────────────────────────────────────────────────────────────────────

    const footer = document.querySelector('.modal-footer');
    footer.innerHTML = `
        <button class="btn-cancel" onclick="closeProductModal()">Cancelar</button>
        <button class="btn-save" onclick="saveProductForm()">Gravar</button>
    `;

    updateSubgroupDropdown(initialGroupId, prod.subgroupId);

    window.currentSelectedIcon = prod.icon || 'package';
    const iconWrapper = document.getElementById('product-icon-wrapper');
    if (iconWrapper) {
        iconWrapper.style.display = 'block';
        document.getElementById('product-icon-preview').innerHTML = `<i data-lucide="${window.currentSelectedIcon}" style="width: 14px;"></i>`;
        document.getElementById('product-icon-name').innerText = window.currentSelectedIcon;
    }

    modal.classList.add('active');
    lucide.createIcons();

    // Inicializa módulo de precificação (com delay mínimo para DOM estar pronto)
    if (typeof window.initPrecificacao === 'function') {
        setTimeout(() => window.initPrecificacao('prec-module-host', prod), 60);
    }
}

window.toggleIconDropdown = function (e) {
    e.stopPropagation();
    const menu = document.getElementById('icon-dropdown-menu');
    if (!menu) return;

    if (menu.style.display === 'none') {
        const icons = ['beer', 'cup-soda', 'coffee', 'utensils', 'pizza', 'sandwich', 'soup', 'cookie', 'wine', 'glass-water', 'package', 'tag', 'ticket', 'shopping-cart', 'receipt', 'gift', 'flame'];
        menu.innerHTML = icons.map(ic => `
            <div onclick="selectProductIcon('${ic}')" style="display: flex; align-items: center; gap: 12px; padding: 8px 16px; cursor: pointer; transition: 0.2s;" onmouseover="this.style.background='var(--surface-light)'" onmouseout="this.style.background='transparent'">
                <i data-lucide="${ic}" style="width: 16px; color: var(--text-sub);"></i>
                <span style="font-size: 13px; font-weight: 600; text-transform: capitalize; color: var(--text-sub);">${ic}</span>
            </div>
        `).join('');
        menu.style.display = 'block';
        lucide.createIcons();
    } else {
        menu.style.display = 'none';
    }
}

window.selectProductIcon = function (iconName) {
    window.currentSelectedIcon = iconName;
    document.getElementById('product-icon-preview').innerHTML = `<i data-lucide="${iconName}" style="width: 14px;"></i>`;
    document.getElementById('product-icon-name').innerText = iconName;
    document.getElementById('icon-dropdown-menu').style.display = 'none';
    lucide.createIcons();
}

document.addEventListener('click', function (e) {
    const wrapper = document.getElementById('product-icon-wrapper');
    const menu = document.getElementById('icon-dropdown-menu');
    if (wrapper && menu && !wrapper.contains(e.target)) {
        menu.style.display = 'none';
    }
});

function closeProductModal() {
    document.getElementById('product-modal').classList.remove('active');
    const iconWrapper = document.getElementById('product-icon-wrapper');
    if (iconWrapper) iconWrapper.style.display = 'none';
    const menu = document.getElementById('icon-dropdown-menu');
    if (menu) menu.style.display = 'none';
}

function saveProductForm() {
    const name = document.getElementById('frm-name').value.trim();
    if (!name) return alert('Nome do produto é obrigatório.');
    const price = parseFloat(document.getElementById('frm-price').value) || 0;
    const subgroupId = parseInt(document.getElementById('frm-subgroup').value) || null;
    if (!subgroupId) return alert('Selecione um subgrupo válido.');
    const newProd = {
        id: currentEditingProductId || Date.now(),
        code: document.getElementById('frm-code').value,
        name,
        order: parseInt(document.getElementById('frm-order').value) || 0,
        cost: parseFloat(document.getElementById('frm-cost').value) || 0,
        price,
        stock: document.getElementById('frm-control-stock').checked ? (parseInt(document.getElementById('frm-stock').value) || 0) : null,
        subgroupId,
        printerId: parseInt(document.getElementById('frm-printer').value),
        useNameOnPrint: document.getElementById('frm-usename').checked,
        description: document.getElementById('frm-desc').value,
        icon: window.currentSelectedIcon || 'package'
    };
    if (currentEditingProductId) {
        state.products = state.products.map(p => p.id === currentEditingProductId ? { ...p, ...newProd } : p);
    } else {
        state.products.push(newProd);
    }
    saveData();
    closeProductModal();
    renderPage('products');
}

function removeProduct(id) {
    if (confirm('Remover este item do catálogo?')) {
        state.products = state.products.filter(p => p.id !== id);
        saveData();
        renderPage('products');
    }
}

// ─── EXPORTAR MODELO DE PLANILHA ────────────────────────────────────────────
window.downloadProductTemplate = function () {
    if (typeof XLSX === 'undefined') {
        return alert('A biblioteca de Excel ainda está carregando. Aguarde um segundo e tente novamente.');
    }

    // Cabeçalhos da planilha modelo
    const headers = [
        'Codigo', 'Nome', 'PrecoVenda', 'Custo', 'Ordem',
        'Estoque', 'Grupo', 'Subgrupo', 'Impressora',
        'UsarNomeNoImpresso', 'Descricao'
    ];

    // Linhas de exemplo
    const exampleRows = [
        {
            Codigo: '101', Nome: 'Heineken Long Neck', PrecoVenda: 12.00, Custo: 6.50, Ordem: 1,
            Estoque: 100, Grupo: 'BEBIDAS', Subgrupo: 'Cervejas e Refris',
            Impressora: 'IMPRESSORA BAR', UsarNomeNoImpresso: 'Sim', Descricao: 'Cerveja gelada long neck 330ml'
        },
        {
            Codigo: '102', Nome: 'Coca-Cola 350ml', PrecoVenda: 6.00, Custo: 2.80, Ordem: 2,
            Estoque: 200, Grupo: 'BEBIDAS', Subgrupo: 'Cervejas e Refris',
            Impressora: 'IMPRESSORA BAR', UsarNomeNoImpresso: 'Sim', Descricao: 'Refrigerante lata'
        },
        {
            Codigo: '201', Nome: 'X-Burguer Artesanal', PrecoVenda: 28.00, Custo: 12.00, Ordem: 1,
            Estoque: 50, Grupo: 'COMIDA', Subgrupo: 'Lanches e Porções',
            Impressora: 'IMPRESSORA COZINHA', UsarNomeNoImpresso: 'Sim', Descricao: 'Hambúrguer artesanal 180g'
        },
        {
            Codigo: '301', Nome: 'Suco de Laranja Natural', PrecoVenda: 9.00, Custo: 3.50, Ordem: 3,
            Estoque: '', Grupo: 'BEBIDAS', Subgrupo: 'Sucos Naturais',
            Impressora: 'IMPRESSORA BAR', UsarNomeNoImpresso: 'Sim', Descricao: 'Suco natural 300ml sem açúcar'
        }
    ];

    // Cria uma nota de instrução na linha 1
    const wsData = [
        // Linha de instrução (mesclada visualmente por ser a primeira)
        ['INSTRUÇÕES: Preencha a partir da linha 3. Não altere os cabeçalhos da linha 2. Campos obrigatórios: Nome e Grupo. UsarNomeNoImpresso: Sim ou Não. Estoque: deixe vazio se não controlar.'],
        headers,
        ...exampleRows.map(r => headers.map(h => r[h] !== undefined ? r[h] : ''))
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Largura das colunas
    ws['!cols'] = [
        { wch: 10 }, { wch: 30 }, { wch: 14 }, { wch: 12 }, { wch: 8 },
        { wch: 10 }, { wch: 20 }, { wch: 22 }, { wch: 22 },
        { wch: 20 }, { wch: 35 }
    ];

    // Mescla a célula de instrução para cobrir todos os cabeçalhos
    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Produtos');
    XLSX.writeFile(wb, 'modelo_importacao_produtos.xlsx');
};

// ─── IMPORTAR PRODUTOS VIA PLANILHA ─────────────────────────────────────────
window.importProductsFromExcel = function (event) {
    const file = event.target.files[0];
    if (!file) return;

    if (typeof XLSX === 'undefined') {
        return alert('A biblioteca de Excel ainda está carregando. Aguarde um segundo e tente novamente.');
    }

    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];

            // Detecta onde começa o cabeçalho (procura pela linha com 'Codigo' ou 'Nome')
            // Converte para array de arrays para localizar o cabeçalho corretamente
            const rawAoa = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
            let headerRowIndex = -1;
            for (let i = 0; i < rawAoa.length; i++) {
                const row = rawAoa[i].map(c => String(c).trim().toLowerCase());
                if (row.includes('nome') && row.includes('precovenda')) {
                    headerRowIndex = i;
                    break;
                }
            }

            if (headerRowIndex === -1) {
                return alert('Erro: Planilha inválida!\n\nNão foi possível encontrar os cabeçalhos obrigatórios (Nome, PrecoVenda).\n\nBaixe o modelo clicando em "Ver Modelo Excel" e preencha conforme as instruções.');
            }

            const rows = XLSX.utils.sheet_to_json(sheet, { range: headerRowIndex, defval: '' });

            if (rows.length === 0) {
                return alert('Aviso: A planilha não contém produtos para importar.\n\nPreencha pelo menos uma linha abaixo do cabeçalho e tente novamente.');
            }

            let novos = 0;
            let atualizados = 0;
            let erros = [];

            // Copia profunda para não mutar state diretamente antes de concluir
            let produtos = [...state.products];
            let grupos = [...state.groups];
            let subgrupos = [...state.subgroups];

            // Função auxiliar: normaliza texto
            const norm = v => String(v || '').trim();

            rows.forEach((row, idx) => {
                const nome = norm(row['Nome'] || row['nome'] || row['NOME']);
                const grupoNome = norm(row['Grupo'] || row['grupo'] || row['GRUPO']).toUpperCase();
                const subgrupoNome = norm(row['Subgrupo'] || row['subgrupo'] || row['SUBGRUPO']);

                // Valida campos obrigatórios
                if (!nome) {
                    erros.push(`Linha ${idx + headerRowIndex + 2}: campo "Nome" está vazio. Linha ignorada.`);
                    return;
                }
                if (!grupoNome) {
                    erros.push(`Linha ${idx + headerRowIndex + 2} ("${nome}"): campo "Grupo" está vazio. Linha ignorada.`);
                    return;
                }

                // ── Resolver Grupo ──────────────────────────────────────
                let grupo = grupos.find(g => g.name.toUpperCase() === grupoNome);
                if (!grupo) {
                    const newGrupoId = Date.now() + Math.floor(Math.random() * 10000);
                    grupo = {
                        id: newGrupoId,
                        name: grupoNome,
                        order: grupos.length + 1
                    };
                    grupos.push(grupo);
                }

                // ── Resolver Subgrupo ───────────────────────────────────
                let subgrupo = null;
                if (subgrupoNome) {
                    subgrupo = subgrupos.find(sg => sg.name.toUpperCase() === subgrupoNome.toUpperCase() && sg.groupId == grupo.id);
                    if (!subgrupo) {
                        // Tenta achar pelo nome sem considerar o grupo
                        subgrupo = subgrupos.find(sg => sg.name.toUpperCase() === subgrupoNome.toUpperCase());
                    }
                    if (!subgrupo) {
                        const newSgId = Date.now() + Math.floor(Math.random() * 10000) + 1;
                        const cores = ['#3b82f6', '#f97316', '#22c55e', '#6366f1', '#ec4899', '#f59e0b', '#ef4444'];
                        subgrupo = {
                            id: newSgId,
                            groupId: grupo.id,
                            name: subgrupoNome,
                            buttonColor: cores[subgrupos.length % cores.length],
                            textColor: '#ffffff'
                        };
                        subgrupos.push(subgrupo);
                    }
                }

                // ── Resolver Impressora ─────────────────────────────────
                const impressoraNome = norm(row['Impressora'] || row['impressora'] || row['IMPRESSORA']);
                let impressora = state.printers.find(pr => pr.name.toUpperCase() === impressoraNome.toUpperCase());
                if (!impressora && state.printers.length > 0) {
                    impressora = state.printers[0]; // fallback para primeira impressora
                }

                // ── Montar objeto do produto ────────────────────────────
                const codigo = norm(row['Codigo'] || row['codigo'] || row['CODIGO'] || row['Código']);
                const preco = parseFloat(String(row['PrecoVenda'] || row['precovenda'] || row['PRECOVENDA'] || row['Preço'] || '0').replace(',', '.')) || 0;
                const custo = parseFloat(String(row['Custo'] || row['custo'] || '0').replace(',', '.')) || 0;
                const ordem = parseInt(row['Ordem'] || row['ordem'] || '0') || 0;
                const estoqueRaw = norm(row['Estoque'] || row['estoque'] || '');
                const estoque = estoqueRaw !== '' ? (parseInt(estoqueRaw) || 0) : null;
                const usarNome = norm(row['UsarNomeNoImpresso'] || row['usarnomenoimpresso'] || 'Sim').toLowerCase() !== 'não' && norm(row['UsarNomeNoImpresso'] || row['usarnomenoimpresso'] || 'Sim').toLowerCase() !== 'nao';
                const descricao = norm(row['Descricao'] || row['descricao'] || row['Descrição'] || '');

                const prodObj = {
                    name: nome,
                    code: codigo,
                    price: preco,
                    cost: custo,
                    order: ordem,
                    stock: estoque,
                    subgroupId: subgrupo ? subgrupo.id : null,
                    printerId: impressora ? impressora.id : null,
                    useNameOnPrint: usarNome,
                    description: descricao,
                    icon: 'package'
                };

                // ── Upsert: atualiza por código (se existir) ou insere ──
                if (codigo) {
                    const idx = produtos.findIndex(p => norm(p.code) === codigo);
                    if (idx !== -1) {
                        produtos[idx] = { ...produtos[idx], ...prodObj };
                        atualizados++;
                        return;
                    }
                }

                // Produto novo
                prodObj.id = Date.now() + Math.floor(Math.random() * 100000);
                produtos.push(prodObj);
                novos++;
            });

            // Limpa o input para permitir reimportação do mesmo arquivo
            event.target.value = '';

            if (erros.length > 0 && novos === 0 && atualizados === 0) {
                return alert('Erro: Nenhum produto foi importado por erros:\n\n' + erros.slice(0, 5).join('\n'));
            }

            // Aplica no estado global
            state.products = produtos;
            state.groups = grupos;
            state.subgroups = subgrupos;

            // Salva tudo no servidor (grupos + subgrupos + produtos em transação única)
            pushToServer({ products: state.products, groups: state.groups, subgroups: state.subgroups });

            // Recarrega a tela
            renderPage('products');
            lucide.createIcons();

            // Feedback detalhado
            let msg = `Importação concluída com sucesso!\n\n`;
            msg += `${novos} novo(s) produto(s) adicionado(s)\n`;
            msg += `${atualizados} produto(s) atualizado(s)`;
            if (erros.length > 0) {
                msg += `\nLinhas ignoradas por erro: ${erros.length}`;
            }
            alert(msg);

        } catch (err) {
            console.error('Erro ao importar planilha:', err);
            alert('Erro ao ler o arquivo.\n\nVerifique se é um arquivo Excel válido (.xlsx, .xls ou .csv) e tente novamente.\n\nDetalhe: ' + err.message);
        }
    };

    reader.readAsArrayBuffer(file);
};


let currentEditingGroupId = null;

window.openGroupModal = function (groupId = null) {
    currentEditingGroupId = groupId;
    const modal = document.getElementById('product-modal');
    const body = document.getElementById('product-form-body');
    const title = document.getElementById('product-modal-title');

    let grp = { order: 0, name: '' };
    if (groupId) {
        const found = state.groups.find(g => g.id === groupId);
        if (found) grp = { ...grp, ...found };
        title.innerText = 'Editar Grupo';
    } else {
        title.innerText = 'Novo Grupo';
    }

    body.innerHTML = `
        <div class="form-grid">
            <div class="form-group col-4">
                <label class="form-label">Ordem de Exibição</label>
                <input type="number" class="form-control" id="frm-grp-order" value="${grp.order}" placeholder="Ex: 1">
            </div>
            <div class="form-group col-8">
                <label class="form-label">Nome do Grupo</label>
                <input type="text" class="form-control" id="frm-grp-name" value="${grp.name}" placeholder="Ex: ALIMENTOS">
            </div>
        </div>
    `;

    const footer = document.querySelector('.modal-footer');
    footer.innerHTML = `
        <button class="btn-cancel" onclick="closeProductModal()">Cancelar</button>
        <button class="btn-save" onclick="saveGroupForm()">Gravar</button>
    `;

    modal.classList.add('active');
}

window.saveGroupForm = function () {
    const name = document.getElementById('frm-grp-name').value.trim().toUpperCase();
    const order = parseInt(document.getElementById('frm-grp-order').value) || 0;

    if (!name) return alert('Nome do grupo é obrigatório.');

    const newGrp = { id: currentEditingGroupId || Date.now(), name, order };

    if (currentEditingGroupId) {
        state.groups = state.groups.map(g => g.id === currentEditingGroupId ? { ...g, ...newGrp } : g);
    } else {
        state.groups.push(newGrp);
    }
    saveData();
    renderPage('groups');
    closeProductModal();
}

function removeGroup(id) {
    if (confirm('Remover este grupo? Os subgrupos vinculados podem ser afetados.')) {
        state.groups = state.groups.filter(g => g.id !== id);
        saveData();
        renderPage('groups');
    }
}

let currentEditingSubgroupId = null;

window.openSubgroupModal = function (subgroupId = null) {
    currentEditingSubgroupId = subgroupId;
    const modal = document.getElementById('product-modal');
    const body = document.getElementById('product-form-body');
    const title = document.getElementById('product-modal-title');

    if (state.groups.length === 0) {
        return alert('Crie um grupo primeiro antes de cadastrar subgrupos.');
    }

    let sg = { groupId: '', name: '', buttonColor: '#f97316', textColor: '#ffffff' };
    if (subgroupId) {
        const found = state.subgroups.find(s => s.id === subgroupId);
        if (found) sg = { ...sg, ...found };
        title.innerText = 'Editar Subgrupo';
    } else {
        title.innerText = 'Novo Subgrupo';
    }

    const groupsOptions = '<option value="">Selecione o Grupo...</option>' + state.groups.map(g =>
        `<option value="${g.id}" ${g.id == sg.groupId ? 'selected' : ''}>${g.name}</option>`
    ).join('');

    body.innerHTML = `
        <div class="form-grid">
            <div class="form-group col-12">
                <label class="form-label">Grupo Pertencente</label>
                <select class="form-control" id="frm-sg-group">${groupsOptions}</select>
            </div>
            <div class="form-group col-12">
                <label class="form-label">Nome do Subgrupo</label>
                <input type="text" class="form-control" id="frm-sg-name" value="${sg.name}" placeholder="Ex: Hambúrgueres">
            </div>
        </div>
        <div class="form-grid" style="margin-top: 16px; padding-top: 16px; border-top: 1px dashed var(--border-med);">
            <div class="form-group col-12" style="margin-bottom: 8px;">
                <label class="form-label" style="font-size: 13px; font-weight: 800; color: var(--text-sub);">Aparência do Botão (Opcional)</label>
            </div>
            <div class="form-group col-6">
                <label class="form-label">Cor de Fundo</label>
                <div style="position: relative; display: flex; align-items: center; border: 1px solid var(--border-med); border-radius: 4px; background: white; height: 38px; cursor: pointer; overflow: hidden;" onclick="document.getElementById('frm-sg-bg-color').showPicker ? document.getElementById('frm-sg-bg-color').showPicker() : document.getElementById('frm-sg-bg-color').click()">
                    <div id="frm-sg-bg-preview" style="width: 16px; height: 16px; background: ${sg.buttonColor}; margin-left: 12px; border-radius: 2px;"></div>
                    <input type="text" id="frm-sg-bg-text" value="${sg.buttonColor}" style="border: none; outline: none; background: transparent; padding: 0 10px; flex: 1; font-family: monospace; font-size: 13px; color: #333;" onclick="event.stopPropagation()">
                    <div style="width: 32px; height: 100%; border-left: 1px solid var(--border-med); display: flex; align-items: center; justify-content: center; background: #f9fafb;">
                        <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 1L5 5L9 1" stroke="#666" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                    </div>
                    <input type="color" id="frm-sg-bg-color" value="${sg.buttonColor}" style="position: absolute; opacity: 0; pointer-events: none;">
                </div>
            </div>
            <div class="form-group col-6">
                <label class="form-label">Cor da Letra</label>
                <div style="position: relative; display: flex; align-items: center; border: 1px solid var(--border-med); border-radius: 4px; background: white; height: 38px; cursor: pointer; overflow: hidden;" onclick="document.getElementById('frm-sg-txt-color').showPicker ? document.getElementById('frm-sg-txt-color').showPicker() : document.getElementById('frm-sg-txt-color').click()">
                    <div id="frm-sg-txt-preview" style="width: 16px; height: 16px; background: ${sg.textColor}; margin-left: 12px; border-radius: 2px; border: 1px solid #ddd;"></div>
                    <input type="text" id="frm-sg-txt-text" value="${sg.textColor}" style="border: none; outline: none; background: transparent; padding: 0 10px; flex: 1; font-family: monospace; font-size: 13px; color: #333;" onclick="event.stopPropagation()">
                    <div style="width: 32px; height: 100%; border-left: 1px solid var(--border-med); display: flex; align-items: center; justify-content: center; background: #f9fafb;">
                        <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 1L5 5L9 1" stroke="#666" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                    </div>
                    <input type="color" id="frm-sg-txt-color" value="${sg.textColor}" style="position: absolute; opacity: 0; pointer-events: none;">
                </div>
            </div>
        </div>
    `;

    setTimeout(() => {
        const bgColor = document.getElementById('frm-sg-bg-color');
        const bgText = document.getElementById('frm-sg-bg-text');
        const bgPreview = document.getElementById('frm-sg-bg-preview');

        const txtColor = document.getElementById('frm-sg-txt-color');
        const txtText = document.getElementById('frm-sg-txt-text');
        const txtPreview = document.getElementById('frm-sg-txt-preview');

        if (bgColor && bgText && bgPreview) {
            bgColor.addEventListener('input', (e) => {
                bgText.value = e.target.value;
                bgPreview.style.background = e.target.value;
            });
            bgText.addEventListener('input', (e) => {
                bgColor.value = e.target.value;
                bgPreview.style.background = e.target.value;
            });
        }

        if (txtColor && txtText && txtPreview) {
            txtColor.addEventListener('input', (e) => {
                txtText.value = e.target.value;
                txtPreview.style.background = e.target.value;
            });
            txtText.addEventListener('input', (e) => {
                txtColor.value = e.target.value;
                txtPreview.style.background = e.target.value;
            });
        }
    }, 50);

    const footer = document.querySelector('.modal-footer');
    footer.innerHTML = `
        <button class="btn-cancel" onclick="closeProductModal()">Cancelar</button>
        <button class="btn-save" onclick="saveSubgroupForm()">Gravar</button>
    `;

    modal.classList.add('active');
}

window.saveSubgroupForm = function () {
    const groupId = parseInt(document.getElementById('frm-sg-group').value);
    const name = document.getElementById('frm-sg-name').value.trim();
    const buttonColor = document.getElementById('frm-sg-bg-text').value.trim() || '#f97316';
    const textColor = document.getElementById('frm-sg-txt-text').value.trim() || '#ffffff';

    if (!groupId) return alert('Selecione o grupo ao qual o subgrupo pertence.');
    if (!name) return alert('Nome do subgrupo é obrigatório.');

    const newSg = { id: currentEditingSubgroupId || Date.now(), groupId, name, buttonColor, textColor };

    if (currentEditingSubgroupId) {
        state.subgroups = state.subgroups.map(s => s.id === currentEditingSubgroupId ? { ...s, ...newSg } : s);
    } else {
        state.subgroups.push(newSg);
    }
    saveData();
    renderPage('subgroups');
    closeProductModal();
}

function removeSubgroup(id) {
    if (confirm('Remover este subgrupo?')) {
        state.subgroups = state.subgroups.filter(sg => sg.id !== id);
        saveData();
        renderPage('subgroups');
    }
}

// --- CRUD Formas de Pagamento ---
let currentEditingPaymentId = null;

function openPaymentModal(paymentId = null) {
    currentEditingPaymentId = paymentId;
    const modal = document.getElementById('product-modal');
    const body = document.getElementById('product-form-body');
    const title = document.getElementById('product-modal-title');
    let pm = { code: '', order: '', name: '', buttonColor: '#f3f4f6', textColor: '#000000' };
    if (paymentId) {
        const found = state.paymentMethods.find(p => p.id === paymentId);
        if (found) pm = { ...pm, ...found };
        title.innerText = 'Editar Forma de Pgto';
    } else {
        title.innerText = 'Nova Forma de Pgto';
    }
    body.innerHTML = `
        <div class="form-grid">
            <div class="form-group col-3">
                <label class="form-label">Código</label>
                <input type="text" class="form-control" id="frm-pay-code" value="${pm.code}">
            </div>
            <div class="form-group col-3">
                <label class="form-label">Ordem</label>
                <input type="number" class="form-control" id="frm-pay-order" value="${pm.order}">
            </div>
            <div class="form-group col-6">
                <label class="form-label">Nome</label>
                <input type="text" class="form-control" id="frm-pay-name" value="${pm.name}">
            </div>
        </div>
        <div class="form-grid" style="margin-top: 16px; padding-top: 16px; border-top: 1px dashed var(--border-med);">
            <div class="form-group col-12" style="margin-bottom: 8px;">
                <label class="form-label" style="font-size: 13px; font-weight: 800; color: var(--text-sub);">Aparência do Botão (Opcional)</label>
            </div>
            <div class="form-group col-6">
                <label class="form-label">Cor de Fundo</label>
                <div style="position: relative; display: flex; align-items: center; border: 1px solid var(--border-med); border-radius: 4px; background: white; height: 38px; cursor: pointer; overflow: hidden;" onclick="document.getElementById('frm-pay-bg-color').showPicker ? document.getElementById('frm-pay-bg-color').showPicker() : document.getElementById('frm-pay-bg-color').click()">
                    <div id="frm-pay-bg-preview" style="width: 16px; height: 16px; background: ${pm.buttonColor}; margin-left: 12px; border-radius: 2px;"></div>
                    <input type="text" id="frm-pay-bg-text" value="${pm.buttonColor}" style="border: none; outline: none; background: transparent; padding: 0 10px; flex: 1; font-family: monospace; font-size: 13px; color: #333;" onclick="event.stopPropagation()">
                    <div style="width: 32px; height: 100%; border-left: 1px solid var(--border-med); display: flex; align-items: center; justify-content: center; background: #f9fafb;">
                        <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 1L5 5L9 1" stroke="#666" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                    </div>
                    <input type="color" id="frm-pay-bg-color" value="${pm.buttonColor}" style="position: absolute; opacity: 0; pointer-events: none;">
                </div>
            </div>
            <div class="form-group col-6">
                <label class="form-label">Cor da Letra</label>
                <div style="position: relative; display: flex; align-items: center; border: 1px solid var(--border-med); border-radius: 4px; background: white; height: 38px; cursor: pointer; overflow: hidden;" onclick="document.getElementById('frm-pay-txt-color').showPicker ? document.getElementById('frm-pay-txt-color').showPicker() : document.getElementById('frm-pay-txt-color').click()">
                    <div id="frm-pay-txt-preview" style="width: 16px; height: 16px; background: ${pm.textColor}; margin-left: 12px; border-radius: 2px; border: 1px solid #ddd;"></div>
                    <input type="text" id="frm-pay-txt-text" value="${pm.textColor}" style="border: none; outline: none; background: transparent; padding: 0 10px; flex: 1; font-family: monospace; font-size: 13px; color: #333;" onclick="event.stopPropagation()">
                    <div style="width: 32px; height: 100%; border-left: 1px solid var(--border-med); display: flex; align-items: center; justify-content: center; background: #f9fafb;">
                        <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 1L5 5L9 1" stroke="#666" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                    </div>
                    <input type="color" id="frm-pay-txt-color" value="${pm.textColor}" style="position: absolute; opacity: 0; pointer-events: none;">
                </div>
            </div>
        </div>
    `;

    setTimeout(() => {
        const bgColor = document.getElementById('frm-pay-bg-color');
        const bgText = document.getElementById('frm-pay-bg-text');
        const bgPreview = document.getElementById('frm-pay-bg-preview');

        const txtColor = document.getElementById('frm-pay-txt-color');
        const txtText = document.getElementById('frm-pay-txt-text');
        const txtPreview = document.getElementById('frm-pay-txt-preview');

        if (bgColor && bgText && bgPreview) {
            bgColor.addEventListener('input', (e) => {
                bgText.value = e.target.value;
                bgPreview.style.background = e.target.value;
            });
            bgText.addEventListener('input', (e) => {
                bgColor.value = e.target.value;
                bgPreview.style.background = e.target.value;
            });
        }

        if (txtColor && txtText && txtPreview) {
            txtColor.addEventListener('input', (e) => {
                txtText.value = e.target.value;
                txtPreview.style.background = e.target.value;
            });
            txtText.addEventListener('input', (e) => {
                txtColor.value = e.target.value;
                txtPreview.style.background = e.target.value;
            });
        }
    }, 50);

    const footer = document.querySelector('.modal-footer');
    footer.innerHTML = `
        <button class="btn-cancel" onclick="closeProductModal()">Cancelar</button>
        <button class="btn-save" onclick="savePaymentForm()">Gravar</button>
    `;
    modal.classList.add('active');
}

window.savePaymentForm = function () {
    const code = document.getElementById('frm-pay-code').value.trim();
    const order = parseInt(document.getElementById('frm-pay-order').value) || 0;
    const name = document.getElementById('frm-pay-name').value.trim();
    const buttonColor = document.getElementById('frm-pay-bg-text').value.trim() || '#f3f4f6';
    const textColor = document.getElementById('frm-pay-txt-text').value.trim() || '#000000';

    if (!code || !name) return alert('Código e Nome são obrigatórios.');

    const newPm = { id: currentEditingPaymentId || Date.now(), code, order, name, buttonColor, textColor };

    if (currentEditingPaymentId) {
        state.paymentMethods = state.paymentMethods.map(p => p.id === currentEditingPaymentId ? { ...p, ...newPm } : p);
    } else {
        state.paymentMethods.push(newPm);
    }
    saveData();
    renderPage('paymentMethods');
    closeProductModal();
}

function removePaymentMethod(id) {
    if (confirm('Remover forma de pagamento?')) {
        state.paymentMethods = state.paymentMethods.filter(p => p.id !== id);
        saveData();
        renderPage('paymentMethods');
    }
}

// --- IMPRESSORAS ---

const PRINTER_MODELS = [
    { brand: 'Epson', models: ['Epson TM-T20', 'Epson TM-T20X', 'Epson TM-T20III', 'Epson TM-T88V', 'Epson TM-T88VI', 'Epson TM-T88VII', 'Epson TM-U220', 'Epson TM-L90'] },
    { brand: 'Elgin', models: ['Elgin i9', 'Elgin i7', 'Elgin i8', 'Elgin RM-23'] },
    { brand: 'Bematech', models: ['Bematech MP-4200 TH', 'Bematech MP-2800 TH', 'Bematech MP-100S TH', 'Bematech MP-4000 TH'] },
    { brand: 'Daruma', models: ['Daruma DR700', 'Daruma DR600', 'Daruma DR800'] },
    { brand: 'Gertec', models: ['Gertec GT-825', 'Gertec GS-100'] },
    { brand: 'Sweda', models: ['Sweda SI-300S', 'Sweda SI-150'] },
    { brand: 'Tanca', models: ['Tanca TP-650', 'Tanca TP-550', 'Tanca TP-450'] },
    { brand: 'Custom', models: ['Custom Q3X', 'Custom VKP80II'] },
    { brand: 'Star Micronics', models: ['Star TSP100', 'Star TSP143', 'Star TSP654II', 'Star SP742'] },
    { brand: 'Citizen', models: ['Citizen CT-S310II', 'Citizen CT-S651', 'Citizen CT-S801'] },
    { brand: 'Outro', models: ['Genérico ESC/POS 80mm', 'Genérico ESC/POS 58mm'] }
];

function renderPrinters(container) {
    container.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
            <h3 style="font-weight: 800; letter-spacing: -0.03em;">Impressoras</h3>
            <button class="nav-item" style="background: var(--brand); color: white; width: auto; padding: 10px 20px;" onclick="openPrinterModal()">+ Nova Impressora</button>
        </div>
        <div class="glass-card" style="padding: 0; overflow: hidden">
            <table class="modern-table" style="margin: 0">
                <thead>
                    <tr>
                        <th>Nome</th>
                        <th>Modelo</th>
                        <th>IP / Conexão</th>
                        <th>Porta TCP</th>
                        <th>Caixas Vinculados</th>
                        <th>Configurações</th>
                        <th style="width: 130px"></th>
                    </tr>
                </thead>
                <tbody>
                    ${state.printers.map(pr => {
        // Descobre quais terminais usam esta impressora
        const linkedTerminals = state.terminals.filter(t => String(t.printerId) === String(pr.id));
        const linkedBadges = linkedTerminals.length > 0
            ? linkedTerminals.map(t => `<span style="padding:3px 8px;background:var(--brand);color:#fff;border-radius:6px;font-size:11px;font-weight:700;">Cx ${t.cashNumber}</span>`).join(' ')
            : `<span style="padding:3px 8px;background:var(--accent);border-radius:6px;font-size:11px;font-weight:600;color:var(--text-sub);">Nenhum</span>`;
        return `
                        <tr>
                            <td style="font-weight: 800">${pr.name}</td>
                            <td><span style="padding: 4px 10px; background: var(--accent); border-radius: 8px; font-size: 12px; font-weight: 700;">${pr.model || 'N/D'}</span></td>
                            <td style="font-size: 13px; font-family: monospace; font-weight: 700; color: var(--brand)">${pr.useWindowsPrinter ? 'Windows Printer' : (pr.ip || '-')}</td>
                            <td style="font-weight: 700">${pr.useWindowsPrinter ? '-' : (pr.port || 9100)}</td>
                            <td><div style="display:flex;gap:4px;flex-wrap:wrap;">${linkedBadges}</div></td>
                            <td>
                                <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                                    ${pr.activeCut ? '<span style="padding: 3px 8px; background: #dcfce7; color: #166534; border-radius: 6px; font-size: 11px; font-weight: 700;">Corte</span>' : ''}
                                    ${pr.blackBackground ? '<span style="padding: 3px 8px; background: #1a1a1a; color: white; border-radius: 6px; font-size: 11px; font-weight: 700;">Fundo Preto</span>' : ''}
                                    ${pr.printServer ? '<span style="padding: 3px 8px; background: #e0e7ff; color: #3730a3; border-radius: 6px; font-size: 11px; font-weight: 700;">Print Server</span>' : ''}
                                    ${pr.useWindowsPrinter ? '<span style="padding: 3px 8px; background: #fef9c3; color: #854d0e; border-radius: 6px; font-size: 11px; font-weight: 700;">Windows</span>' : ''}
                                </div>
                            </td>
                            <td>
                                <div style="display: flex; align-items: center; gap: 10px; justify-content: flex-end;">
                                    <button title="Testar Impressão" style="background:transparent;border:none;cursor:pointer;color:var(--brand);display:flex;align-items:center;gap:4px;font-weight:700;font-size:12px;padding:4px 8px;border-radius:8px;border:1.5px solid var(--brand);" onclick="testPrinter(${pr.id})">
                                        <i data-lucide="printer" style="width:14px;height:14px;"></i> Testar
                                    </button>
                                    <i data-lucide="edit-3" style="width: 18px; color: var(--brand); cursor: pointer" onclick="openPrinterModal(${pr.id})"></i>
                                    <i data-lucide="trash-2" style="width: 18px; color: var(--danger); cursor: pointer" onclick="removePrinter(${pr.id})"></i>
                                </div>
                            </td>
                        </tr>`;
    }).join('')}
                    ${state.printers.length === 0 ? '<tr><td colspan="7" style="text-align:center; padding: 60px; color: var(--text-sub); font-weight: 600">Nenhuma impressora configurada.</td></tr>' : ''}
                </tbody>
            </table>
        </div>
    `;
}

let currentEditingPrinterId = null;

function openPrinterModal(printerId = null) {
    currentEditingPrinterId = printerId;
    const modal = document.getElementById('product-modal');
    const body = document.getElementById('product-form-body');
    const title = document.getElementById('product-modal-title');

    let pr = { name: '', model: 'Epson TM-T20', ip: '', port: 9100, useWindowsPrinter: false, blackBackground: false, activeCut: true, linesBefore: 4, linesAfter: 0, alignSpacing: 2, printServer: false };

    if (printerId) {
        const found = state.printers.find(p => p.id === printerId);
        if (found) pr = { ...pr, ...found };
        title.innerText = 'Editar Impressora';
    } else {
        title.innerText = 'Nova Impressora';
    }

    const modelOptions = PRINTER_MODELS.map(brand => `
        <optgroup label="${brand.brand}">
            ${brand.models.map(m => `<option value="${m}" ${m === pr.model ? 'selected' : ''}>${m}</option>`).join('')}
        </optgroup>
    `).join('');

    body.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding-bottom: 16px; border-bottom: 1px dashed var(--border-med);">
            <span style="font-weight: 800; font-size: 14px; color: var(--text-sub);"># ${printerId || 'NOVA'}</span>
            <span style="font-size: 12px; color: var(--text-sub); font-weight: 600;">Data: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        <p style="font-size: 11px; font-weight: 800; color: var(--brand); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 16px;">Detalhes da impressora</p>

        <div class="form-grid">
            <div class="form-group col-6">
                <label class="form-label">Nome</label>
                <input type="text" class="form-control" id="frm-pr-name" placeholder="Ex: CAIXA - ELGIN I9 - REDE" value="${pr.name}">
            </div>
            <div class="form-group col-6">
                <label class="form-label">Modelo</label>
                <select class="form-control" id="frm-pr-model">${modelOptions}</select>
            </div>
        </div>

        <div style="margin-bottom: 16px;">
            <label style="display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; cursor: pointer; padding: 12px; border: 1px solid var(--border-med); border-radius: 8px;">
                <input type="checkbox" id="frm-pr-windows" ${pr.useWindowsPrinter ? 'checked' : ''} onchange="toggleWindowsPrinterMode(this.checked)">
                Usar impressora do Windows (Spooler)
            </label>
        </div>

        </div>

        <div id="windows-config-section" style="${pr.useWindowsPrinter ? '' : 'display:none;'} margin-bottom: 16px;">
            <div class="form-group col-12">
                <label class="form-label">Nome Exato da Impressora no Windows</label>
                <input type="text" class="form-control" id="frm-pr-systemname" placeholder="Ex: Elgin i9" value="${pr.systemName || ''}">
                <p style="font-size: 11px; color: var(--text-sub); margin-top: 4px;">Vá em 'Impressoras e Scanners' no Windows e copie o nome exato.</p>
            </div>
        </div>

        <div id="network-config-section" style="${pr.useWindowsPrinter ? 'display:none;' : ''}">
            <div class="form-grid">
                <div style="grid-column: span 2; display: flex; flex-direction: column; justify-content: center;">
                    <label style="display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; cursor: pointer;">
                        <input type="checkbox" id="frm-pr-blackbg" ${pr.blackBackground ? 'checked' : ''}> Fundo preto
                    </label>
                </div>
                <div class="form-group col-6">
                    <label class="form-label">IP</label>
                    <input type="text" class="form-control" id="frm-pr-ip" placeholder="192.168.1.10" value="${pr.ip || ''}">
                </div>
                <div class="form-group col-4">
                    <label class="form-label">Porta TCP</label>
                    <input type="number" class="form-control" id="frm-pr-port" value="${pr.port || 9100}">
                </div>
            </div>
            <div style="display: flex; flex-direction: column; justify-content: center; margin-bottom: 12px;">
                <label style="display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; cursor: pointer;">
                    <input type="checkbox" id="frm-pr-server" ${pr.printServer ? 'checked' : ''}> Print server
                    <span style="font-size: 11px; color: var(--text-sub); margin-left: 4px;">(incompatível com modo Windows)</span>
                </label>
            </div>
        </div>

        <!-- ─── Configurações de papel (sempre visíveis) ───────────────────── -->
        <p style="font-size:11px;font-weight:800;color:var(--brand);text-transform:uppercase;letter-spacing:0.08em;margin:16px 0 12px;">Configurações de Papel</p>
        <div class="form-grid">
            <div style="grid-column: span 2; display: flex; flex-direction: column; justify-content: center;">
                <label style="display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; cursor: pointer; padding: 10px; border: 1px solid var(--border-med); border-radius: 8px;">
                    <input type="checkbox" id="frm-pr-cut" ${pr.activeCut !== false ? 'checked' : ''}>
                    <span>
                        <strong>Ativar corte</strong>
                        <span style="display:block;font-size:11px;color:var(--text-sub);font-weight:500;margin-top:2px;">Recomendável sempre ativado. Corta o papel nas linhas certas do sistema.</span>
                    </span>
                </label>
            </div>
            <div class="form-group col-4">
                <label class="form-label">Linhas antes do corte</label>
                <input type="number" class="form-control" id="frm-pr-linesbefore" value="${pr.linesBefore ?? 4}" min="0" max="20">
                <p style="font-size:11px;color:var(--text-sub);margin-top:4px;">Espaço inferior do impresso antes do corte.</p>
            </div>
            <div class="form-group col-4">
                <label class="form-label">Linhas após o corte</label>
                <input type="number" class="form-control" id="frm-pr-linesafter" value="${pr.linesAfter ?? 0}" min="0" max="20">
                <p style="font-size:11px;color:var(--text-sub);margin-top:4px;">Espaço superior do próximo impresso.</p>
            </div>
        </div>
        <div class="form-grid" style="margin-top:8px;">
            <div class="form-group col-4">
                <label class="form-label">Espaço alinhamento</label>
                <input type="number" class="form-control" id="frm-pr-align" value="${pr.alignSpacing ?? 2}" min="0" max="10">
                <p style="font-size:11px;color:var(--text-sub);margin-top:4px;">Linhas de espaço entre cada produto impresso.</p>
            </div>
        </div>
    `;

    const footer = document.querySelector('.modal-footer');
    footer.innerHTML = `
        <button class="btn-cancel" onclick="closeProductModal()">Cancelar</button>
        ${printerId ? `<button class="btn-cancel" style="background:var(--surface-light);color:var(--brand);border:1.5px solid var(--brand);display:flex;align-items:center;gap:6px;" onclick="testPrinter(${printerId})"><i data-lucide="printer" style="width:15px;height:15px;"></i> Testar Impressão</button>` : ''}
        <button class="btn-save" onclick="savePrinterForm()">Gravar</button>
    `;

    modal.classList.add('active');
    lucide.createIcons();
}

window.toggleWindowsPrinterMode = function (checked) {
    document.getElementById('network-config-section').style.display = checked ? 'none' : '';
    document.getElementById('windows-config-section').style.display = checked ? '' : 'none';
}

function savePrinterForm() {
    const name = document.getElementById('frm-pr-name').value.trim();
    if (!name) return alert('Nome da impressora é obrigatório.');

    const useWindows = document.getElementById('frm-pr-windows').checked;

    const newPr = {
        id: currentEditingPrinterId || Date.now(),
        name: name,
        model: document.getElementById('frm-pr-model').value,
        useWindowsPrinter: useWindows,
        systemName: useWindows ? document.getElementById('frm-pr-systemname').value.trim() : '',
        ip: useWindows ? '' : (document.getElementById('frm-pr-ip')?.value || ''),
        port: useWindows ? null : parseInt(document.getElementById('frm-pr-port')?.value || 9100),
        // Configurações de papel: sempre salvas independente do modo
        activeCut: document.getElementById('frm-pr-cut')?.checked ?? true,
        linesBefore: parseInt(document.getElementById('frm-pr-linesbefore')?.value ?? 4),
        linesAfter: parseInt(document.getElementById('frm-pr-linesafter')?.value ?? 0),
        alignSpacing: parseInt(document.getElementById('frm-pr-align')?.value ?? 2),
        // Somente rede
        blackBackground: useWindows ? false : (document.getElementById('frm-pr-blackbg')?.checked ?? false),
        printServer: useWindows ? false : (document.getElementById('frm-pr-server')?.checked ?? false),
    };

    if (currentEditingPrinterId) {
        state.printers = state.printers.map(p => p.id === currentEditingPrinterId ? { ...p, ...newPr } : p);
    } else {
        state.printers.push(newPr);
    }

    saveData();
    closeProductModal();
    renderPage('printers');
}

function removePrinter(id) {
    if (confirm('Remover esta impressora? Os produtos vinculados a ela ficarão sem destino.')) {
        state.printers = state.printers.filter(p => p.id !== id);
        saveData();
        renderPage('printers');
    }
}

window.testPrinter = async function(printerId) {
    const btn = document.querySelector('.modal-footer button[onclick^="testPrinter"]');
    const originalHtml = btn ? btn.innerHTML : '';
    if (btn) {
        btn.innerHTML = '<i data-lucide="loader-2" style="width:15px;height:15px;"></i> Enviando...';
        btn.disabled = true;
        if (window.lucide) lucide.createIcons();
    }

    try {
        const isFileProtocol = window.location.protocol === 'file:';
        const baseUrl = isFileProtocol ? 'http://localhost:8080' : '';

        const res  = await fetch(`${baseUrl}/api/print-test`, {
            method: 'POST',
            headers: VeloAuth.authHeaders(),
            body: JSON.stringify({ printerId }),
        });
        const json = await res.json();

        if (json.success) {
            alert(`✅ Ficha de teste enviada com sucesso para: ${json.printerName || 'Impressora'}\n\nVerifique se o papel saiu corretamente.`);
        } else {
            alert(`❌ Falha no teste:\n${json.error || 'Erro desconhecido.'}\n\nVerifique IP, porta e configurações da impressora.`);
        }
    } catch (e) {
        alert(`❌ Erro de conexão:\n${e.message}\n\nVerifique se o servidor está rodando.`);
    } finally {
        if (btn) {
            btn.innerHTML = originalHtml;
            btn.disabled = false;
            if (window.lucide) lucide.createIcons();
        }
    }
};


function renderTerminals(container) {
    const layoutLabel = { horizontal: 'Horizontal', vertical: 'Vertical' };
    const fontLabel = { Outfit: 'Outfit (Padrao)', Inter: 'Inter', Roboto: 'Roboto', monospace: 'Monospace' };
    const sizeLabel = { small: 'Pequeno (13px)', medium: 'Medio (15px)', large: 'Grande (17px)', xlarge: 'Extra Grande (20px)' };
    const rows = state.terminals.map(t => {
        const printer = state.printers.find(p => p.id == t.printerId);
        const statusBadge = t.active
            ? '<span style="padding:4px 10px;background:#dcfce7;border-radius:8px;font-size:11px;font-weight:700;color:#166534;">Ativo</span>'
            : '<span style="padding:4px 10px;background:#fee2e2;border-radius:8px;font-size:11px;font-weight:700;color:#991b1b;">Inativo</span>';
        return '<tr>' +
            '<td style="font-weight:900;font-size:22px;color:var(--brand);">Cx ' + t.cashNumber + '</td>' +
            '<td style="font-weight:800;">' + t.name + '</td>' +
            '<td><span style="padding:4px 10px;background:var(--accent);border-radius:8px;font-size:12px;font-weight:700;">' + (layoutLabel[t.layout] || t.layout) + '</span></td>' +
            '<td style="font-weight:700;">' + (fontLabel[t.font] || t.font) + ' / ' + (sizeLabel[t.fontSize] || t.fontSize) + '</td>' +
            '<td style="font-weight:700;">' + (printer ? printer.name : 'N/A') + '</td>' +
            '<td>' + statusBadge + '</td>' +
            '<td><div style="display:flex;align-items:center;gap:12px;justify-content:flex-end;">' +
            '<i data-lucide="edit-3" style="width:18px;color:var(--brand);cursor:pointer" onclick="openTerminalModal(\'' + t.id + '\')"></i>' +
            '<i data-lucide="trash-2" style="width:18px;color:var(--danger);cursor:pointer" onclick="removeTerminal(\'' + t.id + '\')"></i>' +
            '</div></td></tr>';
    }).join('');
    const emptyRow = state.terminals.length === 0 ? '<tr><td colspan="7" style="text-align:center;padding:60px;color:var(--text-sub);font-weight:600">Nenhum terminal configurado. Adicione o primeiro caixa.</td></tr>' : '';
    container.innerHTML =
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;">' +
        '<h3 style="font-weight:800;letter-spacing:-0.03em;">Terminais de Caixa</h3>' +
        '<button class="btn-save" onclick="openTerminalModal()" style="padding:10px 20px;">+ Novo Terminal</button></div>' +
        '<div class="glass-card" style="padding:0;overflow:hidden"><table class="modern-table" style="margin:0">' +
        '<thead><tr><th>Caixa Nro</th><th>Identificacao</th><th>Layout</th><th>Fonte / Tamanho</th><th>Impressora Vinculada</th><th>Status</th><th style="width:100px"></th></tr></thead>' +
        '<tbody>' + emptyRow + rows + '</tbody></table></div>';
}

let currentEditingTerminalId = null;

function openTerminalModal(terminalId) {
    terminalId = terminalId || null;
    currentEditingTerminalId = terminalId;
    const modal = document.getElementById('product-modal');
    const body = document.getElementById('product-form-body');
    const title = document.getElementById('product-modal-title');
    let t = { cashNumber: (state.terminals.length + 1), name: '', layout: 'horizontal', font: 'Outfit', fontSize: 'medium', printerId: state.printers[0]?.id || '', active: true };
    if (terminalId) {
        const found = state.terminals.find(x => x.id == terminalId);
        if (found) t = Object.assign({}, t, found);
        title.innerText = 'Editar Terminal';
    } else {
        title.innerText = 'Novo Terminal de Caixa';
    }
    const printerOpts = state.printers.map(p => '<option value="' + p.id + '"' + (p.id == t.printerId ? ' selected' : '') + '>' + p.name + '</option>').join('');
    body.innerHTML =
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;padding-bottom:16px;border-bottom:1px dashed var(--border-med);">' +
        '<span style="font-weight:800;font-size:14px;color:var(--text-sub);"># ' + (terminalId || 'NOVO') + '</span>' +
        '<span style="font-size:12px;color:var(--text-sub);font-weight:600;">Data: ' + new Date().toLocaleDateString() + '</span></div>' +
        '<p style="font-size:11px;font-weight:800;color:var(--brand);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:16px;">Identificacao do Terminal</p>' +
        '<div class="form-grid">' +
        '<div class="form-group col-2"><label class="form-label">Numero do Caixa</label><input type="number" class="form-control" id="frm-trm-num" min="1" value="' + t.cashNumber + '"></div>' +
        '<div class="form-group col-6"><label class="form-label">Nome / Identificacao</label><input type="text" class="form-control" id="frm-trm-name" placeholder="Ex: Caixa 01 - Recepcao" value="' + t.name + '"></div>' +
        '<div class="form-group col-4"><label class="form-label">Impressora Vinculada</label><select class="form-control" id="frm-trm-printer">' + (printerOpts || '<option value="">Nenhuma cadastrada</option>') + '</select></div>' +
        '</div>' +
        '<p style="font-size:11px;font-weight:800;color:var(--brand);text-transform:uppercase;letter-spacing:0.08em;margin:20px 0 16px;">Aparencia do PDV</p>' +
        '<div class="form-grid">' +
        '<div class="form-group col-6"><label class="form-label">Layout da Tela</label>' +
        '<div style="display:flex;gap:12px;margin-top:6px;">' +
        '<label id="lbl-horiz" style="flex:1;display:flex;flex-direction:column;align-items:center;gap:8px;padding:16px 12px;border:2px solid ' + (t.layout === 'horizontal' ? 'var(--brand)' : 'var(--border-med)') + ';border-radius:12px;cursor:pointer;transition:all 0.2s;" onclick="selectLayout(this,\'horizontal\')">' +
        '<div style="width:60px;height:36px;border:2px solid currentColor;border-radius:4px;display:flex;gap:3px;padding:4px;">' +
        '<div style="flex:1;background:currentColor;border-radius:2px;opacity:0.3;"></div><div style="width:18px;background:currentColor;border-radius:2px;opacity:0.7;"></div></div>' +
        '<span style="font-size:12px;font-weight:700;">Horizontal</span>' +
        '<input type="radio" name="frm-trm-layout" value="horizontal" style="display:none;" ' + (t.layout === 'horizontal' ? 'checked' : '') + '></label>' +
        '<label id="lbl-vert" style="flex:1;display:flex;flex-direction:column;align-items:center;gap:8px;padding:16px 12px;border:2px solid ' + (t.layout === 'vertical' ? 'var(--brand)' : 'var(--border-med)') + ';border-radius:12px;cursor:pointer;transition:all 0.2s;" onclick="selectLayout(this,\'vertical\')">' +
        '<div style="width:36px;height:60px;border:2px solid currentColor;border-radius:4px;display:flex;flex-direction:column;gap:3px;padding:4px;">' +
        '<div style="height:12px;background:currentColor;border-radius:2px;opacity:0.7;"></div><div style="flex:1;background:currentColor;border-radius:2px;opacity:0.3;"></div></div>' +
        '<span style="font-size:12px;font-weight:700;">Vertical</span>' +
        '<input type="radio" name="frm-trm-layout" value="vertical" style="display:none;" ' + (t.layout === 'vertical' ? 'checked' : '') + '></label>' +
        '</div></div>' +
        '<div class="form-group col-3"><label class="form-label">Fonte</label>' +
        '<select class="form-control" id="frm-trm-font" onchange="updateFontPreview()">' +
        '<option value="Outfit"' + (t.font === 'Outfit' ? ' selected' : '') + '>Outfit (Padrao)</option>' +
        '<option value="Inter"' + (t.font === 'Inter' ? ' selected' : '') + '>Inter</option>' +
        '<option value="Roboto"' + (t.font === 'Roboto' ? ' selected' : '') + '>Roboto</option>' +
        '<option value="monospace"' + (t.font === 'monospace' ? ' selected' : '') + '>Monospace</option>' +
        '</select></div>' +
        '<div class="form-group col-3"><label class="form-label">Tamanho da Fonte</label>' +
        '<select class="form-control" id="frm-trm-size" onchange="updateFontPreview()">' +
        '<option value="small"' + (t.fontSize === 'small' ? ' selected' : '') + '>Pequeno (13px)</option>' +
        '<option value="medium"' + (t.fontSize === 'medium' ? ' selected' : '') + '>Medio (15px)</option>' +
        '<option value="large"' + (t.fontSize === 'large' ? ' selected' : '') + '>Grande (17px)</option>' +
        '<option value="xlarge"' + (t.fontSize === 'xlarge' ? ' selected' : '') + '>Extra Grande (20px)</option>' +
        '</select></div>' +
        '</div>' +
        '<div id="font-preview" style="margin-top:16px;padding:16px;border:1px solid var(--border-med);border-radius:12px;background:var(--accent);">' +
        '<p style="font-size:11px;font-weight:800;color:var(--text-sub);text-transform:uppercase;margin-bottom:8px;">Preview</p>' +
        '<p id="font-preview-text" style="font-weight:700;">Cerveja Heineken 330ml - R$ 14,50</p></div>' +
        '<div style="margin-top:20px;">' +
        '<label style="display:flex;align-items:center;gap:8px;font-size:13px;font-weight:600;cursor:pointer;padding:12px;border:1px solid var(--border-med);border-radius:8px;">' +
        '<input type="checkbox" id="frm-trm-active"' + (t.active ? ' checked' : '') + '> Terminal Ativo (visivel no PDV)</label></div>';
    const footer = document.querySelector('.modal-footer');
    footer.innerHTML = '<button class="btn-cancel" onclick="closeProductModal()">Cancelar</button><button class="btn-save" onclick="saveTerminalForm()">Gravar</button>';
    modal.classList.add('active');
    lucide.createIcons();
    updateFontPreview();
}

window.selectLayout = function (lbl, value) {
    document.querySelectorAll('[name="frm-trm-layout"]').forEach(r => r.checked = r.value === value);
    document.getElementById('lbl-horiz').style.borderColor = value === 'horizontal' ? 'var(--brand)' : 'var(--border-med)';
    document.getElementById('lbl-vert').style.borderColor = value === 'vertical' ? 'var(--brand)' : 'var(--border-med)';
}

window.updateFontPreview = function () {
    const fontSel = document.getElementById('frm-trm-font');
    const sizeSel = document.getElementById('frm-trm-size');
    const preview = document.getElementById('font-preview-text');
    if (!fontSel || !sizeSel || !preview) return;
    const sizeMap = { small: '13px', medium: '15px', large: '17px', xlarge: '20px' };
    preview.style.fontFamily = fontSel.value;
    preview.style.fontSize = sizeMap[sizeSel.value] || '15px';
}

function saveTerminalForm() {
    const cashNumber = parseInt(document.getElementById('frm-trm-num').value) || 1;
    const name = document.getElementById('frm-trm-name').value.trim();
    if (!name) return alert('Informe o nome/identificacao do terminal.');
    const layout = document.querySelector('[name="frm-trm-layout"]:checked')?.value || 'horizontal';
    const font = document.getElementById('frm-trm-font').value;
    const fontSize = document.getElementById('frm-trm-size').value;
    const printerId = parseInt(document.getElementById('frm-trm-printer')?.value) || null;
    const active = document.getElementById('frm-trm-active').checked;
    const shortId = "CX" + cashNumber;
    const newT = { id: currentEditingTerminalId || shortId, cashNumber, name, layout, font, fontSize, printerId, active };
    if (currentEditingTerminalId) {
        state.terminals = state.terminals.map(t => t.id == currentEditingTerminalId ? Object.assign({}, t, newT) : t);
    } else {
        state.terminals.push(newT);
    }
    saveData();
    closeProductModal();
    renderPage('terminals');
}

function removeTerminal(id) {
    if (confirm('Remover este terminal?')) {
        state.terminals = state.terminals.filter(t => t.id != id);
        saveData();
        renderPage('terminals');
    }
}


// Persistence & UI Sync
function saveData() {
    pushToServer(state);
}

function getPageTitle(id) {
    const map = {
        'dashboard': 'Visão Geral',
        'pos': 'Terminal de Vendas',
        'products': 'Catálogo de Itens',
        'groups': 'Grupos de Produtos',
        'subgroups': 'Subgrupos e Cores',
        'paymentMethods': 'Formas de Pagamento',
        'printers': 'Configurações de Impressoras',
        'terminals': 'Terminais de Caixa',
        'inventory': 'Inventário de Estoque',
        'reportSalesByProduct': 'Relatório de Vendas por Produto',
        'reportSalesByTerminal': 'Relatório de Vendas por Caixa',
        'reportFechamento': 'Relatório de Fechamento de Caixa',
        'reportSangrias': 'Relatório de Sangrias (Retiradas)',
        'reportSalesByPeriod': 'Relatório de Vendas por Período',
        'backup': 'Gestão de Dados e Backup',
        'version-control': 'Controle de Versão'
    };
    return map[id] || 'Portal';
}

function renderBackup(container) {
    container.innerHTML = `
        <div style="max-width: 800px; margin: 0 auto; display: flex; flex-direction: column; gap: 24px; padding-top: 20px;">
            <div class="glass-card" style="display: flex; align-items: center; gap: 24px; padding: 40px;">
                <div style="width: 80px; height: 80px; background: #e0e7ff; border-radius: 24px; display: flex; align-items: center; justify-content: center; color: var(--brand);">
                    <i data-lucide="database" style="width: 40px; height: 40px;"></i>
                </div>
                <div style="flex: 1">
                    <h2 style="font-weight: 800; margin-bottom: 8px;">Backup do Banco de Dados</h2>
                    <p style="color: var(--text-sub); font-size: 14px; line-height: 1.5;">Baixe uma cópia de segurança completa do seu sistema. Este arquivo contém todos os produtos, vendas, terminais e configurações.</p>
                </div>
                <button class="nav-item" style="background: var(--brand); color: white; width: auto; padding: 15px 30px; font-weight: 800;" onclick="downloadBackup()">
                    <i data-lucide="download"></i>
                    Baixar Backup (.json)
                </button>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">
                <div class="glass-card">
                    <h3 style="font-weight: 800; margin-bottom: 16px; display: flex; align-items: center; gap: 10px;">
                        <i data-lucide="info" style="width: 20px; color: var(--brand)"></i>
                        Informações do Banco
                    </h3>
                    <ul style="list-style: none; display: flex; flex-direction: column; gap: 12px; font-size: 14px;">
                        <li style="display: flex; justify-content: space-between;">
                            <span style="color: var(--text-sub)">Produtos Cadastrados:</span>
                            <span style="font-weight: 800">${state.products.length}</span>
                        </li>
                        <li style="display: flex; justify-content: space-between;">
                            <span style="color: var(--text-sub)">Vendas Registradas:</span>
                            <span style="font-weight: 800">${state.cash.sales.length}</span>
                        </li>
                        <li style="display: flex; justify-content: space-between;">
                            <span style="color: var(--text-sub)">Terminais Ativos:</span>
                            <span style="font-weight: 800">${state.terminals.length}</span>
                        </li>
                    </ul>
                </div>

                <div class="glass-card" style="border: 1px dashed var(--brand); background: rgba(128, 0, 32, 0.02); display: flex; flex-direction: column; justify-content: space-between; gap: 16px;">
                    <div>
                        <h3 style="font-weight: 800; margin-bottom: 12px; color: var(--brand)">Limpar Cache local do Portal</h3>
                        <p style="font-size: 13px; color: var(--text-sub); line-height: 1.6;">
                            Se você zerou as vendas no servidor, mas o portal ainda exibe dados antigos no dashboard por conta do cache do seu navegador, clique abaixo para limpar o cache local e forçar a atualização imediata das telas.
                        </p>
                    </div>
                    <button class="nav-item" style="background: var(--danger, #ef4444); color: white; width: auto; padding: 12px 20px; font-weight: 800; border-radius: 10px; display: flex; align-items: center; gap: 8px; cursor: pointer; border: none;" onclick="clearPortalCache()">
                        <i data-lucide="trash-2" style="width: 16px;"></i>
                        Limpar Cache e Zerar Relatórios
                    </button>
                </div>
            </div>
        </div>
    `;
}

window.clearPortalCache = function () {
    if (confirm("Deseja realmente limpar o cache de relatórios do seu navegador? Isso removerá as vendas salvas em cache local e forçará a recarga de dados limpos do servidor.")) {
        localStorage.clear();
        location.reload();
    }
};

window.downloadBackup = function () {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `ticketpro_backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
}
// --- ESTOQUE / INVENTARIO ---
function renderInventory(container) {
    const products = state.products;
    const withStock = products.filter(p => p.stock !== null && p.stock !== undefined && p.stock !== '');
    const totalValue = withStock.reduce((acc, p) => acc + (p.price * (p.stock || 0)), 0);
    const rows = products.map(p => {
        const sg = state.subgroups.find(s => s.id == p.subgroupId);
        const hasStock = p.stock !== null && p.stock !== undefined && p.stock !== '';
        const qty = hasStock ? p.stock : '-';
        const totalVal = hasStock ? 'R$ ' + (p.price * p.stock).toFixed(2) : '-';
        const status = !hasStock
            ? '<span style="padding:4px 10px;background:var(--accent);border-radius:8px;font-size:11px;font-weight:700;color:var(--text-sub);">Sem controle</span>'
            : p.stock === 0 ? '<span style="padding:4px 10px;background:#fee2e2;border-radius:8px;font-size:11px;font-weight:700;color:#991b1b;">Zerado</span>'
                : p.stock <= 5 ? '<span style="padding:4px 10px;background:#fef9c3;border-radius:8px;font-size:11px;font-weight:700;color:#854d0e;">Baixo</span>'
                    : '<span style="padding:4px 10px;background:#dcfce7;border-radius:8px;font-size:11px;font-weight:700;color:#166534;">Normal</span>';
        return '<tr><td style="font-weight:700;color:var(--text-sub);font-size:13px;">' + (p.code || '-') + '</td><td style="font-weight:800;">' + p.name + '</td><td><span style="padding:4px 8px;border-radius:6px;font-size:11px;font-weight:700;background:' + (sg ? sg.buttonColor : 'var(--accent)') + ';color:' + (sg ? sg.textColor : 'var(--text-main)') + ';">' + (sg ? sg.name : 'N/A') + '</span></td><td style="font-weight:900;font-size:18px;">' + qty + '</td><td style="font-weight:800;color:var(--brand);">R$ ' + p.price.toFixed(2) + '</td><td style="font-weight:800;">' + totalVal + '</td><td>' + status + '</td></tr>';
    }).join('');
    container.innerHTML = '<div class="stat-grid" style="margin-bottom:24px;"><div class="stat-box"><span class="label">Itens com Estoque Controlado</span><span class="value">' + withStock.length + ' <span style="font-size:14px;color:var(--text-sub)">itens</span></span></div><div class="stat-box"><span class="label">Valor Total em Estoque</span><span class="value" style="color:var(--brand)">R$ ' + totalValue.toFixed(2) + '</span></div><div class="stat-box"><span class="label">Itens sem Controle</span><span class="value" style="color:var(--text-sub)">' + (products.length - withStock.length) + ' <span style="font-size:14px">itens</span></span></div></div><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;"><h3 style="font-weight:800;letter-spacing:-0.03em;">Posicao de Estoque</h3><button class="btn-save" onclick="printInventory()" style="display:flex;align-items:center;gap:8px;padding:10px 20px;"><i data-lucide="file-text" style="width:16px;"></i> Exportar PDF</button></div><div class="glass-card" style="padding:0;overflow:hidden"><table class="modern-table" style="margin:0"><thead><tr><th>Codigo</th><th>Produto</th><th>Subgrupo</th><th>Qtd. Estoque</th><th>Preco Venda</th><th>Valor Total</th><th>Status</th></tr></thead><tbody>' + (products.length === 0 ? '<tr><td colspan="7" style="text-align:center;padding:60px;color:var(--text-sub);font-weight:600">Nenhum produto cadastrado.</td></tr>' : '') + rows + '</tbody></table></div>';
}

window.printInventory = function () {
    const products = state.products;
    const now = new Date().toLocaleString('pt-BR');
    const rows = products.map((p, i) => {
        const sg = state.subgroups.find(s => s.id == p.subgroupId);
        const hasStock = p.stock !== null && p.stock !== undefined && p.stock !== '';
        const qty = hasStock ? p.stock : '-';
        const totalVal = hasStock ? 'R$ ' + (p.price * p.stock).toFixed(2) : '-';
        const status = !hasStock ? 'Sem controle' : p.stock === 0 ? 'Zerado' : p.stock <= 5 ? 'Baixo' : 'Normal';
        const bg = i % 2 === 0 ? '#fff' : '#f9f9fb';
        return '<tr style="background:' + bg + ';border-bottom:1px solid #e5e5ea;"><td style="padding:8px 12px;font-size:12px;">' + (p.code || '-') + '</td><td style="padding:8px 12px;font-weight:700;font-size:12px;">' + p.name + '</td><td style="padding:8px 12px;font-size:12px;">' + (sg ? sg.name : 'N/A') + '</td><td style="padding:8px 12px;font-weight:900;font-size:14px;text-align:center;">' + qty + '</td><td style="padding:8px 12px;font-size:12px;text-align:right;">R$ ' + p.price.toFixed(2) + '</td><td style="padding:8px 12px;font-size:12px;text-align:right;">' + totalVal + '</td><td style="padding:8px 12px;font-size:12px;text-align:center;">' + status + '</td></tr>';
    }).join('');
    const html = '<!DOCTYPE html><html lang="pt-br"><head><meta charset="UTF-8"><title>Inventario de Estoque</title><style>body{font-family:Arial,sans-serif;margin:0;padding:20px;color:#1a1a1e}.header{text-align:center;border-bottom:2px solid #800020;padding-bottom:16px;margin-bottom:24px}.header h1{font-size:22px;margin:0 0 4px;color:#800020}.header p{font-size:12px;color:#666;margin:2px 0}table{width:100%;border-collapse:collapse}thead{background:#800020;color:white}thead th{padding:10px 12px;font-size:11px;text-align:left;text-transform:uppercase;letter-spacing:0.05em}.footer{margin-top:24px;font-size:11px;color:#666;text-align:center;border-top:1px solid #e5e5ea;padding-top:12px}@media print{@page{margin:10mm;size:A4 landscape}}</style></head><body><div class="header"><h1>INVENTARIO DE ESTOQUE</h1><p>TicketPro Portal de Gestao</p><p>Emitido em: ' + now + '</p></div><table><thead><tr><th>Codigo</th><th>Produto</th><th>Subgrupo</th><th>Estoque</th><th>Preco Venda</th><th>Valor Total</th><th>Status</th></tr></thead><tbody>' + rows + '</tbody></table><div class="footer">Total de itens: ' + products.length + ' - TicketPro Sistema de Gestao</div></body></html>';
    const win = window.open('', '_blank'); win.document.write(html); win.document.close(); setTimeout(() => win.print(), 500);
}

// --- RELATORIO DE VENDAS POR PRODUTO ---
function renderReportSalesByProduct(container) {
    const today = getLocalDateString();

    container.innerHTML = `
        <div class="velo-filter-card">
            <div class="velo-filter-row">
                <div class="velo-date-inputs">
                    <div class="velo-date-group">
                        <label for="prod-start">De</label>
                        <input type="date" id="prod-start" class="velo-date-input" value="${today}">
                    </div>
                    <div class="velo-date-group">
                        <label for="prod-end">Até</label>
                        <input type="date" id="prod-end" class="velo-date-input" value="${today}">
                    </div>
                    <button class="velo-btn-search" onclick="filterSalesByProductByPeriod()">
                        <i data-lucide="search" style="width: 18px; height: 18px;"></i>
                    </button>
                </div>
                <div class="velo-presets-scroll" style="flex: 1; align-self: flex-end; margin-bottom: 2px;">
                    <button class="velo-pill-btn active" onclick="setSalesByProductPeriodPreset('hoje', this)">Hoje</button>
                    <button class="velo-pill-btn" onclick="setSalesByProductPeriodPreset('ontem', this)">Ontem</button>
                    <button class="velo-pill-btn" onclick="setSalesByProductPeriodPreset('7d', this)">7 dias atrás</button>
                    <button class="velo-pill-btn" onclick="setSalesByProductPeriodPreset('30d', this)">30 dias atrás</button>
                    <button class="velo-pill-btn" onclick="setSalesByProductPeriodPreset('esteMes', this)">Este mês</button>
                    <button class="velo-pill-btn" onclick="setSalesByProductPeriodPreset('ultimoMes', this)">Último mês</button>
                    <button class="velo-pill-btn" onclick="setSalesByProductPeriodPreset('esteAno', this)">Este ano</button>
                    <button class="velo-pill-btn" onclick="setSalesByProductPeriodPreset('ultimoAno', this)">Último ano</button>
                </div>
            </div>
        </div>
        
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
            <h3 style="font-weight:900;letter-spacing:-0.03em;font-size:18px;color:var(--text-main)">Resultados da Busca</h3>
            <button class="velo-btn-pdf" onclick="printSalesByProduct()">
                <i data-lucide="file-text" style="width:16px;height:16px;"></i> Exportar PDF
            </button>
        </div>
        
        <div id="product-report-content">
            <!-- Rendered via JS -->
        </div>
    `;

    setTimeout(() => {
        if (window.lucide) lucide.createIcons();
        filterSalesByProductByPeriod(); // Initial load
    }, 50);
}

window.setSalesByProductPeriodPreset = function (preset, btn) {
    btn.closest('.velo-presets-scroll').querySelectorAll('.velo-pill-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const today = new Date();
    let start = new Date();
    let end = new Date();

    switch (preset) {
        case 'hoje':
            break;
        case 'ontem':
            start.setDate(today.getDate() - 1);
            end.setDate(today.getDate() - 1);
            break;
        case '7d':
            start.setDate(today.getDate() - 7);
            break;
        case '30d':
            start.setDate(today.getDate() - 30);
            break;
        case 'esteMes':
            start.setDate(1);
            break;
        case 'ultimoMes':
            start.setMonth(today.getMonth() - 1);
            start.setDate(1);
            end.setMonth(today.getMonth());
            end.setDate(0);
            break;
        case 'esteAno':
            start.setMonth(0);
            start.setDate(1);
            break;
        case 'ultimoAno':
            start.setFullYear(today.getFullYear() - 1);
            start.setMonth(0);
            start.setDate(1);
            end.setFullYear(today.getFullYear() - 1);
            end.setMonth(11);
            end.setDate(31);
            break;
    }

    document.getElementById('prod-start').value = getLocalDateString(start);
    document.getElementById('prod-end').value = getLocalDateString(end);

    filterSalesByProductByPeriod();
}

window.filterSalesByProductByPeriod = function () {
    const startStr = document.getElementById('prod-start').value;
    const endStr = document.getElementById('prod-end').value;

    if (!startStr || !endStr) return;

    const filtered = state.sales.filter(s => {
        const saleDateStr = getLocalDateString(s.timestamp);
        return saleDateStr >= startStr && saleDateStr <= endStr;
    });

    const byProduct = {};
    filtered.forEach(s => {
        if (!byProduct[s.productName]) byProduct[s.productName] = { name: s.productName, qty: 0, total: 0, pms: {} };
        byProduct[s.productName].qty += 1;
        byProduct[s.productName].total += s.price;
        const pm = s.paymentMethod || 'N/D';
        byProduct[s.productName].pms[pm] = (byProduct[s.productName].pms[pm] || 0) + 1;
    });

    const rows = Object.values(byProduct).sort((a, b) => b.total - a.total);
    const grandTotal = rows.reduce((a, r) => a + r.total, 0);
    const grandQty = rows.reduce((a, r) => a + r.qty, 0);

    const tRows = rows.map((r, i) => {
        const pct = grandTotal > 0 ? ((r.total / grandTotal) * 100).toFixed(1) : 0;
        const ticket = (r.total / r.qty).toFixed(2);
        const pms = Object.entries(r.pms).map(([k, v]) => '<span style="padding:4px 8px;background:var(--accent);border-radius:6px;font-size:11px;font-weight:700;margin-right:6px;color:var(--text-main);border:1px solid var(--border-soft);">' + k + ': ' + v + 'x</span>').join('');
        return '<tr><td style="font-weight:800;color:var(--text-sub);">' + (i + 1) + '</td><td style="font-weight:800;color:var(--text-main);">' + r.name + '</td><td style="font-weight:900;font-size:16px;color:var(--text-main);">' + r.qty + ' un.</td><td style="font-weight:900;color:var(--brand);font-size:16px;">R$ ' + r.total.toFixed(2) + '</td><td style="font-weight:700;color:var(--text-main);">R$ ' + ticket + '</td><td>' + pms + '</td><td><div style="display:flex;align-items:center;gap:8px;"><div style="flex:1;height:8px;background:var(--accent);border-radius:4px;overflow:hidden;"><div style="width:' + pct + '%;height:100%;background:var(--brand);border-radius:4px;"></div></div><span style="font-weight:800;font-size:13px;color:var(--text-main);">' + pct + '%</span></div></td></tr>';
    }).join('');

    const totalRow = rows.length > 0 ? '<tr style="background:rgba(37,99,235,0.04);border-top:1.5px solid var(--border-med);"><td colspan="2" style="font-weight:900;padding:18px 24px;color:var(--text-main)">TOTAL GERAL</td><td style="font-weight:900;font-size:16px;color:var(--text-main)">' + grandQty + ' un.</td><td style="font-weight:900;color:var(--brand);font-size:17px;">R$ ' + grandTotal.toFixed(2) + '</td><td colspan="3"></td></tr>' : '';

    const emptyStateHtml = `
        <div class="velo-empty-state">
            <div class="velo-empty-illustration">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <path d="M16 16s-1.5-2-4-2-4 2-4 2"></path>
                    <line x1="9" y1="9" x2="9.01" y2="9"></line>
                    <line x1="15" y1="9" x2="15.01" y2="9"></line>
                </svg>
            </div>
            <div class="velo-empty-text">Nenhuma venda registrada neste período para exibição.</div>
        </div>
    `;

    const content = `
        <div class="stat-grid" style="margin-bottom:24px;">
            <div class="velo-kpi-card">
                <div class="velo-kpi-header">
                    <span class="velo-kpi-label">Total Arrecadado</span>
                    <div class="velo-kpi-icon"><i data-lucide="dollar-sign" style="width:16px;height:16px;"></i></div>
                </div>
                <span class="velo-kpi-value" style="color:var(--brand)">R$ ${grandTotal.toFixed(2)}</span>
            </div>
            <div class="velo-kpi-card">
                <div class="velo-kpi-header">
                    <span class="velo-kpi-label">Itens Vendidos</span>
                    <div class="velo-kpi-icon"><i data-lucide="shopping-bag" style="width:16px;height:16px;"></i></div>
                </div>
                <span class="velo-kpi-value">${grandQty}<span>un.</span></span>
            </div>
            <div class="velo-kpi-card">
                <div class="velo-kpi-header">
                    <span class="velo-kpi-label">Produtos Diferentes</span>
                    <div class="velo-kpi-icon"><i data-lucide="box" style="width:16px;height:16px;"></i></div>
                </div>
                <span class="velo-kpi-value">${rows.length}<span>itens</span></span>
            </div>
        </div>
        <div class="velo-table-card">
            <table class="velo-table">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Produto</th>
                        <th>Qtd. Vendida</th>
                        <th>Total (R$)</th>
                        <th>Ticket Médio</th>
                        <th>Pgtos Utilizados</th>
                        <th>% do Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows.length === 0 ? `<tr><td colspan="7" style="padding:0;">${emptyStateHtml}</td></tr>` : tRows + totalRow}
                </tbody>
            </table>
        </div>
    `;

    document.getElementById('product-report-content').innerHTML = content;
    setTimeout(() => {
        if (window.lucide) lucide.createIcons();
    }, 20);
}

window.printSalesByProduct = function () {
    const startStr = document.getElementById('prod-start').value;
    const endStr = document.getElementById('prod-end').value;

    if (!startStr || !endStr) return;

    const filtered = state.sales.filter(s => {
        const saleDateStr = getLocalDateString(s.timestamp);
        return saleDateStr >= startStr && saleDateStr <= endStr;
    });

    const byProduct = {};
    filtered.forEach(s => {
        if (!byProduct[s.productName]) byProduct[s.productName] = { name: s.productName, qty: 0, total: 0 };
        byProduct[s.productName].qty += 1;
        byProduct[s.productName].total += s.price;
    });

    const rows = Object.values(byProduct).sort((a, b) => b.total - a.total);
    const grandTotal = rows.reduce((a, r) => a + r.total, 0);
    const grandQty = rows.reduce((a, r) => a + r.qty, 0);
    const now = new Date().toLocaleString('pt-BR');

    const startFmt = startStr.split('-').reverse().join('/');
    const endFmt = endStr.split('-').reverse().join('/');

    const tRows = rows.map((r, i) => {
        const pct = grandTotal > 0 ? ((r.total / grandTotal) * 100).toFixed(1) : 0;
        const bg = i % 2 === 0 ? '#fff' : '#f9f9fb';
        return '<tr style="background:' + bg + ';border-bottom:1px solid #e5e5ea;"><td style="padding:10px 12px;font-size:13px;font-weight:800;">' + (i + 1) + '</td><td style="padding:10px 12px;font-weight:700;">' + r.name + '</td><td style="padding:10px 12px;font-weight:900;font-size:16px;text-align:center;">' + r.qty + '</td><td style="padding:10px 12px;font-weight:900;color:#800020;text-align:right;">R$ ' + r.total.toFixed(2) + '</td><td style="padding:10px 12px;font-size:12px;text-align:right;">R$ ' + (r.total / r.qty).toFixed(2) + '</td><td style="padding:10px 12px;font-size:12px;text-align:right;">' + pct + '%</td></tr>';
    }).join('');

    const html = '<!DOCTYPE html><html lang="pt-br"><head><meta charset="UTF-8"><title>Relatório de Vendas por Produto</title><style>body{font-family:Arial,sans-serif;margin:0;padding:20px;color:#1a1a1e}.header{text-align:center;border-bottom:2px solid #800020;padding-bottom:16px;margin-bottom:24px}.header h1{font-size:20px;margin:0 0 4px;color:#800020}.header p{font-size:12px;color:#666;margin:2px 0}.summary{display:flex;gap:20px;margin-bottom:20px}.sc{flex:1;border:1px solid #e5e5ea;border-radius:8px;padding:12px 16px}.sc .label{font-size:10px;text-transform:uppercase;font-weight:800;color:#6e6e73;letter-spacing:0.05em;display:block;margin-bottom:4px}.sc .value{font-size:24px;font-weight:900;color:#800020}table{width:100%;border-collapse:collapse}thead{background:#800020;color:white}thead th{padding:10px 12px;font-size:11px;text-align:left;text-transform:uppercase;letter-spacing:0.05em}tfoot td{padding:12px;font-weight:900;background:#f5f5f7;border-top:2px solid #800020}.footer{margin-top:24px;font-size:11px;color:#666;text-align:center;border-top:1px solid #e5e5ea;padding-top:12px}@media print{@page{margin:10mm;size:A4}}</style></head><body><div class="header"><h1>RELATÓRIO DE VENDAS POR PRODUTO</h1><p>TicketPro Portal de Gestão</p><p>Emitido em: ' + now + ' | Período: ' + startFmt + ' até ' + endFmt + '</p></div><div class="summary"><div class="sc"><span class="label">Total Arrecadado</span><span class="value">R$ ' + grandTotal.toFixed(2) + '</span></div><div class="sc"><span class="label">Itens Vendidos</span><span class="value">' + grandQty + ' un.</span></div><div class="sc"><span class="label">Produtos Diferentes</span><span class="value">' + rows.length + '</span></div></div><table><thead><tr><th>#</th><th>Produto</th><th>Qtd.</th><th>Total</th><th>Ticket Médio</th><th>% Total</th></tr></thead><tbody>' + tRows + '</tbody><tfoot><tr><td colspan="2">TOTAL GERAL</td><td style="text-align:center;">' + grandQty + ' un.</td><td style="text-align:right;">R$ ' + grandTotal.toFixed(2) + '</td><td>-</td><td>100%</td></tr></tfoot></table><div class="footer">TicketPro Sistema de Gestão - Relatório gerado automaticamente</div></body></html>';
    const win = window.open('', '_blank'); win.document.write(html); win.document.close(); setTimeout(() => win.print(), 500);
}// --- RELATORIO DE VENDAS POR CAIXA ---
function renderReportSalesByTerminal(container) {
    const today = getLocalDateString();

    container.innerHTML = `
        <div class="velo-filter-card">
            <div class="velo-filter-row">
                <div class="velo-date-inputs">
                    <div class="velo-date-group">
                        <label for="term-start">De</label>
                        <input type="date" id="term-start" class="velo-date-input" value="${today}">
                    </div>
                    <div class="velo-date-group">
                        <label for="term-end">Até</label>
                        <input type="date" id="term-end" class="velo-date-input" value="${today}">
                    </div>
                    <button class="velo-btn-search" onclick="filterSalesByTerminalByPeriod()">
                        <i data-lucide="search" style="width: 18px; height: 18px;"></i>
                    </button>
                </div>
                <div class="velo-presets-scroll" style="flex: 1; align-self: flex-end; margin-bottom: 2px;">
                    <button class="velo-pill-btn active" onclick="setSalesByTerminalPeriodPreset('hoje', this)">Hoje</button>
                    <button class="velo-pill-btn" onclick="setSalesByTerminalPeriodPreset('ontem', this)">Ontem</button>
                    <button class="velo-pill-btn" onclick="setSalesByTerminalPeriodPreset('7d', this)">7 dias atrás</button>
                    <button class="velo-pill-btn" onclick="setSalesByTerminalPeriodPreset('30d', this)">30 dias atrás</button>
                    <button class="velo-pill-btn" onclick="setSalesByTerminalPeriodPreset('esteMes', this)">Este mês</button>
                    <button class="velo-pill-btn" onclick="setSalesByTerminalPeriodPreset('ultimoMes', this)">Último mês</button>
                    <button class="velo-pill-btn" onclick="setSalesByTerminalPeriodPreset('esteAno', this)">Este ano</button>
                    <button class="velo-pill-btn" onclick="setSalesByTerminalPeriodPreset('ultimoAno', this)">Último ano</button>
                </div>
            </div>
        </div>
        
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
            <h3 style="font-weight:900;letter-spacing:-0.03em;font-size:18px;color:var(--text-main)">Resultados da Busca</h3>
            <button class="velo-btn-pdf" onclick="printSalesByTerminal()">
                <i data-lucide="file-text" style="width:16px;height:16px;"></i> Exportar PDF
            </button>
        </div>
        
        <div id="terminal-report-content">
            <!-- Rendered via JS -->
        </div>
    `;

    setTimeout(() => {
        if (window.lucide) lucide.createIcons();
        filterSalesByTerminalByPeriod(); // Initial load
    }, 50);
}

window.setSalesByTerminalPeriodPreset = function (preset, btn) {
    btn.closest('.velo-presets-scroll').querySelectorAll('.velo-pill-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const today = new Date();
    let start = new Date();
    let end = new Date();

    switch (preset) {
        case 'hoje':
            break;
        case 'ontem':
            start.setDate(today.getDate() - 1);
            end.setDate(today.getDate() - 1);
            break;
        case '7d':
            start.setDate(today.getDate() - 7);
            break;
        case '30d':
            start.setDate(today.getDate() - 30);
            break;
        case 'esteMes':
            start.setDate(1);
            break;
        case 'ultimoMes':
            start.setMonth(today.getMonth() - 1);
            start.setDate(1);
            end.setMonth(today.getMonth());
            end.setDate(0);
            break;
        case 'esteAno':
            start.setMonth(0);
            start.setDate(1);
            break;
        case 'ultimoAno':
            start.setFullYear(today.getFullYear() - 1);
            start.setMonth(0);
            start.setDate(1);
            end.setFullYear(today.getFullYear() - 1);
            end.setMonth(11);
            end.setDate(31);
            break;
    }

    document.getElementById('term-start').value = getLocalDateString(start);
    document.getElementById('term-end').value = getLocalDateString(end);

    filterSalesByTerminalByPeriod();
}

window.filterSalesByTerminalByPeriod = function () {
    const startStr = document.getElementById('term-start').value;
    const endStr = document.getElementById('term-end').value;

    if (!startStr || !endStr) return;

    const filtered = state.sales.filter(s => {
        const saleDateStr = getLocalDateString(s.timestamp);
        return saleDateStr >= startStr && saleDateStr <= endStr;
    });

    const byTerminal = {};
    filtered.forEach(s => {
        const tid = s.terminalId || 'Desconhecido';
        if (!byTerminal[tid]) byTerminal[tid] = { name: tid, qty: 0, total: 0, pms: {} };
        byTerminal[tid].qty += 1;
        byTerminal[tid].total += s.price;
        const pm = s.paymentMethod || 'N/D';
        byTerminal[tid].pms[pm] = (byTerminal[tid].pms[pm] || 0) + 1;
    });

    const rows = Object.values(byTerminal).sort((a, b) => b.total - a.total);
    const grandTotal = rows.reduce((a, r) => a + r.total, 0);
    const grandQty = rows.reduce((a, r) => a + r.qty, 0);

    const tRows = rows.map((r, i) => {
        const pct = grandTotal > 0 ? ((r.total / grandTotal) * 100).toFixed(1) : 0;
        const ticket = (r.total / r.qty).toFixed(2);
        const pms = Object.entries(r.pms).map(([k, v]) => '<span style="padding:4px 8px;background:var(--accent);border-radius:6px;font-size:11px;font-weight:700;margin-right:6px;color:var(--text-main);border:1px solid var(--border-soft);">' + k + ': ' + v + 'x</span>').join('');
        return '<tr><td style="font-weight:800;color:var(--text-sub);">' + (i + 1) + '</td><td style="font-weight:800;color:var(--text-main);">Caixa ' + r.name + '</td><td style="font-weight:900;font-size:16px;color:var(--text-main);">' + r.qty + ' un.</td><td style="font-weight:900;color:var(--brand);font-size:16px;">R$ ' + r.total.toFixed(2) + '</td><td style="font-weight:700;color:var(--text-main);">R$ ' + ticket + '</td><td>' + pms + '</td><td><div style="display:flex;align-items:center;gap:8px;"><div style="flex:1;height:8px;background:var(--accent);border-radius:4px;overflow:hidden;"><div style="width:' + pct + '%;height:100%;background:var(--brand);border-radius:4px;"></div></div><span style="font-weight:800;font-size:13px;color:var(--text-main);">' + pct + '%</span></div></td></tr>';
    }).join('');

    const totalRow = rows.length > 0 ? '<tr style="background:rgba(37,99,235,0.04);border-top:1.5px solid var(--border-med);"><td colspan="2" style="font-weight:900;padding:18px 24px;color:var(--text-main)">TOTAL GERAL</td><td style="font-weight:900;font-size:16px;color:var(--text-main)">' + grandQty + ' un.</td><td style="font-weight:900;color:var(--brand);font-size:17px;">R$ ' + grandTotal.toFixed(2) + '</td><td colspan="3"></td></tr>' : '';

    const emptyStateHtml = `
        <div class="velo-empty-state">
            <div class="velo-empty-illustration">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <path d="M16 16s-1.5-2-4-2-4 2-4 2"></path>
                    <line x1="9" y1="9" x2="9.01" y2="9"></line>
                    <line x1="15" y1="9" x2="15.01" y2="9"></line>
                </svg>
            </div>
            <div class="velo-empty-text">Nenhuma venda registrada neste período para os caixas.</div>
        </div>
    `;

    const content = `
        <div class="stat-grid" style="margin-bottom:24px;">
            <div class="velo-kpi-card">
                <div class="velo-kpi-header">
                    <span class="velo-kpi-label">Total Arrecadado</span>
                    <div class="velo-kpi-icon"><i data-lucide="dollar-sign" style="width:16px;height:16px;"></i></div>
                </div>
                <span class="velo-kpi-value" style="color:var(--brand)">R$ ${grandTotal.toFixed(2)}</span>
            </div>
            <div class="velo-kpi-card">
                <div class="velo-kpi-header">
                    <span class="velo-kpi-label">Tickets Emitidos</span>
                    <div class="velo-kpi-icon"><i data-lucide="ticket" style="width:16px;height:16px;"></i></div>
                </div>
                <span class="velo-kpi-value">${grandQty}<span>un.</span></span>
            </div>
            <div class="velo-kpi-card">
                <div class="velo-kpi-header">
                    <span class="velo-kpi-label">Caixas Ativos</span>
                    <div class="velo-kpi-icon"><i data-lucide="monitor" style="width:16px;height:16px;"></i></div>
                </div>
                <span class="velo-kpi-value">${rows.length}<span>caixas</span></span>
            </div>
        </div>
        <div class="velo-table-card">
            <table class="velo-table">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Caixa / Terminal</th>
                        <th>Qtd. Vendas</th>
                        <th>Total Arrecadado</th>
                        <th>Ticket Médio</th>
                        <th>Formas de Pgto</th>
                        <th>% do Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows.length === 0 ? `<tr><td colspan="7" style="padding:0;">${emptyStateHtml}</td></tr>` : tRows + totalRow}
                </tbody>
            </table>
        </div>
    `;

    document.getElementById('terminal-report-content').innerHTML = content;
    setTimeout(() => {
        if (window.lucide) lucide.createIcons();
    }, 20);
}

window.printSalesByTerminal = function () {
    const startStr = document.getElementById('term-start').value;
    const endStr = document.getElementById('term-end').value;

    if (!startStr || !endStr) return;

    const filtered = state.sales.filter(s => {
        const saleDateStr = getLocalDateString(s.timestamp);
        return saleDateStr >= startStr && saleDateStr <= endStr;
    });

    const byTerminal = {};
    filtered.forEach(s => {
        const tid = s.terminalId || 'Desconhecido';
        if (!byTerminal[tid]) byTerminal[tid] = { name: tid, qty: 0, total: 0 };
        byTerminal[tid].qty += 1;
        byTerminal[tid].total += s.price;
    });

    const rows = Object.values(byTerminal).sort((a, b) => b.total - a.total);
    const grandTotal = rows.reduce((a, r) => a + r.total, 0);
    const grandQty = rows.reduce((a, r) => a + r.qty, 0);
    const now = new Date().toLocaleString('pt-BR');

    const startFmt = startStr.split('-').reverse().join('/');
    const endFmt = endStr.split('-').reverse().join('/');

    const tRows = rows.map((r, i) => {
        const pct = grandTotal > 0 ? ((r.total / grandTotal) * 100).toFixed(1) : 0;
        const bg = i % 2 === 0 ? '#fff' : '#f9f9fb';
        return '<tr style="background:' + bg + ';border-bottom:1px solid #e5e5ea;"><td style="padding:10px 12px;font-size:13px;font-weight:800;">' + (i + 1) + '</td><td style="padding:10px 12px;font-weight:700;">Caixa ' + r.name + '</td><td style="padding:10px 12px;font-weight:900;font-size:16px;text-align:center;">' + r.qty + '</td><td style="padding:10px 12px;font-weight:900;color:#800020;text-align:right;">R$ ' + r.total.toFixed(2) + '</td><td style="padding:10px 12px;font-size:12px;text-align:right;">R$ ' + (r.total / r.qty).toFixed(2) + '</td><td style="padding:10px 12px;font-size:12px;text-align:right;">' + pct + '%</td></tr>';
    }).join('');

    const html = '<!DOCTYPE html><html lang="pt-br"><head><meta charset="UTF-8"><title>Relatório de Vendas por Caixa</title><style>body{font-family:Arial,sans-serif;margin:0;padding:20px;color:#1a1a1e}.header{text-align:center;border-bottom:2px solid #800020;padding-bottom:16px;margin-bottom:24px}.header h1{font-size:20px;margin:0 0 4px;color:#800020}.header p{font-size:12px;color:#666;margin:2px 0}.summary{display:flex;gap:20px;margin-bottom:20px}.sc{flex:1;border:1px solid #e5e5ea;border-radius:8px;padding:12px 16px}.sc .label{font-size:10px;text-transform:uppercase;font-weight:800;color:#6e6e73;letter-spacing:0.05em;display:block;margin-bottom:4px}.sc .value{font-size:24px;font-weight:900;color:#800020}table{width:100%;border-collapse:collapse}thead{background:#800020;color:white}thead th{padding:10px 12px;font-size:11px;text-align:left;text-transform:uppercase;letter-spacing:0.05em}tfoot td{padding:12px;font-weight:900;background:#f5f5f7;border-top:2px solid #800020}.footer{margin-top:24px;font-size:11px;color:#666;text-align:center;border-top:1px solid #e5e5ea;padding-top:12px}@media print{@page{margin:10mm;size:A4}}</style></head><body><div class="header"><h1>RELATÓRIO DE VENDAS POR CAIXA</h1><p>TicketPro Portal de Gestão</p><p>Emitido em: ' + now + ' | Período: ' + startFmt + ' até ' + endFmt + '</p></div><div class="summary"><div class="sc"><span class="label">Total Arrecadado</span><span class="value">R$ ' + grandTotal.toFixed(2) + '</span></div><div class="sc"><span class="label">Tickets Emitidos</span><span class="value">' + grandQty + ' un.</span></div><div class="sc"><span class="label">Caixas Ativos</span><span class="value">' + rows.length + '</span></div></div><table><thead><tr><th>#</th><th>Caixa / Terminal</th><th>Qtd. Vendas</th><th>Total Arrecadado</th><th>Ticket Médio</th><th>% Total</th></tr></thead><tbody>' + tRows + '</tbody><tfoot><tr><td colspan="2">TOTAL GERAL</td><td style="text-align:center;">' + grandQty + ' un.</td><td style="text-align:right;">R$ ' + grandTotal.toFixed(2) + '</td><td>-</td><td>100%</td></tr></tfoot></table><div class="footer">TicketPro Sistema de Gestão - Relatório gerado automaticamente</div></body></html>';

    const win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 500);
}

// --- RELATORIO DE SANGRIAS ---
function renderReportSangrias(container) {
    const today = getLocalDateString();

    container.innerHTML = `
        <div class="velo-filter-card">
            <div class="velo-filter-row">
                <div class="velo-date-inputs">
                    <div class="velo-date-group">
                        <label for="sangria-start">De</label>
                        <input type="date" id="sangria-start" class="velo-date-input" value="${today}">
                    </div>
                    <div class="velo-date-group">
                        <label for="sangria-end">Até</label>
                        <input type="date" id="sangria-end" class="velo-date-input" value="${today}">
                    </div>
                    <button class="velo-btn-search" onclick="filterSangriasByPeriod()">
                        <i data-lucide="search" style="width: 18px; height: 18px;"></i>
                    </button>
                </div>
                <div class="velo-presets-scroll" style="flex: 1; align-self: flex-end; margin-bottom: 2px;">
                    <button class="velo-pill-btn active" onclick="setSangriasPeriodPreset('hoje', this)">Hoje</button>
                    <button class="velo-pill-btn" onclick="setSangriasPeriodPreset('ontem', this)">Ontem</button>
                    <button class="velo-pill-btn" onclick="setSangriasPeriodPreset('7d', this)">7 dias atrás</button>
                    <button class="velo-pill-btn" onclick="setSangriasPeriodPreset('30d', this)">30 dias atrás</button>
                    <button class="velo-pill-btn" onclick="setSangriasPeriodPreset('esteMes', this)">Este mês</button>
                    <button class="velo-pill-btn" onclick="setSangriasPeriodPreset('ultimoMes', this)">Último mês</button>
                    <button class="velo-pill-btn" onclick="setSangriasPeriodPreset('esteAno', this)">Este ano</button>
                    <button class="velo-pill-btn" onclick="setSangriasPeriodPreset('ultimoAno', this)">Último ano</button>
                </div>
            </div>
        </div>
        
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
            <h3 style="font-weight:900;letter-spacing:-0.03em;font-size:18px;color:var(--text-main)">Resultados da Busca</h3>
            <button class="velo-btn-pdf" onclick="printSangrias()">
                <i data-lucide="file-text" style="width:16px;height:16px;"></i> Exportar PDF
            </button>
        </div>
        
        <div id="sangrias-report-content">
            <!-- Renderizado via JS -->
        </div>
    `;

    setTimeout(() => {
        if (window.lucide) lucide.createIcons();
        filterSangriasByPeriod();
    }, 50);
}

window.setSangriasPeriodPreset = function (preset, btn) {
    btn.closest('.velo-presets-scroll').querySelectorAll('.velo-pill-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const today = new Date();
    let start = new Date();
    let end = new Date();

    switch (preset) {
        case 'hoje':
            break;
        case 'ontem':
            start.setDate(today.getDate() - 1);
            end.setDate(today.getDate() - 1);
            break;
        case '7d':
            start.setDate(today.getDate() - 7);
            break;
        case '30d':
            start.setDate(today.getDate() - 30);
            break;
        case 'esteMes':
            start.setDate(1);
            break;
        case 'ultimoMes':
            start.setMonth(today.getMonth() - 1);
            start.setDate(1);
            end.setMonth(today.getMonth());
            end.setDate(0);
            break;
        case 'esteAno':
            start.setMonth(0);
            start.setDate(1);
            break;
        case 'ultimoAno':
            start.setFullYear(today.getFullYear() - 1);
            start.setMonth(0);
            start.setDate(1);
            end.setFullYear(today.getFullYear() - 1);
            end.setMonth(11);
            end.setDate(31);
            break;
    }

    document.getElementById('sangria-start').value = getLocalDateString(start);
    document.getElementById('sangria-end').value = getLocalDateString(end);

    filterSangriasByPeriod();
}

window.filterSangriasByPeriod = function () {
    const startStr = document.getElementById('sangria-start').value;
    const endStr = document.getElementById('sangria-end').value;

    if (!startStr || !endStr) return;

    const sangrias = JSON.parse(localStorage.getItem('tp_sangrias') || '[]');

    const filtered = sangrias.filter(r => {
        const itemDateStr = getLocalDateString(r.timestamp);
        return itemDateStr >= startStr && itemDateStr <= endStr;
    });

    const rows = [...filtered].sort((a, b) => b.timestamp - a.timestamp);
    const grandTotal = rows.reduce((a, r) => a + r.valor, 0);

    const tRows = rows.map((r, i) => {
        const dataStr = new Date(r.timestamp).toLocaleString('pt-BR');
        return '<tr><td style="font-weight:800;color:var(--text-sub);">' + (i + 1) + '</td><td style="font-weight:800;color:var(--text-main);">' + dataStr + '</td><td style="font-weight:700;color:var(--text-main);">' + (r.motivo || 'Sangria') + '</td><td style="font-weight:700;color:var(--text-main);">Caixa ' + (r.terminalId || '-') + '</td><td style="font-weight:700;color:var(--text-sub);">' + (r.operador || '-') + '</td><td style="font-weight:900;color:var(--danger);font-size:16px;">- R$ ' + (r.valor || 0).toFixed(2) + '</td></tr>';
    }).join('');

    const totalRow = rows.length > 0 ? '<tr style="background:rgba(220,38,38,0.03);border-top:1.5px solid var(--border-med);"><td colspan="5" style="font-weight:900;padding:18px 24px;text-align:right;color:var(--text-main)">TOTAL RETIRADO</td><td style="font-weight:900;color:var(--danger);font-size:17px;">- R$ ' + grandTotal.toFixed(2) + '</td></tr>' : '';

    const emptyStateHtml = `
        <div class="velo-empty-state">
            <div class="velo-empty-illustration">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                </svg>
            </div>
            <div class="velo-empty-text">Nenhuma sangria ou retirada de caixa registrada neste período.</div>
        </div>
    `;

    const contentArea = document.getElementById('sangrias-report-content');
    if (contentArea) {
        contentArea.innerHTML = `
            <div class="stat-grid" style="margin-bottom:24px;">
                <div class="velo-kpi-card">
                    <div class="velo-kpi-header">
                        <span class="velo-kpi-label">Total Retirado</span>
                        <div class="velo-kpi-icon"><i data-lucide="arrow-down-right" style="width:16px;height:16px;color:var(--danger);"></i></div>
                    </div>
                    <span class="velo-kpi-value" style="color:var(--danger)">R$ ${grandTotal.toFixed(2)}</span>
                </div>
                <div class="velo-kpi-card">
                    <div class="velo-kpi-header">
                        <span class="velo-kpi-label">Operações</span>
                        <div class="velo-kpi-icon"><i data-lucide="activity" style="width:16px;height:16px;"></i></div>
                    </div>
                    <span class="velo-kpi-value">${rows.length}<span>retiradas</span></span>
                </div>
            </div>
            <div class="velo-table-card">
                <table class="velo-table">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Data/Hora</th>
                            <th>Motivo</th>
                            <th>Terminal</th>
                            <th>Operador</th>
                            <th>Valor Retirado</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows.length === 0 ? `<tr><td colspan="6" style="padding:0;">${emptyStateHtml}</td></tr>` : tRows + totalRow}
                    </tbody>
                </table>
            </div>
        `;
        setTimeout(() => {
            if (window.lucide) lucide.createIcons();
        }, 20);
    }
}

window.printSangrias = function () {
    const startStr = document.getElementById('sangria-start').value;
    const endStr = document.getElementById('sangria-end').value;

    if (!startStr || !endStr) return;

    const sangrias = JSON.parse(localStorage.getItem('tp_sangrias') || '[]');

    const filtered = sangrias.filter(r => {
        const itemDateStr = getLocalDateString(r.timestamp);
        return itemDateStr >= startStr && itemDateStr <= endStr;
    });

    const rows = [...filtered].sort((a, b) => b.timestamp - a.timestamp);
    const grandTotal = rows.reduce((a, r) => a + r.valor, 0);
    const now = new Date().toLocaleString('pt-BR');

    const startFmt = startStr.split('-').reverse().join('/');
    const endFmt = endStr.split('-').reverse().join('/');

    const tRows = rows.map((r, i) => {
        const bg = i % 2 === 0 ? '#fff' : '#f9f9fb';
        const dataStr = new Date(r.timestamp).toLocaleString('pt-BR');
        return '<tr style="background:' + bg + ';border-bottom:1px solid #e5e5ea;"><td style="padding:10px 12px;font-size:13px;font-weight:800;">' + (i + 1) + '</td><td style="padding:10px 12px;font-size:12px;">' + dataStr + '</td><td style="padding:10px 12px;font-weight:700;">' + (r.motivo || 'Sangria') + '</td><td style="padding:10px 12px;font-size:12px;">Caixa ' + (r.terminalId || '-') + '</td><td style="padding:10px 12px;font-size:12px;">' + (r.operador || '-') + '</td><td style="padding:10px 12px;font-weight:900;color:#ff3b30;text-align:right;">- R$ ' + (r.valor || 0).toFixed(2) + '</td></tr>';
    }).join('');

    const html = '<!DOCTYPE html><html lang="pt-br"><head><meta charset="UTF-8"><title>Relatório de Sangrias</title><style>body{font-family:Arial,sans-serif;margin:0;padding:20px;color:#1a1a1e}.header{text-align:center;border-bottom:2px solid #800020;padding-bottom:16px;margin-bottom:24px}.header h1{font-size:20px;margin:0 0 4px;color:#800020}.header p{font-size:12px;color:#666;margin:2px 0}.summary{display:flex;gap:20px;margin-bottom:20px}.sc{flex:1;border:1px solid #e5e5ea;border-radius:8px;padding:12px 16px}.sc .label{font-size:10px;text-transform:uppercase;font-weight:800;color:#6e6e73;letter-spacing:0.05em;display:block;margin-bottom:4px}.sc .value{font-size:24px;font-weight:900;color:#ff3b30}table{width:100%;border-collapse:collapse}thead{background:#800020;color:white}thead th{padding:10px 12px;font-size:11px;text-align:left;text-transform:uppercase;letter-spacing:0.05em}tfoot td{padding:12px;font-weight:900;background:#f5f5f7;border-top:2px solid #800020}.footer{margin-top:24px;font-size:11px;color:#666;text-align:center;border-top:1px solid #e5e5ea;padding-top:12px}@media print{@page{margin:10mm;size:A4}}</style></head><body><div class="header"><h1>RELATÓRIO DE SANGRIAS</h1><p>TicketPro Portal de Gestão</p><p>Emitido em: ' + now + ' | Período: ' + startFmt + ' até ' + endFmt + '</p></div><div class="summary"><div class="sc"><span class="label">Total Retirado</span><span class="value">R$ ' + grandTotal.toFixed(2) + '</span></div><div class="sc"><span class="label">Operações</span><span class="value">' + rows.length + ' un.</span></div></div><table><thead><tr><th>#</th><th>Data/Hora</th><th>Motivo</th><th>Terminal</th><th>Operador</th><th>Valor</th></tr></thead><tbody>' + (rows.length === 0 ? '<tr><td colspan="6" style="text-align:center;padding:40px;color:#666;">Nenhuma sangria registrada neste período.</td></tr>' : tRows) + '</tbody><tfoot><tr><td colspan="5" style="text-align:right;">TOTAL RETIRADO</td><td style="text-align:right;color:#ff3b30;font-weight:900;">- R$ ' + grandTotal.toFixed(2) + '</td></tr></tfoot></table><div class="footer">TicketPro Sistema de Gestão - Relatório gerado automaticamente</div></body></html>';

    const win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 500);
}


// --- RELATORIO DE VENDAS POR PERIODO ---
function renderReportSalesByPeriod(container) {
    const today = getLocalDateString();

    container.innerHTML = `
        <div class="velo-filter-card">
            <div class="velo-filter-row">
                <div class="velo-date-inputs">
                    <div class="velo-date-group">
                        <label for="filter-start">De</label>
                        <input type="date" id="filter-start" class="velo-date-input" value="${today}">
                    </div>
                    <div class="velo-date-group">
                        <label for="filter-end">Até</label>
                        <input type="date" id="filter-end" class="velo-date-input" value="${today}">
                    </div>
                    <button class="velo-btn-search" onclick="filterSalesByPeriod()">
                        <i data-lucide="search" style="width: 18px; height: 18px;"></i>
                    </button>
                </div>
                <div class="velo-presets-scroll" style="flex: 1; align-self: flex-end; margin-bottom: 2px;">
                    <button class="velo-pill-btn active" onclick="setSalesPeriodPreset('hoje', this)">Hoje</button>
                    <button class="velo-pill-btn" onclick="setSalesPeriodPreset('ontem', this)">Ontem</button>
                    <button class="velo-pill-btn" onclick="setSalesPeriodPreset('7d', this)">7 dias atrás</button>
                    <button class="velo-pill-btn" onclick="setSalesPeriodPreset('30d', this)">30 dias atrás</button>
                    <button class="velo-pill-btn" onclick="setSalesPeriodPreset('esteMes', this)">Este mês</button>
                    <button class="velo-pill-btn" onclick="setSalesPeriodPreset('ultimoMes', this)">Último mês</button>
                    <button class="velo-pill-btn" onclick="setSalesPeriodPreset('esteAno', this)">Este ano</button>
                    <button class="velo-pill-btn" onclick="setSalesPeriodPreset('ultimoAno', this)">Último ano</button>
                </div>
            </div>
        </div>
        
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
            <h3 style="font-weight:900;letter-spacing:-0.03em;font-size:18px;color:var(--text-main)">Resultados da Busca</h3>
            <button class="velo-btn-pdf" onclick="printSalesByPeriod()">
                <i data-lucide="file-text" style="width:16px;height:16px;"></i> Exportar PDF
            </button>
        </div>
        
        <div id="period-report-content">
            <!-- Rendered via JS -->
        </div>
    `;

    setTimeout(() => {
        if (window.lucide) lucide.createIcons();
        filterSalesByPeriod(); // Initial load
    }, 50);
}

window.setSalesPeriodPreset = function (preset, btn) {
    btn.closest('.velo-presets-scroll').querySelectorAll('.velo-pill-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const today = new Date();
    let start = new Date();
    let end = new Date();

    switch (preset) {
        case 'hoje':
            break;
        case 'ontem':
            start.setDate(today.getDate() - 1);
            end.setDate(today.getDate() - 1);
            break;
        case '7d':
            start.setDate(today.getDate() - 7);
            break;
        case '30d':
            start.setDate(today.getDate() - 30);
            break;
        case 'esteMes':
            start.setDate(1);
            break;
        case 'ultimoMes':
            start.setMonth(today.getMonth() - 1);
            start.setDate(1);
            end.setMonth(today.getMonth());
            end.setDate(0);
            break;
        case 'esteAno':
            start.setMonth(0);
            start.setDate(1);
            break;
        case 'ultimoAno':
            start.setFullYear(today.getFullYear() - 1);
            start.setMonth(0);
            start.setDate(1);
            end.setFullYear(today.getFullYear() - 1);
            end.setMonth(11);
            end.setDate(31);
            break;
    }

    document.getElementById('filter-start').value = getLocalDateString(start);
    document.getElementById('filter-end').value = getLocalDateString(end);

    filterSalesByPeriod();
}

window.filterSalesByPeriod = function () {
    const startStr = document.getElementById('filter-start').value;
    const endStr = document.getElementById('filter-end').value;

    if (!startStr || !endStr) return;

    const filtered = state.sales.filter(s => {
        const saleDateStr = getLocalDateString(s.timestamp);
        return saleDateStr >= startStr && saleDateStr <= endStr;
    });

    const byProduct = {};
    filtered.forEach(s => {
        if (!byProduct[s.productName]) byProduct[s.productName] = { name: s.productName, qty: 0, total: 0 };
        byProduct[s.productName].qty += 1;
        byProduct[s.productName].total += s.price;
    });

    const rows = Object.values(byProduct).sort((a, b) => b.total - a.total);
    const grandTotal = rows.reduce((a, r) => a + r.total, 0);
    const grandQty = rows.reduce((a, r) => a + r.qty, 0);

    const tRows = rows.map((r, i) => {
        const pct = grandTotal > 0 ? ((r.total / grandTotal) * 100).toFixed(1) : 0;
        return '<tr><td style="font-weight:800;color:var(--text-sub);">' + (i + 1) + '</td><td style="font-weight:800;color:var(--text-main);">' + r.name + '</td><td style="font-weight:900;font-size:16px;text-align:center;color:var(--text-main);">' + r.qty + ' un.</td><td style="font-weight:900;color:var(--brand);font-size:16px;text-align:right;">R$ ' + r.total.toFixed(2) + '</td><td style="text-align:right;font-size:13.5px;font-weight:700;color:var(--text-main);">' + pct + '%</td></tr>';
    }).join('');

    const emptyStateHtml = `
        <div class="velo-empty-state">
            <div class="velo-empty-illustration">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
            </div>
            <div class="velo-empty-text">Nenhuma venda encontrada para o período selecionado.</div>
        </div>
    `;

    const content = `
        <div class="stat-grid" style="margin-bottom:24px;">
            <div class="velo-kpi-card">
                <div class="velo-kpi-header">
                    <span class="velo-kpi-label">Faturamento no Período</span>
                    <div class="velo-kpi-icon"><i data-lucide="trending-up" style="width:16px;height:16px;color:var(--success);"></i></div>
                </div>
                <span class="velo-kpi-value" style="color:var(--brand)">R$ ${grandTotal.toFixed(2)}</span>
            </div>
            <div class="velo-kpi-card">
                <div class="velo-kpi-header">
                    <span class="velo-kpi-label">Itens Vendidos</span>
                    <div class="velo-kpi-icon"><i data-lucide="shopping-bag" style="width:16px;height:16px;"></i></div>
                </div>
                <span class="velo-kpi-value">${grandQty}<span>un.</span></span>
            </div>
            <div class="velo-kpi-card">
                <div class="velo-kpi-header">
                    <span class="velo-kpi-label">Tickets Gerados</span>
                    <div class="velo-kpi-icon"><i data-lucide="file-text" style="width:16px;height:16px;"></i></div>
                </div>
                <span class="velo-kpi-value">${filtered.length}<span>operações</span></span>
            </div>
        </div>
        <div class="velo-table-card">
            <table class="velo-table">
                <thead>
                    <tr>
                        <th style="width:60px">#</th>
                        <th>Produto</th>
                        <th style="text-align:center;">Qtd. Vendida</th>
                        <th style="text-align:right;">Faturamento (R$)</th>
                        <th style="text-align:right;">Participação (%)</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows.length === 0 ? `<tr><td colspan="5" style="padding:0;">${emptyStateHtml}</td></tr>` : tRows}
                </tbody>
            </table>
        </div>
    `;

    document.getElementById('period-report-content').innerHTML = content;
    setTimeout(() => {
        if (window.lucide) lucide.createIcons();
    }, 20);
}

window.printSalesByPeriod = function () {
    const startStr = document.getElementById('filter-start').value;
    const endStr = document.getElementById('filter-end').value;
    if (!startStr || !endStr) return;

    const filtered = state.sales.filter(s => {
        const saleDateStr = getLocalDateString(s.timestamp);
        return saleDateStr >= startStr && saleDateStr <= endStr;
    });

    const byProduct = {};
    filtered.forEach(s => {
        if (!byProduct[s.productName]) byProduct[s.productName] = { name: s.productName, qty: 0, total: 0 };
        byProduct[s.productName].qty += 1;
        byProduct[s.productName].total += s.price;
    });

    const rows = Object.values(byProduct).sort((a, b) => b.total - a.total);
    const grandTotal = rows.reduce((a, r) => a + r.total, 0);
    const grandQty = rows.reduce((a, r) => a + r.qty, 0);
    const now = new Date().toLocaleString('pt-BR');

    const startFmt = startStr.split('-').reverse().join('/');
    const endFmt = endStr.split('-').reverse().join('/');

    const tRows = rows.map((r, i) => {
        const pct = grandTotal > 0 ? ((r.total / grandTotal) * 100).toFixed(1) : 0;
        const bg = i % 2 === 0 ? '#fff' : '#f9f9fb';
        return '<tr style="background:' + bg + ';border-bottom:1px solid #e5e5ea;"><td style="padding:10px 12px;font-size:13px;font-weight:800;">' + (i + 1) + '</td><td style="padding:10px 12px;font-weight:700;">' + r.name + '</td><td style="padding:10px 12px;font-weight:900;font-size:16px;text-align:center;">' + r.qty + '</td><td style="padding:10px 12px;font-weight:900;color:#800020;text-align:right;">R$ ' + r.total.toFixed(2) + '</td><td style="padding:10px 12px;font-size:12px;text-align:right;">' + pct + '%</td></tr>';
    }).join('');

    const html = '<!DOCTYPE html><html lang="pt-br"><head><meta charset="UTF-8"><title>Relatório por Período</title><style>body{font-family:Arial,sans-serif;margin:0;padding:20px;color:#1a1a1e}.header{text-align:center;border-bottom:2px solid #800020;padding-bottom:16px;margin-bottom:24px}.header h1{font-size:20px;margin:0 0 4px;color:#800020}.header p{font-size:12px;color:#666;margin:2px 0}.summary{display:flex;gap:20px;margin-bottom:20px}.sc{flex:1;border:1px solid #e5e5ea;border-radius:8px;padding:12px 16px}.sc .label{font-size:10px;text-transform:uppercase;font-weight:800;color:#6e6e73;letter-spacing:0.05em;display:block;margin-bottom:4px}.sc .value{font-size:24px;font-weight:900;color:#800020}table{width:100%;border-collapse:collapse}thead{background:#800020;color:white}thead th{padding:10px 12px;font-size:11px;text-align:left;text-transform:uppercase;letter-spacing:0.05em}tfoot td{padding:12px;font-weight:900;background:#f5f5f7;border-top:2px solid #800020}.footer{margin-top:24px;font-size:11px;color:#666;text-align:center;border-top:1px solid #e5e5ea;padding-top:12px}@media print{@page{margin:10mm;size:A4}}</style></head><body><div class="header"><h1>RELATÓRIO DE VENDAS POR PERÍODO</h1><p>TicketPro Portal de Gestão</p><p>Período: ' + startFmt + ' até ' + endFmt + ' | Emitido: ' + now + '</p></div><div class="summary"><div class="sc"><span class="label">Total Arrecadado</span><span class="value">R$ ' + grandTotal.toFixed(2) + '</span></div><div class="sc"><span class="label">Itens Vendidos</span><span class="value">' + grandQty + ' un.</span></div><div class="sc"><span class="label">Tickets Emitidos</span><span class="value">' + filtered.length + ' op.</span></div></div><table><thead><tr><th>#</th><th>Produto</th><th>Qtd. Vendida</th><th>Faturamento (R$)</th><th>% Total</th></tr></thead><tbody>' + tRows + '</tbody><tfoot><tr><td colspan="2">TOTAL GERAL</td><td style="text-align:center;">' + grandQty + ' un.</td><td style="text-align:right;">R$ ' + grandTotal.toFixed(2) + '</td><td>100%</td></tr></tfoot></table><div class="footer">TicketPro Sistema de Gestão - Relatório gerado automaticamente</div></body></html>';

    const win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 500);
}

// --- RELATORIO DE FECHAMENTO DE CAIXA ---
function renderReportFechamento(container) {
    const today = getLocalDateString();

    container.innerHTML = `
        <div class="period-filter-bar">
            <div class="period-inputs">
                <input type="date" id="fechamento-start" value="${today}">
                <input type="date" id="fechamento-end" value="${today}">
                <button class="btn-search" onclick="filterFechamentoByPeriod()">
                    <i data-lucide="search" style="width: 18px;"></i>
                </button>
            </div>
            <div class="period-presets">
                <button class="preset-btn active" onclick="setFechamentoPeriodPreset('hoje', this)">Hoje</button>
                <button class="preset-btn" onclick="setFechamentoPeriodPreset('ontem', this)">Ontem</button>
                <button class="preset-btn" onclick="setFechamentoPeriodPreset('7d', this)">7 dias atrás</button>
                <button class="preset-btn" onclick="setFechamentoPeriodPreset('30d', this)">30 dias atrás</button>
                <button class="preset-btn" onclick="setFechamentoPeriodPreset('esteMes', this)">Este mês</button>
                <button class="preset-btn" onclick="setFechamentoPeriodPreset('ultimoMes', this)">Último mês</button>
                <button class="preset-btn" onclick="setFechamentoPeriodPreset('esteAno', this)">Este ano</button>
                <button class="preset-btn" onclick="setFechamentoPeriodPreset('ultimoAno', this)">Último ano</button>
            </div>
        </div>
        
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
            <h3 style="font-weight:800;letter-spacing:-0.03em;">Resultados da Busca</h3>
            <button class="btn-save" onclick="printFechamento()" style="display:flex;align-items:center;gap:8px;padding:8px 16px;">
                <i data-lucide="printer" style="width:16px;"></i> Imprimir Fechamento
            </button>
        </div>
        
        <div id="fechamento-report-content">
            <!-- Rendered via JS -->
        </div>
    `;

    setTimeout(() => {
        if (window.lucide) lucide.createIcons();
        filterFechamentoByPeriod(); // Initial load
    }, 50);
}

window.setFechamentoPeriodPreset = function (preset, btn) {
    document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const today = new Date();
    let start = new Date();
    let end = new Date();

    switch (preset) {
        case 'hoje':
            break;
        case 'ontem':
            start.setDate(today.getDate() - 1);
            end.setDate(today.getDate() - 1);
            break;
        case '7d':
            start.setDate(today.getDate() - 7);
            break;
        case '30d':
            start.setDate(today.getDate() - 30);
            break;
        case 'esteMes':
            start.setDate(1);
            break;
        case 'ultimoMes':
            start.setMonth(today.getMonth() - 1);
            start.setDate(1);
            end.setMonth(today.getMonth());
            end.setDate(0);
            break;
        case 'esteAno':
            start.setMonth(0);
            start.setDate(1);
            break;
        case 'ultimoAno':
            start.setFullYear(today.getFullYear() - 1);
            start.setMonth(0);
            start.setDate(1);
            end.setFullYear(today.getFullYear() - 1);
            end.setMonth(11);
            end.setDate(31);
            break;
    }

    document.getElementById('fechamento-start').value = getLocalDateString(start);
    document.getElementById('fechamento-end').value = getLocalDateString(end);

    filterFechamentoByPeriod();
}

window.filterFechamentoByPeriod = function () {
    const startStr = document.getElementById('fechamento-start').value;
    const endStr = document.getElementById('fechamento-end').value;

    if (!startStr || !endStr) return;

    const localTid = localStorage.getItem('tp_tid') || '';
    const localSuprimento = parseFloat(localStorage.getItem('tp_suprimento_valor') || '0');
    const localSangrias = JSON.parse(localStorage.getItem('tp_sangrias') || '[]');

    // Filtra vendas do período usando getLocalDateString
    const salesFiltered = state.sales.filter(s => {
        const saleDateStr = getLocalDateString(s.timestamp);
        return saleDateStr >= startStr && saleDateStr <= endStr;
    });

    const byTerminal = {};

    // Iniciar a partir das vendas filtradas
    salesFiltered.forEach(s => {
        const tid = s.terminalId || 'Desconhecido';
        if (!byTerminal[tid]) byTerminal[tid] = { name: tid, vendas: 0, dinheiro: 0, cartoes: 0, suprimento: 0, sangrias: 0 };
        byTerminal[tid].vendas += s.price;
        const pms = (s.paymentMethod || 'Dinheiro').split(' + ');
        const dividedPrice = s.price / pms.length;
        pms.forEach(pmRaw => {
            const pm = pmRaw.trim().toUpperCase();
            if (pm === 'DINHEIRO') {
                byTerminal[tid].dinheiro += dividedPrice;
            } else {
                byTerminal[tid].cartoes += dividedPrice;
            }
        });
    });

    // Injetar suprimento local se aplicável
    const todayStr = getLocalDateString();
    const coversToday = (todayStr >= startStr && todayStr <= endStr);
    if (localTid && coversToday) {
        if (!byTerminal[localTid]) byTerminal[localTid] = { name: localTid, vendas: 0, dinheiro: 0, cartoes: 0, suprimento: 0, sangrias: 0 };
        byTerminal[localTid].suprimento = localSuprimento;
    }

    // Filtrar sangrias locais do período
    localSangrias.forEach(s => {
        const sangriaDateStr = getLocalDateString(s.timestamp);
        if (sangriaDateStr >= startStr && sangriaDateStr <= endStr) {
            const tid = s.terminalId || localTid;
            if (!byTerminal[tid]) byTerminal[tid] = { name: tid, vendas: 0, dinheiro: 0, cartoes: 0, suprimento: 0, sangrias: 0 };
            byTerminal[tid].sangrias += (s.valor || 0);
        }
    });

    const rows = Object.values(byTerminal).sort((a, b) => a.name.localeCompare(b.name));
    let grandVendas = 0, grandDinheiro = 0, grandCartoes = 0, grandSangrias = 0, grandGaveta = 0;

    const tRows = rows.map((r, i) => {
        const gaveta = r.suprimento + r.dinheiro - r.sangrias;
        grandVendas += r.vendas;
        grandDinheiro += r.dinheiro;
        grandCartoes += r.cartoes;
        grandSangrias += r.sangrias;
        grandGaveta += gaveta;

        return '<tr><td style="font-weight:800;">Caixa ' + r.name + '</td><td style="font-weight:700;color:var(--brand);">R$ ' + r.vendas.toFixed(2) + '</td><td style="font-weight:700;">R$ ' + r.dinheiro.toFixed(2) + '</td><td style="font-weight:700;">R$ ' + r.cartoes.toFixed(2) + '</td><td style="font-weight:700;color:var(--text-sub);">R$ ' + r.suprimento.toFixed(2) + '</td><td style="font-weight:700;color:var(--danger);">- R$ ' + r.sangrias.toFixed(2) + '</td><td style="font-weight:900;color:var(--success);font-size:16px;">R$ ' + gaveta.toFixed(2) + '</td></tr>';
    }).join('');

    const totalRow = rows.length > 0 ? '<tr style="background:var(--accent);"><td style="font-weight:900;padding:16px 24px;">TOTAL GERAL</td><td style="font-weight:900;color:var(--brand);">R$ ' + grandVendas.toFixed(2) + '</td><td style="font-weight:900;">R$ ' + grandDinheiro.toFixed(2) + '</td><td style="font-weight:900;">R$ ' + grandCartoes.toFixed(2) + '</td><td style="font-weight:900;">-</td><td style="font-weight:900;color:var(--danger);">- R$ ' + grandSangrias.toFixed(2) + '</td><td style="font-weight:900;color:var(--success);font-size:18px;">R$ ' + grandGaveta.toFixed(2) + '</td></tr>' : '';

    const content = `
        <div class="stat-grid" style="margin-bottom:24px;">
            <div class="stat-box">
                <span class="label">Total em Gaveta (Dinheiro Líquido)</span>
                <span class="value" style="color:var(--success)">R$ ${grandGaveta.toFixed(2)}</span>
            </div>
            <div class="stat-box">
                <span class="label">Total Cartões / PIX</span>
                <span class="value">R$ ${grandCartoes.toFixed(2)}</span>
            </div>
            <div class="stat-box">
                <span class="label">Faturamento no Período</span>
                <span class="value" style="color:var(--brand)">R$ ${grandVendas.toFixed(2)}</span>
            </div>
        </div>
        <div class="glass-card" style="padding:0;overflow:hidden">
            <table class="modern-table" style="margin:0">
                <thead>
                    <tr>
                        <th>Caixa / Terminal</th>
                        <th>Total Vendas</th>
                        <th>Recebido em Dinheiro</th>
                        <th>Cartões / PIX</th>
                        <th>Suprimento Inicial</th>
                        <th>Sangrias (Retiradas)</th>
                        <th>Saldo em Gaveta</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows.length === 0 ? '<tr><td colspan="7" style="text-align:center;padding:60px;color:var(--text-sub);font-weight:600">Nenhuma movimentação registrada no período.</td></tr>' : ''}
                    ${tRows}
                    ${totalRow}
                </tbody>
            </table>
        </div>
    `;

    document.getElementById('fechamento-report-content').innerHTML = content;
}

window.printFechamento = function () {
    const startStr = document.getElementById('fechamento-start').value;
    const endStr = document.getElementById('fechamento-end').value;

    if (!startStr || !endStr) return;

    const localTid = localStorage.getItem('tp_tid') || '';
    const localSuprimento = parseFloat(localStorage.getItem('tp_suprimento_valor') || '0');
    const localSangrias = JSON.parse(localStorage.getItem('tp_sangrias') || '[]');

    const salesFiltered = state.sales.filter(s => {
        const saleDateStr = getLocalDateString(s.timestamp);
        return saleDateStr >= startStr && saleDateStr <= endStr;
    });

    const byTerminal = {};
    salesFiltered.forEach(s => {
        const tid = s.terminalId || 'Desconhecido';
        if (!byTerminal[tid]) byTerminal[tid] = { name: tid, vendas: 0, dinero: 0, cartoes: 0, suprimento: 0, sangrias: 0 };
        byTerminal[tid].vendas += s.price;
        const pms = (s.paymentMethod || 'Dinheiro').split(' + ');
        const dividedPrice = s.price / pms.length;
        pms.forEach(pmRaw => {
            const pm = pmRaw.trim().toUpperCase();
            if (pm === 'DINHEIRO') {
                byTerminal[tid].dinero += dividedPrice;
            } else {
                byTerminal[tid].cartoes += dividedPrice;
            }
        });
    });

    const todayStr = getLocalDateString();
    const coversToday = (todayStr >= startStr && todayStr <= endStr);
    if (localTid && coversToday) {
        if (!byTerminal[localTid]) byTerminal[localTid] = { name: localTid, vendas: 0, dinero: 0, cartoes: 0, suprimento: 0, sangrias: 0 };
        byTerminal[localTid].suprimento = localSuprimento;
    }

    localSangrias.forEach(s => {
        const sangriaDateStr = getLocalDateString(s.timestamp);
        if (sangriaDateStr >= startStr && sangriaDateStr <= endStr) {
            const tid = s.terminalId || localTid;
            if (!byTerminal[tid]) byTerminal[tid] = { name: tid, vendas: 0, dinero: 0, cartoes: 0, suprimento: 0, sangrias: 0 };
            byTerminal[tid].sangrias += (s.valor || 0);
        }
    });

    const rows = Object.values(byTerminal).sort((a, b) => a.name.localeCompare(b.name));
    let grandVendas = 0, grandDinheiro = 0, grandCartoes = 0, grandSangrias = 0, grandGaveta = 0;
    const now = new Date().toLocaleString('pt-BR');

    const startFmt = startStr.split('-').reverse().join('/');
    const endFmt = endStr.split('-').reverse().join('/');

    const tRows = rows.map((r, i) => {
        const gaveta = r.suprimento + (r.dinero || 0) - r.sangrias;
        grandVendas += r.vendas; grandDinheiro += (r.dinero || 0); grandCartoes += r.cartoes; grandSangrias += r.sangrias; grandGaveta += gaveta;
        const bg = i % 2 === 0 ? '#fff' : '#f9f9fb';
        return '<tr style="background:' + bg + ';border-bottom:1px solid #e5e5ea;"><td style="padding:10px 12px;font-weight:700;">Caixa ' + r.name + '</td><td style="padding:10px 12px;font-weight:800;color:#800020;text-align:right;">R$ ' + r.vendas.toFixed(2) + '</td><td style="padding:10px 12px;text-align:right;">R$ ' + (r.dinero || 0).toFixed(2) + '</td><td style="padding:10px 12px;text-align:right;">R$ ' + r.cartoes.toFixed(2) + '</td><td style="padding:10px 12px;text-align:right;color:#666;">R$ ' + r.suprimento.toFixed(2) + '</td><td style="padding:10px 12px;text-align:right;color:#ff3b30;">- R$ ' + r.sangrias.toFixed(2) + '</td><td style="padding:10px 12px;font-weight:900;color:#166534;text-align:right;">R$ ' + gaveta.toFixed(2) + '</td></tr>';
    }).join('');

    const html = '<!DOCTYPE html><html lang="pt-br"><head><meta charset="UTF-8"><title>Relatório de Fechamento</title><style>body{font-family:Arial,sans-serif;margin:0;padding:20px;color:#1a1a1e}.header{text-align:center;border-bottom:2px solid #800020;padding-bottom:16px;margin-bottom:24px}.header h1{font-size:20px;margin:0 0 4px;color:#800020}.header p{font-size:12px;color:#666;margin:2px 0}.summary{display:flex;gap:20px;margin-bottom:20px}.sc{flex:1;border:1px solid #e5e5ea;border-radius:8px;padding:12px 16px}.sc .label{font-size:10px;text-transform:uppercase;font-weight:800;color:#6e6e73;letter-spacing:0.05em;display:block;margin-bottom:4px}.sc .value{font-size:24px;font-weight:900;color:#800020}table{width:100%;border-collapse:collapse}thead{background:#800020;color:white}thead th{padding:10px 12px;font-size:11px;text-align:right;text-transform:uppercase;letter-spacing:0.05em}thead th:first-child{text-align:left;}tfoot td{padding:12px;font-weight:900;background:#f5f5f7;border-top:2px solid #800020}.footer{margin-top:24px;font-size:11px;color:#666;text-align:center;border-top:1px solid #e5e5ea;padding-top:12px}@media print{@page{margin:10mm;size:A4 landscape}}</style></head><body><div class="header"><h1>MAPA GERAL DE FECHAMENTO DE CAIXAS</h1><p>TicketPro Portal de Gestão</p><p>Emitido em: ' + now + ' | Período: ' + startFmt + ' até ' + endFmt + '</p></div><div class="summary"><div class="sc"><span class="label">Saldo Total em Gaveta (Líquido)</span><span class="value" style="color:#166534">R$ ' + grandGaveta.toFixed(2) + '</span></div><div class="sc"><span class="label">Total Cartões / PIX</span><span class="value">R$ ' + grandCartoes.toFixed(2) + '</span></div><div class="sc"><span class="label">Faturamento Total no Período</span><span class="value">R$ ' + grandVendas.toFixed(2) + '</span></div></div><table><thead><tr><th>Caixa</th><th>Vendas</th><th>Dinheiro</th><th>Cartão/PIX</th><th>Suprimento</th><th>Sangrias</th><th>Saldo Gaveta</th></tr></thead><tbody>' + tRows + '</tbody><tfoot><tr><td>TOTAL GERAL</td><td style="text-align:right;">R$ ' + grandVendas.toFixed(2) + '</td><td style="text-align:right;">R$ ' + grandDinheiro.toFixed(2) + '</td><td style="text-align:right;">R$ ' + grandCartoes.toFixed(2) + '</td><td style="text-align:right;">-</td><td style="text-align:right;color:#ff3b30;">- R$ ' + grandSangrias.toFixed(2) + '</td><td style="text-align:right;color:#166534;">R$ ' + grandGaveta.toFixed(2) + '</td></tr></tfoot></table><div class="footer">TicketPro Sistema de Gestão - Relatório gerado automaticamente</div></body></html>';

    const win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 500);
}

// ─── Version Control Section ───
function renderVersionControl(container) {
    if (!state.versions) {
        state.versions = [
            { id: 1, version: "1.0.0", date: new Date().toISOString(), description: "Versão inicial de lançamento do sistema VELO com controle de vendas e impressão de cupom." }
        ];
        state.currentVersion = "1.0.0";
    }

    const versionsList = [...state.versions].sort((a, b) => new Date(b.date) - new Date(a.date));

    container.innerHTML = `
        <div style="max-width: 850px; margin: 0 auto; display: flex; flex-direction: column; gap: 28px; padding-top: 10px;">
            
            <!-- Header Card for Current Version -->
            <div class="glass-card" style="display: flex; align-items: center; gap: 24px; padding: 32px; background: linear-gradient(135deg, var(--brand-dark) 0%, var(--brand) 100%); color: white; border: none; box-shadow: var(--shadow-bold);">
                <div style="width: 72px; height: 72px; background: rgba(255,255,255,0.15); border-radius: 20px; display: flex; align-items: center; justify-content: center;">
                    <i data-lucide="git-branch" style="width: 36px; height: 36px; color: white;"></i>
                </div>
                <div style="flex: 1">
                    <span style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; opacity: 0.8; display: block; margin-bottom: 4px;">Versão Atual Instalada</span>
                    <h2 style="font-weight: 900; font-size: 36px; line-height: 1.1; margin-bottom: 4px; display: flex; align-items: center; gap: 12px;">
                        v${state.currentVersion}
                        <span style="font-size: 11px; font-weight: 800; background: var(--success); color: white; padding: 4px 10px; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.05em; vertical-align: middle;">Ativa</span>
                    </h2>
                    <p style="opacity: 0.9; font-size: 13px; font-weight: 500;">Controle e gere novos marcos de versão do sistema VELO.</p>
                </div>
                <button class="btn-save" style="background: white; color: var(--brand); font-weight: 800; padding: 12px 24px; border-radius: var(--radius-md); box-shadow: 0 4px 12px rgba(0,0,0,0.15); transition: transform 0.2s;" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform=''" onclick="openNewVersionModal()">
                    <i data-lucide="plus-circle" style="vertical-align: middle; margin-right: 6px;"></i>
                    Gerar Nova Versão
                </button>
            </div>

            <!-- Version Timeline Card -->
            <div class="glass-card" style="padding: 32px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 32px; border-bottom: 1px solid var(--border-soft); padding-bottom: 16px;">
                    <h3 style="font-weight: 800; font-size: 18px; letter-spacing: -0.02em;">Histórico de Atualizações (Changelog)</h3>
                    <span style="font-size: 12px; font-weight: 700; color: var(--text-sub); text-transform: uppercase;">${state.versions.length} marco(s) registrado(s)</span>
                </div>

                <div class="timeline-container" style="display: flex; flex-direction: column; gap: 24px; position: relative;">
                    <!-- Vertical timeline bar line -->
                    <div style="position: absolute; left: 19px; top: 12px; bottom: 12px; width: 2px; background: var(--border-med); z-index: 1;"></div>

                    ${versionsList.map((v, index) => {
                        const dateStr = new Date(v.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
                        const isLatest = index === 0;
                        const iconBg = isLatest ? 'var(--brand)' : 'var(--border-med)';
                        const iconColor = isLatest ? 'white' : 'var(--text-sub)';
                        const borderStyle = isLatest ? 'border: 2px solid var(--brand);' : 'border: 1px solid var(--border-med);';
                        const backgroundStyle = isLatest ? 'background: rgba(128, 0, 32, 0.02);' : '';
                        
                        return `
                        <div class="timeline-item" style="display: flex; gap: 20px; position: relative; z-index: 2;">
                            <!-- Timeline node -->
                            <div style="width: 40px; height: 40px; background: ${iconBg}; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: ${iconColor}; box-shadow: 0 0 0 4px var(--surface); flex-shrink: 0; font-weight: 800; font-size: 14px;">
                                ${isLatest ? '<i data-lucide="award" style="width: 18px; height: 18px;"></i>' : '<i data-lucide="check" style="width: 18px; height: 18px;"></i>'}
                            </div>
                            
                            <!-- Timeline Content Card -->
                            <div style="flex: 1; padding: 20px; border-radius: var(--radius-lg); ${borderStyle} ${backgroundStyle} display: flex; flex-direction: column; gap: 8px;">
                                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
                                    <div style="display: flex; align-items: center; gap: 10px;">
                                        <h4 style="font-weight: 800; font-size: 16px; margin: 0; color: var(--text-main);">Versão ${v.version}</h4>
                                        ${isLatest ? '<span style="font-size: 10px; font-weight: 800; background: rgba(52, 199, 89, 0.15); color: var(--success); padding: 2px 8px; border-radius: 12px; text-transform: uppercase;">Mais Recente</span>' : ''}
                                    </div>
                                    <span style="font-size: 12px; font-weight: 600; color: var(--text-sub); display: flex; align-items: center; gap: 4px;">
                                        <i data-lucide="calendar" style="width: 14px; height: 14px;"></i>
                                        ${dateStr}
                                    </span>
                                </div>
                                <p style="font-size: 13.5px; color: var(--text-sub); line-height: 1.6; white-space: pre-wrap; font-weight: 500; margin-top: 4px;">${v.description || 'Nenhuma descrição fornecida.'}</p>
                            </div>
                        </div>
                        `;
                    }).join('')}
                </div>
            </div>
        </div>
    `;
}

window.openNewVersionModal = function() {
    const modal = document.getElementById('product-modal');
    const body = document.getElementById('product-form-body');
    const title = document.getElementById('product-modal-title');

    title.innerText = 'Gerar Nova Versão';

    // Propose an incremental version based on current
    let nextVersion = '1.0.1';
    if (state.currentVersion) {
        const parts = state.currentVersion.replace(/[^0-9.]/g, '').split('.');
        if (parts.length === 3) {
            parts[2] = parseInt(parts[2]) + 1; // Auto increment patch version
            nextVersion = parts.join('.');
        }
    }

    body.innerHTML = `
        <div class="form-grid">
            <div class="form-group col-4">
                <label class="form-label">Número da Versão</label>
                <input type="text" class="form-control" id="frm-ver-num" value="${nextVersion}" placeholder="Ex: 1.1.0">
                <p style="font-size:11px;color:var(--text-sub);margin-top:4px;">Utilize o padrão SemVer (ex: 1.0.1 ou 2.0.0).</p>
            </div>
            <div class="form-group col-8">
                <label class="form-label">Data de Lançamento</label>
                <input type="datetime-local" class="form-control" id="frm-ver-date" value="${new Date().toISOString().slice(0, 16)}">
            </div>
            <div class="form-group col-12">
                <label class="form-label">Notas da Versão / Histórico de Mudanças (Changelog)</label>
                <textarea class="form-control" id="frm-ver-desc" style="min-height: 140px; font-family: inherit; resize: vertical;" placeholder="Descreva o que foi alterado nesta atualização...&#10;- Ex: Adicionado fechamento de caixa detalhado.&#10;- Ex: Corrigido bug de impressão USB."></textarea>
            </div>
        </div>
    `;

    const footer = document.querySelector('.modal-footer');
    footer.innerHTML = `
        <button class="btn-cancel" onclick="closeProductModal()">Cancelar</button>
        <button class="btn-save" onclick="saveNewVersion()">Gerar e Registrar Versão</button>
    `;

    modal.classList.add('active');
    lucide.createIcons();
}

window.saveNewVersion = function() {
    const ver = document.getElementById('frm-ver-num').value.trim();
    const date = document.getElementById('frm-ver-date').value;
    const desc = document.getElementById('frm-ver-desc').value.trim();

    if (!ver) return alert('O número da versão é obrigatório.');
    if (!desc) return alert('Por favor, insira as notas da versão/changelog.');

    if (!state.versions) state.versions = [];

    // Check if version already exists
    const exists = state.versions.some(v => v.version === ver);
    if (exists && !confirm(`A versão ${ver} já está registrada. Deseja substituí-la?`)) {
        return;
    }

    const newVer = {
        id: Date.now(),
        version: ver,
        date: new Date(date).toISOString(),
        description: desc
    };

    if (exists) {
        state.versions = state.versions.filter(v => v.version !== ver);
    }

    state.versions.push(newVer);
    state.currentVersion = ver;

    // Save and Sync
    saveData();
    
    // Update local labels immediately
    updateVersionLabels();

    // Re-render version control page
    renderPage('version-control');
    closeProductModal();
}

// ============================================================================
// SISTEMA MULTILOJA INTEGRADO AO GELIC (GELIC-Active Only)
// ============================================================================

// Estado local de lojas no portal
let portalStoresState = {
    stores: [],
    currentStoreId: ''
};

/**
 * Carrega as informações das lojas no boot do portal
 */
async function loadPortalStoresInfo() {
    const isFileProtocol = window.location.protocol === 'file:';
    const baseUrl = isFileProtocol ? 'http://localhost:8080' : '';
    
    try {
        const res = await fetch(`${baseUrl}/api/master/stores`, { headers: VeloAuth.authHeaders() });
        if (!res.ok) throw new Error('Não foi possível obter dados das lojas.');
        
        const result = await res.json();
        if (result.success) {
            portalStoresState.stores = result.stores || [];
            portalStoresState.currentStoreId = result.currentStoreId || '';
            
            // Localiza a loja ativa
            const activeStore = portalStoresState.stores.find(s => String(s.id) === String(portalStoresState.currentStoreId));
            const storeLabel = document.getElementById('header-active-store-name');
            
            if (activeStore && storeLabel) {
                storeLabel.textContent = activeStore.name;
            }
        }
    } catch (e) {
        console.warn('Erro ao carregar lista de lojas (servidor offline ou protocolo local):', e);
        const storeLabel = document.getElementById('header-active-store-name');
        if (storeLabel) {
            storeLabel.textContent = 'Loja Única';
        }
    }
}

/**
 * Abre o modal seletor multiloja listando apenas as lojas ativas no GELIC
 */
window.openStoreSelectorPortal = function() {
    const modal = document.getElementById('store-selector-modal');
    const container = document.getElementById('portal-stores-list-container');
    
    if (!modal || !container) return;
    
    // Filtra apenas as lojas que estão ativas (liberadas) no GELIC
    const activeStores = portalStoresState.stores.filter(s => s.active === true);
    
    if (activeStores.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 24px 16px; color: var(--text-sub);">
                <i data-lucide="info" style="width: 32px; height: 32px; opacity: 0.5; margin-bottom: 8px;"></i>
                <p style="font-size: 13px;">Nenhuma loja adicional liberada no GELIC.</p>
            </div>
        `;
    } else {
        container.innerHTML = activeStores.map(store => {
            const isCurrent = String(store.id) === String(portalStoresState.currentStoreId);
            const initials = store.name ? store.name.substring(0, 2).toUpperCase() : 'LJ';
            
            let cnpjFormatted = store.cnpj;
            if (store.cnpj && store.cnpj.replace(/\D/g, '').length === 14) {
                const c = store.cnpj.replace(/\D/g, '');
                cnpjFormatted = `${c.slice(0,2)}.${c.slice(2,5)}.${c.slice(5,8)}/${c.slice(8,12)}-${c.slice(12)}`;
            }
            
            return `
                <div class="portal-store-item ${isCurrent ? 'active' : ''}" onclick="selectStorePortal('${store.id}')">
                    <div class="portal-store-info">
                        <span class="portal-store-name" style="${isCurrent ? 'color: var(--brand);' : ''}">${store.name}</span>
                        <div class="portal-store-meta">
                            <span class="portal-store-id-badge">${store.id}</span>
                            <span class="portal-store-cnpj">${cnpjFormatted}</span>
                        </div>
                    </div>
                    ${isCurrent ? `
                        <span style="display: inline-flex; align-items: center; gap: 4px; font-size: 10px; font-weight: 700; color: var(--brand); margin-left: auto; padding-left: 12px; white-space: nowrap;">
                            <i data-lucide="check-circle" style="width: 13px; height: 13px;"></i> Ativa
                        </span>
                    ` : `
                        <i data-lucide="chevron-right" style="width: 14px; height: 14px; color: var(--text-sub); margin-left: auto; padding-left: 12px; opacity: 0.4;"></i>
                    `}
                </div>
            `;
        }).join('');
    }
    
    modal.classList.add('active');
    if (typeof lucide !== 'undefined') lucide.createIcons();
};

/**
 * Fecha o modal seletor multiloja
 */
window.closeStoreSelectorPortal = function() {
    const modal = document.getElementById('store-selector-modal');
    if (modal) {
        modal.classList.remove('active');
    }
};

/**
 * Seleciona a loja, chama o servidor NodeJS para alterar o banco SQLite ativo e recarrega a página
 */
window.selectStorePortal = async function(storeId) {
    const isFileProtocol = window.location.protocol === 'file:';
    const baseUrl = isFileProtocol ? 'http://localhost:8080' : '';
    
    if (String(storeId) === String(portalStoresState.currentStoreId)) {
        closeStoreSelectorPortal();
        return;
    }
    
    try {
        const response = await fetch(`${baseUrl}/api/master/select-store`, {
            method: 'POST',
            headers: VeloAuth.authHeaders(),
            body: JSON.stringify({ storeId })
        });
        
        if (response.ok) {
            const result = await response.json();
            if (result.success) {
                // Redireciona / recarrega para aplicar as configurações
                window.location.reload();
            } else {
                alert('Erro ao chavear filial no servidor.');
            }
        } else {
            alert('Resposta inválida do servidor ao selecionar filial.');
        }
    } catch (e) {
        console.error('Erro ao conectar ao servidor para trocar de loja:', e);
        alert('Erro ao alternar de loja. Verifique se o serviço VeloSync está rodando.');
    }
};


// ============================================================================
// FINANCEIRO — PLANO DE CONTAS
// ============================================================================
function renderPlanoConta(container) {
    const list = state.planoConta || [];

    container.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;flex-wrap:wrap;gap:12px;">
            <div>
                <h3 style="font-weight:800;letter-spacing:-0.03em;">Plano de Contas</h3>
                <p style="font-size:13px;color:var(--text-sub);margin-top:4px;">Estrutura contábil hierárquica de receitas e despesas</p>
            </div>
            <button class="btn-save" style="display:flex;align-items:center;gap:8px;padding:10px 20px;" onclick="openPlanoContaModal()">
                <i data-lucide="plus" style="width:16px;"></i> Nova Conta
            </button>
        </div>

        <div class="glass-card" style="padding:0;overflow:hidden;">
            <table class="modern-table" style="margin:0;">
                <thead>
                    <tr>
                        <th>Código</th>
                        <th>Descrição</th>
                        <th>Tipo</th>
                        <th>Natureza</th>
                        <th>Permite Lançamento</th>
                        <th style="width:80px;"></th>
                    </tr>
                </thead>
                <tbody>
                    ${list.length === 0
                        ? `<tr><td colspan="6" style="text-align:center;padding:60px;color:var(--text-sub);font-weight:600;">Nenhuma conta cadastrada.</td></tr>`
                        : list.map(c => `
                        <tr>
                            <td style="font-weight:800;color:var(--brand);font-size:13px;">${c.codigo}</td>
                            <td style="font-weight:700;">${c.descricao}</td>
                            <td>
                                <span style="padding:3px 10px;border-radius:20px;font-size:11px;font-weight:800;
                                    background:${c.tipo === 'Receita' ? '#dcfce7' : c.tipo === 'Despesa' ? '#fee2e2' : '#eff6ff'};
                                    color:${c.tipo === 'Receita' ? '#16a34a' : c.tipo === 'Despesa' ? '#dc2626' : '#2563eb'};">
                                    ${c.tipo}
                                </span>
                            </td>
                            <td style="font-weight:600;font-size:13px;">${c.natureza || '-'}</td>
                            <td>
                                <span style="padding:3px 8px;border-radius:4px;font-size:11px;font-weight:700;
                                    background:${c.lancamento ? '#dcfce7' : '#f4f4f5'};
                                    color:${c.lancamento ? '#16a34a' : '#71717a'};">
                                    ${c.lancamento ? 'Sim' : 'Não'}
                                </span>
                            </td>
                            <td>
                                <div style="display:flex;align-items:center;gap:12px;justify-content:flex-end;">
                                    <i data-lucide="edit-3" style="width:16px;color:var(--brand);cursor:pointer;" onclick="openPlanoContaModal(${c.id})"></i>
                                    <i data-lucide="trash-2" style="width:16px;color:var(--danger);cursor:pointer;" onclick="removePlanoConta(${c.id})"></i>
                                </div>
                            </td>
                        </tr>`).join('')}
                </tbody>
            </table>
        </div>
    `;
}

let _editingPlanoContaId = null;
window.openPlanoContaModal = function(id = null) {
    _editingPlanoContaId = id;
    const list = state.planoConta || [];
    const item = id ? list.find(c => c.id === id) : { codigo:'', descricao:'', tipo:'Receita', natureza:'Analítica', lancamento: true };

    const modal = document.getElementById('product-modal');
    document.getElementById('product-modal-title').innerText = id ? 'Editar Conta' : 'Nova Conta';
    document.getElementById('product-icon-wrapper').style.display = 'none';

    document.getElementById('product-form-body').innerHTML = `
        <div class="form-grid">
            <div class="form-group col-3">
                <label class="form-label">Código</label>
                <input type="text" class="form-control" id="pc-codigo" value="${item.codigo}" placeholder="Ex: 1.1.01">
            </div>
            <div class="form-group col-9">
                <label class="form-label">Descrição</label>
                <input type="text" class="form-control" id="pc-descricao" value="${item.descricao}" placeholder="Nome da conta">
            </div>
            <div class="form-group col-4">
                <label class="form-label">Tipo</label>
                <select class="form-control" id="pc-tipo">
                    <option value="Receita" ${item.tipo==='Receita'?'selected':''}>Receita</option>
                    <option value="Despesa" ${item.tipo==='Despesa'?'selected':''}>Despesa</option>
                    <option value="Ativo" ${item.tipo==='Ativo'?'selected':''}>Ativo</option>
                    <option value="Passivo" ${item.tipo==='Passivo'?'selected':''}>Passivo</option>
                    <option value="Patrimônio" ${item.tipo==='Patrimônio'?'selected':''}>Patrimônio Líquido</option>
                </select>
            </div>
            <div class="form-group col-4">
                <label class="form-label">Natureza</label>
                <select class="form-control" id="pc-natureza">
                    <option value="Analítica" ${item.natureza==='Analítica'?'selected':''}>Analítica</option>
                    <option value="Sintética" ${item.natureza==='Sintética'?'selected':''}>Sintética</option>
                </select>
            </div>
            <div class="form-group col-4">
                <label class="form-label">Permite Lançamento</label>
                <select class="form-control" id="pc-lancamento">
                    <option value="1" ${item.lancamento?'selected':''}>Sim</option>
                    <option value="0" ${!item.lancamento?'selected':''}>Não</option>
                </select>
            </div>
        </div>
    `;

    document.querySelector('.modal-footer').innerHTML = `
        <button class="btn-cancel" onclick="closeProductModal()">Cancelar</button>
        <button class="btn-save" onclick="savePlanoConta()">Gravar</button>
    `;
    modal.classList.add('active');
    lucide.createIcons();
};

window.savePlanoConta = function() {
    const codigo = document.getElementById('pc-codigo').value.trim();
    const descricao = document.getElementById('pc-descricao').value.trim();
    if (!codigo || !descricao) return alert('Código e Descrição são obrigatórios.');

    if (!state.planoConta) state.planoConta = [];
    const item = {
        id: _editingPlanoContaId || Date.now(),
        codigo,
        descricao,
        tipo: document.getElementById('pc-tipo').value,
        natureza: document.getElementById('pc-natureza').value,
        lancamento: document.getElementById('pc-lancamento').value === '1'
    };

    if (_editingPlanoContaId) {
        state.planoConta = state.planoConta.map(c => c.id === _editingPlanoContaId ? item : c);
    } else {
        state.planoConta.push(item);
    }
    pushToServer({ planoConta: state.planoConta });
    closeProductModal();
    renderPage('planoConta');
};

window.removePlanoConta = function(id) {
    if (!confirm('Remover esta conta?')) return;
    state.planoConta = (state.planoConta || []).filter(c => c.id !== id);
    pushToServer({ planoConta: state.planoConta });
    renderPage('planoConta');
};


// ============================================================================
// FINANCEIRO — CENTRO DE CUSTOS
// ============================================================================
function renderCentroCusto(container) {
    const list = state.centroCusto || [];

    container.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;flex-wrap:wrap;gap:12px;">
            <div>
                <h3 style="font-weight:800;letter-spacing:-0.03em;">Centros de Custos</h3>
                <p style="font-size:13px;color:var(--text-sub);margin-top:4px;">Unidades organizacionais para apropriação de receitas e despesas</p>
            </div>
            <button class="btn-save" style="display:flex;align-items:center;gap:8px;padding:10px 20px;" onclick="openCentroCustoModal()">
                <i data-lucide="plus" style="width:16px;"></i> Novo Centro
            </button>
        </div>

        <div class="glass-card" style="padding:0;overflow:hidden;">
            <table class="modern-table" style="margin:0;">
                <thead>
                    <tr>
                        <th>Código</th>
                        <th>Descrição</th>
                        <th>Responsável</th>
                        <th>Tipo</th>
                        <th>Status</th>
                        <th style="width:80px;"></th>
                    </tr>
                </thead>
                <tbody>
                    ${list.length === 0
                        ? `<tr><td colspan="6" style="text-align:center;padding:60px;color:var(--text-sub);font-weight:600;">Nenhum centro de custo cadastrado.</td></tr>`
                        : list.map(c => `
                        <tr>
                            <td style="font-weight:800;color:var(--brand);font-size:13px;">${c.codigo}</td>
                            <td style="font-weight:700;">${c.descricao}</td>
                            <td style="font-size:13px;color:var(--text-sub);">${c.responsavel || '-'}</td>
                            <td>
                                <span style="padding:3px 10px;border-radius:20px;font-size:11px;font-weight:800;
                                    background:${c.tipo === 'Receita' ? '#dcfce7' : c.tipo === 'Despesa' ? '#fee2e2' : '#eff6ff'};
                                    color:${c.tipo === 'Receita' ? '#16a34a' : c.tipo === 'Despesa' ? '#dc2626' : '#2563eb'};">
                                    ${c.tipo || 'Misto'}
                                </span>
                            </td>
                            <td>
                                <span style="padding:3px 8px;border-radius:4px;font-size:11px;font-weight:700;
                                    background:${c.ativo ? '#dcfce7' : '#fee2e2'};
                                    color:${c.ativo ? '#16a34a' : '#dc2626'};">
                                    ${c.ativo ? 'Ativo' : 'Inativo'}
                                </span>
                            </td>
                            <td>
                                <div style="display:flex;align-items:center;gap:12px;justify-content:flex-end;">
                                    <i data-lucide="edit-3" style="width:16px;color:var(--brand);cursor:pointer;" onclick="openCentroCustoModal(${c.id})"></i>
                                    <i data-lucide="trash-2" style="width:16px;color:var(--danger);cursor:pointer;" onclick="removeCentroCusto(${c.id})"></i>
                                </div>
                            </td>
                        </tr>`).join('')}
                </tbody>
            </table>
        </div>
    `;
}

let _editingCentroCustoId = null;
window.openCentroCustoModal = function(id = null) {
    _editingCentroCustoId = id;
    const list = state.centroCusto || [];
    const item = id ? list.find(c => c.id === id) : { codigo:'', descricao:'', responsavel:'', tipo:'Misto', ativo: true };

    const modal = document.getElementById('product-modal');
    document.getElementById('product-modal-title').innerText = id ? 'Editar Centro de Custo' : 'Novo Centro de Custo';
    document.getElementById('product-icon-wrapper').style.display = 'none';

    document.getElementById('product-form-body').innerHTML = `
        <div class="form-grid">
            <div class="form-group col-3">
                <label class="form-label">Código</label>
                <input type="text" class="form-control" id="cc-codigo" value="${item.codigo}" placeholder="Ex: CC-001">
            </div>
            <div class="form-group col-9">
                <label class="form-label">Descrição</label>
                <input type="text" class="form-control" id="cc-descricao" value="${item.descricao}" placeholder="Nome do centro de custo">
            </div>
            <div class="form-group col-6">
                <label class="form-label">Responsável</label>
                <input type="text" class="form-control" id="cc-responsavel" value="${item.responsavel || ''}" placeholder="Nome do responsável">
            </div>
            <div class="form-group col-3">
                <label class="form-label">Tipo</label>
                <select class="form-control" id="cc-tipo">
                    <option value="Misto" ${item.tipo==='Misto'?'selected':''}>Misto</option>
                    <option value="Receita" ${item.tipo==='Receita'?'selected':''}>Receita</option>
                    <option value="Despesa" ${item.tipo==='Despesa'?'selected':''}>Despesa</option>
                </select>
            </div>
            <div class="form-group col-3">
                <label class="form-label">Status</label>
                <select class="form-control" id="cc-ativo">
                    <option value="1" ${item.ativo?'selected':''}>Ativo</option>
                    <option value="0" ${!item.ativo?'selected':''}>Inativo</option>
                </select>
            </div>
        </div>
    `;

    document.querySelector('.modal-footer').innerHTML = `
        <button class="btn-cancel" onclick="closeProductModal()">Cancelar</button>
        <button class="btn-save" onclick="saveCentroCusto()">Gravar</button>
    `;
    modal.classList.add('active');
    lucide.createIcons();
};

window.saveCentroCusto = function() {
    const codigo = document.getElementById('cc-codigo').value.trim();
    const descricao = document.getElementById('cc-descricao').value.trim();
    if (!codigo || !descricao) return alert('Código e Descrição são obrigatórios.');

    if (!state.centroCusto) state.centroCusto = [];
    const item = {
        id: _editingCentroCustoId || Date.now(),
        codigo,
        descricao,
        responsavel: document.getElementById('cc-responsavel').value.trim(),
        tipo: document.getElementById('cc-tipo').value,
        ativo: document.getElementById('cc-ativo').value === '1'
    };

    if (_editingCentroCustoId) {
        state.centroCusto = state.centroCusto.map(c => c.id === _editingCentroCustoId ? item : c);
    } else {
        state.centroCusto.push(item);
    }
    pushToServer({ centroCusto: state.centroCusto });
    closeProductModal();
    renderPage('centroCusto');
};

window.removeCentroCusto = function(id) {
    if (!confirm('Remover este centro de custo?')) return;
    state.centroCusto = (state.centroCusto || []).filter(c => c.id !== id);
    pushToServer({ centroCusto: state.centroCusto });
    renderPage('centroCusto');
};


// ============================================================================
// FINANCEIRO — CONTAS FINANCEIRAS
// ============================================================================
function renderContaFinanceira(container) {
    const list = state.contaFinanceira || [];

    const totalSaldo = list.reduce((s, c) => s + (Number(c.saldoInicial) || 0), 0);

    container.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;flex-wrap:wrap;gap:12px;">
            <div>
                <h3 style="font-weight:800;letter-spacing:-0.03em;">Contas Financeiras</h3>
                <p style="font-size:13px;color:var(--text-sub);margin-top:4px;">Caixas, bancos e carteiras financeiras da empresa</p>
            </div>
            <button class="btn-save" style="display:flex;align-items:center;gap:8px;padding:10px 20px;" onclick="openContaFinanceiraModal()">
                <i data-lucide="plus" style="width:16px;"></i> Nova Conta
            </button>
        </div>

        <!-- KPI de saldo total -->
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;margin-bottom:24px;">
            <div class="stat-box">
                <span class="label">Contas Cadastradas</span>
                <span class="value">${list.length}</span>
            </div>
            <div class="stat-box">
                <span class="label">Saldo Inicial Total</span>
                <span class="value" style="color:var(--brand);">R$ ${totalSaldo.toFixed(2)}</span>
            </div>
            <div class="stat-box">
                <span class="label">Contas Ativas</span>
                <span class="value" style="color:var(--success);">${list.filter(c=>c.ativa).length}</span>
            </div>
        </div>

        <div class="glass-card" style="padding:0;overflow:hidden;">
            <table class="modern-table" style="margin:0;">
                <thead>
                    <tr>
                        <th>Código</th>
                        <th>Descrição</th>
                        <th>Tipo</th>
                        <th>Banco / Agência</th>
                        <th>Saldo Inicial</th>
                        <th>Status</th>
                        <th style="width:80px;"></th>
                    </tr>
                </thead>
                <tbody>
                    ${list.length === 0
                        ? `<tr><td colspan="7" style="text-align:center;padding:60px;color:var(--text-sub);font-weight:600;">Nenhuma conta financeira cadastrada.</td></tr>`
                        : list.map(c => `
                        <tr>
                            <td style="font-weight:800;color:var(--brand);font-size:13px;">${c.codigo}</td>
                            <td style="font-weight:700;">${c.descricao}</td>
                            <td>
                                <span style="padding:3px 10px;border-radius:20px;font-size:11px;font-weight:800;background:#eff6ff;color:#2563eb;">
                                    ${c.tipo}
                                </span>
                            </td>
                            <td style="font-size:13px;color:var(--text-sub);">${c.banco ? `${c.banco}${c.agencia ? ' / Ag. '+c.agencia : ''}` : '-'}</td>
                            <td style="font-weight:800;color:var(--brand);">R$ ${Number(c.saldoInicial||0).toFixed(2)}</td>
                            <td>
                                <span style="padding:3px 8px;border-radius:4px;font-size:11px;font-weight:700;
                                    background:${c.ativa ? '#dcfce7' : '#fee2e2'};
                                    color:${c.ativa ? '#16a34a' : '#dc2626'};">
                                    ${c.ativa ? 'Ativa' : 'Inativa'}
                                </span>
                            </td>
                            <td>
                                <div style="display:flex;align-items:center;gap:12px;justify-content:flex-end;">
                                    <i data-lucide="edit-3" style="width:16px;color:var(--brand);cursor:pointer;" onclick="openContaFinanceiraModal(${c.id})"></i>
                                    <i data-lucide="trash-2" style="width:16px;color:var(--danger);cursor:pointer;" onclick="removeContaFinanceira(${c.id})"></i>
                                </div>
                            </td>
                        </tr>`).join('')}
                </tbody>
            </table>
        </div>
    `;
}

let _editingContaFinanceiraId = null;
window.openContaFinanceiraModal = function(id = null) {
    _editingContaFinanceiraId = id;
    const list = state.contaFinanceira || [];
    const item = id ? list.find(c => c.id === id) : { codigo:'', descricao:'', tipo:'Caixa', banco:'', agencia:'', conta:'', saldoInicial: 0, ativa: true };

    const modal = document.getElementById('product-modal');
    document.getElementById('product-modal-title').innerText = id ? 'Editar Conta Financeira' : 'Nova Conta Financeira';
    document.getElementById('product-icon-wrapper').style.display = 'none';

    document.getElementById('product-form-body').innerHTML = `
        <div class="form-grid">
            <div class="form-group col-3">
                <label class="form-label">Código</label>
                <input type="text" class="form-control" id="cf-codigo" value="${item.codigo}" placeholder="Ex: CX-001">
            </div>
            <div class="form-group col-6">
                <label class="form-label">Descrição</label>
                <input type="text" class="form-control" id="cf-descricao" value="${item.descricao}" placeholder="Nome da conta">
            </div>
            <div class="form-group col-3">
                <label class="form-label">Tipo</label>
                <select class="form-control" id="cf-tipo">
                    <option value="Caixa" ${item.tipo==='Caixa'?'selected':''}>Caixa</option>
                    <option value="Banco" ${item.tipo==='Banco'?'selected':''}>Banco</option>
                    <option value="Carteira" ${item.tipo==='Carteira'?'selected':''}>Carteira</option>
                    <option value="Poupança" ${item.tipo==='Poupança'?'selected':''}>Poupança</option>
                    <option value="Investimento" ${item.tipo==='Investimento'?'selected':''}>Investimento</option>
                </select>
            </div>
            <div class="form-group col-4">
                <label class="form-label">Banco</label>
                <input type="text" class="form-control" id="cf-banco" value="${item.banco||''}" placeholder="Ex: Bradesco, Itaú...">
            </div>
            <div class="form-group col-3">
                <label class="form-label">Agência</label>
                <input type="text" class="form-control" id="cf-agencia" value="${item.agencia||''}" placeholder="0000-0">
            </div>
            <div class="form-group col-3">
                <label class="form-label">Nº da Conta</label>
                <input type="text" class="form-control" id="cf-conta" value="${item.conta||''}" placeholder="00000-0">
            </div>
            <div class="form-group col-2">
                <label class="form-label">Status</label>
                <select class="form-control" id="cf-ativa">
                    <option value="1" ${item.ativa?'selected':''}>Ativa</option>
                    <option value="0" ${!item.ativa?'selected':''}>Inativa</option>
                </select>
            </div>
            <div class="form-group col-4">
                <label class="form-label">Saldo Inicial (R$)</label>
                <input type="number" step="0.01" class="form-control" id="cf-saldo" value="${Number(item.saldoInicial||0).toFixed(2)}" placeholder="0,00">
            </div>
        </div>
    `;

    document.querySelector('.modal-footer').innerHTML = `
        <button class="btn-cancel" onclick="closeProductModal()">Cancelar</button>
        <button class="btn-save" onclick="saveContaFinanceira()">Gravar</button>
    `;
    modal.classList.add('active');
    lucide.createIcons();
};

window.saveContaFinanceira = function() {
    const codigo = document.getElementById('cf-codigo').value.trim();
    const descricao = document.getElementById('cf-descricao').value.trim();
    if (!codigo || !descricao) return alert('Código e Descrição são obrigatórios.');

    if (!state.contaFinanceira) state.contaFinanceira = [];
    const item = {
        id: _editingContaFinanceiraId || Date.now(),
        codigo,
        descricao,
        tipo: document.getElementById('cf-tipo').value,
        banco: document.getElementById('cf-banco').value.trim(),
        agencia: document.getElementById('cf-agencia').value.trim(),
        conta: document.getElementById('cf-conta').value.trim(),
        saldoInicial: parseFloat(document.getElementById('cf-saldo').value) || 0,
        ativa: document.getElementById('cf-ativa').value === '1'
    };

    if (_editingContaFinanceiraId) {
        state.contaFinanceira = state.contaFinanceira.map(c => c.id === _editingContaFinanceiraId ? item : c);
    } else {
        state.contaFinanceira.push(item);
    }
    pushToServer({ contaFinanceira: state.contaFinanceira });
    closeProductModal();
    renderPage('contaFinanceira');
};

window.removeContaFinanceira = function(id) {
    if (!confirm('Remover esta conta financeira?')) return;
    state.contaFinanceira = (state.contaFinanceira || []).filter(c => c.id !== id);
    pushToServer({ contaFinanceira: state.contaFinanceira });
    renderPage('contaFinanceira');
};


// ============================================================================
// FINANCEIRO — CONCILIAÇÃO DE CAIXA (BORDERÔS / CONFERÊNCIA)
// ============================================================================
function renderConciliacaoCaixa(container) {
    if (!state.sales) state.sales = [];
    if (!state.borderos) state.borderos = [];

    // Vamos extrair as vendas reais agrupadas por dia, terminal e operador para comparar
    // com o que foi fechado/declarado ou para gerar sugestões.
    // Como no PDV os operadores fazem o fechamento (borderô),
    // vamos simular um banco de borderos a partir de vendas/fechamentos e permitir conciliação.
    
    // Se não tiver nenhum borderô cadastrado ainda, vamos gerar automaticamente alguns a partir das vendas
    // para dar massa de dados inicial para o usuário testar!
    if (state.borderos.length === 0 && state.sales.length > 0) {
        // Agrupa vendas por data, terminal, operador para gerar borderôs simulados
        const groups = {};
        state.sales.forEach(s => {
            const dateStr = getLocalDateString(s.timestamp);
            const key = `${dateStr}_${s.terminalId || 'CX1'}_${s.operator || 'OPERADOR'}`;
            if (!groups[key]) {
                groups[key] = {
                    id: Date.now() + Math.random(),
                    data: dateStr,
                    terminal: s.terminalId || 'CX1',
                    operador: s.operator || 'OPERADOR',
                    suprimento: 100.00, // suprimento inicial padrão simulado
                    vendasReais: 0,
                    declarado: {},
                    vendasPorMetodo: {},
                    status: 'Pendente',
                    observacao: ''
                };
            }
            groups[key].vendasReais += s.price;
            const m = s.paymentMethod || 'DINHEIRO';
            if (!groups[key].vendasPorMetodo[m]) groups[key].vendasPorMetodo[m] = 0;
            groups[key].vendasPorMetodo[m] += s.price;
        });

        Object.values(groups).forEach(g => {
            // Define o declarado pelo operador (com pequenas variações para ter graça a conciliação!)
            Object.entries(g.vendasPorMetodo).forEach(([m, val]) => {
                // Simula variação de centavos/reais em dinheiro, cartões exatos
                if (m === 'DINHEIRO') {
                    g.declarado[m] = Math.max(0, val + (Math.random() > 0.5 ? 5.00 : -2.00));
                } else {
                    g.declarado[m] = val; // cartões geralmente batem exato
                }
            });
            state.borderos.push(g);
        });
        pushToServer({ borderos: state.borderos });
    }

    const borderos = state.borderos;
    const totalPendente = borderos.filter(b => b.status === 'Pendente').length;
    const totalConciliado = borderos.filter(b => b.status === 'Conciliado').length;

    const tRows = [...borderos].sort((a,b) => b.data.localeCompare(a.data)).map(b => {
        const statusColor = b.status === 'Conciliado' ? '#16a34a' : '#f59e0b';
        const statusBg    = b.status === 'Conciliado' ? '#dcfce7' : '#fef9c3';
        
        // Calcula totais reais das vendas do borderô
        const totalReal = Object.values(b.vendasPorMetodo).reduce((x, y) => x + y, 0);
        const totalDeclarado = Object.values(b.declarado).reduce((x, y) => x + y, 0);
        const diferenca = totalDeclarado - totalReal;
        const difColor = diferenca === 0 ? 'var(--text)' : (diferenca > 0 ? 'var(--success)' : 'var(--danger)');
        const difSign = diferenca > 0 ? '+' : '';

        return `<tr>
            <td style="font-weight:700;">${b.data ? b.data.split('-').reverse().join('/') : '-'}</td>
            <td style="font-weight:700;">${b.terminal}</td>
            <td style="font-weight:700; text-transform:uppercase;">${b.operador}</td>
            <td style="font-weight:900;color:var(--brand);">R$ ${totalReal.toFixed(2)}</td>
            <td style="font-weight:900;color:var(--success);">R$ ${totalDeclarado.toFixed(2)}</td>
            <td style="font-weight:900;color:${difColor};">${difSign}R$ ${diferenca.toFixed(2)}</td>
            <td><span style="padding:3px 8px;border-radius:4px;font-size:11px;font-weight:700;
                background:${statusBg};color:${statusColor};">${b.status}</span></td>
            <td>
                <div style="display:flex;align-items:center;gap:10px;justify-content:flex-end;">
                    <button class="btn-save" style="padding:4px 8px;font-size:11px;background:var(--brand);" onclick="openConciliacaoModal(${b.id})">
                        <i data-lucide="check-square" style="width:12px;margin-right:3px;vertical-align:middle;"></i> Conciliar
                    </button>
                    <i data-lucide="trash-2" style="width:16px;color:var(--danger);cursor:pointer;" onclick="removeBordero(${b.id})"></i>
                </div>
            </td>
        </tr>`;
    }).join('');

    container.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;flex-wrap:wrap;gap:12px;">
            <div>
                <h3 style="font-weight:800;letter-spacing:-0.03em;">Conciliação de Caixa (Borderôs)</h3>
                <p style="font-size:13px;color:var(--text-sub);margin-top:4px;">Confronte os valores declarados pelo operador (fechamento de caixa) com os dados registrados no sistema.</p>
            </div>
            <button class="btn-save" style="display:flex;align-items:center;gap:8px;padding:10px 20px;" onclick="openNewBorderoModal()">
                <i data-lucide="plus" style="width:16px;"></i> Lançar Fechamento (Borderô)
            </button>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:16px;margin-bottom:24px;">
            <div class="stat-box"><span class="label">Total Fechamentos</span><span class="value" style="color:var(--brand);">${borderos.length}</span></div>
            <div class="stat-box"><span class="label">Pendentes de Conferência</span><span class="value" style="color:#f59e0b;">${totalPendente}</span></div>
            <div class="stat-box"><span class="label">Conciliados</span><span class="value" style="color:var(--success);">${totalConciliado}</span></div>
        </div>
        <div class="glass-card" style="padding:0;overflow:hidden;">
            <table class="modern-table" style="margin:0;">
                <thead>
                    <tr>
                        <th>Data</th>
                        <th>Terminal</th>
                        <th>Operador</th>
                        <th>Vendas Sistema</th>
                        <th>Valor Declarado</th>
                        <th>Diferença</th>
                        <th>Status</th>
                        <th style="width:180px;"></th>
                    </tr>
                </thead>
                <tbody>
                    ${borderos.length === 0
                        ? `<tr><td colspan="8" style="text-align:center;padding:60px;color:var(--text-sub);font-weight:600;">Nenhum borderô ou fechamento aguardando conciliação.</td></tr>`
                        : tRows}
                </tbody>
            </table>
        </div>
    `;
}


// ============================================================================
// FINANCEIRO — CONCILIAÇÃO DE CAIXA (BORDERÔS / CONFERÊNCIA)
// ============================================================================
let _activeBorderoId = null;

function renderConciliacaoCaixa(container) {
    if (!state.sales) state.sales = [];
    if (!state.borderos) state.borderos = [];

    // Se estivermos visualizando os detalhes de um borderô ativo
    if (_activeBorderoId !== null) {
        renderBorderoDetail(container, _activeBorderoId);
        return;
    }

    // Se não tiver nenhum borderô, gera simulados para testes
    if (state.borderos.length === 0 && state.sales.length > 0) {
        const groups = {};
        state.sales.forEach(s => {
            const dateStr = getLocalDateString(s.timestamp);
            const key = `${dateStr}_${s.terminalId || 'CX1'}_${s.operator || 'OPERADOR'}`;
            if (!groups[key]) {
                groups[key] = {
                    id: Date.now() + Math.round(Math.random() * 1000),
                    data: dateStr,
                    terminal: s.terminalId || 'CX1',
                    operador: s.operator || 'OPERADOR',
                    suprimento: 100.00,
                    vendasReais: 0,
                    declarado: {},
                    vendasPorMetodo: {},
                    configMetodos: {}, // Guarda plano, dataDep, conta, taxa, etc
                    status: 'Pendente',
                    observacao: ''
                };
            }
            groups[key].vendasReais += s.price;
            const m = s.paymentMethod || 'DINHEIRO';
            if (!groups[key].vendasPorMetodo[m]) groups[key].vendasPorMetodo[m] = 0;
            groups[key].vendasPorMetodo[m] += s.price;
        });

        Object.values(groups).forEach(g => {
            Object.entries(g.vendasPorMetodo).forEach(([m, val]) => {
                g.declarado[m] = m === 'DINHEIRO' ? Math.max(0, val - 15.66) : val; // Simula quebra igual ao mockup do cliente (Falta R$ 15,66)
            });
            state.borderos.push(g);
        });
        pushToServer({ borderos: state.borderos });
    }

    const borderos = state.borderos;
    const totalPendente = borderos.filter(b => b.status === 'Pendente').length;
    const totalConciliado = borderos.filter(b => b.status === 'Conciliado').length;

    const tRows = [...borderos].sort((a,b) => b.data.localeCompare(a.data)).map(b => {
        const statusColor = b.status === 'Conciliado' ? '#16a34a' : '#f59e0b';
        const statusBg    = b.status === 'Conciliado' ? '#dcfce7' : '#fef9c3';
        
        const totalReal = Object.values(b.vendasPorMetodo).reduce((x, y) => x + y, 0);
        const totalDeclarado = Object.values(b.declarado).reduce((x, y) => x + y, 0);
        const diferenca = totalDeclarado - totalReal;
        const difColor = diferenca === 0 ? 'var(--text)' : (diferenca > 0 ? 'var(--success)' : 'var(--danger)');
        const difSign = diferenca > 0 ? '+' : '';

        return `<tr>
            <td style="font-weight:700;">${b.data ? b.data.split('-').reverse().join('/') : '-'}</td>
            <td style="font-weight:700;">${b.terminal}</td>
            <td style="font-weight:700; text-transform:uppercase;">${b.operador}</td>
            <td style="font-weight:900;color:var(--brand);">R$ ${totalReal.toFixed(2)}</td>
            <td style="font-weight:900;color:var(--success);">R$ ${totalDeclarado.toFixed(2)}</td>
            <td style="font-weight:900;color:${difColor};">${difSign}R$ ${diferenca.toFixed(2)}</td>
            <td><span style="padding:3px 8px;border-radius:4px;font-size:11px;font-weight:700;
                background:${statusBg};color:${statusColor};">${b.status}</span></td>
            <td>
                <div style="display:flex;align-items:center;gap:10px;justify-content:flex-end;">
                    <button class="btn-save" style="padding:6px 12px;font-size:12px;background:var(--brand);display:inline-flex;align-items:center;gap:4px;" onclick="viewBorderoDetail(${b.id})">
                        <i data-lucide="eye" style="width:14px;"></i> Abrir Conciliador
                    </button>
                    <i data-lucide="trash-2" style="width:16px;color:var(--danger);cursor:pointer;" onclick="removeBordero(${b.id})"></i>
                </div>
            </td>
        </tr>`;
    }).join('');

    container.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;flex-wrap:wrap;gap:12px;">
            <div>
                <h3 style="font-weight:800;letter-spacing:-0.03em;">Conciliação de Caixa (Borderôs)</h3>
                <p style="font-size:13px;color:var(--text-sub);margin-top:4px;">Selecione um borderô de fechamento para realizar a conciliação fina por forma de pagamento.</p>
            </div>
            <button class="btn-save" style="display:flex;align-items:center;gap:8px;padding:10px 20px;" onclick="openNewBorderoModal()">
                <i data-lucide="plus" style="width:16px;"></i> Lançar Fechamento (Borderô)
            </button>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:16px;margin-bottom:24px;">
            <div class="stat-box"><span class="label">Total Fechamentos</span><span class="value" style="color:var(--brand);">${borderos.length}</span></div>
            <div class="stat-box"><span class="label">Pendentes de Conferência</span><span class="value" style="color:#f59e0b;">${totalPendente}</span></div>
            <div class="stat-box"><span class="label">Conciliados</span><span class="value" style="color:var(--success);">${totalConciliado}</span></div>
        </div>
        <div class="glass-card" style="padding:0;overflow:hidden;">
            <table class="modern-table" style="margin:0;">
                <thead>
                    <tr>
                        <th>Data</th>
                        <th>Terminal</th>
                        <th>Operador</th>
                        <th>Vendas Sistema</th>
                        <th>Valor Declarado</th>
                        <th>Diferença</th>
                        <th>Status</th>
                        <th style="width:200px;"></th>
                    </tr>
                </thead>
                <tbody>
                    ${borderos.length === 0
                        ? `<tr><td colspan="8" style="text-align:center;padding:60px;color:var(--text-sub);font-weight:600;">Nenhum borderô ou fechamento aguardando conciliação.</td></tr>`
                        : tRows}
                </tbody>
            </table>
        </div>
    `;
}

window.viewBorderoDetail = function(id) {
    _activeBorderoId = id;
    renderPage('conciliacaoCaixa');
};

window.backToBorderos = function() {
    _activeBorderoId = null;
    renderPage('conciliacaoCaixa');
};

function renderBorderoDetail(container, id) {
    const b = state.borderos.find(x => x.id === id);
    if (!b) {
        _activeBorderoId = null;
        renderConciliacaoCaixa(container);
        return;
    }

    if (!b.configMetodos) b.configMetodos = {};

    const metodosDisponiveis = Array.from(new Set([
        ...Object.keys(b.vendasPorMetodo || {}),
        'DINHEIRO', 'CARTÃO CRÉDITO', 'CARTÃO DÉBITO', 'PIX'
    ]));

    // Planos de contas cadastrados no portal
    const planosOpts = (state.planoConta || []).map(p => 
        `<option value="${p.id}">${p.descricao.toUpperCase()}</option>`
    ).join('') || `<option value="1">VENDAS À VISTA</option><option value="2">TAXAS DE CARTAO/PIX</option>`;

    // Contas financeiras do portal
    const contasOpts = (state.contaFinanceira || []).map(c => 
        `<option value="${c.id}">${c.descricao.toUpperCase()}</option>`
    ).join('') || `<option value="1">CONTA CAIXA 00001</option><option value="2">BANCO DO BRASIL 5805 13001</option>`;

    // Opções de Adquirente/Fornecedor para Taxas Administrativas
    const fornecedoresOpts = `
        <option value="1">STONE MEIO DE PAGAMENTO</option>
        <option value="2">REDE CARD</option>
        <option value="3">CIELO S.A.</option>
        <option value="4">MOTOBOY CARLOS</option>
    `;

    // Vamos desenhar as colunas baseadas nas formas de pagamento
    const columnsHtml = metodosDisponiveis.map(m => {
        const config = b.configMetodos[m] || {
            planoId: m === 'DINHEIRO' ? '1' : '2',
            depositoDt: b.data,
            contaId: m === 'DINHEIRO' ? '1' : '2',
            percentualTaxa: m.includes('CRÉDITO') ? 2.99 : (m.includes('DÉBITO') ? 1.50 : 0.00),
            fornecedorId: m.includes('CARTÃO') ? '1' : '4',
            planoTaxaId: '2',
            conciliado: false
        };
        b.configMetodos[m] = config;

        const valSistema = b.vendasPorMetodo[m] || 0;
        const valDigitado = b.declarado[m] !== undefined ? b.declarado[m] : valSistema;
        const valConciliado = config.conciliado ? valDigitado : 0;
        const valSaldo = valSistema;
        const diferenca = valDigitado - valSistema;
        const faltaColor = diferenca < 0 ? '#dc2626' : 'var(--text-sub)';

        // Cálculo de Taxa
        const pctTaxa = config.percentualTaxa || 0;
        const valTaxa = (valConciliado * pctTaxa) / 100;
        const valLiquido = valConciliado - valTaxa;

        const isDinheiro = m === 'DINHEIRO';

        return `
            <!-- Coluna para a forma de pagamento: ${m} -->
            <div style="flex:0 0 310px; background:#fefefe; border:1px solid #e2e8f0; border-radius:8px; padding:16px; box-shadow:0 4px 6px -1px rgba(0,0,0,0.05); display:flex; flex-direction:column; gap:12px;">
                <h4 style="font-weight:900; font-size:14px; text-align:center; color:var(--text); letter-spacing:0.05em; border-bottom:2px solid var(--accent); padding-bottom:8px; margin:0;">${m}</h4>
                
                <button class="btn-save" id="btn-conc-${m}" style="width:100%; padding:8px; background:${config.conciliado ? 'var(--success)' : 'var(--brand)'}; font-weight:800; font-size:12px; display:inline-flex; align-items:center; justify-content:center; gap:6px;" 
                    onclick="toggleMetodoConciliado('${m}')">
                    <i data-lucide="${config.conciliado ? 'check' : 'check-square'}" style="width:14px;"></i> 
                    ${config.conciliado ? 'CONCILIADO' : 'CONCILIAR'}
                </button>

                <div class="form-group" style="margin:0;">
                    <label class="form-label" style="font-size:11px; font-weight:700; color:var(--text-sub);">Plano</label>
                    <select class="form-control" style="padding:6px; font-size:12px;" id="plano-${m}">
                        ${planosOpts}
                    </select>
                </div>

                <div class="form-group" style="margin:0;">
                    <label class="form-label" style="font-size:11px; font-weight:700; color:var(--text-sub);">Data depósito</label>
                    <input type="date" class="form-control" style="padding:6px; font-size:12px;" id="dep-${m}" value="${config.depositoDt}">
                </div>

                <div class="form-group" style="margin:0;">
                    <label class="form-label" style="font-size:11px; font-weight:700; color:var(--text-sub);">Conta</label>
                    <select class="form-control" style="padding:6px; font-size:12px;" id="conta-${m}">
                        ${contasOpts}
                    </select>
                </div>

                <!-- Painel de Valores -->
                <div style="background:#f8fafc; border-radius:6px; padding:10px; display:flex; flex-direction:column; gap:8px;">
                    <div style="display:flex; justify-content:space-between; font-size:12px; font-weight:600;">
                        <span style="color:var(--text-sub);">Valor Sistema</span>
                        <span style="color:var(--text);">R$ ${valSistema.toFixed(2)}</span>
                    </div>
                    <div style="display:flex; justify-content:space-between; align-items:center; font-size:12px; font-weight:600;">
                        <span style="color:var(--text-sub);">Valor Digitado</span>
                        <input type="number" step="0.01" class="form-control" style="width:100px; padding:4px; font-size:12px; margin:0; text-align:right;" 
                            id="digitado-${m}" value="${valDigitado.toFixed(2)}" oninput="recalcColumnValues('${m}', ${valSistema})">
                    </div>
                    <div style="display:flex; justify-content:space-between; font-size:12px; font-weight:600;">
                        <span style="color:var(--text-sub);">Valor Saldo</span>
                        <span>R$ ${valSaldo.toFixed(2)}</span>
                    </div>
                    <div style="display:flex; justify-content:space-between; font-size:12px; font-weight:600;">
                        <span style="color:var(--text-sub);">Valor conciliação</span>
                        <span style="font-weight:800; color:var(--brand);">R$ ${valConciliado.toFixed(2)}</span>
                    </div>
                    <div style="display:flex; justify-content:space-between; font-size:12px; font-weight:600;">
                        <span style="color:var(--text-sub);">Diferença</span>
                        <span style="color:${diferenca >= 0 ? 'var(--success)' : 'var(--danger)'};">R$ ${diferenca.toFixed(2)}</span>
                    </div>
                </div>

                <!-- Campo de Falta / Sobra -->
                ${diferenca < 0 ? `
                <div style="border:1px solid #fee2e2; background:#fff5f5; border-radius:6px; padding:8px; display:flex; flex-direction:column; gap:2px;">
                    <span style="font-size:10px; font-weight:800; color:#dc2626; text-transform:uppercase;">Falta</span>
                    <span style="font-size:14px; font-weight:900; color:#dc2626; text-align:right;">- R$ ${Math.abs(diferenca).toFixed(2)}</span>
                </div>
                ` : ''}

                <!-- Sangrias se for Dinheiro -->
                ${isDinheiro ? `
                <div style="border-top:1px dashed var(--border); padding-top:10px;">
                    <span style="font-size:11px; font-weight:800; color:var(--text-sub); text-transform:uppercase; display:block; margin-bottom:6px;">Sangrias</span>
                    <div style="font-size:12px; font-weight:700; color:#f59e0b; display:flex; justify-content:space-between;">
                        <span>Sangria do Turno</span>
                        <span>- R$ ${(b.suprimento ? 0 : 0).toFixed(2)}</span>
                    </div>
                </div>
                ` : ''}

                <!-- Taxa Administrativa -->
                <div style="border-top:1px dashed var(--border); padding-top:10px; display:flex; flex-direction:column; gap:8px;">
                    <span style="font-size:11px; font-weight:800; color:var(--text-sub); text-transform:uppercase; display:block; margin:0;">Taxa Administrativa</span>
                    
                    <div class="form-group" style="margin:0;">
                        <label class="form-label" style="font-size:10px; font-weight:700; color:var(--text-sub);">Fornecedor</label>
                        <select class="form-control" style="padding:4px; font-size:11px;" id="forn-${m}">
                            ${fornecedoresOpts}
                        </select>
                    </div>

                    <div class="form-group" style="margin:0;">
                        <label class="form-label" style="font-size:10px; font-weight:700; color:var(--text-sub);">Plano de contas</label>
                        <select class="form-control" style="padding:4px; font-size:11px;" id="planotaxa-${m}">
                            ${planosOpts}
                        </select>
                    </div>

                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
                        <div class="form-group" style="margin:0;">
                            <label class="form-label" style="font-size:10px; font-weight:700; color:var(--text-sub);">Percentual Taxa (%)</label>
                            <input type="number" step="0.01" class="form-control" style="padding:4px; font-size:11px; text-align:right;" 
                                id="pct-${m}" value="${pctTaxa.toFixed(2)}" oninput="recalcColumnValues('${m}', ${valSistema})">
                        </div>
                        <div style="display:flex; flex-direction:column; justify-content:flex-end; text-align:right; font-size:12px; font-weight:700;">
                            <span style="font-size:9px; color:var(--text-sub); text-transform:uppercase;">Valor taxa (R$)</span>
                            <span style="font-size:13px; color:var(--danger);" id="valtaxa-${m}">R$ ${valTaxa.toFixed(2)}</span>
                        </div>
                    </div>

                    <div style="display:flex; justify-content:space-between; border-top:1px solid var(--border); padding-top:6px; font-weight:800; font-size:13px; color:var(--brand);">
                        <span>Valor líquido (R$)</span>
                        <span id="liq-${m}">R$ ${valLiquido.toFixed(2)}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
            <button class="btn-cancel" style="padding:8px 16px; font-weight:800; display:inline-flex; align-items:center; gap:6px; background:#fff; border:1px solid var(--border);" 
                onclick="backToBorderos()">
                <i data-lucide="arrow-left" style="width:16px;"></i> Voltar
            </button>
            <span style="font-weight:700; font-size:13px; color:var(--text-sub);">Nº Fechamento: <strong>${b.id.toString().substring(0, 5)}</strong></span>
        </div>

        <div class="glass-card" style="padding:20px; margin-bottom:20px;">
            <h3 style="font-weight:900; letter-spacing:-0.03em; margin:0; font-size:24px;">Fechamento de Caixa: #${b.id.toString().substring(0, 5)}</h3>
            <p style="font-size:14px; color:var(--text-sub); margin-top:6px; line-height:1.5;">
                Abertura realizada em <strong>${b.data.split('-').reverse().join('/')}</strong> pelo operador <strong style="text-transform:uppercase;">${b.operador}</strong>.<br>
                Fechamento do Caixa conferido no portal Velo.
            </p>

            <div style="display:flex; gap:12px; margin-top:20px; border-top:1px solid var(--border); padding-top:15px;">
                <button class="btn-save" style="padding:10px 24px; font-weight:800; font-size:13px; display:inline-flex; align-items:center; gap:6px;" onclick="saveBorderoConciliation(${b.id})">
                    <i data-lucide="save" style="width:16px;"></i> Gravar Conciliação
                </button>
                <button class="btn-save" style="padding:10px 24px; font-weight:800; font-size:13px; display:inline-flex; align-items:center; gap:6px; background:#16a34a;" onclick="conciliarTodosMetodos()">
                    <i data-lucide="check-check" style="width:16px;"></i> Conciliar todos
                </button>
            </div>
        </div>

        <h4 style="font-weight:900; font-size:16px; color:var(--text); margin-bottom:16px; display:flex; align-items:center; gap:8px;">
            <i data-lucide="table" style="width:18px;"></i> Painel de Conciliação Financeira
        </h4>

        <!-- Scroller Horizontal do Painel de Colunas -->
        <div style="display:flex; gap:16px; overflow-x:auto; padding-bottom:16px; align-items:stretch;">
            ${columnsHtml}
        </div>
    `;
    lucide.createIcons();
}

window.toggleMetodoConciliado = function(m) {
    const b = state.borderos.find(x => x.id === _activeBorderoId);
    if (!b || !b.configMetodos || !b.configMetodos[m]) return;

    b.configMetodos[m].conciliado = !b.configMetodos[m].conciliado;
    renderPage('conciliacaoCaixa');
};

window.conciliarTodosMetodos = function() {
    const b = state.borderos.find(x => x.id === _activeBorderoId);
    if (!b || !b.configMetodos) return;

    Object.keys(b.configMetodos).forEach(m => {
        b.configMetodos[m].conciliado = true;
    });
    renderPage('conciliacaoCaixa');
};

window.recalcColumnValues = function(m, valSistema) {
    const digInput = document.getElementById(`digitado-${m}`);
    const pctInput = document.getElementById(`pct-${m}`);
    const valTaxaSpan = document.getElementById(`valtaxa-${m}`);
    const liqSpan = document.getElementById(`liq-${m}`);

    if (!digInput || !pctInput) return;

    const dig = parseFloat(digInput.value) || 0;
    const pct = parseFloat(pctInput.value) || 0;

    const valTaxa = (dig * pct) / 100;
    const liq = dig - valTaxa;

    if (valTaxaSpan) valTaxaSpan.innerText = `R$ ${valTaxa.toFixed(2)}`;
    if (liqSpan) liqSpan.innerText = `R$ ${liq.toFixed(2)}`;
};

window.saveBorderoConciliation = function(id) {
    const b = state.borderos.find(x => x.id === id);
    if (!b) return;

    // Salva as configurações de todas as colunas
    Object.keys(b.configMetodos).forEach(m => {
        const digInput = document.getElementById(`digitado-${m}`);
        const pctInput = document.getElementById(`pct-${m}`);
        const planoSelect = document.getElementById(`plano-${m}`);
        const contaSelect = document.getElementById(`conta-${m}`);
        const depInput = document.getElementById(`dep-${m}`);

        if (digInput) b.declarado[m] = parseFloat(digInput.value) || 0;
        if (pctInput) b.configMetodos[m].percentualTaxa = parseFloat(pctInput.value) || 0;
        if (planoSelect) b.configMetodos[m].planoId = planoSelect.value;
        if (contaSelect) b.configMetodos[m].contaId = contaSelect.value;
        if (depInput) b.configMetodos[m].depositoDt = depInput.value;
    });

    // Se todos estiverem conciliados, muda o status geral do borderô para Conciliado
    const todosConciliados = Object.values(b.configMetodos).every(c => c.conciliado === true);
    b.status = todosConciliados ? 'Conciliado' : 'Pendente';

    pushToServer({ borderos: state.borderos });
    alert('Conciliação financeira salva com sucesso!');
    _activeBorderoId = null;
    renderPage('conciliacaoCaixa');
};


// ============================================================================
// FINANCEIRO — RECEITAS
// ============================================================================
function renderReceitas(container) {
    renderFinLancamentos(container, 'Receita');
}

// ============================================================================
// FINANCEIRO — DESPESAS
// ============================================================================
function renderDespesas(container) {
    renderFinLancamentos(container, 'Despesa');
}

// Renderização unificada para simplificar manutenção
function renderFinLancamentos(container, tipoFiltro) {
    if (!state.lancamentos) state.lancamentos = [];
    const list = state.lancamentos.filter(l => l.tipo === tipoFiltro);

    const total = list.reduce((s,l) => s + l.valor, 0);

    const tRows = [...list].sort((a,b) => b.data.localeCompare(a.data)).map(l => {
        const pc = (state.planoConta || []).find(c => c.id == l.planoContaId);
        const cc = (state.centroCusto || []).find(c => c.id == l.centroCustoId);
        const cf = (state.contaFinanceira || []).find(c => c.id == l.contaFinanceiraId);
        const statusColor = l.status === 'Pago' ? '#16a34a' : l.status === 'Cancelado' ? '#dc2626' : '#f59e0b';
        const statusBg    = l.status === 'Pago' ? '#dcfce7' : l.status === 'Cancelado' ? '#fee2e2' : '#fef9c3';
        return `<tr>
            <td style="font-weight:700;">${l.data ? l.data.split('-').reverse().join('/') : '-'}</td>
            <td style="font-weight:700;">${l.descricao}</td>
            <td style="font-size:12px;color:var(--text-sub);">${pc ? pc.descricao : '-'}</td>
            <td style="font-size:12px;color:var(--text-sub);">${cc ? cc.descricao : '-'}</td>
            <td style="font-size:12px;color:var(--text-sub);">${cf ? cf.descricao : '-'}</td>
            <td><span style="padding:3px 8px;border-radius:4px;font-size:11px;font-weight:700;
                background:${statusBg};color:${statusColor};">${l.status || 'Pago'}</span></td>
            <td style="font-weight:900;font-size:16px;color:${tipoFiltro === 'Receita' ? 'var(--success)' : 'var(--danger)'};">
                ${tipoFiltro === 'Receita' ? '' : '- '}R$ ${l.valor.toFixed(2)}</td>
            <td>
                <div style="display:flex;align-items:center;gap:10px;justify-content:flex-end;">
                    <i data-lucide="edit-3" style="width:16px;color:var(--brand);cursor:pointer;" onclick="openLancamentoModal(${l.id}, '${tipoFiltro}')"></i>
                    <i data-lucide="trash-2" style="width:16px;color:var(--danger);cursor:pointer;" onclick="removeLancamento(${l.id}, '${tipoFiltro}')"></i>
                </div>
            </td>
        </tr>`;
    }).join('');

    container.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;flex-wrap:wrap;gap:12px;">
            <div>
                <h3 style="font-weight:800;letter-spacing:-0.03em;">Gestão de ${tipoFiltro}s</h3>
                <p style="font-size:13px;color:var(--text-sub);margin-top:4px;">Controle detalhado de ${tipoFiltro.toLowerCase()}s financeiras</p>
            </div>
            <button class="btn-save" style="display:flex;align-items:center;gap:8px;padding:10px 20px;" onclick="openLancamentoModal(null, '${tipoFiltro}')">
                <i data-lucide="plus" style="width:16px;"></i> Nova ${tipoFiltro}
            </button>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px;margin-bottom:24px;">
            <div class="stat-box"><span class="label">Total ${tipoFiltro}s</span><span class="value" style="color:${tipoFiltro === 'Receita' ? 'var(--success)' : 'var(--danger)'};">R$ ${total.toFixed(2)}</span></div>
            <div class="stat-box"><span class="label">Lançamentos</span><span class="value">${list.length}</span></div>
        </div>
        <div class="glass-card" style="padding:0;overflow:hidden;">
            <table class="modern-table" style="margin:0;">
                <thead>
                    <tr>
                        <th>Data</th><th>Descrição</th><th>Plano de Contas</th>
                        <th>Centro de Custo</th><th>Conta Financeira</th><th>Status</th><th>Valor</th>
                        <th style="width:80px;"></th>
                    </tr>
                </thead>
                <tbody>
                    ${list.length === 0
                        ? `<tr><td colspan="8" style="text-align:center;padding:60px;color:var(--text-sub);font-weight:600;">Nenhuma ${tipoFiltro.toLowerCase()} registrada.</td></tr>`
                        : tRows}
                </tbody>
            </table>
        </div>
    `;
}

let _editingLancamentoId = null;
let _editingLancamentoTipo = 'Receita';

window.openLancamentoModal = function(id = null, tipoPadrao = 'Receita') {
    _editingLancamentoId = id;
    _editingLancamentoTipo = tipoPadrao;
    if (!state.lancamentos) state.lancamentos = [];
    const item = id
        ? state.lancamentos.find(l => l.id === id)
        : { data: getLocalDateString(), tipo: tipoPadrao, descricao: '', valor: 0, status: 'Pago', planoContaId: '', centroCustoId: '', contaFinanceiraId: '', obs: '' };

    const planosOpts  = (state.planoConta || []).map(c =>
        `<option value="${c.id}" ${item.planoContaId == c.id ? 'selected' : ''}>${c.codigo} — ${c.descricao}</option>`).join('');
    const centrosOpts = (state.centroCusto || []).filter(c => c.ativo).map(c =>
        `<option value="${c.id}" ${item.centroCustoId == c.id ? 'selected' : ''}>${c.codigo} — ${c.descricao}</option>`).join('');
    const contasOpts  = (state.contaFinanceira || []).filter(c => c.ativa).map(c =>
        `<option value="${c.id}" ${item.contaFinanceiraId == c.id ? 'selected' : ''}>${c.codigo} — ${c.descricao}</option>`).join('');

    const modal = document.getElementById('product-modal');
    document.getElementById('product-modal-title').innerText = id ? `Editar ${item.tipo}` : `Nova ${tipoPadrao}`;
    document.getElementById('product-icon-wrapper').style.display = 'none';

    document.getElementById('product-form-body').innerHTML = `
        <div class="form-grid">
            <div class="form-group col-4">
                <label class="form-label">Data</label>
                <input type="date" class="form-control" id="lan-data" value="${item.data}">
            </div>
            <div class="form-group col-4">
                <label class="form-label">Valor (R$)</label>
                <input type="number" step="0.01" class="form-control" id="lan-valor" value="${Number(item.valor||0).toFixed(2)}">
            </div>
            <div class="form-group col-4">
                <label class="form-label">Status</label>
                <select class="form-control" id="lan-status">
                    <option value="Pago" ${item.status==='Pago'?'selected':''}>${tipoPadrao === 'Receita' ? 'Recebido' : 'Pago'}</option>
                    <option value="Pendente" ${item.status==='Pendente'?'selected':''}>Pendente</option>
                    <option value="Cancelado" ${item.status==='Cancelado'?'selected':''}>Cancelado</option>
                </select>
            </div>
            <div class="form-group col-12">
                <label class="form-label">Descrição</label>
                <input type="text" class="form-control" id="lan-descricao" value="${item.descricao}" placeholder="Descreva a ${tipoPadrao.toLowerCase()}">
            </div>
            <div class="form-group col-4">
                <label class="form-label">Plano de Contas</label>
                <select class="form-control" id="lan-plano">
                    <option value="">— Selecione —</option>
                    ${planosOpts}
                </select>
            </div>
            <div class="form-group col-4">
                <label class="form-label">Centro de Custo</label>
                <select class="form-control" id="lan-centro">
                    <option value="">— Selecione —</option>
                    ${centrosOpts}
                </select>
            </div>
            <div class="form-group col-4">
                <label class="form-label">Conta Financeira</label>
                <select class="form-control" id="lan-conta">
                    <option value="">— Selecione —</option>
                    ${contasOpts}
                </select>
            </div>
            <div class="form-group col-12">
                <label class="form-label">Observações</label>
                <input type="text" class="form-control" id="lan-obs" value="${item.obs||''}" placeholder="Observações adicionais (opcional)">
            </div>
        </div>
    `;

    document.querySelector('.modal-footer').innerHTML = `
        <button class="btn-cancel" onclick="closeProductModal()">Cancelar</button>
        <button class="btn-save" onclick="saveLancamento()">Gravar</button>
    `;
    modal.classList.add('active');
    lucide.createIcons();
};

window.saveLancamento = function() {
    const descricao = document.getElementById('lan-descricao').value.trim();
    const valor = parseFloat(document.getElementById('lan-valor').value) || 0;
    if (!descricao) return alert('A descrição é obrigatória.');
    if (valor <= 0)  return alert('Informe um valor maior que zero.');

    if (!state.lancamentos) state.lancamentos = [];
    const item = {
        id: _editingLancamentoId || Date.now(),
        data: document.getElementById('lan-data').value,
        tipo: _editingLancamentoTipo,
        descricao,
        valor,
        status: document.getElementById('lan-status').value,
        planoContaId:      document.getElementById('lan-plano').value  || null,
        centroCustoId:     document.getElementById('lan-centro').value || null,
        contaFinanceiraId: document.getElementById('lan-conta').value  || null,
        obs: document.getElementById('lan-obs').value.trim()
    };

    if (_editingLancamentoId) {
        state.lancamentos = state.lancamentos.map(l => l.id === _editingLancamentoId ? item : l);
    } else {
        state.lancamentos.push(item);
    }
    pushToServer({ lancamentos: state.lancamentos });
    closeProductModal();
    renderPage(_editingLancamentoTipo === 'Receita' ? 'receitas' : 'despesas');
};

window.removeLancamento = function(id, tipo) {
    if (!confirm(`Remover esta ${tipo.toLowerCase()}?`)) return;
    state.lancamentos = (state.lancamentos || []).filter(l => l.id !== id);
    pushToServer({ lancamentos: state.lancamentos });
    renderPage(tipo === 'Receita' ? 'receitas' : 'despesas');
};


// ============================================================================
// COLABORADORES — CARGOS E PERMISSÕES
// ============================================================================
function renderCargos(container) {
    if (!state.cargos) {
        state.cargos = [
            {
                id: 1,
                nome: 'ADMINISTRADOR',
                permissoes: {
                    'cadastros': true,
                    'produtos': true,
                    'financeiro': true,
                    'estoque': true,
                    'relatorios': true,
                    'vendas': true,
                    'vendas_cartoes': true,
                    'configuracoes': true
                }
            },
            {
                id: 2,
                nome: 'OPERADOR DE CAIXA',
                permissoes: {
                    'cadastros': false,
                    'produtos': false,
                    'financeiro': false,
                    'estoque': false,
                    'relatorios': false,
                    'vendas': true,
                    'vendas_cartoes': false,
                    'configuracoes': false
                }
            }
        ];
        pushToServer({ cargos: state.cargos });
    }

    const tRows = state.cargos.map(c => {
        const countPerms = Object.values(c.permissoes).filter(Boolean).length;
        return `<tr>
            <td style="font-weight:800; font-size:14px; color:var(--brand);">${c.nome.toUpperCase()}</td>
            <td style="font-weight:700;">${countPerms} módulo(s) habilitado(s)</td>
            <td>
                <div style="display:flex;align-items:center;gap:10px;justify-content:flex-end;">
                    <i data-lucide="edit-3" style="width:16px;color:var(--brand);cursor:pointer;" onclick="openCargoModal(${c.id})"></i>
                    <i data-lucide="trash-2" style="width:16px;color:var(--danger);cursor:pointer;" onclick="removeCargo(${c.id})"></i>
                </div>
            </td>
        </tr>`;
    }).join('');

    container.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;flex-wrap:wrap;gap:12px;">
            <div>
                <h3 style="font-weight:800;letter-spacing:-0.03em;">Cargos e Permissões</h3>
                <p style="font-size:13px;color:var(--text-sub);margin-top:4px;">Defina os perfis de acesso e permissões dos módulos do sistema.</p>
            </div>
            <button class="btn-save" style="display:flex;align-items:center;gap:8px;padding:10px 20px;" onclick="openCargoModal()">
                <i data-lucide="plus" style="width:16px;"></i> Novo Cargo
            </button>
        </div>
        <div class="glass-card" style="padding:0;overflow:hidden;">
            <table class="modern-table" style="margin:0;">
                <thead>
                    <tr>
                        <th>Nome do Cargo</th>
                        <th>Nível de Acesso</th>
                        <th style="width:100px;"></th>
                    </tr>
                </thead>
                <tbody>
                    ${tRows}
                </tbody>
            </table>
        </div>
    `;
}

let _editingCargoId = null;

window.openCargoModal = function(id = null) {
    _editingCargoId = id;
    const item = id
        ? state.cargos.find(c => c.id === id)
        : { nome: '', permissoes: { cadastros: false, produtos: false, financeiro: false, estoque: false, relatorios: false, vendas: true, vendas_cartoes: false, configuracoes: false } };

    const modal = document.getElementById('product-modal');
    document.getElementById('product-modal-title').innerText = id ? 'Editar Registro de Cargo' : 'Novo Cargo e Acessos';
    document.getElementById('product-icon-wrapper').style.display = 'none';

    // Lista de módulos adaptada do mockup e sistema atual (Sem NFE, Sem NFCE)
    const modulos = [
        { key: 'cadastros', label: 'CLIENTES E CADASTROS DE BASE', modulo: 'CADASTROS' },
        { key: 'produtos', label: 'CATÁLOGO DE PRODUTOS E PREÇOS', modulo: 'CADASTROS' },
        { key: 'financeiro', label: 'FINANCEIRO (CONTAS, FLUXOS E BANCO)', modulo: 'CADASTROS' },
        { key: 'configuracoes', label: 'CONFIGURAÇÕES DA LOJA E TERMINAIS', modulo: 'CONFIGURAÇÕES LOJA' },
        { key: 'relatorios', label: 'RELATÓRIOS ANALÍTICOS DE GESTÃO', modulo: 'RELATÓRIOS' },
        { key: 'vendas', label: 'REALIZAR VENDAS NO PDV / OPERAÇÃO', modulo: 'VENDAS' },
        { key: 'vendas_cartoes', label: 'CONCILIAÇÃO E CARTÕES DE VENDAS', modulo: 'VENDAS CARTOES' }
    ];

    // Agrupa por módulo para exibir na árvore
    const agrupado = {};
    modulos.forEach(m => {
        if (!agrupado[m.modulo]) agrupado[m.modulo] = [];
        agrupado[m.modulo].push(m);
    });

    let modulosHtml = '';
    Object.entries(agrupado).forEach(([modName, itens]) => {
        const itemRows = itens.map(i => {
            const checked = item.permissoes[i.key] ? 'checked' : '';
            return `
                <div style="display:flex; align-items:center; justify-content:space-between; padding:8px 16px; border-bottom:1px solid #f1f5f9; background:#fff;">
                    <span style="font-size:12px; font-weight:700; color:var(--text-sub);">${i.label}</span>
                    <input type="checkbox" id="perm-${i.key}" ${checked} style="width:18px; height:18px; cursor:pointer;">
                </div>
            `;
        }).join('');

        modulosHtml += `
            <div style="border:1px solid #e2e8f0; border-radius:6px; overflow:hidden; margin-bottom:12px;">
                <div style="background:#f8fafc; padding:10px; font-weight:800; font-size:11px; color:var(--text); text-transform:uppercase; border-bottom:1px solid #e2e8f0; display:flex; align-items:center; gap:8px;">
                    <i data-lucide="folder" style="width:14px;"></i> Modulo: ${modName}
                </div>
                ${itemRows}
            </div>
        `;
    });

    document.getElementById('product-form-body').innerHTML = `
        <div class="form-grid">
            <div class="form-group col-12" style="margin-bottom:16px;">
                <label class="form-label">Nome do Cargo</label>
                <input type="text" class="form-control" id="cargo-nome" value="${item.nome}" placeholder="Ex: OPERADOR DE CAIXA, GERENTE" style="text-transform:uppercase;">
            </div>
            
            <h4 class="col-12" style="font-weight:900; font-size:13px; color:var(--text-sub); margin-bottom:10px; text-transform:uppercase; border-bottom:2px solid var(--accent); padding-bottom:6px;">
                Acessos e Permissões de Módulo
            </h4>
            <div class="col-12" style="max-height:300px; overflow-y:auto; padding-right:4px;">
                ${modulosHtml}
            </div>
        </div>
    `;

    document.querySelector('.modal-footer').innerHTML = `
        <button class="btn-cancel" onclick="closeProductModal()">Cancelar</button>
        <button class="btn-save" onclick="saveCargo()">Gravar Registro</button>
    `;
    modal.classList.add('active');
    lucide.createIcons();
};

window.saveCargo = function() {
    const nome = document.getElementById('cargo-nome').value.trim().toUpperCase();
    if (!nome) return alert('O nome do cargo é obrigatório.');

    const keys = ['cadastros', 'produtos', 'financeiro', 'estoque', 'relatorios', 'vendas', 'vendas_cartoes', 'configuracoes'];
    const permissoes = {};
    keys.forEach(k => {
        const checkbox = document.getElementById(`perm-${k}`);
        permissoes[k] = checkbox ? checkbox.checked : false;
    });

    const item = {
        id: _editingCargoId || Date.now(),
        nome,
        permissoes
    };

    if (!state.cargos) state.cargos = [];

    if (_editingCargoId) {
        state.cargos = state.cargos.map(c => c.id === _editingCargoId ? item : c);
    } else {
        state.cargos.push(item);
    }

    pushToServer({ cargos: state.cargos });
    closeProductModal();
    renderPage('cargos');
};

window.removeCargo = function(id) {
    if (!confirm('Remover este cargo permanentemente?')) return;
    state.cargos = state.cargos.filter(c => c.id !== id);
    pushToServer({ cargos: state.cargos });
    renderPage('cargos');
};

// ==========================================
// DRE PERSONALIZADA (REQUISITO GESTOR VELO)
// ==========================================

let _dreActiveLineId = null;

window.renderReportDrePersonalizada = function(container) {
    // Inicialização do Mock Data com as REGRAS OFICIAIS DA DRE DESTE ANO (CPC 26) + Regras de Plano de Contas
    if (!state.dreStructure || state.dreStructure.length === 0 || !state.dreStructure.some(l => l.planoContasRules)) {
        state.dreStructure = [
            { id: 1001, parentId: null, description: "(+) RECEITA BRUTA DE VENDAS", order: 1, type: "somar", val: 0.00, percent: 100.00, expanded: true, bold: true, showPercent: true },
            { id: 1002, parentId: 1001, description: "Vendas de Mercadorias (Frente Caixa)", order: 1, type: "receitas", val: 38000.00, percent: 0.00, expanded: true, bold: false, showPercent: true, planoContasRules: [{ id: 1, name: 'Vendas de Mercadorias (Frente Caixa)', tpData: 'Emissão', tpValor: 'Pago/Recebido', active: true }] },
            { id: 1003, parentId: 1001, description: "Prestação de Serviços Especializados", order: 2, type: "receitas", val: 17450.00, percent: 0.00, expanded: true, bold: false, showPercent: true, planoContasRules: [{ id: 2, name: 'Prestação de Serviços Especializados', tpData: 'Emissão', tpValor: 'Pago/Recebido', active: true }] },
            { id: 1004, parentId: null, description: "(-) DEDUÇÕES DA RECEITA BRUTA", order: 2, type: "somar", val: 0.00, percent: 0.00, expanded: true, bold: true, showPercent: true },
            { id: 1005, parentId: 1004, description: "Impostos sobre Vendas (ICMS/ISS/PIS)", order: 1, type: "despesas", val: 3400.00, percent: 0.00, expanded: true, bold: false, showPercent: true, planoContasRules: [{ id: 3, name: 'Impostos sobre Vendas (ICMS/ISS/PIS)', tpData: 'Vencimento', tpValor: 'Original', active: true }] },
            { id: 1006, parentId: 1004, description: "Devoluções e Abatimentos de Clientes", order: 2, type: "despesas", val: 1800.00, percent: 0.00, expanded: true, bold: false, showPercent: true, planoContasRules: [{ id: 4, name: 'Devoluções e Abatimentos de Clientes', tpData: 'Registro', tpValor: 'Original', active: true }] },
            { id: 1007, parentId: null, description: "(=) RECEITA LÍQUIDA DE VENDAS", order: 3, type: "calculo", val: 0.00, percent: 0.00, expanded: true, bold: true, showPercent: true },
            { id: 1008, parentId: null, description: "(-) CUSTOS OPERACIONAIS (CMV/CPV)", order: 4, type: "somar", val: 0.00, percent: 0.00, expanded: true, bold: true, showPercent: true },
            { id: 1009, parentId: 1008, description: "Custo de Mercadorias Vendidas (CMV)", order: 1, type: "compras_mercadorias", val: 11200.00, percent: 0.00, expanded: true, bold: false, showPercent: true, planoContasRules: [{ id: 5, name: 'Custo de Mercadorias Vendidas (CMV)', tpData: 'Data de finalização', tpValor: 'Original', active: true }] },
            { id: 1010, parentId: 1008, description: "Custo de Serviços Prestados (CSP)", order: 2, type: "compras_mercadorias", val: 4200.00, percent: 0.00, expanded: true, bold: false, showPercent: true, planoContasRules: [{ id: 6, name: 'Custo de Serviços Prestados (CSP)', tpData: 'Data de finalização', tpValor: 'Original', active: true }] },
            { id: 1011, parentId: null, description: "(=) RESULTADO BRUTO (LUCRO BRUTO)", order: 5, type: "calculo", val: 0.00, percent: 0.00, expanded: true, bold: true, showPercent: true },
            { id: 1012, parentId: null, description: "(-) DESPESAS OPERACIONAIS", order: 6, type: "somar", val: 0.00, percent: 0.00, expanded: false, bold: true, showPercent: true },
            { id: 1013, parentId: 1012, description: "Despesas Administrativas do Período", order: 1, type: "despesas", val: 4500.00, percent: 0.00, expanded: true, bold: false, showPercent: true, planoContasRules: [{ id: 7, name: 'Despesas Administrativas do Período', tpData: 'Vencimento', tpValor: 'Original', active: true }] },
            { id: 1014, parentId: 1012, description: "Despesas Comerciais e Logística", order: 2, type: "despesas", val: 3300.00, percent: 0.00, expanded: true, bold: false, showPercent: true, planoContasRules: [{ id: 8, name: 'Despesas Comerciais e Logística', tpData: 'Vencimento', tpValor: 'Original', active: true }] },
            { id: 1015, parentId: 1012, description: "Pró-labore e Salários e Encargos", order: 3, type: "despesas", val: 2000.00, percent: 0.00, expanded: true, bold: false, showPercent: true, planoContasRules: [{ id: 9, name: 'Pró-labore e Salários e Encargos', tpData: 'Vencimento', tpValor: 'Original', active: true }] },
            { id: 1016, parentId: null, description: "(=) RESULTADO LÍQUIDO DO EXERCÍCIO", order: 7, type: "calculo", val: 0.00, percent: 0.00, expanded: true, bold: true, showPercent: true }
        ];
        saveLocalBackup();
    }

    // Calcula os valores dinamicamente a partir dos nós filhos antes de renderizar
    recalculateDreValues();

    // Estilos personalizados específicos da DRE Personalizada
    if (!document.getElementById('dre-tactile-css')) {
        const styleEl = document.createElement('style');
        styleEl.id = 'dre-tactile-css';
        styleEl.innerHTML = `
            .dre-layout {
                display: grid;
                grid-template-columns: 380px 1fr;
                gap: 24px;
                align-items: start;
            }
            @media (max-width: 950px) {
                .dre-layout {
                    grid-template-columns: 1fr;
                }
            }
            .dre-card-left {
                background: linear-gradient(135deg, #ffffff 0%, #faf9f6 100%);
                border: 1px solid #dcdad0;
                border-radius: 16px;
                box-shadow: 0 10px 30px rgba(50, 48, 44, 0.08), inset 0 1px 0 rgba(255,255,255,0.9);
                padding: 24px;
                position: sticky;
                top: 20px;
                transition: all 0.3s ease;
            }
            .dre-card-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 20px;
                border-bottom: 1px dashed #e5e3d9;
                padding-bottom: 14px;
            }
            .dre-card-title {
                font-family: 'Plus Jakarta Sans', sans-serif;
                font-size: 14px;
                font-weight: 800;
                color: #2c2b29;
                letter-spacing: -0.01em;
            }
            .dre-pill-btn {
                border-radius: 20px;
                padding: 6px 14px;
                font-size: 11px;
                font-weight: 800;
                letter-spacing: 0.02em;
                text-transform: uppercase;
                display: inline-flex;
                align-items: center;
                gap: 6px;
                border: none;
                cursor: pointer;
                transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
                box-shadow: 0 4px 6px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,0.4);
            }
            .dre-pill-btn.primary {
                background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
                color: white;
            }
            .dre-pill-btn.primary:hover {
                background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%);
                transform: translateY(-1px);
                box-shadow: 0 6px 10px rgba(29,78,216,0.15), inset 0 1px 0 rgba(255,255,255,0.4);
            }
            .dre-pill-btn.success {
                background: linear-gradient(135deg, #10b981 0%, #047857 100%);
                color: white;
            }
            .dre-pill-btn.success:hover {
                background: linear-gradient(135deg, #059669 0%, #065f46 100%);
                transform: translateY(-1px);
                box-shadow: 0 6px 10px rgba(4,120,87,0.15), inset 0 1px 0 rgba(255,255,255,0.4);
            }
            .dre-close-btn {
                background: transparent;
                border: none;
                cursor: pointer;
                color: #8c8a82;
                display: flex;
                padding: 4px;
                border-radius: 50%;
                transition: background 0.2s;
            }
            .dre-close-btn:hover {
                background: #f1efe8;
                color: #2c2b29;
            }
            .dre-form-control {
                background: #fff;
                border: 1px solid #c8c6bc;
                border-radius: 8px;
                color: #2c2b29;
                font-family: inherit;
                font-size: 13px;
                font-weight: 600;
                padding: 10px 12px;
                width: 100%;
                box-sizing: border-box;
                outline: none;
                transition: all 0.2s;
            }
            .dre-form-control:focus {
                border-color: #3b82f6;
                box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.12);
            }
            .dre-checkbox-label {
                display: inline-flex;
                align-items: center;
                gap: 8px;
                font-size: 12px;
                font-weight: 700;
                color: #5c5a53;
                cursor: pointer;
                user-select: none;
            }
            .dre-checkbox-label input {
                width: 16px;
                height: 16px;
                cursor: pointer;
            }

            /* Tree Table Estilo Premium */
            .dre-table-card {
                background: linear-gradient(135deg, #ffffff 0%, #faf9f6 100%);
                border: 1px solid #dcdad0;
                border-radius: 16px;
                box-shadow: 0 6px 20px rgba(50, 48, 44, 0.04);
                overflow: hidden;
            }
            .dre-tree-table {
                width: 100%;
                border-collapse: collapse;
                margin: 0;
            }
            .dre-tree-table th {
                background: #f3f1e9;
                color: #5c5a53;
                font-family: 'Plus Jakarta Sans', sans-serif;
                font-size: 11px;
                font-weight: 800;
                text-transform: uppercase;
                letter-spacing: 0.05em;
                padding: 12px 18px;
                text-align: left;
                border-bottom: 1px solid #dcdad0;
            }
            .dre-row {
                border-bottom: 1px solid #f1efe8;
                transition: background-color 0.2s ease;
                cursor: pointer;
            }
            .dre-row:hover {
                background-color: #f5f4ed !important;
            }
            .dre-row.header-level {
                background: #eae8df;
            }
            .dre-row.header-level td {
                padding-top: 14px;
                padding-bottom: 14px;
            }
            .dre-row.header-level .desc-cell {
                font-family: 'Plus Jakarta Sans', sans-serif;
                font-size: 13px;
                font-weight: 900;
                color: #1e2025; /* Grafite sofisticado */
                text-transform: uppercase;
                letter-spacing: 0.04em;
            }
            .dre-row.header-level .val-cell,
            .dre-row.header-level .pct-cell {
                font-weight: 900;
                color: #1e2025;
            }
            .dre-row.bold-row td {
                font-weight: 800;
            }
            .dre-indent-guide {
                display: inline-block;
                width: 24px;
                height: 18px;
                border-right: 1px solid rgba(200, 198, 188, 0.4);
                margin-right: 8px;
                vertical-align: middle;
            }
            .dre-toggle-icon {
                cursor: pointer;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                width: 20px;
                height: 20px;
                color: #8c8a82;
                margin-right: 4px;
                border-radius: 4px;
                transition: all 0.2s;
            }
            .dre-toggle-icon:hover {
                background: rgba(0,0,0,0.05);
                color: #2c2b29;
            }
            .desc-cell {
                font-size: 13px;
                font-weight: 600;
                color: #2c2b29;
                padding: 10px 18px;
                display: flex;
                align-items: center;
            }
            .val-cell {
                font-size: 13px;
                font-weight: 700;
                color: #2c2b29;
                padding: 10px 18px;
            }
            .pct-cell {
                font-size: 12px;
                font-weight: 700;
                color: #8c8a82;
                padding: 10px 18px;
            }
            .actions-cell {
                padding: 10px 18px;
                text-align: right;
            }
            .action-btn-minimal {
                background: transparent;
                border: none;
                cursor: pointer;
                color: #a8a69e;
                padding: 4px;
                border-radius: 6px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s;
            }
            .action-btn-minimal:hover {
                background: #fdf2f2;
                color: #ef4444;
            }
            .action-btn-minimal.edit:hover {
                background: #eff6ff;
                color: #3b82f6;
            }
            .dre-badge-indicator {
                font-size: 10px;
                font-weight: 900;
                padding: 2px 6px;
                border-radius: 4px;
                margin-right: 8px;
                font-family: monospace;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                min-width: 14px;
            }
            .dre-badge-indicator.plus {
                background: rgba(16, 185, 129, 0.12);
                border: 1px solid rgba(16, 185, 129, 0.25);
                color: #047857;
            }
            .dre-badge-indicator.minus {
                background: rgba(239, 68, 68, 0.12);
                border: 1px solid rgba(239, 68, 68, 0.25);
                color: #b91c1c;
            }
            .dre-badge-indicator.equals {
                background: rgba(59, 130, 246, 0.12);
                border: 1px solid rgba(59, 130, 246, 0.25);
                color: #1d4ed8;
            }
            .dre-progress-bar-container {
                width: 100%;
                height: 4px;
                background: #e5e3d9;
                border-radius: 2px;
                overflow: hidden;
                margin-top: 4px;
            }
            .dre-progress-fill {
                height: 100%;
                border-radius: 2px;
            }
        `;
        document.head.appendChild(styleEl);
    }

    // Define a linha atualmente em edição
    let activeLine = state.dreStructure.find(l => l.id === _dreActiveLineId);
    if (!activeLine && state.dreStructure.length > 0) {
        activeLine = state.dreStructure[0];
        _dreActiveLineId = activeLine.id;
    }

    // Constrói as opções de aninhar linha
    const validParents = state.dreStructure.filter(l => !activeLine || l.id !== activeLine.id);
    const parentOpts = `
        <option value="">— Nenhuma (Linha Raiz) —</option>
        ${validParents.map(l => `<option value="${l.id}" ${activeLine && activeLine.parentId === l.id ? 'selected' : ''}>${l.description}</option>`).join('')}
    `;

    // Renderiza a estrutura básica com as colunas
    container.innerHTML = `
        <div class="dre-layout">
            <!-- COLUNA DA ESQUERDA: Formulário Flutuante Físico -->
            <div class="dre-card-left" id="dre-form-container">
                <!-- Injetado dinamicamente -->
            </div>

            <!-- COLUNA DA DIREITA: Tree Table de Visualização -->
            <div class="dre-table-card">
                <table class="dre-tree-table">
                    <thead>
                        <tr>
                            <th>Descrição</th>
                            <th style="width: 150px;">Valor (R$)</th>
                            <th style="width: 130px;">% da Receita</th>
                            <th style="width: 100px; text-align: right;">Ações</th>
                        </tr>
                    </thead>
                    <tbody id="dre-tree-tbody">
                        <!-- Injetado dinamicamente -->
                    </tbody>
                </table>
            </div>
        </div>
    `;

    renderDreLeftForm(activeLine, parentOpts);
    renderDreTreeTable();
};

function recalculateDreValues() {
    const list = state.dreStructure;

    // Função recursiva com suporte contábil oficial
    function getNodeValue(node) {
        if (node.type === 'somar') {
            const children = list.filter(l => l.parentId === node.id);
            let sum = 0;
            children.forEach(c => {
                sum += getNodeValue(c);
            });
            node.val = sum;
            return sum;
        } else if (node.type === 'calculo') {
            const desc = node.description.toUpperCase();
            if (desc.includes('RECEITA LÍQUIDA')) {
                const receitaBruta = list.find(l => l.description.toUpperCase().includes('RECEITA BRUTA'))?.val || 0;
                const deducoes = list.find(l => l.description.toUpperCase().includes('DEDUÇÕES') || l.description.toUpperCase().includes('IMPOSTOS'))?.val || 0;
                node.val = receitaBruta - deducoes;
            } else if (desc.includes('RESULTADO BRUTO') || desc.includes('LUCRO BRUTO')) {
                const receitaLiquida = list.find(l => l.description.toUpperCase().includes('RECEITA LÍQUIDA'))?.val || 0;
                const custos = list.find(l => l.description.toUpperCase().includes('CUSTO'))?.val || 0;
                node.val = receitaLiquida - custos;
            } else if (desc.includes('RESULTADO LÍQUIDO') || desc.includes('LUCRO LÍQUIDO') || desc.includes('RESULTADO DO EXERCÍCIO')) {
                const lucroBruto = list.find(l => l.description.toUpperCase().includes('LUCRO BRUTO') || l.description.toUpperCase().includes('RESULTADO BRUTO'))?.val || 0;
                const despesas = list.find(l => l.description.toUpperCase().includes('DESPESAS'))?.val || 0;
                node.val = lucroBruto - despesas;
            } else {
                // Lógica genérica de balanço de raiz
                const entradas = list.filter(l => l.parentId === null && l.description.includes('(+)')).reduce((acc, x) => acc + x.val, 0);
                const saidas = list.filter(l => l.parentId === null && l.description.includes('(-)')).reduce((acc, x) => acc + x.val, 0);
                node.val = entradas - saidas;
            }
            return node.val;
        } else {
            return node.val || 0;
        }
    }

    list.forEach(node => {
        if (node.parentId === null) {
            getNodeValue(node);
        }
    });

    // Calcula percentuais com relação à Receita Bruta ou Linha de cálculo customizada
    const receitaBrutaNode = list.find(l => l.description.toUpperCase().includes('RECEITA BRUTA')) || list.find(l => l.description.includes('ENTRADA'));
    const defaultBaseVal = receitaBrutaNode ? receitaBrutaNode.val : 1.0;
    
    list.forEach(node => {
        let baseVal = defaultBaseVal;
        if (node.linhaCalculoId) {
            const customBaseNode = list.find(l => l.id == node.linhaCalculoId);
            if (customBaseNode && customBaseNode.val > 0) {
                baseVal = customBaseNode.val;
            }
        }
        if (baseVal > 0) {
            node.percent = (node.val / baseVal) * 100.0;
        } else {
            node.percent = 0.0;
        }
    });
}

function renderDreLeftForm(line, parentOpts) {
    const formContainer = document.getElementById('dre-form-container');
    if (!formContainer) return;

    const baseLinesOpts = `
        <option value="">— Selecione (Padrão: Receita Bruta) —</option>
        ${state.dreStructure.filter(l => !line || l.id !== line.id).map(l => `<option value="${l.id}" ${line && line.linhaCalculoId == l.id ? 'selected' : ''}>${l.description}</option>`).join('')}
    `;

    const isNew = !line || !state.dreStructure.some(l => l.id === line.id);
    const headerTitle = isNew ? "Nova Linha" : `Linhas perfil #${line.id}`;

    formContainer.innerHTML = `
        <div class="dre-card-header">
            <span class="dre-card-title">${headerTitle}</span>
            <div style="display: flex; align-items: center; gap: 8px;">
                <button class="dre-pill-btn success" onclick="clickDreNovaLinha()">
                    <i data-lucide="plus" style="width: 12px;"></i> Nova
                </button>
                <button class="dre-pill-btn primary" onclick="clickDreGravar()">
                    <i data-lucide="save" style="width: 12px;"></i> Gravar
                </button>
                ${!isNew ? `<button class="dre-close-btn" onclick="clearDreEditing()" title="Limpar Seleção"><i data-lucide="x" style="width: 14px;"></i></button>` : ''}
            </div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 16px;">
            <div>
                <label style="font-size: 11px; font-weight: 800; color: #8c8a82; text-transform: uppercase; margin-bottom: 6px; display: block;">Descrição</label>
                <input type="text" class="dre-form-control" id="dre-inp-desc" value="${line ? line.description : ''}" placeholder="Ex: (+) RECEITA BRUTA DE VENDAS, (-) Impostos">
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
                <div>
                    <label style="font-size: 11px; font-weight: 800; color: #8c8a82; text-transform: uppercase; margin-bottom: 6px; display: block;">Ordem</label>
                    <input type="number" class="dre-form-control" id="dre-inp-order" value="${line ? line.order : 1}">
                </div>
                <div>
                    <label style="font-size: 11px; font-weight: 800; color: #8c8a82; text-transform: uppercase; margin-bottom: 6px; display: block;">Aninhar Linha</label>
                    <select class="dre-form-control" id="dre-inp-parent">
                        ${parentOpts}
                    </select>
                </div>
            </div>

            <div>
                <label style="font-size: 11px; font-weight: 800; color: #8c8a82; text-transform: uppercase; margin-bottom: 6px; display: block;">Tipo de Informação</label>
                <select class="dre-form-control" id="dre-inp-type" onchange="toggleDreValueField(this.value)">
                    <option value="calculo" ${line && line.type === 'calculo' ? 'selected' : ''}>Cálculo</option>
                    <option value="receitas" ${line && line.type === 'receitas' ? 'selected' : ''}>Receitas</option>
                    <option value="despesas" ${line && line.type === 'despesas' ? 'selected' : ''}>Despesas</option>
                    <option value="compras_mercadorias" ${line && line.type === 'compras_mercadorias' ? 'selected' : ''}>Compras de Mercadorias</option>
                    <option value="somar" ${line && line.type === 'somar' ? 'selected' : ''}>Somar Filhos</option>
                    <option value="formas_pagamento" ${line && line.type === 'formas_pagamento' ? 'selected' : ''}>Formas Pagamento (Valor Lançado)</option>
                </select>
            </div>

            <!-- PAINEL DINÂMICO DE PLANO DE CONTAS (EXCLUSIVO VELO PREMIUM) -->
            <div id="dre-plano-contas-panel" style="display: ${line && ['receitas', 'despesas', 'compras_mercadorias'].includes(line.type) ? 'block' : 'none'}; border-top: 1px dashed #e5e3d9; padding-top: 14px; margin-top: 4px;">
                <div style="display: flex; gap: 10px; align-items: flex-end; margin-bottom: 12px;">
                    <div style="flex: 1;">
                        <label style="font-size: 11px; font-weight: 800; color: #8c8a82; text-transform: uppercase; margin-bottom: 6px; display: block;">Plano de contas.</label>
                        <select class="dre-form-control" id="dre-pc-select">
                            <!-- Opções populadas dinamicamente via JS -->
                        </select>
                    </div>
                    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-width: 80px;">
                        <label style="font-size: 10px; font-weight: 800; color: #8c8a82; text-transform: uppercase; margin-bottom: 6px;">Incluir Filhos?</label>
                        <input type="checkbox" id="dre-pc-include-children" style="width: 18px; height: 18px; cursor: pointer;">
                    </div>
                </div>

                <div style="display: flex; gap: 10px; align-items: flex-end; margin-bottom: 12px;">
                    <div style="flex: 1;">
                        <label style="font-size: 11px; font-weight: 800; color: #8c8a82; text-transform: uppercase; margin-bottom: 6px; display: block;">Tipo data</label>
                        <select class="dre-form-control" id="dre-pc-date-type">
                            <!-- Populado dinamicamente -->
                        </select>
                    </div>
                    <div style="flex: 1;">
                        <label style="font-size: 11px; font-weight: 800; color: #8c8a82; text-transform: uppercase; margin-bottom: 6px; display: block;">Tipo Valor</label>
                        <select class="dre-form-control" id="dre-pc-value-type">
                            <option value="Original">Original</option>
                            <option value="Pendente">Pendente</option>
                            <option value="Pago/Recebido">Pago/Recebido</option>
                            <option value="Estornado">Estornado</option>
                            <option value="Multa/Juros">Multa/Juros</option>
                            <option value="Desconto">Desconto</option>
                        </select>
                    </div>
                    <button class="dre-pill-btn primary" onclick="addDrePlanoContasRule(event)" style="padding: 10px 14px; border-radius: 8px;">
                        <i data-lucide="plus" style="width: 16px; height: 16px;"></i>
                    </button>
                </div>

                <!-- Tabela de Planos Vinculados -->
                <div style="border: 1px solid #dcdad0; border-radius: 8px; overflow: hidden; background: #fff; max-height: 200px; overflow-y: auto; margin-top: 10px;">
                    <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                        <thead>
                            <tr style="background: #f3f1e9; border-bottom: 1px solid #dcdad0; text-align: left;">
                                <th style="padding: 8px; font-weight: 800; color: #5c5a53;">Nome</th>
                                <th style="padding: 8px; font-weight: 800; color: #5c5a53;">Tp. Data</th>
                                <th style="padding: 8px; font-weight: 800; color: #5c5a53;">Tp. Valor</th>
                                <th style="padding: 8px; width: 40px; text-align: center;">Ativo</th>
                                <th style="padding: 8px; width: 40px; text-align: center;"></th>
                            </tr>
                        </thead>
                        <tbody id="dre-pc-rules-tbody">
                            <!-- Injetado dinamicamente -->
                        </tbody>
                    </table>
                </div>
            </div>

            <div style="border-top: 1px dashed #e5e3d9; padding-top: 16px; display: flex; flex-direction: column; gap: 12px; margin-top: 4px;">
                <label class="dre-checkbox-label">
                    <input type="checkbox" id="dre-chk-expanded" ${!line || line.expanded ? 'checked' : ''}>
                    <span>Iniciar Expandido</span>
                </label>
                <label class="dre-checkbox-label">
                    <input type="checkbox" id="dre-chk-bold" ${line && line.bold ? 'checked' : ''}>
                    <span>Negrito</span>
                </label>
                <label class="dre-checkbox-label">
                    <input type="checkbox" id="dre-chk-percent" ${!line || line.showPercent ? 'checked' : ''}>
                    <span>Exibir Percentual</span>
                </label>
            </div>

            <div style="border-top: 1px dashed #e5e3d9; padding-top: 16px; margin-top: 4px;">
                <label style="font-size: 11px; font-weight: 800; color: #8c8a82; text-transform: uppercase; margin-bottom: 6px; display: block;">Linha calculo (Valor linha / Valor Linha calculo * 100)</label>
                <select class="dre-form-control" id="dre-inp-calc-base">
                    ${baseLinesOpts}
                </select>
            </div>
        </div>
    `;

    // Inicializa a lista temporária de regras vinculadas ao componente
    window._tempDrePcRules = (line && line.planoContasRules) ? [...line.planoContasRules] : [];

    // Popula as opções do painel contábil
    populateDrePlanoContasOptions(line ? line.type : 'calculo');
    renderDrePlanoContasRulesTable();

    if (window.lucide) lucide.createIcons();
}

window.toggleDreValueField = function(valType) {
    const pcPanel = document.getElementById('dre-plano-contas-panel');
    if (pcPanel) {
        pcPanel.style.display = ['receitas', 'despesas', 'compras_mercadorias'].includes(valType) ? 'block' : 'none';
    }
    populateDrePlanoContasOptions(valType);
};

window.populateDrePlanoContasOptions = function(valType) {
    const pcSelect = document.getElementById('dre-pc-select');
    const dateSelect = document.getElementById('dre-pc-date-type');
    if (!pcSelect || !dateSelect) return;

    // Popula dropdown de Plano de Contas com base no Tipo de Informação
    let pcOpts = "";
    if (valType === 'receitas') {
        pcOpts = `
            <option value="RECEITAS">RECEITAS</option>
            <option value="RECEITA BRUTA DE VENDAS">RECEITA BRUTA DE VENDAS</option>
            <option value="Receitas Financeiras">Receitas Financeiras</option>
        `;
    } else if (valType === 'despesas') {
        pcOpts = `
            <option value="DESPESAS">DESPESAS</option>
            <option value="Despesas Administrativas">Despesas Administrativas</option>
            <option value="Despesas de Pessoal">Despesas de Pessoal</option>
            <option value="Despesas Tributárias">Despesas Tributárias</option>
        `;
    } else if (valType === 'compras_mercadorias') {
        pcOpts = `
            <option value="COMPRAS DE MERCADORIAS">COMPRAS DE MERCADORIAS</option>
            <option value="Custo de Mercadorias Vendidas (CMV)">Custo de Mercadorias Vendidas (CMV)</option>
        `;
    } else {
        pcOpts = `<option value="">—</option>`;
    }
    pcSelect.innerHTML = pcOpts;

    // Requisito especial: Compras de Mercadorias tem opções exclusivas de data
    let dateOpts = "";
    if (valType === 'compras_mercadorias') {
        dateOpts = `
            <option value="Emissão">Emissão</option>
            <option value="Data de finalização">Data de finalização</option>
        `;
    } else {
        dateOpts = `
            <option value="Registro">Registro</option>
            <option value="Emissão">Emissão</option>
            <option value="Vencimento">Vencimento</option>
            <option value="Recebimento/Pagamento">Recebimento/Pagamento</option>
        `;
    }
    dateSelect.innerHTML = dateOpts;
};

window.renderDrePlanoContasRulesTable = function() {
    const tbody = document.getElementById('dre-pc-rules-tbody');
    if (!tbody) return;

    const rules = window._tempDrePcRules || [];
    if (rules.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #8c8a82; padding: 12px;">Nenhum plano de contas vinculado.</td></tr>`;
        return;
    }

    tbody.innerHTML = rules.map(r => {
        const checked = r.active ? 'checked' : '';
        return `
            <tr style="border-bottom: 1px solid #f1efe8;">
                <td style="padding: 8px; font-weight: 700; color: #2c2b29;">${r.name}</td>
                <td style="padding: 8px; color: #5c5a53;">${r.tpData}</td>
                <td style="padding: 8px; color: #5c5a53;">${r.tpValor}</td>
                <td style="padding: 8px; text-align: center;">
                    <input type="checkbox" onchange="toggleDrePlanoContasRuleActive(${r.id}, this.checked)" ${checked} style="cursor: pointer;">
                </td>
                <td style="padding: 8px; text-align: center;">
                    <button class="action-btn-minimal" onclick="deleteDrePlanoContasRule(${r.id}, event)" style="padding: 2px;">
                        <i data-lucide="trash-2" style="width: 14px; height: 14px; color: #ef4444;"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');

    if (window.lucide) lucide.createIcons();
};

window.addDrePlanoContasRule = function(event) {
    if (event) event.preventDefault();

    const name = document.getElementById('dre-pc-select').value;
    const includeChildren = document.getElementById('dre-pc-include-children').checked;
    const tpData = document.getElementById('dre-pc-date-type').value;
    const tpValor = document.getElementById('dre-pc-value-type').value;

    if (!name) return alert('Por favor, selecione um plano de contas.');

    const newRule = {
        id: Date.now(),
        name: name + (includeChildren ? ' (Com Filhos)' : ''),
        tpData: tpData,
        tpValor: tpValor,
        active: true
    };

    window._tempDrePcRules.push(newRule);
    renderDrePlanoContasRulesTable();
};

window.deleteDrePlanoContasRule = function(id, event) {
    if (event) event.preventDefault();
    window._tempDrePcRules = window._tempDrePcRules.filter(r => r.id !== id);
    renderDrePlanoContasRulesTable();
};

window.toggleDrePlanoContasRuleActive = function(id, active) {
    window._tempDrePcRules = window._tempDrePcRules.map(r => {
        if (r.id === id) {
            return { ...r, active: active };
        }
        return r;
    });
};

window.clickDreNovaLinha = function() {
    _dreActiveLineId = null;
    const parentOpts = `
        <option value="">— Nenhuma (Linha Raiz) —</option>
        ${state.dreStructure.map(l => `<option value="${l.id}">${l.description}</option>`).join('')}
    `;
    renderDreLeftForm(null, parentOpts);
};

window.clearDreEditing = function() {
    clickDreNovaLinha();
};

window.clickDreGravar = function() {
    const desc = document.getElementById('dre-inp-desc').value.trim();
    if (!desc) return alert('Por favor, informe a descrição da linha.');

    const order = parseInt(document.getElementById('dre-inp-order').value) || 1;
    const parentIdVal = document.getElementById('dre-inp-parent').value;
    const parentId = parentIdVal ? parseInt(parentIdVal) : null;
    const type = document.getElementById('dre-inp-type').value;

    const pcRules = window._tempDrePcRules || [];

    // Calcula valor contábil simulado inteligente baseado nas regras ativas
    let val = 0.0;
    if (['receitas', 'despesas', 'compras_mercadorias'].includes(type)) {
        pcRules.forEach(r => {
            if (r.active) {
                if (r.name.includes('RECEITA BRUTA')) val += 55450.00;
                else if (r.name.includes('Mercadorias')) val += 38000.00;
                else if (r.name.includes('Serviços')) val += 17450.00;
                else if (r.name.includes('DESPESAS')) val += 9800.00;
                else if (r.name.includes('Administrativas')) val += 4500.00;
                else if (r.name.includes('Comerciais') || r.name.includes('Logística')) val += 3300.00;
                else if (r.name.includes('Pessoal') || r.name.includes('Salários') || r.name.includes('Pró-labore')) val += 2000.00;
                else if (r.name.includes('COMPRAS')) val += 15400.00;
                else if (r.name.includes('CMV')) val += 11200.00;
                else if (r.name.includes('CSP') || r.name.includes('Serviços Prestados')) val += 4200.00;
                else if (r.name.includes('Impostos') || r.name.includes('Deduções')) val += 5200.00;
                else if (r.name.includes('Tributárias') || r.name.includes('ICMS')) val += 3400.00;
                else if (r.name.includes('Devoluções')) val += 1800.00;
                else val += 1500.00; // valor padrão por regra
            }
        });
    } else {
        const valEl = document.getElementById('dre-inp-val');
        val = valEl ? parseFloat(valEl.value) || 0.0 : 0.0;
    }

    const calcBaseEl = document.getElementById('dre-inp-calc-base');
    const calcBaseId = calcBaseEl && calcBaseEl.value ? parseInt(calcBaseEl.value) : null;

    const expanded = document.getElementById('dre-chk-expanded').checked;
    const bold = document.getElementById('dre-chk-bold').checked;
    const showPercent = document.getElementById('dre-chk-percent').checked;

    if (_dreActiveLineId) {
        state.dreStructure = state.dreStructure.map(l => {
            if (l.id === _dreActiveLineId) {
                return { ...l, description: desc, order, parentId, type, val, expanded, bold, showPercent, planoContasRules: pcRules, linhaCalculoId: calcBaseId };
            }
            return l;
        });
    } else {
        const newLine = {
            id: Date.now(),
            parentId,
            description: desc,
            order,
            type,
            val,
            percent: 0.0,
            expanded,
            bold,
            showPercent,
            planoContasRules: pcRules,
            linhaCalculoId: calcBaseId
        };
        state.dreStructure.push(newLine);
        _dreActiveLineId = newLine.id;
    }

    saveLocalBackup();
    pushToServer({ dreStructure: state.dreStructure });
    renderReportDrePersonalizada(document.getElementById('content-area'));
};

window.editDreLine = function(id) {
    _dreActiveLineId = id;
    renderReportDrePersonalizada(document.getElementById('content-area'));
};

window.deleteDreLine = function(id, event) {
    if (event) event.stopPropagation();
    if (!confirm('Deseja realmente excluir esta linha e todas as suas subdivisões?')) return;

    function removeNode(nodeId) {
        state.dreStructure = state.dreStructure.filter(l => l.id !== nodeId);
        const children = state.dreStructure.filter(l => l.parentId === nodeId);
        children.forEach(c => removeNode(c.id));
    }

    removeNode(id);
    _dreActiveLineId = null;

    saveLocalBackup();
    pushToServer({ dreStructure: state.dreStructure });
    renderReportDrePersonalizada(document.getElementById('content-area'));
};

window.toggleDreNode = function(id, event) {
    if (event) event.stopPropagation();
    state.dreStructure = state.dreStructure.map(l => {
        if (l.id === id) {
            return { ...l, expanded: !l.expanded };
        }
        return l;
    });
    saveLocalBackup();
    renderReportDrePersonalizada(document.getElementById('content-area'));
};

function renderDreTreeTable() {
    const tbody = document.getElementById('dre-tree-tbody');
    if (!tbody) return;

    const list = state.dreStructure;
    const renderedRows = [];

    function buildTreeRows(parentId = null, depth = 0, isParentVisible = true) {
        if (!isParentVisible) return;

        const siblings = list.filter(l => l.parentId === parentId).sort((a,b) => a.order - b.order);

        siblings.forEach(node => {
            const hasChildren = list.some(l => l.parentId === node.id);
            const isRowBold = node.bold;
            const isRootNode = node.parentId === null;

            let rowClass = "dre-row";
            if (isRootNode) rowClass += " header-level";
            if (isRowBold && !isRootNode) rowClass += " bold-row";

            let indentHtml = "";
            for (let i = 0; i < depth; i++) {
                indentHtml += `<span class="dre-indent-guide"></span>`;
            }

            let toggleHtml = "";
            if (hasChildren) {
                const chevronIcon = node.expanded ? "chevron-down" : "chevron-right";
                toggleHtml = `<span class="dre-toggle-icon" onclick="toggleDreNode(${node.id}, event)"><i data-lucide="${chevronIcon}" style="width:14px; height:14px;"></i></span>`;
            } else {
                toggleHtml = `<span style="display:inline-block; width:24px;"></span>`;
            }

            // Novo parseamento de sinalização e badges contábeis
            let descText = node.description;
            let badgeHtml = "";
            if (descText.startsWith("(+)")) {
                badgeHtml = `<span class="dre-badge-indicator plus">+</span>`;
                descText = descText.replace("(+)", "").trim();
            } else if (descText.startsWith("(-)")) {
                badgeHtml = `<span class="dre-badge-indicator minus">-</span>`;
                descText = descText.replace("(-)", "").trim();
            } else if (descText.startsWith("(=)")) {
                badgeHtml = `<span class="dre-badge-indicator equals">=</span>`;
                descText = descText.replace("(=)", "").trim();
            }

            const isSelected = node.id === _dreActiveLineId ? 'style="background-color: #f1efe8; border-left: 4px solid #3b82f6;"' : '';
            const formatVal = node.val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

            // Barra de faturamento/percentual premium contábil
            let pctContent = "-";
            if (node.showPercent) {
                const fillCol = node.description.includes('(-)') ? '#ef4444' : '#3b82f6';
                pctContent = `
                    <div style="font-size:12px; font-weight:700; color:#5c5a53;">${node.percent.toFixed(2)}%</div>
                    <div class="dre-progress-bar-container">
                        <div class="dre-progress-fill" style="width: ${Math.min(100, Math.max(0, node.percent)) || 0}%; background: ${fillCol};"></div>
                    </div>
                `;
            }

            renderedRows.push(`
                <tr class="${rowClass}" ${isSelected} onclick="editDreLine(${node.id})">
                    <td class="desc-cell">
                        ${indentHtml}
                        ${toggleHtml}
                        ${badgeHtml}
                        <span style="letter-spacing: -0.01em;">${descText}</span>
                    </td>
                    <td class="val-cell">R$ ${formatVal}</td>
                    <td class="pct-cell">${pctContent}</td>
                    <td class="actions-cell">
                        <button class="action-btn-minimal edit" onclick="editDreLine(${node.id})" title="Editar linha">
                            <i data-lucide="edit-3" style="width: 14px; height: 14px;"></i>
                        </button>
                        <button class="action-btn-minimal" onclick="deleteDreLine(${node.id}, event)" title="Excluir linha">
                            <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>
                        </button>
                    </td>
                </tr>
            `);

            if (hasChildren && node.expanded) {
                buildTreeRows(node.id, depth + 1, true);
            }
        });
    }

    buildTreeRows(null, 0, true);

    tbody.innerHTML = renderedRows.join('');
    if (window.lucide) lucide.createIcons();
}

// ──────────────────────────────────────────
// NOVOS RELATÓRIOS FINANCEIROS (SIMPLIFICADOS)
// ──────────────────────────────────────────

window.renderReportFluxoCaixa = function(container) {
    container.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px; flex-wrap:wrap; gap:12px;">
            <div>
                <h3 style="font-weight:800; letter-spacing:-0.03em;">Fluxo de Caixa Simplificado</h3>
                <p style="font-size:13px; color:var(--text-sub); margin-top:4px;">Acompanhe as entradas e saídas previstas e consolidadas.</p>
            </div>
        </div>
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:20px; margin-bottom:28px;">
            <div class="rich-kpi-card">
                <span class="rich-kpi-title">Saldo Inicial consolidado</span>
                <span class="rich-kpi-value blue-foil">R$ 5.000,00</span>
                <div class="micro-emboss-stamp"><i data-lucide="wallet" style="width:16px; color:#1d4ed8;"></i></div>
            </div>
            <div class="rich-kpi-card">
                <span class="rich-kpi-title">Total de Entradas (Recebido)</span>
                <span class="rich-kpi-value green-foil">R$ 25.450,00</span>
                <div class="micro-emboss-stamp"><i data-lucide="trending-up" style="width:16px; color:#15803d;"></i></div>
            </div>
            <div class="rich-kpi-card">
                <span class="rich-kpi-title">Total de Saídas (Pago)</span>
                <span class="rich-kpi-value red-foil">R$ 14.150,00</span>
                <div class="micro-emboss-stamp"><i data-lucide="trending-down" style="width:16px; color:#b91c1c;"></i></div>
            </div>
            <div class="rich-kpi-card">
                <span class="rich-kpi-title">Saldo Final Previsto</span>
                <span class="rich-kpi-value green-foil" style="font-weight:900;">R$ 16.300,00</span>
                <div class="micro-emboss-stamp"><i data-lucide="check-circle" style="width:16px; color:#15803d;"></i></div>
            </div>
        </div>
        <div class="glass-card" style="padding:24px;">
            <h4 style="font-family:'Plus Jakarta Sans', sans-serif; font-size:14px; font-weight:800; color:#2c2b29; margin-bottom:16px; text-transform:uppercase; letter-spacing:0.02em;">Extrato do Período</h4>
            <table class="modern-table" style="margin:0;">
                <thead>
                    <tr>
                        <th>Data</th>
                        <th>Descrição / Categoria</th>
                        <th>Tipo</th>
                        <th style="text-align:right;">Valor (R$)</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td style="font-weight:700; color:var(--text-sub);">30/05/2026</td>
                        <td style="font-weight:800;">Saldo Inicial de Caixa</td>
                        <td style="font-weight:800; color:var(--brand);">SALDO</td>
                        <td style="text-align:right; font-weight:800; color:var(--brand);">R$ 5.000,00</td>
                    </tr>
                    <tr>
                        <td style="font-weight:700; color:var(--text-sub);">30/05/2026</td>
                        <td style="font-weight:800;">Recebimento de Vendas à vista (Caixa)</td>
                        <td style="font-weight:800; color:var(--success);">ENTRADA</td>
                        <td style="text-align:right; font-weight:800; color:var(--success);">R$ 12.350,00</td>
                    </tr>
                    <tr>
                        <td style="font-weight:700; color:var(--text-sub);">30/05/2026</td>
                        <td style="font-weight:800;">Recebimentos de Duplicatas</td>
                        <td style="font-weight:800; color:var(--success);">ENTRADA</td>
                        <td style="text-align:right; font-weight:800; color:var(--success);">R$ 8.500,00</td>
                    </tr>
                    <tr>
                        <td style="font-weight:700; color:var(--text-sub);">30/05/2026</td>
                        <td style="font-weight:800;">Pagamento de Fornecedores</td>
                        <td style="font-weight:800; color:var(--danger);">SAÍDA</td>
                        <td style="text-align:right; font-weight:800; color:var(--danger);">- R$ 6.200,00</td>
                    </tr>
                    <tr>
                        <td style="font-weight:700; color:var(--text-sub);">30/05/2026</td>
                        <td style="font-weight:800;">Despesas Operacionais do Período</td>
                        <td style="font-weight:800; color:var(--danger);">SAÍDA</td>
                        <td style="text-align:right; font-weight:800; color:var(--danger);">- R$ 4.500,00</td>
                    </tr>
                </tbody>
            </table>
        </div>
    `;
    if (window.lucide) lucide.createIcons();
};

window.renderReportPontoEquilibrio = function(container) {
    container.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px; flex-wrap:wrap; gap:12px;">
            <div>
                <h3 style="font-weight:800; letter-spacing:-0.03em;">Ponto de Equilíbrio</h3>
                <p style="font-size:13px; color:var(--text-sub); margin-top:4px;">Calcule o faturamento mínimo necessário para cobrir todos os custos.</p>
            </div>
        </div>
        <div style="display:grid; grid-template-columns:1fr 1.5fr; gap:24px; align-items:start;">
            <div class="rich-kpi-card" style="min-height:auto; padding:24px; display:flex; flex-direction:column; gap:16px;">
                <h4 style="font-family:'Plus Jakarta Sans', sans-serif; font-size:12px; font-weight:900; color:#5a5955; text-transform:uppercase; letter-spacing:0.08em; border-bottom:1px dashed #d5d3ca; padding-bottom:8px; margin:0;">Variáveis de Cálculo</h4>
                <div>
                    <label style="font-size:11px; font-weight:800; color:#8c8a82; text-transform:uppercase; margin-bottom:6px; display:block;">Custos Fixos Totais (R$)</label>
                    <input type="number" class="dre-form-control" id="pe-custo-fixo" value="14150.00" oninput="recalculatePE()">
                </div>
                <div>
                    <label style="font-size:11px; font-weight:800; color:#8c8a82; text-transform:uppercase; margin-bottom:6px; display:block;">Margem de Contribuição (%)</label>
                    <input type="number" class="dre-form-control" id="pe-margem" value="65.0" oninput="recalculatePE()">
                </div>
            </div>
            <div class="rich-kpi-card" style="min-height:220px; display:flex; flex-direction:column; justify-content:center; align-items:center; text-align:center; padding:32px;">
                <span class="rich-kpi-title" style="font-size:13px; margin-bottom:12px;">Faturamento Mínimo Necessário (Meta PE)</span>
                <span class="rich-kpi-value blue-foil" id="pe-resultado-faturamento" style="font-size:38px;">R$ 21.769,23</span>
                <p style="font-size:12px; color:var(--text-sub); max-width:320px; margin-top:16px; font-weight:600; line-height:1.5;">Com custos fixos de R$ <span id="lbl-custo-fixo">14.150,00</span> e margem de <span id="lbl-margem">65</span>%, sua empresa entra em ponto de equilíbrio ao faturar o valor acima.</p>
                <div class="micro-emboss-stamp" style="bottom:16px; right:16px;"><i data-lucide="scale" style="width:18px; color:#1d4ed8;"></i></div>
            </div>
        </div>
    `;
    
    window.recalculatePE = function() {
        const cf = parseFloat(document.getElementById('pe-custo-fixo').value) || 0;
        const mc = parseFloat(document.getElementById('pe-margem').value) || 0;
        const resEl = document.getElementById('pe-resultado-faturamento');
        const lblCf = document.getElementById('lbl-custo-fixo');
        const lblMc = document.getElementById('lbl-margem');
        
        if (resEl && lblCf && lblMc) {
            lblCf.innerText = cf.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            lblMc.innerText = mc.toFixed(1);
            if (mc > 0) {
                const pe = cf / (mc / 100);
                resEl.innerText = "R$ " + pe.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            } else {
                resEl.innerText = "R$ 0,00";
            }
        }
    };
    if (window.lucide) lucide.createIcons();
};

window.renderReportDreGerencial = function(container) {
    container.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px; flex-wrap:wrap; gap:12px;">
            <div>
                <h3 style="font-weight:800; letter-spacing:-0.03em;">DRE Gerencial</h3>
                <p style="font-size:13px; color:var(--text-sub); margin-top:4px;">Demonstrativo do Resultado do Exercício consolidado padrão.</p>
            </div>
        </div>
        <div class="dre-table-card">
            <table class="dre-tree-table">
                <thead>
                    <tr>
                        <th>Estrutura Gerencial</th>
                        <th style="width: 160px;">Valor (R$)</th>
                        <th style="width: 120px;">% da Receita</th>
                    </tr>
                </thead>
                <tbody>
                    <tr class="dre-row bold-row" style="background:#eae8df;">
                        <td class="desc-cell">(=) RECEITA BRUTA DE VENDAS</td>
                        <td class="val-cell">R$ 25.450,00</td>
                        <td class="pct-cell">100,00%</td>
                    </tr>
                    <tr class="dre-row">
                        <td class="desc-cell" style="padding-left:28px;">(-) Deduções e Impostos</td>
                        <td class="val-cell" style="color:var(--danger);">- R$ 2.150,00</td>
                        <td class="pct-cell">8,45%</td>
                    </tr>
                    <tr class="dre-row bold-row" style="background:#f5f4ed;">
                        <td class="desc-cell">(=) RECEITA LÍQUIDA DE VENDAS</td>
                        <td class="val-cell">R$ 23.300,00</td>
                        <td class="pct-cell">91,55%</td>
                    </tr>
                    <tr class="dre-row">
                        <td class="desc-cell" style="padding-left:28px;">(-) Custos dos Produtos Vendidos (CPV)</td>
                        <td class="val-cell" style="color:var(--danger);">- R$ 6.200,00</td>
                        <td class="pct-cell">24,36%</td>
                    </tr>
                    <tr class="dre-row bold-row" style="background:#f5f4ed;">
                        <td class="desc-cell">(=) LUCRO BRUTO</td>
                        <td class="val-cell">R$ 17.100,00</td>
                        <td class="pct-cell">67,19%</td>
                    </tr>
                    <tr class="dre-row">
                        <td class="desc-cell" style="padding-left:28px;">(-) Despesas Operacionais / Administrativas</td>
                        <td class="val-cell" style="color:var(--danger);">- R$ 4.500,00</td>
                        <td class="pct-cell">17,68%</td>
                    </tr>
                    <tr class="dre-row">
                        <td class="desc-cell" style="padding-left:28px;">(-) Salários e Encargos</td>
                        <td class="val-cell" style="color:var(--danger);">- R$ 1.300,00</td>
                        <td class="pct-cell">5,11%</td>
                    </tr>
                    <tr class="dre-row bold-row" style="background:#eae8df;">
                        <td class="desc-cell">(=) RESULTADO LÍQUIDO DO PERÍODO (LUCRO)</td>
                        <td class="val-cell" style="color:var(--success);">R$ 11.300,00</td>
                        <td class="pct-cell">44,40%</td>
                    </tr>
                </tbody>
            </table>
        </div>
    `;
    if (window.lucide) lucide.createIcons();
};

window.renderReportBalancoPatrimonial = function(container) {
    container.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px; flex-wrap:wrap; gap:12px;">
            <div>
                <h3 style="font-weight:800; letter-spacing:-0.03em;">Balanço Patrimonial</h3>
                <p style="font-size:13px; color:var(--text-sub); margin-top:4px;">Demonstrativo consolidado de Ativos, Passivos e Patrimônio Líquido.</p>
            </div>
            <div style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.2); color: #047857; font-size: 11px; font-weight: 800; padding: 6px 14px; border-radius: 20px; display: flex; align-items: center; gap: 6px;">
                <i data-lucide="check-circle" style="width: 14px;"></i> Equação Ativa: Ativo = Passivo + PL
            </div>
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:24px; align-items:start;">
            <!-- ATIVO (Aplicações de Recursos) -->
            <div class="dre-table-card">
                <table class="dre-tree-table">
                    <thead>
                        <tr>
                            <th>ATIVO (Bens e Direitos)</th>
                            <th style="width: 140px; text-align: right;">Valor (R$)</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr class="dre-row bold-row" style="background:#eae8df;">
                            <td class="desc-cell">1. ATIVO CIRCULANTE</td>
                            <td class="val-cell" style="text-align: right;">R$ 23.350,00</td>
                        </tr>
                        <tr class="dre-row">
                            <td class="desc-cell" style="padding-left:28px;">Disponibilidades (Caixa e Bancos)</td>
                            <td class="val-cell" style="text-align: right;">R$ 11.300,00</td>
                        </tr>
                        <tr class="dre-row">
                            <td class="desc-cell" style="padding-left:28px;">Contas a Receber (Clientes)</td>
                            <td class="val-cell" style="text-align: right;">R$ 8.550,00</td>
                        </tr>
                        <tr class="dre-row">
                            <td class="desc-cell" style="padding-left:28px;">Estoques de Mercadorias</td>
                            <td class="val-cell" style="text-align: right;">R$ 3.500,00</td>
                        </tr>
                        <tr class="dre-row bold-row" style="background:#eae8df;">
                            <td class="desc-cell">2. ATIVO NÃO CIRCULANTE (Realizável a Longo Prazo)</td>
                            <td class="val-cell" style="text-align: right;">R$ 15.000,00</td>
                        </tr>
                        <tr class="dre-row">
                            <td class="desc-cell" style="padding-left:28px;">Imobilizado (Equipamentos e Ti)</td>
                            <td class="val-cell" style="text-align: right;">R$ 15.000,00</td>
                        </tr>
                        <tr class="dre-row bold-row" style="background:#eae8df;">
                            <td class="desc-cell">TOTAL DO ATIVO</td>
                            <td class="val-cell" style="text-align: right; color:var(--brand); font-size:15px;">R$ 38.350,00</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <!-- PASSIVO & PL (Origem de Recursos) -->
            <div class="dre-table-card">
                <table class="dre-tree-table">
                    <thead>
                        <tr>
                            <th>PASSIVO & PATRIMÔNIO LÍQUIDO</th>
                            <th style="width: 140px; text-align: right;">Valor (R$)</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr class="dre-row bold-row" style="background:#eae8df;">
                            <td class="desc-cell">3. PASSIVO CIRCULANTE (Curto Prazo)</td>
                            <td class="val-cell" style="text-align: right;">R$ 10.750,00</td>
                        </tr>
                        <tr class="dre-row">
                            <td class="desc-cell" style="padding-left:28px;">Fornecedores a Pagar</td>
                            <td class="val-cell" style="text-align: right;">R$ 6.200,00</td>
                        </tr>
                        <tr class="dre-row">
                            <td class="desc-cell" style="padding-left:28px;">Obrigações Sociais (Salários)</td>
                            <td class="val-cell" style="text-align: right;">R$ 1.300,00</td>
                        </tr>
                        <tr class="dre-row">
                            <td class="desc-cell" style="padding-left:28px;">Obrigações Tributárias (Impostos)</td>
                            <td class="val-cell" style="text-align: right;">R$ 3.250,00</td>
                        </tr>
                        <tr class="dre-row bold-row" style="background:#eae8df;">
                            <td class="desc-cell">4. PASSIVO NÃO CIRCULANTE (Longo Prazo)</td>
                            <td class="val-cell" style="text-align: right;">R$ 3.000,00</td>
                        </tr>
                        <tr class="dre-row">
                            <td class="desc-cell" style="padding-left:28px;">Financiamentos e Empréstimos</td>
                            <td class="val-cell" style="text-align: right;">R$ 3.000,00</td>
                        </tr>
                        <tr class="dre-row bold-row" style="background:#f5f4ed;">
                            <td class="desc-cell">5. PATRIMÔNIO LÍQUIDO (Recursos Próprios)</td>
                            <td class="val-cell" style="text-align: right;">R$ 24.600,00</td>
                        </tr>
                        <tr class="dre-row">
                            <td class="desc-cell" style="padding-left:28px;">Capital Social Integralizado</td>
                            <td class="val-cell" style="text-align: right;">R$ 20.000,00</td>
                        </tr>
                        <tr class="dre-row">
                            <td class="desc-cell" style="padding-left:28px;">Lucros ou Prejuízos Acumulados</td>
                            <td class="val-cell" style="text-align: right; color:var(--success);">R$ 4.600,00</td>
                        </tr>
                        <tr class="dre-row bold-row" style="background:#eae8df;">
                            <td class="desc-cell">TOTAL DO PASSIVO E PL</td>
                            <td class="val-cell" style="text-align: right; color:var(--brand); font-size:15px;">R$ 38.350,00</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;
    if (window.lucide) lucide.createIcons();
};

// ==============================================================================
// ─── MÓDULO MATRIZ SWOT DINÂMICA (UI/UX PREMIUM VELO) ─────────────────────────
// ==============================================================================

// Estado de controle global para persistência dos dados da SWOT e Plano 5W2H
let swotState = {
    forcas: [
        { id: 'F1', texto: 'Marca tradicional consolidada fisicamente na região' },
        { id: 'F2', texto: 'Equipe de vendas altamente treinada e consultiva' }
    ],
    fraquezas: [
        { id: 'FR1', texto: 'Presença digital incipiente e e-commerce lento' },
        { id: 'FR2', texto: 'Dependência de terceiros para logística local' }
    ],
    oportunidades: [
        { id: 'O1', texto: 'Crescimento acelerado na demanda de entregas rápidas' },
        { id: 'O2', texto: 'Adoção de canais de compras digitais por novos públicos' }
    ],
    ameacas: [
        { id: 'A1', texto: 'Entrada de grande marketplace com entrega no mesmo dia' },
        { id: 'A2', texto: 'Alta volatilidade no custo de frete e insumos' }
    ],
    correlacoes: {
        'F1:O1': 1, 'F1:O2': 2, 'F1:A1': 1, 'F1:A2': 0,
        'F2:O1': 0, 'F2:O2': 2, 'F2:A1': 2, 'F2:A2': 0,
        'FR1:O1': 2, 'FR1:O2': 1, 'FR1:A1': 2, 'FR1:A2': 0,
        'FR2:O1': 2, 'FR2:O2': 0, 'FR2:A1': 1, 'FR2:A2': 1
    },
    planoAcao: [
        {
            id: 1,
            oQue: 'Desenvolver nova plataforma de e-commerce integrada',
            porQue: 'Superar a fraqueza de presença digital e capturar compras online',
            onde: 'Ambiente online e servidores internos',
            quem: 'Diretoria de Tecnologia e Agência Parceira',
            quando: '2026-07-30',
            como: 'Contratação de plataforma SaaS integrada via API ao ERP',
            quanto: 15000.00
        },
        {
            id: 2,
            oQue: 'Treinar equipe e contratar motoboys dedicados',
            porQue: 'Reduzir custos e acelerar prazos de entrega urbana',
            onde: 'CD Urbano da Unidade Centro',
            quem: 'Supervisor de Operações',
            quando: '2026-06-15',
            como: 'Roteirizador integrado e equipe exclusiva com taxa fixa',
            quanto: 2500.00
        }
    ]
};

// Funções utilitárias e globais de gerenciamento da SWOT
window.updateFactorText = function(type, id, value) {
    const list = swotState[type];
    if (list) {
        const item = list.find(x => x.id === id);
        if (item) {
            item.texto = value;
        }
    }
};

window.updateCorrelation = function(idInt, idExt, val) {
    const key = `${idInt}:${idExt}`;
    swotState.correlacoes[key] = parseInt(val) || 0;
    
    // Re-renderizar para calcular resultados de veredito
    const stage = document.getElementById('content-area');
    if (stage) renderSwot(stage);
};

window.addFactor = function(type) {
    const list = swotState[type];
    if (!list) return;
    
    let prefix = 'F';
    if (type === 'fraquezas') prefix = 'FR';
    if (type === 'oportunidades') prefix = 'O';
    if (type === 'ameacas') prefix = 'A';
    
    const nextNum = list.reduce((max, item) => {
        const num = parseInt(item.id.replace(prefix, '')) || 0;
        return num > max ? num : max;
    }, 0) + 1;
    
    const newId = `${prefix}${nextNum}`;
    list.push({ id: newId, texto: `Novo fator ${prefix}${nextNum}...` });
    
    // Inicializar correlações do cruzamento
    if (prefix === 'F' || prefix === 'FR') {
        swotState.oportunidades.forEach(o => { swotState.correlacoes[`${newId}:${o.id}`] = 0; });
        swotState.ameacas.forEach(a => { swotState.correlacoes[`${newId}:${a.id}`] = 0; });
    } else {
        swotState.forcas.forEach(f => { swotState.correlacoes[`${f.id}:${newId}`] = 0; });
        swotState.fraquezas.forEach(fr => { swotState.correlacoes[`${fr.id}:${newId}`] = 0; });
    }
    
    const stage = document.getElementById('content-area');
    if (stage) renderSwot(stage);
};

window.removeFactor = function(type, id) {
    swotState[type] = swotState[type].filter(item => item.id !== id);
    
    // Limpar correlações órfãs
    for (let key in swotState.correlacoes) {
        const parts = key.split(':');
        if (parts[0] === id || parts[1] === id) {
            delete swotState.correlacoes[key];
        }
    }
    
    const stage = document.getElementById('content-area');
    if (stage) renderSwot(stage);
};

window.addPlanoAcao = function() {
    const nextId = swotState.planoAcao.reduce((max, item) => item.id > max ? item.id : max, 0) + 1;
    
    // Tenta sugerir um verbo baseado no veredito atual
    const vereditoObj = getSwotVerdictData();
    let verboSugerido = 'Desenvolver';
    if (vereditoObj.veredito === 'Crescimento') verboSugerido = 'Expandir';
    if (vereditoObj.veredito === 'Manutenção') verboSugerido = 'Otimizar';
    if (vereditoObj.veredito === 'Sobrevivência') verboSugerido = 'Mitigar';
    
    swotState.planoAcao.push({
        id: nextId,
        oQue: verboSugerido + ' ',
        porQue: '',
        onde: '',
        quem: '',
        quando: getLocalDateString(),
        como: '',
        quanto: 0.00
    });
    
    const stage = document.getElementById('content-area');
    if (stage) renderSwot(stage);
};

window.removePlanoAcao = function(id) {
    swotState.planoAcao = swotState.planoAcao.filter(item => item.id !== id);
    const stage = document.getElementById('content-area');
    if (stage) renderSwot(stage);
};

window.updatePlanoAcaoText = function(id, field, value) {
    const item = swotState.planoAcao.find(p => p.id === id);
    if (item) {
        if (field === 'quanto') {
            const numeric = parseFloat(value.replace(/[^\d.-]/g, '')) || 0;
            item.quanto = numeric;
            // Atualizar o total de orçamento no badge em tempo real sem renderizar tudo
            const totalVal = swotState.planoAcao.reduce((acc, p) => acc + (p.quanto || 0), 0);
            const totalEl = document.getElementById('swot-plano-total-budget');
            if (totalEl) {
                totalEl.innerText = 'R$ ' + totalVal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            }
        } else {
            item[field] = value;
        }
    }
};

window.resetSwotMockData = function() {
    swotState = {
        forcas: [
            { id: 'F1', texto: 'Marca tradicional consolidada fisicamente na região' },
            { id: 'F2', texto: 'Equipe de vendas altamente treinada e consultiva' }
        ],
        fraquezas: [
            { id: 'FR1', texto: 'Presença digital incipiente e e-commerce lento' },
            { id: 'FR2', texto: 'Dependência de terceiros para logística local' }
        ],
        oportunidades: [
            { id: 'O1', texto: 'Crescimento acelerado na demanda de entregas rápidas' },
            { id: 'O2', texto: 'Adoção de canais de compras digitais por novos públicos' }
        ],
        ameacas: [
            { id: 'A1', texto: 'Entrada de grande marketplace com entrega no mesmo dia' },
            { id: 'A2', texto: 'Alta volatilidade no custo de frete e insumos' }
        ],
        correlacoes: {
            'F1:O1': 1, 'F1:O2': 2, 'F1:A1': 1, 'F1:A2': 0,
            'F2:O1': 0, 'F2:O2': 2, 'F2:A1': 2, 'F2:A2': 0,
            'FR1:O1': 2, 'FR1:O2': 1, 'FR1:A1': 2, 'FR1:A2': 0,
            'FR2:O1': 2, 'FR2:O2': 0, 'FR2:A1': 1, 'FR2:A2': 1
        },
        planoAcao: [
            {
                id: 1,
                oQue: 'Desenvolver nova plataforma de e-commerce integrada',
                porQue: 'Superar a fraqueza de presença digital e capturar compras online',
                onde: 'Ambiente online e servidores internos',
                quem: 'Diretoria de Tecnologia e Agência Parceira',
                quando: '2026-07-30',
                como: 'Contratação de plataforma SaaS integrada via API ao ERP',
                quanto: 15000.00
            },
            {
                id: 2,
                oQue: 'Treinar equipe e contratar motoboys dedicados',
                porQue: 'Reduzir custos e acelerar prazos de entrega urbana',
                onde: 'CD Urbano da Unidade Centro',
                quem: 'Supervisor de Operações',
                quando: '2026-06-15',
                como: 'Roteirizador integrado e equipe exclusiva com taxa fixa',
                quanto: 2500.00
            }
        ]
    };
    const stage = document.getElementById('content-area');
    if (stage) renderSwot(stage);
};

// Retorna as somas dos quadrantes e o posicionamento final
function getSwotVerdictData() {
    const { forcas, fraquezas, oportunidades, ameacas, correlacoes } = swotState;
    
    // Soma FO: Capacidade Ofensiva
    const FO = forcas.reduce((soma, f) => soma + oportunidades.reduce((s, o) => s + (correlacoes[`${f.id}:${o.id}`] || 0), 0), 0);
    // Soma FA: Capacidade Defensiva
    const FA = forcas.reduce((soma, f) => soma + ameacas.reduce((s, a) => s + (correlacoes[`${f.id}:${a.id}`] || 0), 0), 0);
    // Soma DO: Vulnerabilidades a Desenvolver
    const DO = fraquezas.reduce((soma, fr) => soma + oportunidades.reduce((s, o) => s + (correlacoes[`${fr.id}:${o.id}`] || 0), 0), 0);
    // Soma DA: Sobrevivência Crítica
    const DA = fraquezas.reduce((soma, fr) => soma + ameacas.reduce((s, a) => s + (correlacoes[`${fr.id}:${a.id}`] || 0), 0), 0);
    
    const maxPoints = Math.max(FO, FA, DO, DA);
    let veredito = 'Desenvolvimento';
    let verdictClass = 'state-desenvolvimento';
    let verdictText = '';
    
    if (maxPoints === 0) {
        veredito = 'Desenvolvimento';
        verdictClass = 'state-desenvolvimento';
        verdictText = 'Aguardando preenchimento. Atribua notas de correlação nas células de interseção (0, 1 ou 2) para obter o veredito especializado da consultoria humana.';
    } else if (maxPoints === FO) {
        veredito = 'Crescimento';
        verdictClass = 'state-crescimento';
        verdictText = 'Cenário estratégico de Crescimento. Suas Forças internas estão altamente alinhadas com as Oportunidades externas. A recomendação da consultoria é investir agressivamente em expansão comercial, novos mercados e escala.';
    } else if (maxPoints === DO) {
        veredito = 'Desenvolvimento';
        verdictClass = 'state-desenvolvimento';
        verdictText = 'Cenário estratégico de Desenvolvimento. O mercado está gerando Oportunidades valiosas, porém as Fraquezas internas impedem seu aproveitamento pleno. A prioridade máxima é sanar essas falhas e desenvolver novas capacidades antes de expandir.';
    } else if (maxPoints === FA) {
        veredito = 'Manutenção';
        verdictClass = 'state-manutencao';
        verdictText = 'Cenário estratégico de Manutenção. Suas Forças são importantes para blindar o negócio, mas o ambiente externo apresenta Ameaças severas. Foque em blindagem de clientes tradicionais, eficiência de processos e sustentabilidade financeira.';
    } else {
        veredito = 'Sobrevivência';
        verdictClass = 'state-sobrevivencia';
        verdictText = 'Cenário de alto risco de Sobrevivência. Suas Fraquezas críticas internas o deixam extremamente vulnerável a Ameaças do mercado (como a forte concorrência digital). Prioridade absoluta para desinvestimentos, cortes profundos e contingenciamento.';
    }
    
    return { FO, FA, DO, DA, veredito, verdictClass, verdictText };
}

// Renderiza a célula de correlação discreta estilo planilha
function renderCorrelationCell(idInt, idExt) {
    const key = `${idInt}:${idExt}`;
    const valor = swotState.correlacoes[key] !== undefined ? swotState.correlacoes[key] : 0;
    
    let cellClass = 'swot-cell-zero';
    if (valor == 1) cellClass = 'swot-cell-low';
    if (valor == 2) cellClass = 'swot-cell-high';
    
    const isInternoFraqueza = idInt.startsWith('FR');
    const isExternoAmeaca = idExt.startsWith('A');
    
    if (valor > 0) {
        if (isInternoFraqueza || isExternoAmeaca) {
            cellClass += ' swot-risk-tone'; // terracota fosco
        } else {
            cellClass += ' swot-opportunity-tone'; // verde-oliva fosco
        }
    }
    
    return `
        <td class="swot-matrix-cell ${cellClass}">
            <select class="swot-select-note" onchange="updateCorrelation('${idInt}', '${idExt}', this.value)">
                <option value="0" ${valor == 0 ? 'selected' : ''}>0</option>
                <option value="1" ${valor == 1 ? 'selected' : ''}>1</option>
                <option value="2" ${valor == 2 ? 'selected' : ''}>2</option>
            </select>
        </td>
    `;
}

// Função de renderização principal da seção "Matriz SWOT Dinâmica"
window.renderSwot = function(container) {
    const { forcas, fraquezas, oportunidades, ameacas, planoAcao } = swotState;
    const verdictData = getSwotVerdictData();
    const totalBudget = planoAcao.reduce((acc, p) => acc + (p.quanto || 0), 0);
    
    container.innerHTML = `
        <style>
            /* Estilos premium encapsulados localmente para a SWOT VELO */
            .swot-container-wrapper {
                display: flex;
                flex-direction: column;
                gap: 28px;
                font-family: 'Outfit', sans-serif;
                color: var(--text-main);
                animation: swotFadeIn 0.25s ease-out;
            }
            @keyframes swotFadeIn {
                from { opacity: 0; transform: translateY(8px); }
                to { opacity: 1; transform: translateY(0); }
            }
            .swot-section-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                flex-wrap: wrap;
                gap: 12px;
                margin-bottom: 4px;
            }
            .swot-section-title {
                font-weight: 800;
                letter-spacing: -0.03em;
                margin: 0;
            }
            .swot-section-subtitle {
                font-size: 13px;
                color: var(--text-sub);
                margin-top: 4px;
            }
            
            /* Tabela de Preenchimento Excel Premium */
            .swot-excel-wrapper {
                background: var(--surface);
                border-radius: var(--radius-lg);
                border: 1px solid var(--border-med);
                box-shadow: var(--shadow-soft);
                padding: 24px;
                overflow: hidden;
            }
            .swot-scrollable-table {
                overflow-x: auto;
                max-width: 100%;
                scrollbar-width: thin;
                scrollbar-color: var(--border-med) transparent;
            }
            .swot-scrollable-table::-webkit-scrollbar { height: 6px; }
            .swot-scrollable-table::-webkit-scrollbar-thumb { background: var(--border-med); border-radius: 4px; }
            .swot-excel-grid {
                width: 100%;
                border-collapse: collapse;
                font-size: 13px;
                table-layout: fixed;
            }
            .swot-excel-grid th, .swot-excel-grid td {
                border: 1px solid var(--border-soft);
                padding: 6px 10px;
                height: 48px;
                vertical-align: middle;
            }
            .swot-corner-cell {
                background: var(--accent);
                width: 250px;
                min-width: 250px;
                position: sticky;
                left: 0;
                z-index: 3;
                border-right: 2px solid var(--border-med) !important;
            }
            .swot-corner-split {
                display: flex;
                flex-direction: column;
                font-weight: 800;
                font-size: 10px;
                color: var(--text-sub);
                text-transform: uppercase;
                letter-spacing: 0.05em;
                gap: 2px;
            }
            .swot-header-group {
                font-weight: 800;
                text-transform: uppercase;
                font-size: 11px;
                letter-spacing: 0.08em;
                text-align: center;
                color: white;
            }
            .swot-header-group.group-opp {
                background: #102a43; /* Azul profundo texturizado */
            }
            .swot-header-group.group-thr {
                background: #334e68; /* Azul cinza premium */
            }
            .swot-col-header {
                background: #fbfbfd;
                width: 180px;
                min-width: 180px;
                text-align: left;
            }
            .swot-row-header {
                background: #fbfbfd;
                font-weight: 700;
                width: 250px;
                min-width: 250px;
                position: sticky;
                left: 0;
                z-index: 2;
                border-right: 2px solid var(--border-med) !important;
            }
            body.dark-mode .swot-corner-cell { background: #2c2c35; border-right: 2px solid var(--border-soft) !important; }
            body.dark-mode .swot-row-header { background: #232329; border-right: 2px solid var(--border-soft) !important; }
            body.dark-mode .swot-col-header { background: #232329; }
            .swot-header-input-wrap {
                display: flex;
                align-items: center;
                gap: 8px;
                position: relative;
                width: 100%;
            }
            .swot-factor-tag {
                font-size: 9px;
                font-weight: 900;
                padding: 2px 5px;
                border-radius: 4px;
                color: white;
                font-family: monospace;
                flex-shrink: 0;
            }
            .swot-factor-tag.str { background: #4c6a48; }  /* Verde-oliva fosco */
            .swot-factor-tag.weak { background: #a34c4c; } /* Terracota fosco */
            .swot-factor-tag.opp { background: #2d3748; }  /* Grafite */
            .swot-factor-tag.thr { background: #4a5568; }  /* Grafite claro */
            .swot-in-grid-input {
                background: transparent;
                border: none;
                outline: none;
                font-family: inherit;
                font-size: 12px;
                font-weight: 600;
                color: var(--text-main);
                width: 100%;
                padding: 4px;
                border-radius: 4px;
                transition: background 0.15s;
            }
            .swot-in-grid-input:focus {
                background: rgba(37, 99, 235, 0.05);
                box-shadow: inset 0 0 0 1px var(--brand);
            }
            .swot-remove-factor-btn {
                position: absolute;
                right: 0;
                background: transparent;
                border: none;
                color: var(--text-sub);
                cursor: pointer;
                font-size: 10px;
                opacity: 0;
                transition: opacity 0.2s, color 0.2s;
            }
            .swot-header-input-wrap:hover .swot-remove-factor-btn {
                opacity: 0.6;
            }
            .swot-remove-factor-btn:hover {
                color: var(--danger) !important;
                opacity: 1 !important;
            }
            
            /* Notas na Planilha */
            .swot-matrix-cell {
                text-align: center;
                padding: 0 !important;
                position: relative;
                background: var(--surface);
                transition: all 0.2s;
            }
            .swot-select-note {
                width: 100%;
                height: 100%;
                background: transparent;
                border: none;
                outline: none;
                font-size: 13px;
                font-weight: 800;
                text-align: center;
                text-align-last: center;
                cursor: pointer;
                color: var(--text-main);
                padding: 10px;
            }
            .swot-cell-zero { background: transparent; }
            .swot-cell-low.swot-opportunity-tone { background: rgba(76, 106, 72, 0.08); }
            .swot-cell-high.swot-opportunity-tone { background: rgba(76, 106, 72, 0.2); }
            .swot-cell-low.swot-risk-tone { background: rgba(163, 76, 76, 0.08); }
            .swot-cell-high.swot-risk-tone { background: rgba(163, 76, 76, 0.2); }
            
            /* Ações da Planilha */
            .swot-actions-toolbar {
                display: flex;
                gap: 12px;
                margin-top: 16px;
                flex-wrap: wrap;
            }
            .swot-pill-btn {
                font-family: 'Plus Jakarta Sans', sans-serif;
                font-size: 10.5px;
                font-weight: 800;
                text-transform: uppercase;
                letter-spacing: 0.05em;
                padding: 8px 14px;
                border-radius: 20px;
                border: 1px solid var(--border-med);
                background: var(--surface);
                color: var(--text-sub);
                cursor: pointer;
                transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                display: flex;
                align-items: center;
                gap: 6px;
                box-shadow: var(--shadow-soft);
            }
            .swot-pill-btn:hover {
                transform: translateY(-1px);
                box-shadow: 0 4px 6px rgba(0,0,0,0.05);
                color: var(--text-main);
                background: var(--accent);
            }
            .swot-pill-btn.str:hover { border-color: #4c6a48; color: #4c6a48; }
            .swot-pill-btn.weak:hover { border-color: #a34c4c; color: #a34c4c; }
            .swot-pill-btn.opp:hover { border-color: var(--brand); color: var(--brand); }
            .swot-pill-btn.thr:hover { border-color: #4a5568; color: #4a5568; }
            
            /* Etapa 2: Painel Tátil & Veredito */
            .swot-result-layout {
                display: grid;
                grid-template-columns: 1fr 1.6fr;
                gap: 24px;
                align-items: stretch;
            }
            @media (max-width: 1024px) {
                .swot-result-layout { grid-template-columns: 1fr; }
            }
            .swot-metrics-card {
                background: linear-gradient(135deg, #ffffff 0%, #f7f6f2 100%);
                border: 1px solid var(--border-med);
                border-bottom: 3.5px solid var(--border-med);
                border-radius: var(--radius-lg);
                padding: 24px;
                display: flex;
                flex-direction: column;
                justify-content: center;
                gap: 20px;
                box-shadow: var(--shadow-soft);
            }
            body.dark-mode .swot-metrics-card {
                background: linear-gradient(135deg, #232329 0%, #1a1a20 100%);
                border-bottom-color: var(--border-soft);
            }
            .swot-metric-row {
                display: flex;
                align-items: center;
                justify-content: space-between;
                border-bottom: 1px dashed var(--border-soft);
                padding-bottom: 14px;
            }
            .swot-metric-row:last-child {
                border-bottom: none;
                padding-bottom: 0;
            }
            .swot-metric-info {
                display: flex;
                flex-direction: column;
                gap: 4px;
            }
            .swot-metric-label {
                font-size: 11px;
                font-weight: 800;
                color: var(--text-sub);
                text-transform: uppercase;
                letter-spacing: 0.08em;
            }
            .swot-metric-desc {
                font-size: 11px;
                color: var(--text-sub);
                opacity: 0.8;
            }
            .swot-metric-value {
                font-size: 32px;
                font-weight: 900;
                font-family: 'Plus Jakarta Sans', sans-serif;
                letter-spacing: -0.05em;
            }
            .swot-metric-value.ofensiva { color: #2563eb; }
            .swot-metric-value.defensiva { color: #4c6a48; }
            
            .swot-verdict-card {
                background: linear-gradient(135deg, #ffffff 0%, #faf9f6 100%);
                border: 1px solid var(--border-med);
                border-bottom: 5px solid #1e293b;
                border-radius: var(--radius-lg);
                padding: 28px;
                position: relative;
                overflow: hidden;
                box-shadow: 0 10px 25px -5px rgba(0,0,0,0.03), var(--shadow-soft);
                display: flex;
                flex-direction: column;
                gap: 14px;
                justify-content: space-between;
            }
            body.dark-mode .swot-verdict-card {
                background: linear-gradient(135deg, #232329 0%, #1c1c22 100%);
            }
            .swot-verdict-card.state-desenvolvimento { border-bottom-color: #3b82f6; }
            .swot-verdict-card.state-crescimento { border-bottom-color: #4c6a48; }
            .swot-verdict-card.state-manutencao { border-bottom-color: #d97706; }
            .swot-verdict-card.state-sobrevivencia { border-bottom-color: #a34c4c; }
            
            .swot-verdict-badge {
                align-self: flex-start;
                font-size: 10px;
                font-weight: 900;
                letter-spacing: 0.12em;
                text-transform: uppercase;
                padding: 4px 10px;
                border-radius: 12px;
                background: var(--accent);
                color: var(--text-sub);
            }
            .swot-verdict-title {
                font-size: 20px;
                font-weight: 900;
                text-transform: uppercase;
                letter-spacing: 0.08em;
                color: var(--text-main);
                line-height: 1.1;
                margin-top: 4px;
            }
            .swot-verdict-text {
                font-size: 13px;
                line-height: 1.6;
                color: var(--text-main);
                opacity: 0.95;
            }
            .swot-verdict-footer {
                border-top: 1px solid var(--border-soft);
                padding-top: 12px;
                display: flex;
                align-items: center;
                gap: 8px;
                font-size: 10.5px;
                font-weight: 800;
                text-transform: uppercase;
                letter-spacing: 0.05em;
                color: var(--text-sub);
            }
            
            /* Etapa 3: Plano de Ação 5W2H */
            .swot-5w2h-card {
                background: var(--surface);
                border-radius: var(--radius-lg);
                border: 1px solid var(--border-med);
                box-shadow: var(--shadow-soft);
                padding: 24px;
            }
            .swot-5w2h-title-wrap {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 20px;
                flex-wrap: wrap;
                gap: 12px;
            }
            .swot-total-budget-badge {
                background: rgba(37, 99, 235, 0.06);
                border: 1px solid rgba(37, 99, 235, 0.15);
                color: var(--brand);
                font-family: 'Plus Jakarta Sans', sans-serif;
                font-weight: 900;
                font-size: 13.5px;
                padding: 6px 16px;
                border-radius: 20px;
            }
            .swot-5w2h-table-wrap {
                overflow-x: auto;
                max-width: 100%;
                scrollbar-width: thin;
                scrollbar-color: var(--border-med) transparent;
            }
            .swot-5w2h-table {
                width: 100%;
                border-collapse: collapse;
                font-size: 12.5px;
            }
            .swot-5w2h-table th {
                background: #1e2a38;
                color: white;
                font-size: 9.5px;
                font-weight: 800;
                text-transform: uppercase;
                letter-spacing: 0.08em;
                padding: 10px 12px;
                border: 1px solid #2d3748;
                text-align: left;
            }
            .swot-5w2h-table td {
                border: 1px solid var(--border-soft);
                padding: 4px;
                background: var(--surface);
            }
            .swot-5w2h-input {
                width: 100%;
                border: none;
                outline: none;
                background: transparent;
                padding: 8px;
                font-family: inherit;
                font-size: 12px;
                font-weight: 600;
                color: var(--text-main);
                border-radius: 4px;
                transition: background 0.15s;
            }
            .swot-5w2h-input:focus {
                background: rgba(37, 99, 235, 0.05);
                box-shadow: inset 0 0 0 1px var(--brand);
            }
            .swot-5w2h-input.num-field {
                text-align: right;
                font-family: 'Plus Jakarta Sans', sans-serif;
                font-weight: 700;
            }
            .swot-5w2h-delete-btn {
                background: transparent;
                border: none;
                color: var(--text-sub);
                cursor: pointer;
                padding: 6px;
                border-radius: 4px;
                transition: all 0.15s;
                display: flex;
                align-items: center;
                justify-content: center;
                width: 28px;
                height: 28px;
                margin: 0 auto;
            }
            .swot-5w2h-delete-btn:hover {
                color: var(--danger);
                background: rgba(220, 38, 38, 0.06);
            }
            .swot-btn-pill-add {
                background: var(--brand);
                color: white;
                font-family: 'Plus Jakarta Sans', sans-serif;
                font-size: 11.5px;
                font-weight: 800;
                text-transform: uppercase;
                letter-spacing: 0.08em;
                padding: 10px 20px;
                border-radius: 30px;
                border: none;
                cursor: pointer;
                box-shadow: 0 4px 10px rgba(37, 99, 235, 0.15);
                transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                display: flex;
                align-items: center;
                gap: 8px;
                margin-top: 16px;
            }
            .swot-btn-pill-add:hover {
                background: var(--brand-light);
                transform: translateY(-1px);
                box-shadow: 0 6px 14px rgba(37, 99, 235, 0.22);
            }
        </style>
        
        <div class="swot-container-wrapper">
            <!-- Cabeçalho -->
            <div class="swot-section-header">
                <div>
                    <h3 class="swot-section-title">Análise SWOT Dinâmica</h3>
                    <p class="swot-section-subtitle">Matriz quantitativa de impactos estratégicos e planos de ação integrados</p>
                </div>
                <button class="swot-pill-btn" onclick="resetSwotMockData()">
                    <i data-lucide="refresh-cw" style="width:13px;height:13px;"></i>
                    <span>Reiniciar Cenário Exemplo</span>
                </button>
            </div>
            
            <!-- ETAPA 1: Grade de Preenchimento -->
            <div class="swot-excel-wrapper">
                <div style="font-size:11px;font-weight:800;color:var(--text-sub);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:12px;display:flex;align-items:center;gap:6px;">
                    <i data-lucide="grid" style="width:14px;height:14px;"></i>
                    <span>Etapa 1: Cruzamento de Correlações (Estilo Excel)</span>
                </div>
                <div class="swot-scrollable-table">
                    <table class="swot-excel-grid">
                        <thead>
                            <tr>
                                <th rowspan="2" class="swot-corner-cell">
                                    <div class="swot-corner-split">
                                        <span>Externo →</span>
                                        <span>↓ Interno</span>
                                    </div>
                                </th>
                                <th colspan="${oportunidades.length}" class="swot-header-group group-opp">Oportunidades (Ambiente Externo)</th>
                                <th colspan="${ameacas.length}" class="swot-header-group group-thr">Ameaças (Ambiente Externo)</th>
                            </tr>
                            <tr>
                                ${oportunidades.map(o => `
                                    <th class="swot-col-header">
                                        <div class="swot-header-input-wrap">
                                            <span class="swot-factor-tag opp" title="Oportunidade">O${o.id.replace('O','')}</span>
                                            <input type="text" class="swot-in-grid-input" value="${o.texto}" oninput="updateFactorText('oportunidades', '${o.id}', this.value)" placeholder="Digite a oportunidade...">
                                            <button class="swot-remove-factor-btn" onclick="removeFactor('oportunidades', '${o.id}')" title="Excluir Oportunidade">✕</button>
                                        </div>
                                    </th>
                                `).join('')}
                                ${ameacas.map(a => `
                                    <th class="swot-col-header">
                                        <div class="swot-header-input-wrap">
                                            <span class="swot-factor-tag thr" title="Ameaça">A${a.id.replace('A','')}</span>
                                            <input type="text" class="swot-in-grid-input" value="${a.texto}" oninput="updateFactorText('ameacas', '${a.id}', this.value)" placeholder="Digite a ameaça...">
                                            <button class="swot-remove-factor-btn" onclick="removeFactor('ameacas', '${a.id}')" title="Excluir Ameaça">✕</button>
                                        </div>
                                    </th>
                                `).join('')}
                            </tr>
                        </thead>
                        <tbody>
                            <!-- Seção de Forças -->
                            ${forcas.map(f => `
                                <tr>
                                    <td class="swot-row-header">
                                        <div class="swot-header-input-wrap">
                                            <span class="swot-factor-tag str" title="Força">F${f.id.replace('F','')}</span>
                                            <input type="text" class="swot-in-grid-input" value="${f.texto}" oninput="updateFactorText('forcas', '${f.id}', this.value)" placeholder="Digite a força...">
                                            <button class="swot-remove-factor-btn" onclick="removeFactor('forcas', '${f.id}')" title="Excluir Força">✕</button>
                                        </div>
                                    </td>
                                    ${oportunidades.map(o => renderCorrelationCell(f.id, o.id)).join('')}
                                    ${ameacas.map(a => renderCorrelationCell(f.id, a.id)).join('')}
                                </tr>
                            `).join('')}
                            
                            <!-- Seção de Fraquezas -->
                            ${fraquezas.map(fr => `
                                <tr>
                                    <td class="swot-row-header">
                                        <div class="swot-header-input-wrap">
                                            <span class="swot-factor-tag weak" title="Fraqueza">FR${fr.id.replace('FR','')}</span>
                                            <input type="text" class="swot-in-grid-input" value="${fr.texto}" oninput="updateFactorText('fraquezas', '${fr.id}', this.value)" placeholder="Digite a fraqueza...">
                                            <button class="swot-remove-factor-btn" onclick="removeFactor('fraquezas', '${fr.id}')" title="Excluir Fraqueza">✕</button>
                                        </div>
                                    </td>
                                    ${oportunidades.map(o => renderCorrelationCell(fr.id, o.id)).join('')}
                                    ${ameacas.map(a => renderCorrelationCell(fr.id, a.id)).join('')}
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
                
                <!-- Ações da Barra -->
                <div class="swot-actions-toolbar">
                    <button class="swot-pill-btn str" onclick="addFactor('forcas')">
                        <i data-lucide="plus" style="width:12px;height:12px;"></i> Força (F)
                    </button>
                    <button class="swot-pill-btn weak" onclick="addFactor('fraquezas')">
                        <i data-lucide="plus" style="width:12px;height:12px;"></i> Fraqueza (FR)
                    </button>
                    <button class="swot-pill-btn opp" onclick="addFactor('oportunidades')">
                        <i data-lucide="plus" style="width:12px;height:12px;"></i> Oportunidade (O)
                    </button>
                    <button class="swot-pill-btn thr" onclick="addFactor('ameacas')">
                        <i data-lucide="plus" style="width:12px;height:12px;"></i> Ameaça (A)
                    </button>
                </div>
            </div>
            
            <!-- ETAPA 2: Painel de Resultados & Veredito -->
            <div class="swot-result-layout">
                <!-- Capacidades -->
                <div class="swot-metrics-card">
                    <div style="font-size:10px;font-weight:900;color:var(--text-sub);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:-4px;display:flex;align-items:center;gap:6px;">
                        <i data-lucide="bar-chart-2" style="width:14px;height:14px;"></i>
                        <span>Cálculos Estratégicos</span>
                    </div>
                    <div class="swot-metric-row">
                        <div class="swot-metric-info">
                            <span class="swot-metric-label">Capacidade Ofensiva</span>
                            <span class="swot-metric-desc">Forças aproveitando Oportunidades</span>
                        </div>
                        <span class="swot-metric-value ofensiva">${verdictData.FO}</span>
                    </div>
                    <div class="swot-metric-row">
                        <div class="swot-metric-info">
                            <span class="swot-metric-label">Capacidade Defensiva</span>
                            <span class="swot-metric-desc">Forças blindando contra Ameaças</span>
                        </div>
                        <span class="swot-metric-value defensiva">${verdictData.FA}</span>
                    </div>
                </div>
                
                <!-- O Veredito de Luxo -->
                <div class="swot-verdict-card ${verdictData.verdictClass}">
                    <div class="swot-verdict-stamp">
                        <i data-lucide="shield-check" style="width:110px;height:110px;color:var(--text-main);opacity:0.25;"></i>
                    </div>
                    <span class="swot-verdict-badge">Veredito Velo Consultoria</span>
                    <div>
                        <h4 class="swot-verdict-title">Predominância: ${verdictData.veredito}</h4>
                        <p class="swot-verdict-text" style="margin-top:10px;">${verdictData.verdictText}</p>
                    </div>
                    <div class="swot-verdict-footer">
                        <i data-lucide="award" style="width:14px;height:14px;color:var(--brand);"></i>
                        <span>Análise Quantitativa Autenticada</span>
                    </div>
                </div>
            </div>
            
            <!-- ETAPA 3: Gerador de Plano de Ação 5W2H -->
            <div class="swot-5w2h-card">
                <div class="swot-5w2h-title-wrap">
                    <div>
                        <h4 style="font-weight:800;letter-spacing:-0.02em;margin:0;display:flex;align-items:center;gap:8px;">
                            <i data-lucide="list-todo" style="color:var(--brand);width:18px;height:18px;"></i>
                            <span>Etapa 3: Plano de Ação Estratégico (Metodologia 5W2H)</span>
                        </h4>
                        <p style="font-size:12px;color:var(--text-sub);margin-top:4px;">Gere e edite planos de ação alinhados com o diagnóstico de ${verdictData.veredito.toLowerCase()}</p>
                    </div>
                    <div class="swot-total-budget-badge">
                        <span>Orçamento Acumulado: </span>
                        <span id="swot-plano-total-budget">R$ ${totalBudget.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                </div>
                
                <div class="swot-5w2h-table-wrap">
                    <table class="swot-5w2h-table">
                        <thead>
                            <tr>
                                <th style="width:25%;">O Que Fazer (What)</th>
                                <th style="width:20%;">Por Quê (Why)</th>
                                <th style="width:13%;">Onde (Where)</th>
                                <th style="width:13%;">Quem (Who)</th>
                                <th style="width:10%;">Quando (When)</th>
                                <th style="width:14%;">Como (How)</th>
                                <th style="width:11%;text-align:right;">Quanto (How Much)</th>
                                <th style="width:40px;"></th>
                            </tr>
                        </thead>
                        <tbody>
                            ${planoAcao.length > 0 ? planoAcao.map(p => `
                                <tr>
                                    <td>
                                        <input type="text" class="swot-5w2h-input" value="${p.oQue}" oninput="updatePlanoAcaoText(${p.id}, 'oQue', this.value)" placeholder="Verbo no infinitivo...">
                                    </td>
                                    <td>
                                        <input type="text" class="swot-5w2h-input" value="${p.porQue}" oninput="updatePlanoAcaoText(${p.id}, 'porQue', this.value)" placeholder="Motivação da ação...">
                                    </td>
                                    <td>
                                        <input type="text" class="swot-5w2h-input" value="${p.onde}" oninput="updatePlanoAcaoText(${p.id}, 'onde', this.value)" placeholder="Local ou setor...">
                                    </td>
                                    <td>
                                        <input type="text" class="swot-5w2h-input" value="${p.quem}" oninput="updatePlanoAcaoText(${p.id}, 'quem', this.value)" placeholder="Responsável...">
                                    </td>
                                    <td>
                                        <input type="date" class="swot-5w2h-input" value="${p.quando}" oninput="updatePlanoAcaoText(${p.id}, 'quando', this.value)">
                                    </td>
                                    <td>
                                        <input type="text" class="swot-5w2h-input" value="${p.como}" oninput="updatePlanoAcaoText(${p.id}, 'como', this.value)" placeholder="Passo a passo...">
                                    </td>
                                    <td>
                                        <input type="text" class="swot-5w2h-input num-field" value="${p.quanto.toFixed(2)}" onblur="this.value = parseFloat(this.value.replace(/[^\\d.-]/g, '') || 0).toFixed(2)" oninput="updatePlanoAcaoText(${p.id}, 'quanto', this.value)" placeholder="0.00">
                                    </td>
                                    <td>
                                        <button class="swot-5w2h-delete-btn" onclick="removePlanoAcao(${p.id})" title="Excluir Linha">
                                            <i data-lucide="trash-2" style="width:14px;height:14px;"></i>
                                        </button>
                                    </td>
                                </tr>
                            `).join('') : `
                                <tr>
                                    <td colspan="8" style="text-align:center;padding:32px;color:var(--text-sub);font-weight:600;">
                                        Nenhuma ação estratégica definida. Clique no botão abaixo para planejar.
                                    </td>
                                </tr>
                            `}
                        </tbody>
                    </table>
                </div>
                
                <button class="swot-btn-pill-add" onclick="addPlanoAcao()">
                    <i data-lucide="plus" style="width:14px;height:14px;"></i>
                    <span>Adicionar Ação 5W2H</span>
                </button>
            </div>
        </div>
    `;
    
    // Recriar ícones do Lucide
    if (window.lucide) {
        lucide.createIcons();
    }
};

// ==============================================================================
// ─── MÓDULO PLANO DE AÇÃO E CRONOGRAMA TÁTICO (UI/UX PREMIUM VELO) ────────────
// ==============================================================================

// Estado de controle global para persistência dos dados do Plano de Ação Estratégico
let actionPlanState = {
    macroobjetivo: "Incremento de Ticket Médio",
    status: "Em execução",
    mesAtivo: "Maio",
    notasDiagnostico: "• Treinamento da equipe comercial pendente de aplicação prática nos caixas.\n• Baixo reforço de marca nos pontos de contato secundários.\n• Ruído detectado nas auditorias de campo no checkout mobile.",
    sazonais: {
        "Janeiro": { experiencia: "Resoluções de Ano Novo (Brindes)", campanha: "Liquidação Geral de Verão" },
        "Fevereiro": { experiencia: "Esquenta de Carnaval (Acessórios)", campanha: "Volta às Aulas Especiais" },
        "Março": { experiencia: "Dia do Consumidor (Mimos VIP)", campanha: "Lançamento da Coleção de Outono" },
        "Abril": { experiencia: "Estações de Páscoa (Brindes)", campanha: "Semana Especial de Páscoa" },
        "Maio": { experiencia: "Estação de Fotos & Flores (Mães)", campanha: "Campanha Integrada Dia das Mães" },
        "Junho": { experiencia: "Cabines de Fotos do Amor", campanha: "Semana dos Namorados" },
        "Julho": { experiencia: "Cacau Quente Cortesia no Caixa", campanha: "Grandes Liquidações de Inverno" },
        "Agosto": { experiencia: "Estação de Gravação e Brindes (Pais)", campanha: "Especial Dia dos Pais" },
        "Setembro": { experiencia: "Semana da Pátria (Decoração)", campanha: "Semanas da Beleza / Boti Promo" },
        "Outubro": { experiencia: "Doce ou Travessura (Brinquedos)", campanha: "Semana das Crianças" },
        "Novembro": { experiencia: "Checkouts Express e Brindes", campanha: "Novembro Black / Black Friday" },
        "Dezembro": { experiencia: "Visita de Papai Noel & Embrulhos", campanha: "Natal e Grandes Festas" }
    },
    acoes: {
        "Maio": [
            {
                id: 1,
                oQue: "Treinar a equipe de atendimento em Omnichannel",
                porQue: "Superar o gap de treinamento e elevar a conversão física",
                onde: "Sala de Convenções e Plataforma EAD",
                quem: "Gerência Comercial",
                quando: "2026-05-15",
                como: "Workshop prático com simulações de vendas e roleplay",
                quanto: 2500.00,
                kpi: "Taxa de Conversão"
            },
            {
                id: 2,
                oQue: "Instalar displays aromáticos na entrada da loja física",
                porQue: "Reforçar a identidade de marca e engajamento sensorial",
                onde: "Entrada e provadores",
                quem: "Visual Merchandising",
                quando: "2026-05-10",
                como: "Instalação de difusores automáticos programados",
                quanto: 800.00,
                kpi: "ROI"
            }
        ],
        "Junho": [
            {
                id: 3,
                oQue: "Criar kits de presentes combinados para o Dia dos Namorados",
                porQue: "Elevar o ticket médio induzindo cross-selling",
                onde: "Área de caixas e gôndolas promocionais",
                quem: "Equipe de Produto",
                quando: "2026-06-05",
                como: "Montagem de caixas exclusivas com descontos progressivos nos combos",
                quanto: 1500.00,
                kpi: "LTV"
            }
        ],
        "Novembro": [
            {
                id: 4,
                oQue: "Configurar hotsite exclusivo de Black Friday com contagem regressiva",
                porQue: "Acelerar a conversão de leads frios com urgência visual",
                onde: "Ambiente Web",
                quem: "TI & Marketing Digital",
                quando: "2026-11-20",
                como: "Landing page SaaS otimizada e integrada ao banco de dados",
                quanto: 4500.00,
                kpi: "CAC"
            }
        ]
    }
};

// Funções globais de controle e reatividade do Plano de Ação
window.changeActionPlanMonth = function(mes) {
    actionPlanState.mesAtivo = mes;
    const stage = document.getElementById('content-area');
    if (stage) renderActionPlan(stage);
};

window.updateMacroobjetivo = function(val) {
    actionPlanState.macroobjetivo = val;
};

window.updateActionPlanStatus = function(val) {
    actionPlanState.status = val;
    
    // Atualiza a tag de status na tela sem precisar de re-render completo
    const badge = document.getElementById('swot-status-badge');
    if (badge) {
        badge.className = 'action-status-tag ' + (val === 'Em execução' ? 'tag-execucao' : val === 'Concluído' ? 'tag-concluido' : 'tag-atrasado');
        badge.innerText = val;
    }
};

window.updateDiagnosticoText = function(val) {
    actionPlanState.notasDiagnostico = val;
};

window.openNewActionModal = function() {
    const modal = document.getElementById('action-plan-modal');
    if (modal) modal.classList.add('active');
};

window.closeNewActionModal = function() {
    const modal = document.getElementById('action-plan-modal');
    if (modal) modal.classList.remove('active');
};

window.saveNewAction = function(event) {
    if (event) event.preventDefault();
    
    const oQue = document.getElementById('modal-ap-oque').value.trim();
    const porQue = document.getElementById('modal-ap-porque').value.trim();
    const onde = document.getElementById('modal-ap-onde').value.trim();
    const quem = document.getElementById('modal-ap-quem').value.trim();
    const quando = document.getElementById('modal-ap-quando').value;
    const como = document.getElementById('modal-ap-como').value.trim();
    const quantoRaw = document.getElementById('modal-ap-quanto').value;
    const kpi = document.getElementById('modal-ap-kpi').value;
    
    if (!oQue) {
        alert('Por favor, informe a descrição da ação estratégica (O Que Fazer).');
        return;
    }
    
    const quanto = parseFloat(quantoRaw.replace(/[^\d.-]/g, '')) || 0;
    const mes = actionPlanState.mesAtivo;
    
    if (!actionPlanState.acoes[mes]) {
        actionPlanState.acoes[mes] = [];
    }
    
    // Gerar maior ID
    let maxId = 0;
    for (let m in actionPlanState.acoes) {
        actionPlanState.acoes[m].forEach(a => {
            if (a.id > maxId) maxId = a.id;
        });
    }
    
    actionPlanState.acoes[mes].push({
        id: maxId + 1,
        oQue,
        porQue,
        onde,
        quem,
        quando: quando || getLocalDateString(),
        como,
        quanto,
        kpi
    });
    
    closeNewActionModal();
    
    const stage = document.getElementById('content-area');
    if (stage) renderActionPlan(stage);
};

window.deleteActionPlanItem = function(id) {
    const mes = actionPlanState.mesAtivo;
    if (actionPlanState.acoes[mes]) {
        actionPlanState.acoes[mes] = actionPlanState.acoes[mes].filter(a => a.id !== id);
    }
    
    const stage = document.getElementById('content-area');
    if (stage) renderActionPlan(stage);
};

window.updateActionInGridText = function(id, field, value) {
    const mes = actionPlanState.mesAtivo;
    if (actionPlanState.acoes[mes]) {
        const item = actionPlanState.acoes[mes].find(a => a.id === id);
        if (item) {
            if (field === 'quanto') {
                const numeric = parseFloat(value.replace(/[^\d.-]/g, '')) || 0;
                item.quanto = numeric;
                
                // Recalcula totalizador na DOM
                const mesAcoes = actionPlanState.acoes[mes] || [];
                const total = mesAcoes.reduce((acc, a) => acc + (a.quanto || 0), 0);
                const totalEl = document.getElementById('ap-total-budget-label');
                if (totalEl) {
                    totalEl.innerText = 'R$ ' + total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                }
            } else {
                item[field] = value;
            }
        }
    }
};

window.resetActionPlanMockData = function() {
    actionPlanState = {
        macroobjetivo: "Incremento de Ticket Médio",
        status: "Em execução",
        mesAtivo: "Maio",
        notasDiagnostico: "• Treinamento da equipe comercial pendente de aplicação prática nos caixas.\n• Baixo reforço de marca nos pontos de contato secundários.\n• Ruído detectado nas auditorias de campo no checkout mobile.",
        sazonais: {
            "Janeiro": { experiencia: "Resoluções de Ano Novo (Brindes)", campanha: "Liquidação Geral de Verão" },
            "Fevereiro": { experiencia: "Esquenta de Carnaval (Acessórios)", campanha: "Volta às Aulas Especiais" },
            "Março": { experiencia: "Dia do Consumidor (Mimos VIP)", campanha: "Lançamento da Coleção de Outono" },
            "Abril": { experiencia: "Estações de Páscoa (Brindes)", campanha: "Semana Especial de Páscoa" },
            "Maio": { experiencia: "Estação de Fotos & Flores (Mães)", campanha: "Campanha Integrada Dia das Mães" },
            "Junho": { experiencia: "Cabines de Fotos do Amor", campanha: "Semana dos Namorados" },
            "Julho": { experiencia: "Cacau Quente Cortesia no Caixa", campanha: "Grandes Liquidações de Inverno" },
            "Agosto": { experiencia: "Estação de Gravação e Brindes (Pais)", campanha: "Especial Dia dos Pais" },
            "Setembro": { experiencia: "Semana da Pátria (Decoração)", campanha: "Semanas da Beleza / Boti Promo" },
            "Outubro": { experiencia: "Doce ou Travessura (Brinquedos)", campanha: "Semana das Crianças" },
            "Novembro": { experiencia: "Checkouts Express e Brindes", campanha: "Novembro Black / Black Friday" },
            "Dezembro": { experiencia: "Visita de Papai Noel & Embrulhos", campanha: "Natal e Grandes Festas" }
        },
        acoes: {
            "Maio": [
                {
                    id: 1,
                    oQue: "Treinar a equipe de atendimento em Omnichannel",
                    porQue: "Superar o gap de treinamento e elevar a conversão física",
                    onde: "Sala de Convenções e Plataforma EAD",
                    quem: "Gerência Comercial",
                    quando: "2026-05-15",
                    como: "Workshop prático com simulações de vendas e roleplay",
                    quanto: 2500.00,
                    kpi: "Taxa de Conversão"
                },
                {
                    id: 2,
                    oQue: "Instalar displays aromáticos na entrada da loja física",
                    porQue: "Reforçar a identidade de marca e engajamento sensorial",
                    onde: "Entrada e provadores",
                    quem: "Visual Merchandising",
                    quando: "2026-05-10",
                    como: "Instalação de difusores automáticos programados",
                    quanto: 800.00,
                    kpi: "ROI"
                }
            ],
            "Junho": [
                {
                    id: 3,
                    oQue: "Criar kits de presentes combinados para o Dia dos Namorados",
                    porQue: "Elevar o ticket médio induzindo cross-selling",
                    onde: "Área de caixas e gôndolas promocionais",
                    quem: "Equipe de Produto",
                    quando: "2026-06-05",
                    como: "Montagem de caixas exclusivas com descontos progressivos nos combos",
                    quanto: 1500.00,
                    kpi: "LTV"
                }
            ],
            "Novembro": [
                {
                    id: 4,
                    oQue: "Configurar hotsite exclusivo de Black Friday com contagem regressiva",
                    porQue: "Acelerar a conversão de leads frios com urgência visual",
                    onde: "Ambiente Web",
                    quem: "TI & Marketing Digital",
                    quando: "2026-11-20",
                    como: "Landing page SaaS otimizada e integrada ao banco de dados",
                    quanto: 4500.00,
                    kpi: "CAC"
                }
            ]
        }
    };
    const stage = document.getElementById('content-area');
    if (stage) renderActionPlan(stage);
};

// Renderização principal do Plano de Ação Estratégico
window.renderActionPlan = function(container) {
    const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    const { macroobjetivo, status, mesAtivo, sazonais, acoes, notasDiagnostico } = actionPlanState;
    
    const mesAcoes = acoes[mesAtivo] || [];
    const totalBudget = mesAcoes.reduce((acc, a) => acc + (a.quanto || 0), 0);
    const sazonaisAtivas = sazonais[mesAtivo] || { experiencia: "Nenhuma ativação mapeada", campanha: "Sem campanha especial" };
    
    container.innerHTML = `
        <style>
            /* Estilos sofisticados locais do Plano de Ação VELO */
            .ap-main-grid {
                display: grid;
                grid-template-columns: 1fr 280px;
                gap: 24px;
                font-family: 'Outfit', sans-serif;
                color: var(--text-main);
                animation: apFadeIn 0.25s cubic-bezier(0.4, 0, 0.2, 1);
            }
            @keyframes apFadeIn {
                from { opacity: 0; transform: translateY(8px); }
                to { opacity: 1; transform: translateY(0); }
            }
            @media (max-width: 1024px) {
                .ap-main-grid { grid-template-columns: 1fr; }
            }
            
            .ap-primary-col {
                display: flex;
                flex-direction: column;
                gap: 24px;
            }
            
            /* Painel Superior / Cabeçalho */
            .ap-header-card {
                background: var(--surface);
                border: 1px solid var(--border-med);
                border-radius: var(--radius-lg);
                padding: 20px 24px;
                display: flex;
                align-items: center;
                justify-content: space-between;
                flex-wrap: wrap;
                gap: 16px;
                box-shadow: var(--shadow-soft);
            }
            .ap-macro-selector-wrap {
                display: flex;
                flex-direction: column;
                gap: 6px;
                min-width: 280px;
            }
            .ap-select-control {
                padding: 10px 14px;
                border: 1px solid var(--border-med);
                border-radius: var(--radius-md);
                font-size: 13px;
                font-weight: 700;
                background: var(--surface);
                color: var(--text-main);
                cursor: pointer;
                outline: none;
                transition: border-color 0.2s;
            }
            .ap-select-control:focus {
                border-color: var(--brand);
            }
            
            /* Status do Planejamento */
            .ap-status-card-wrap {
                display: flex;
                align-items: center;
                gap: 12px;
                background: var(--accent);
                padding: 10px 18px;
                border-radius: var(--radius-lg);
                border: 1px solid var(--border-soft);
            }
            .action-status-tag {
                font-size: 10.5px;
                font-weight: 900;
                text-transform: uppercase;
                letter-spacing: 0.08em;
                padding: 4px 10px;
                border-radius: 12px;
                color: white;
            }
            .action-status-tag.tag-execucao { background: #4c6a48; } /* verde-oliva fosco */
            .action-status-tag.tag-concluido { background: #1e3a8a; } /* azul premium */
            .action-status-tag.tag-atrasado { background: #a34c4c; }  /* terracota fosco */
            
            /* Linha do Tempo Mensal */
            .ap-timeline-wrapper {
                background: var(--surface);
                border: 1px solid var(--border-med);
                border-radius: var(--radius-lg);
                padding: 24px;
                box-shadow: var(--shadow-soft);
            }
            .ap-months-scroll {
                display: flex;
                gap: 8px;
                overflow-x: auto;
                padding-bottom: 12px;
                scrollbar-width: thin;
                scrollbar-color: var(--border-med) transparent;
            }
            .ap-months-scroll::-webkit-scrollbar { height: 4px; }
            .ap-months-scroll::-webkit-scrollbar-thumb { background: var(--border-med); border-radius: 4px; }
            
            .ap-month-btn {
                padding: 10px 18px;
                border-radius: var(--radius-md);
                border: 1px solid transparent;
                background: transparent;
                color: var(--text-sub);
                font-size: 12.5px;
                font-weight: 800;
                cursor: pointer;
                transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                white-space: nowrap;
            }
            .ap-month-btn:hover {
                background: var(--accent);
                color: var(--text-main);
            }
            .ap-month-btn.active {
                background: var(--surface);
                border-color: var(--border-med);
                color: var(--text-main);
                box-shadow: 0 4px 10px -2px rgba(27,26,24,0.06), var(--shadow-soft);
                transform: translateY(-1px);
            }
            
            /* Ativações do Mês */
            .ap-activation-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 16px;
                margin-top: 20px;
                border-top: 1px dashed var(--border-soft);
                padding-top: 16px;
            }
            @media (max-width: 600px) {
                .ap-activation-grid { grid-template-columns: 1fr; }
            }
            .ap-activation-card {
                background: var(--accent);
                border: 1px solid var(--border-soft);
                border-radius: var(--radius-md);
                padding: 14px 16px;
                display: flex;
                align-items: center;
                gap: 12px;
            }
            .ap-activation-icon {
                width: 38px;
                height: 38px;
                background: var(--surface);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                color: var(--brand);
                flex-shrink: 0;
                box-shadow: inset 0 1px 2px rgba(0,0,0,0.03);
            }
            .ap-activation-info {
                display: flex;
                flex-direction: column;
                gap: 2px;
            }
            .ap-activation-label {
                font-size: 10px;
                font-weight: 900;
                color: var(--text-sub);
                text-transform: uppercase;
                letter-spacing: 0.05em;
            }
            .ap-activation-value {
                font-size: 12px;
                font-weight: 700;
                color: var(--text-main);
            }
            
            /* Tabela 5W2H Clássica Refinada */
            .ap-table-card {
                background: var(--surface);
                border: 1px solid var(--border-med);
                border-radius: var(--radius-lg);
                padding: 24px;
                box-shadow: var(--shadow-soft);
            }
            .ap-table-title-bar {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 20px;
                flex-wrap: wrap;
                gap: 12px;
            }
            .ap-table-scroll {
                overflow-x: auto;
                max-width: 100%;
                scrollbar-width: thin;
                scrollbar-color: var(--border-med) transparent;
            }
            .ap-table-scroll::-webkit-scrollbar { height: 6px; }
            .ap-table-scroll::-webkit-scrollbar-thumb { background: var(--border-med); border-radius: 4px; }
            
            .ap-execution-table {
                width: 100%;
                border-collapse: collapse;
                font-size: 12.5px;
            }
            .ap-execution-table th {
                background: #102a43; /* Azul profundo fosco */
                color: white;
                font-size: 9.5px;
                font-weight: 800;
                text-transform: uppercase;
                letter-spacing: 0.08em;
                padding: 12px 14px;
                border: 1px solid #193e60;
                text-align: left;
            }
            .ap-execution-table td {
                border: 1px solid var(--border-soft);
                padding: 4px;
                background: var(--surface);
            }
            .ap-grid-input {
                width: 100%;
                border: none;
                outline: none;
                background: transparent;
                padding: 8px;
                font-family: inherit;
                font-size: 12px;
                font-weight: 600;
                color: var(--text-main);
                border-radius: 4px;
                transition: background 0.15s;
            }
            .ap-grid-input:focus {
                background: rgba(37, 99, 235, 0.05);
                box-shadow: inset 0 0 0 1px var(--brand);
            }
            .ap-grid-input.num-field {
                text-align: right;
                font-family: 'Plus Jakarta Sans', sans-serif;
                font-weight: 700;
            }
            
            /* KPI Tag */
            .ap-kpi-badge {
                font-size: 9px;
                font-weight: 900;
                text-transform: uppercase;
                letter-spacing: 0.05em;
                padding: 4px 8px;
                border-radius: 6px;
                color: white;
                display: inline-block;
                text-align: center;
                font-family: monospace;
            }
            .kpi-cac { background: #a34c4c; } /* terracota */
            .kpi-roi { background: #4c6a48; } /* verde-oliva */
            .kpi-ltv { background: #1e3a8a; } /* azul premium */
            .kpi-conv { background: #5a5955; } /* grafite */
            .kpi-nps { background: #b87333; } /* cobre fosco */
            
            .ap-delete-btn {
                background: transparent;
                border: none;
                color: var(--text-sub);
                cursor: pointer;
                padding: 6px;
                border-radius: 4px;
                transition: all 0.15s;
                display: flex;
                align-items: center;
                justify-content: center;
                width: 28px;
                height: 28px;
                margin: 0 auto;
            }
            .ap-delete-btn:hover {
                color: var(--danger);
                background: rgba(220, 38, 38, 0.06);
            }
            
            /* Notas de Diagnóstico (Coluna da Direita) */
            .ap-diagnostico-card {
                background: linear-gradient(135deg, #ffffff 0%, #faf9f6 100%);
                border: 1px solid var(--border-med);
                border-bottom: 5px solid #8c8273; /* Cor areia quente */
                border-radius: var(--radius-lg);
                padding: 24px;
                box-shadow: var(--shadow-soft);
                display: flex;
                flex-direction: column;
                gap: 16px;
                align-self: start;
            }
            body.dark-mode .ap-diagnostico-card {
                background: linear-gradient(135deg, #232329 0%, #1c1c22 100%);
                border-bottom-color: var(--border-soft);
            }
            .ap-diagnostico-title {
                font-size: 11px;
                font-weight: 900;
                color: var(--text-sub);
                text-transform: uppercase;
                letter-spacing: 0.08em;
                margin: 0;
            }
            .ap-diagnostico-textarea {
                width: 100%;
                min-height: 180px;
                background: transparent;
                border: none;
                outline: none;
                font-family: inherit;
                font-size: 12.5px;
                line-height: 1.6;
                color: #55534f;
                font-weight: 500;
                resize: vertical;
                padding: 6px;
                border-radius: 6px;
            }
            body.dark-mode .ap-diagnostico-textarea { color: #c4c2bc; }
            .ap-diagnostico-textarea:focus {
                background: rgba(140, 130, 115, 0.04);
                box-shadow: inset 0 0 0 1px var(--border-med);
            }
            
            /* Modal / Gaveta de Criação */
            .ap-modal-overlay {
                position: fixed;
                top: 0; left: 0; right: 0; bottom: 0;
                background: rgba(0,0,0,0.4);
                display: none;
                align-items: center;
                justify-content: center;
                z-index: 1000;
                backdrop-filter: blur(2px);
                animation: modalFadeIn 0.2s ease-out;
            }
            .ap-modal-overlay.active { display: flex; }
            @keyframes modalFadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            .ap-modal-card {
                background: var(--surface);
                border-radius: var(--radius-lg);
                width: 650px;
                max-width: 90vw;
                box-shadow: var(--shadow-bold);
                border: 1px solid var(--border-med);
                overflow: hidden;
            }
            .ap-modal-header {
                padding: 16px 24px;
                border-bottom: 1px solid var(--border-soft);
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            .ap-modal-body {
                padding: 24px;
            }
            .ap-modal-footer {
                padding: 16px 24px;
                background: var(--bg-app);
                border-top: 1px solid var(--border-soft);
                display: flex;
                justify-content: flex-end;
                gap: 12px;
            }
        </style>
        
        <div class="ap-main-grid">
            <!-- Coluna Principal (Esquerda) -->
            <div class="ap-primary-col">
                <!-- Cabeçalho de Seleção -->
                <div class="ap-header-card">
                    <div class="ap-macro-selector-wrap">
                        <span class="ap-activation-label" style="color:var(--text-sub);">Foco Estratégico (Macroobjetivo)</span>
                        <select class="ap-select-control" onchange="updateMacroobjetivo(this.value)">
                            <option value="Incremento de Ticket Médio" ${macroobjetivo === 'Incremento de Ticket Médio' ? 'selected' : ''}>Incremento de Ticket Médio</option>
                            <option value="Conversão de Leads" ${macroobjetivo === 'Conversão de Leads' ? 'selected' : ''}>Conversão de Leads</option>
                            <option value="Captação de Clientes" ${macroobjetivo === 'Captação de Clientes' ? 'selected' : ''}>Captação de Clientes</option>
                            <option value="Desenvolvimento e Manutenção (Retenção)" ${macroobjetivo === 'Desenvolvimento e Manutenção (Retenção)' ? 'selected' : ''}>Desenvolvimento e Manutenção (Retenção)</option>
                        </select>
                    </div>
                    
                    <div class="ap-status-card-wrap">
                        <span class="ap-activation-label" style="margin-bottom:0;">Status:</span>
                        <div id="swot-status-badge" class="action-status-tag ${status === 'Em execução' ? 'tag-execucao' : status === 'Concluído' ? 'tag-concluido' : 'tag-atrasado'}">${status}</div>
                        <select class="ap-select-control" style="padding: 4px 8px; font-size:11px; font-weight:800; text-transform:uppercase;" onchange="updateActionPlanStatus(this.value)">
                            <option value="Em execução" ${status === 'Em execução' ? 'selected' : ''}>Em Execução</option>
                            <option value="Concluído" ${status === 'Concluído' ? 'selected' : ''}>Concluído</option>
                            <option value="Atrasado" ${status === 'Atrasado' ? 'selected' : ''}>Atrasado</option>
                        </select>
                    </div>
                </div>
                
                <!-- Linha do Tempo Mensal -->
                <div class="ap-timeline-wrapper">
                    <span class="ap-activation-label" style="display:block; margin-bottom:12px; font-size:10px; font-weight:900;">
                        <i data-lucide="calendar" style="width:12px;height:12px;vertical-align:middle;margin-right:4px;"></i> Cronograma Tático Anual
                    </span>
                    <div class="ap-months-scroll">
                        ${meses.map(m => `
                            <button class="ap-month-btn ${m === mesAtivo ? 'active' : ''}" onclick="changeActionPlanMonth('${m}')">${m}</button>
                        `).join('')}
                    </div>
                    
                    <!-- Ativações do Mês Selecionado -->
                    <div class="ap-activation-grid">
                        <div class="ap-activation-card">
                            <div class="ap-activation-icon">
                                <i data-lucide="sparkles" style="width:16px;height:16px;"></i>
                            </div>
                            <div class="ap-activation-info">
                                <span class="ap-activation-label">Ativação de Experiência</span>
                                <span class="ap-activation-value">${sazonaisAtivas.experiencia}</span>
                            </div>
                        </div>
                        
                        <div class="ap-activation-card">
                            <div class="ap-activation-icon">
                                <i data-lucide="megaphone" style="width:16px;height:16px;"></i>
                            </div>
                            <div class="ap-activation-info">
                                <span class="ap-activation-label">Campanha Sazonal</span>
                                <span class="ap-activation-value">${sazonaisAtivas.campanha}</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Grade de Ações 5W2H -->
                <div class="ap-table-card">
                    <div class="ap-table-title-bar">
                        <div>
                            <h4 style="font-weight:800;letter-spacing:-0.02em;margin:0;display:flex;align-items:center;gap:8px;">
                                <i data-lucide="check-square" style="color:var(--brand);width:18px;height:18px;"></i>
                                <span>Grade de Execução (${mesAtivo})</span>
                            </h4>
                            <p style="font-size:12px;color:var(--text-sub);margin-top:4px;">Metodologia 5W2H integrada aos indicadores chave de controle</p>
                        </div>
                        <div class="swot-total-budget-badge">
                            <span>Orçamento Mensal: </span>
                            <span id="ap-total-budget-label" style="font-weight:900;">R$ ${totalBudget.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                    </div>
                    
                    <div class="ap-table-scroll">
                        <table class="ap-execution-table">
                            <thead>
                                <tr>
                                    <th style="width:22%;">O Que Fazer (What)</th>
                                    <th style="width:18%;">Por Quê (Why)</th>
                                    <th style="width:10%;">Onde (Where)</th>
                                    <th style="width:10%;">Quem (Who)</th>
                                    <th style="width:10%;">Quando (When)</th>
                                    <th style="width:12%;">Como (How)</th>
                                    <th style="width:10%;text-align:right;">Quanto (How Much)</th>
                                    <th style="width:10%;text-align:center;">KPI Alvo</th>
                                    <th style="width:40px;"></th>
                                </tr>
                            </thead>
                            <tbody>
                                ${mesAcoes.length > 0 ? mesAcoes.map(a => {
                                    const kpiClass = 'kpi-' + (a.kpi === 'CAC' ? 'cac' : a.kpi === 'ROI' ? 'roi' : a.kpi === 'LTV' ? 'ltv' : a.kpi === 'NPS' ? 'nps' : 'conv');
                                    return `
                                        <tr>
                                            <td>
                                                <input type="text" class="ap-grid-input" value="${a.oQue}" oninput="updateActionInGridText(${a.id}, 'oQue', this.value)" placeholder="Verbo no infinitivo...">
                                            </td>
                                            <td>
                                                <input type="text" class="ap-grid-input" value="${a.porQue}" oninput="updateActionInGridText(${a.id}, 'porQue', this.value)" placeholder="Ganho futuro...">
                                            </td>
                                            <td>
                                                <input type="text" class="ap-grid-input" value="${a.onde}" oninput="updateActionInGridText(${a.id}, 'onde', this.value)" placeholder="Local...">
                                            </td>
                                            <td>
                                                <input type="text" class="ap-grid-input" value="${a.quem}" oninput="updateActionInGridText(${a.id}, 'quem', this.value)" placeholder="Responsável...">
                                            </td>
                                            <td>
                                                <input type="date" class="ap-grid-input" value="${a.quando}" oninput="updateActionInGridText(${a.id}, 'quando', this.value)">
                                            </td>
                                            <td>
                                                <input type="text" class="ap-grid-input" value="${a.como}" oninput="updateActionInGridText(${a.id}, 'como', this.value)" placeholder="Método...">
                                            </td>
                                            <td>
                                                <input type="text" class="ap-grid-input num-field" value="${a.quanto.toFixed(2)}" onblur="this.value = parseFloat(this.value.replace(/[^\\d.-]/g, '') || 0).toFixed(2)" oninput="updateActionInGridText(${a.id}, 'quanto', this.value)" placeholder="0.00">
                                            </td>
                                            <td style="text-align:center;">
                                                <span class="ap-kpi-badge ${kpiClass}">${a.kpi || 'NPS'}</span>
                                            </td>
                                            <td>
                                                <button class="ap-delete-btn" onclick="deleteActionPlanItem(${a.id})" title="Excluir Ação">
                                                    <i data-lucide="trash-2" style="width:14px;height:14px;"></i>
                                                </button>
                                            </td>
                                        </tr>
                                    `;
                                }).join('') : `
                                    <tr>
                                        <td colspan="9" style="text-align:center;padding:32px;color:var(--text-sub);font-weight:600;">
                                            Nenhuma ação tática planejada para o mês de ${mesAtivo}.
                                        </td>
                                    </tr>
                                `}
                            </tbody>
                        </table>
                    </div>
                    
                    <button class="swot-btn-pill-add" onclick="openNewActionModal()">
                        <i data-lucide="plus" style="width:14px;height:14px;"></i>
                        <span>+ Nova Ação Estratégica</span>
                    </button>
                </div>
            </div>
            
            <!-- Coluna da Direita (Painel Lateral de Diagnóstico) -->
            <div class="ap-diagnostico-card">
                <div style="display:flex;align-items:center;gap:6px;">
                    <i data-lucide="clipboard-list" style="width:15px;height:15px;color:var(--text-sub);"></i>
                    <h5 class="ap-diagnostico-title">Notas de Diagnóstico</h5>
                </div>
                <p style="font-size:11px;color:var(--text-sub);line-height:1.4;margin:0;">Lembretes dos gaps internos identificados antes de planejar as ações táticas.</p>
                <textarea class="ap-diagnostico-textarea" oninput="updateDiagnosticoText(this.value)" placeholder="Digite observações sobre auditorias de campo, gaps comerciais, treinamento pendente...">${notasDiagnostico}</textarea>
                <div style="font-size:10px;color:var(--text-sub);text-align:right;opacity:0.7;font-weight:600;font-family:monospace;">Autosalvamento ativo</div>
            </div>
        </div>
        
        <!-- Modal de Nova Ação -->
        <div id="action-plan-modal" class="ap-modal-overlay">
            <div class="ap-modal-card">
                <div class="ap-modal-header">
                    <h3 style="font-weight:800;letter-spacing:-0.02em;margin:0;display:flex;align-items:center;gap:8px;">
                        <i data-lucide="plus-circle" style="color:var(--brand);width:20px;height:20px;"></i>
                        <span>Planejar Ação Estratégica (${mesAtivo})</span>
                    </h3>
                    <button class="close-btn" onclick="closeNewActionModal()"><i data-lucide="x"></i></button>
                </div>
                <form onsubmit="saveNewAction(event)">
                    <div class="ap-modal-body">
                        <div class="form-grid">
                            <div class="form-group col-12">
                                <label class="form-label">O Que Fazer (What - Iniciar com Verbo no Infinitivo)</label>
                                <input type="text" class="form-control" id="modal-ap-oque" placeholder="Ex: Treinar os operadores comerciais no caixa..." required>
                            </div>
                            
                            <div class="form-group col-12">
                                <label class="form-label">Por Quê (Why - Ganho Estratégico Futuro)</label>
                                <input type="text" class="form-control" id="modal-ap-porque" placeholder="Ex: Evitar atritos de atendimento e reter clientes..." required>
                            </div>
                            
                            <div class="form-group col-6">
                                <label class="form-label">Onde (Where)</label>
                                <input type="text" class="form-control" id="modal-ap-onde" placeholder="Ex: Unidade Centro físico e site..." required>
                            </div>
                            
                            <div class="form-group col-6">
                                <label class="form-label">Quem (Who - Responsável)</label>
                                <input type="text" class="form-control" id="modal-ap-quem" placeholder="Ex: Supervisor de Atendimento..." required>
                            </div>
                            
                            <div class="form-group col-4">
                                <label class="form-label">Quando (When - Prazo final)</label>
                                <input type="date" class="form-control" id="modal-ap-quando" required>
                            </div>
                            
                            <div class="form-group col-4">
                                <label class="form-label">Quanto (How Much - R$)</label>
                                <input type="number" step="0.01" class="form-control" id="modal-ap-quanto" placeholder="0.00" required>
                            </div>
                            
                            <div class="form-group col-4">
                                <label class="form-label">KPI Alvo (Métrica)</label>
                                <select class="form-control" id="modal-ap-kpi">
                                    <option value="Taxa de Conversão">Taxa de Conversão</option>
                                    <option value="ROI">ROI</option>
                                    <option value="LTV">LTV</option>
                                    <option value="CAC">CAC</option>
                                    <option value="NPS">NPS</option>
                                    <option value="Burn Rate">Burn Rate</option>
                                </select>
                            </div>
                            
                            <div class="form-group col-12">
                                <label class="form-label">Como Fazer (How - Método de Aplicação)</label>
                                <textarea class="form-control" id="modal-ap-como" style="min-height:70px; resize:vertical;" placeholder="Ex: Contratar consultoria de varejo e aplicar dinâmicas de atendimento prático..." required></textarea>
                            </div>
                        </div>
                    </div>
                    <div class="ap-modal-footer">
                        <button type="button" class="btn-cancel" onclick="closeNewActionModal()">Cancelar</button>
                        <button type="submit" class="btn-save">Gravar Ação</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    // Configura data padrão na modal se abrir
    const dateInput = document.getElementById('modal-ap-quando');
    if (dateInput) {
        dateInput.value = getLocalDateString();
    }
    
    // Recria ícones do Lucide
    if (window.lucide) {
        lucide.createIcons();
    }
};

// ==============================================================================
// ─── TELA DE COMPLIANCE E INTEGRIDADE (RH) ───────────────────────────────────
// ==============================================================================

function renderCompliance(container) {
    // 1. Inicializar Mock Data se não existir
    if (!state.compliance_denuncias) {
        state.compliance_denuncias = [
            { id: '#DEN-2026-01', tipo: 'Trabalhista', data: '2026-05-10', status: 'Resolvido', descricao: 'Relato de jornada de trabalho excessiva e falta de registro de horas extras na Unidade Varejo Centro.', prioridade: 'Média', responsavel: 'Ana Paula (RH)' },
            { id: '#DEN-2026-02', tipo: 'Conflito de Interesses', data: '2026-05-18', status: 'Em Análise', descricao: 'Fornecedor contratado para fornecimento de TI possui vínculos de parentesco com gerente de suprimentos.', prioridade: 'Alta', responsavel: 'Carlos Lima (Auditoria)' },
            { id: '#DEN-2026-03', tipo: 'Segurança da Informação', data: '2026-05-22', status: 'Mitigado', descricao: 'Uso de chaves de acesso genéricas e compartilhamento de senhas do PDV master entre turnos.', prioridade: 'Alta', responsavel: 'Roberto Silva (TI)' },
            { id: '#DEN-2026-04', tipo: 'Trabalhista', data: '2026-05-28', status: 'Em Análise', descricao: 'Denúncia confidencial relatando comportamento ríspido, humilhante e assédio verbal no setor de recebimento.', prioridade: 'Crítica', responsavel: 'Ana Paula (RH)' },
            { id: '#DEN-2026-05', tipo: 'Ética e Conduta', data: '2026-05-29', status: 'Resolvido', descricao: 'Suposto desvio de materiais de embalagem descartados para uso comercial paralelo no entorno da loja.', prioridade: 'Baixa', responsavel: 'Carlos Lima (Auditoria)' }
        ];
    }
    if (!state.compliance_fornecedores) {
        state.compliance_fornecedores = [
            { id: 1, fornecedor: 'Logística Express S.A.', tipo: 'Fiscal/Trabalhista', risco: 'Baixo', status: 'Certificado', analista: 'Carlos Lima', dataAnalise: '2026-04-12' },
            { id: 2, fornecedor: 'Sistemas e Soluções Tech', tipo: 'LGPD/Segurança', risco: 'Médio', status: 'Pendente', analista: 'Roberto Silva', dataAnalise: '2026-05-02' },
            { id: 3, fornecedor: 'Alimentos e Refeições Ltda', tipo: 'Fiscal/Trabalhista', risco: 'Alto', status: 'Rejeitado', analista: 'Carlos Lima', dataAnalise: '2026-05-15' },
            { id: 4, fornecedor: 'Marketing Digital e Eventos', tipo: 'Reputacional', risco: 'Baixo', status: 'Certificado', analista: 'Ana Paula', dataAnalise: '2026-05-20' },
            { id: 5, fornecedor: 'Segurança & Vigilância Velo', tipo: 'LGPD/Segurança', risco: 'Alto', status: 'Certificado', analista: 'Roberto Silva', dataAnalise: '2026-05-25' }
        ];
    }
    if (!state.compliance_treinamentos) {
        state.compliance_treinamentos = [
            { id: 1, nome: 'Curso de LGPD e Proteção de Dados', concluido: 92, icone: 'shield', cor: '#4f46e5', duracao: '4h' },
            { id: 2, nome: 'Treinamento Antiasseio e Diversidade', concluido: 88, icone: 'users-2', cor: '#db2777', duracao: '2h' },
            { id: 3, nome: 'Código de Conduta & Integridade IBGC', concluido: 97, icone: 'scale', cor: '#059669', duracao: '3h' },
            { id: 4, nome: 'Segurança Física & Compliance Varejo', concluido: 74, icone: 'alert-triangle', cor: '#ea580c', duracao: '1.5h' }
        ];
    }

    // 2. Injetar estilos CSS específicos se não existirem
    if (!document.getElementById('compliance-tactile-css')) {
        const styleEl = document.createElement('style');
        styleEl.id = 'compliance-tactile-css';
        styleEl.innerHTML = `
            .comp-grid-layout {
                display: grid;
                grid-template-columns: repeat(12, 1fr);
                gap: 20px;
                margin-bottom: 28px;
            }
            .comp-card-3 { grid-column: span 3; }
            .comp-card-6 { grid-column: span 6; }
            .comp-card-12 { grid-column: span 12; }
            
            @media (max-width: 1024px) {
                .comp-card-3 { grid-column: span 6; }
                .comp-card-6 { grid-column: span 12; }
            }
            @media (max-width: 640px) {
                .comp-card-3 { grid-column: span 12; }
            }

            /* Acabamento Físico Tátil Premium */
            .comp-kpi-card {
                background: linear-gradient(135deg, var(--surface) 0%, var(--bg-app) 100%);
                border: 1px solid var(--border-med);
                border-bottom: 3.5px solid var(--border-med);
                border-radius: var(--radius-lg);
                padding: 18px 20px;
                position: relative;
                overflow: hidden;
                display: flex;
                flex-direction: column;
                justify-content: space-between;
                min-height: 125px;
                box-shadow: var(--shadow-soft), inset 0 1px 0 rgba(255,255,255,0.8);
                transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
            }
            .comp-kpi-card:hover {
                transform: translateY(-2px);
                box-shadow: var(--shadow-bold);
                border-bottom-width: 4.5px;
            }
            .comp-kpi-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 12px;
            }
            .comp-kpi-title {
                font-size: 11px;
                font-weight: 800;
                color: var(--text-sub);
                text-transform: uppercase;
                letter-spacing: 0.08em;
            }
            .comp-kpi-icon-wrap {
                width: 32px;
                height: 32px;
                border-radius: 8px;
                background: var(--accent);
                border: 1px solid var(--border-soft);
                display: flex;
                align-items: center;
                justify-content: center;
                color: var(--text-main);
                box-shadow: inset 0 1px 2px rgba(0,0,0,0.05);
            }
            .comp-kpi-value {
                font-size: 28px;
                font-weight: 900;
                letter-spacing: -0.04em;
                color: var(--text-main);
                line-height: 1;
                display: flex;
                align-items: baseline;
                gap: 4px;
            }
            .comp-kpi-sub {
                font-size: 11px;
                color: var(--text-sub);
                margin-top: 6px;
                font-weight: 600;
            }

            /* Painel */
            .comp-panel {
                background: var(--surface);
                border: 1px solid var(--border-med);
                border-radius: var(--radius-lg);
                padding: 24px;
                box-shadow: var(--shadow-soft);
                display: flex;
                flex-direction: column;
                height: 520px;
            }
            .comp-panel-header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                margin-bottom: 18px;
                border-bottom: 1px solid var(--border-soft);
                padding-bottom: 14px;
            }
            .comp-panel-title {
                font-size: 16px;
                font-weight: 800;
                letter-spacing: -0.02em;
                display: flex;
                align-items: center;
                gap: 8px;
                color: var(--text-main);
            }
            .comp-panel-subtitle {
                font-size: 12px;
                color: var(--text-sub);
                margin-top: 3px;
                font-weight: 500;
            }

            /* Filtros */
            .comp-filter-bar {
                display: flex;
                gap: 10px;
                margin-bottom: 16px;
            }
            .comp-input-search {
                flex: 1;
                padding: 8px 12px;
                border: 1px solid var(--border-med);
                border-radius: var(--radius-sm);
                font-size: 12px;
                font-weight: 600;
                font-family: inherit;
                background: var(--surface);
                color: var(--text-main);
                transition: border-color 0.2s;
            }
            .comp-input-search:focus {
                outline: none;
                border-color: var(--brand);
            }
            .comp-select-filter {
                padding: 8px 12px;
                border: 1px solid var(--border-med);
                border-radius: var(--radius-sm);
                font-size: 12px;
                font-weight: 600;
                font-family: inherit;
                background: var(--surface);
                color: var(--text-main);
                cursor: pointer;
            }

            /* Scroll */
            .comp-list-scroll {
                flex: 1;
                overflow-y: auto;
                padding-right: 4px;
                scrollbar-width: thin;
                scrollbar-color: var(--border-med) transparent;
            }
            .comp-list-scroll::-webkit-scrollbar { width: 4px; }
            .comp-list-scroll::-webkit-scrollbar-track { background: transparent; }
            .comp-list-scroll::-webkit-scrollbar-thumb { background: var(--border-med); border-radius: 4px; }

            /* Relatos Itens */
            .comp-list-item {
                padding: 16px;
                border-radius: var(--radius-md);
                background: var(--bg-app);
                border: 1px solid var(--border-soft);
                margin-bottom: 12px;
                cursor: pointer;
                transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                position: relative;
                box-shadow: inset 0 1px 0 rgba(255,255,255,0.6);
            }
            .comp-list-item:hover {
                border-color: var(--border-med);
                box-shadow: var(--shadow-soft);
                transform: translateX(3px);
            }
            .comp-item-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 6px;
            }
            .comp-item-id {
                font-family: monospace;
                font-weight: 800;
                font-size: 12px;
                color: var(--text-sub);
            }
            .comp-item-type {
                font-size: 13px;
                font-weight: 800;
                color: var(--text-main);
            }
            .comp-item-desc {
                font-size: 12px;
                color: var(--text-sub);
                line-height: 1.4;
                margin-bottom: 10px;
                display: -webkit-box;
                -webkit-line-clamp: 2;
                -webkit-box-orient: vertical;
                overflow: hidden;
            }
            .comp-item-meta {
                display: flex;
                justify-content: space-between;
                align-items: center;
                font-size: 11px;
                color: var(--text-sub);
                font-weight: 600;
            }

            /* Tags Premium Fosco */
            .comp-tag {
                padding: 3px 10px;
                border-radius: 30px;
                font-size: 10px;
                font-weight: 800;
                text-transform: uppercase;
                letter-spacing: 0.04em;
                display: inline-flex;
                align-items: center;
                border: 1px solid transparent;
            }
            .tag-resolvido {
                background: rgba(22, 163, 74, 0.08);
                color: #15803d;
                border-color: rgba(22, 163, 74, 0.15);
            }
            .tag-analise {
                background: rgba(185, 28, 28, 0.06);
                color: #b91c1c;
                border-color: rgba(185, 28, 28, 0.12);
            }
            .tag-mitigado {
                background: rgba(234, 88, 12, 0.06);
                color: #d97706;
                border-color: rgba(234, 88, 12, 0.12);
            }

            /* Excel Premium */
            .excel-table-scroll {
                flex: 1;
                overflow-y: auto;
                scrollbar-width: thin;
                scrollbar-color: var(--border-med) transparent;
            }
            .excel-table-scroll::-webkit-scrollbar { width: 4px; }
            .excel-table-scroll::-webkit-scrollbar-track { background: transparent; }
            .excel-table-scroll::-webkit-scrollbar-thumb { background: var(--border-med); border-radius: 4px; }

            .excel-table {
                width: 100%;
                border-collapse: collapse;
                font-size: 13px;
            }
            .excel-table th {
                padding: 10px 12px;
                font-size: 11px;
                font-weight: 700;
                color: var(--text-sub);
                text-transform: uppercase;
                letter-spacing: 0.05em;
                border-bottom: 1px solid var(--border-med);
                background: var(--bg-app);
                text-align: left;
                position: sticky;
                top: 0;
                z-index: 1;
            }
            .excel-table td {
                padding: 12px;
                border-bottom: 0.5px solid var(--border-soft);
                font-weight: 600;
                color: var(--text-main);
            }
            .excel-table tr:hover {
                background: rgba(0, 0, 0, 0.015);
            }
            body.dark-mode .excel-table tr:hover {
                background: rgba(255, 255, 255, 0.015);
            }

            /* Botão Pílula */
            .btn-pill-action {
                padding: 8px 16px;
                border-radius: 30px;
                background: var(--brand);
                color: white;
                border: none;
                font-size: 12px;
                font-weight: 700;
                font-family: inherit;
                cursor: pointer;
                transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                display: inline-flex;
                align-items: center;
                gap: 6px;
                box-shadow: 0 3px 6px rgba(37, 99, 235, 0.12);
            }
            .btn-pill-action:hover {
                background: var(--brand-light);
                transform: translateY(-1px);
                box-shadow: 0 6px 12px rgba(37, 99, 235, 0.2);
            }
            .btn-pill-action:active {
                transform: translateY(0);
            }

            /* Riscos Tags */
            .risco-badge {
                padding: 2px 6px;
                border-radius: 4px;
                font-size: 10px;
                font-weight: 800;
                text-transform: uppercase;
            }
            .risco-baixo { background: rgba(22, 163, 74, 0.08); color: #16a34a; }
            .risco-medio { background: rgba(234, 88, 12, 0.08); color: #ea580c; }
            .risco-alto { background: rgba(220, 38, 38, 0.08); color: #dc2626; }

            /* Rodapé Treinamento */
            .training-section-container {
                background: var(--surface);
                border: 1px solid var(--border-med);
                border-radius: var(--radius-lg);
                padding: 24px;
                box-shadow: var(--shadow-soft);
            }
            .training-cards-row {
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: 20px;
            }
            @media (max-width: 1200px) {
                .training-cards-row { grid-template-columns: repeat(2, 1fr); }
            }
            @media (max-width: 640px) {
                .training-cards-row { grid-template-columns: 1fr; }
            }

            .training-tatile-card {
                background: linear-gradient(135deg, var(--surface) 0%, var(--bg-app) 100%);
                border: 1px solid var(--border-med);
                border-bottom: 3.5px solid var(--border-med);
                border-radius: var(--radius-lg);
                padding: 18px;
                box-shadow: var(--shadow-soft), inset 0 1px 0 rgba(255,255,255,0.8);
                transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
            }
            .training-tatile-card:hover {
                transform: translateY(-2px);
                box-shadow: var(--shadow-bold);
                border-bottom-width: 4.5px;
            }
            .training-card-header {
                display: flex;
                align-items: center;
                gap: 12px;
                margin-bottom: 14px;
            }
            .training-icon-badge {
                width: 36px;
                height: 36px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .training-card-title {
                font-size: 13px;
                font-weight: 800;
                color: var(--text-main);
                line-height: 1.35;
                font-family: 'Plus Jakarta Sans', sans-serif;
            }
            .training-progress-container {
                height: 6px;
                background: var(--accent);
                border-radius: 3px;
                overflow: hidden;
                margin-bottom: 8px;
                box-shadow: inset 0 1px 2px rgba(0,0,0,0.05);
            }
            .training-progress-fill {
                height: 100%;
                border-radius: 3px;
                transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1);
            }
            .training-meta-info {
                display: flex;
                justify-content: space-between;
                font-size: 11px;
                font-weight: 700;
                color: var(--text-sub);
            }

            /* Estilos específicos do Modal Ouvidoria */
            .comp-modal-detail-overlay {
                position: fixed;
                top: 0; left: 0; right: 0; bottom: 0;
                background: rgba(0,0,0,0.4);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 1050;
                backdrop-filter: blur(3px);
            }
            .comp-modal-detail-card {
                background: var(--surface);
                border-radius: var(--radius-lg);
                width: 580px;
                max-width: 95vw;
                box-shadow: var(--shadow-bold);
                overflow: hidden;
                border: 1px solid var(--border-med);
            }
            .comp-modal-detail-header {
                padding: 18px 24px;
                border-bottom: 1px solid var(--border-soft);
                display: flex;
                justify-content: space-between;
                align-items: center;
                background: var(--bg-app);
            }
            .comp-modal-detail-body {
                padding: 24px;
            }
            .comp-detail-row {
                margin-bottom: 16px;
            }
            .comp-detail-label {
                font-size: 11px;
                font-weight: 800;
                color: var(--text-sub);
                text-transform: uppercase;
                margin-bottom: 6px;
                display: block;
            }
            .comp-detail-value {
                font-size: 13px;
                font-weight: 600;
                color: var(--text-main);
                line-height: 1.45;
            }
            .comp-detail-box {
                padding: 14px;
                background: var(--bg-app);
                border-radius: var(--radius-md);
                border: 1px solid var(--border-soft);
                font-size: 12.5px;
                color: var(--text-main);
                line-height: 1.5;
            }
        `;
        document.head.appendChild(styleEl);
    }

    // 3. Renderizar a Casca do HTML
    container.innerHTML = `
        <div style="margin-bottom: 24px;">
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px;">
                <div>
                    <h3 style="font-weight:900; letter-spacing:-0.04em; font-family:'Plus Jakarta Sans', sans-serif; font-size: 20px; color: var(--text-main)">
                        Monitoramento de Integridade Corporativa
                    </h3>
                    <p style="font-size: 12px; color: var(--text-sub); font-weight: 600; margin-top:4px;">
                        Com base nos fundamentos do IBGC e no Decreto Federal nº 11.129/22 (Lei Anticorrupção)
                    </p>
                </div>
                <div style="display:flex; align-items:center; gap:8px;">
                    <span class="comp-tag tag-resolvido" style="font-weight:800; font-size:10px;">
                        <i data-lucide="shield-check" style="width:12px; margin-right:4px;"></i> Canal Seguro
                    </span>
                    <span class="comp-tag tag-mitigado" style="font-weight:800; font-size:10px;">
                        Auditoria Ativa: 2026
                    </span>
                </div>
            </div>
        </div>

        <!-- 1. CARDS DE MONITORAMENTO DE PONTOS SENSÍVEIS -->
        <div class="comp-grid-layout" id="comp-kpis-container">
            <!-- Injetado via JS -->
        </div>

        <!-- CENTRAL ESQUERDA (OUVIDORIA) E CENTRAL DIREITA (DUE DIGILENCE) -->
        <div class="comp-grid-layout" style="margin-bottom: 28px;">
            <!-- Ouvidoria / Canal de Denúncias -->
            <div class="comp-card-6 comp-panel">
                <div class="comp-panel-header">
                    <div>
                        <div class="comp-panel-title">
                            <i data-lucide="megaphone" style="color:var(--danger); width:18px;"></i>
                            <span>Canal de Denúncias & Ouvidoria</span>
                        </div>
                        <p class="comp-panel-subtitle">Hotline interna para desvios de conduta, assédio e infrações</p>
                    </div>
                </div>

                <!-- Barra de Busca e Filtro de Denúncias -->
                <div class="comp-filter-bar">
                    <input type="text" class="comp-input-search" id="comp-search-denuncias" oninput="filterDenuncias()" placeholder="Buscar por ID ou descrição...">
                    <select class="comp-select-filter" id="comp-filter-denuncias-status" onchange="filterDenuncias()">
                        <option value="Todos">Todos os Status</option>
                        <option value="Em Análise">Em Análise</option>
                        <option value="Mitigado">Mitigado</option>
                        <option value="Resolvido">Resolvido</option>
                    </select>
                </div>

                <!-- Lista de Denúncias -->
                <div class="comp-list-scroll" id="comp-denuncias-list">
                    <!-- Injetado dinamicamente -->
                </div>
            </div>

            <!-- Gestão de Riscos & Due Diligence -->
            <div class="comp-card-6 comp-panel">
                <div class="comp-panel-header">
                    <div>
                        <div class="comp-panel-title">
                            <i data-lucide="scale" style="color:var(--brand); width:18px;"></i>
                            <span>Due Diligence de Terceiros</span>
                        </div>
                        <p class="comp-panel-subtitle">Homologação de riscos fiscais, trabalhistas, reputacionais e LGPD</p>
                    </div>
                    <button class="btn-pill-action" onclick="openNewDueDiligenceModal()">
                        <i data-lucide="plus" style="width:14px; height:14px;"></i>
                        <span>+ Conduzir Due Diligence</span>
                    </button>
                </div>

                <!-- Barra de Busca e Filtro de Fornecedores -->
                <div class="comp-filter-bar">
                    <input type="text" class="comp-input-search" id="comp-search-fornecedores" oninput="filterFornecedores()" placeholder="Buscar por fornecedor...">
                    <select class="comp-select-filter" id="comp-filter-fornecedores-risco" onchange="filterFornecedores()">
                        <option value="Todos">Todos os Riscos</option>
                        <option value="Baixo">Risco Baixo</option>
                        <option value="Médio">Risco Médio</option>
                        <option value="Alto">Risco Alto</option>
                    </select>
                </div>

                <!-- Tabela de Due Diligence -->
                <div class="excel-table-scroll">
                    <table class="excel-table">
                        <thead>
                            <tr>
                                <th>Fornecedor</th>
                                <th>Análise</th>
                                <th style="text-align:center;">Nível Risco</th>
                                <th style="text-align:center;">Status</th>
                                <th style="width:40px;"></th>
                            </tr>
                        </thead>
                        <tbody id="comp-fornecedores-table-body">
                            <!-- Injetado dinamicamente -->
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <!-- 4. TRILHA DE TREINAMENTO E CONSCIENTIZAÇÃO (RODAPÉ) -->
        <div class="training-section-container">
            <div style="margin-bottom:18px; border-bottom:1px solid var(--border-soft); padding-bottom:12px;">
                <h4 style="font-weight:800; letter-spacing:-0.03em; font-family:'Plus Jakarta Sans', sans-serif; display:flex; align-items:center; gap:8px;">
                    <i data-lucide="book-open" style="color:var(--brand); width:18px;"></i>
                    <span>Trilha de Conscientização & Capacitação</span>
                </h4>
                <p style="font-size:12px; color:var(--text-sub); margin-top:2px; font-weight:600;">Acompanhamento de adesão aos treinamentos periódicos obrigatórios</p>
            </div>
            
            <div class="training-cards-row" id="comp-treinamentos-container">
                <!-- Injetado dinamicamente -->
            </div>
        </div>
    `;

    // 4. Iniciar renderização dinâmica de dados
    renderKPIs();
    renderDenuncias();
    renderFornecedores();
    renderTreinamentos();

    // 5. Funções de Atualização e Filtro
    window.filterDenuncias = function() {
        renderDenuncias();
    };

    window.filterFornecedores = function() {
        renderFornecedores();
    };

    function renderKPIs() {
        const kpisContainer = document.getElementById('comp-kpis-container');
        if (!kpisContainer) return;

        // Calcular valores dos KPIs baseado no estado atual
        const emAberto = state.compliance_denuncias.filter(d => d.status === 'Em Análise').length;
        
        // Média de conclusão dos treinamentos
        const totalConcluido = state.compliance_treinamentos.reduce((acc, t) => acc + t.concluido, 0);
        const mediaTreinamentos = (totalConcluido / state.compliance_treinamentos.length).toFixed(1);

        // Pendências Pós-Auditoria (fornecedores em conformidade mitigada / pendentes)
        const totalFornecedores = state.compliance_fornecedores.length;
        const certificados = state.compliance_fornecedores.filter(f => f.status === 'Certificado').length;
        const conformidadeMitigadaPct = totalFornecedores > 0 ? Math.round((certificados / totalFornecedores) * 100) : 100;

        kpisContainer.innerHTML = `
            <!-- KPI 1 -->
            <div class="comp-card-3 comp-kpi-card">
                <div class="comp-kpi-header">
                    <span class="comp-kpi-title">Denúncias em Aberto</span>
                    <div class="comp-kpi-icon-wrap" style="color: #b91c1c;">
                        <i data-lucide="megaphone" style="width:16px;height:16px;"></i>
                    </div>
                </div>
                <div>
                    <span class="comp-kpi-value" style="color: #b91c1c;">${emAberto}</span>
                    <span class="comp-kpi-sub">Requerendo investigação imediata</span>
                </div>
            </div>

            <!-- KPI 2 -->
            <div class="comp-card-3 comp-kpi-card">
                <div class="comp-kpi-header">
                    <span class="comp-kpi-title">Tempo de Investigação</span>
                    <div class="comp-kpi-icon-wrap" style="color: var(--brand);">
                        <i data-lucide="clock" style="width:16px;height:16px;"></i>
                    </div>
                </div>
                <div>
                    <span class="comp-kpi-value" style="color: var(--text-main);">14 <span style="font-size:14px; font-weight:700; color:var(--text-sub);">Dias</span></span>
                    <span class="comp-kpi-sub">Ciclo médio de resolução (Meta: <20d)</span>
                </div>
            </div>

            <!-- KPI 3 -->
            <div class="comp-card-3 comp-kpi-card">
                <div class="comp-kpi-header">
                    <span class="comp-kpi-title">Adesão ao Código de Conduta</span>
                    <div class="comp-kpi-icon-wrap" style="color: #059669;">
                        <i data-lucide="check-square" style="width:16px;height:16px;"></i>
                    </div>
                </div>
                <div>
                    <span class="comp-kpi-value" style="color: #059669;">${mediaTreinamentos}%</span>
                    <span class="comp-kpi-sub">Assinaturas e treinamentos da equipe</span>
                </div>
            </div>

            <!-- KPI 4 -->
            <div class="comp-card-3 comp-kpi-card">
                <div class="comp-kpi-header">
                    <span class="comp-kpi-title">Parceiros Homologados</span>
                    <div class="comp-kpi-icon-wrap" style="color: #d97706;">
                        <i data-lucide="scale" style="width:16px;height:16px;"></i>
                    </div>
                </div>
                <div>
                    <span class="comp-kpi-value" style="color: #d97706;">${conformidadeMitigadaPct}%</span>
                    <span class="comp-kpi-sub">Due Diligence sem restrições críticas</span>
                </div>
            </div>
        `;
        if (window.lucide) lucide.createIcons();
    }

    function renderDenuncias() {
        const listContainer = document.getElementById('comp-denuncias-list');
        if (!listContainer) return;

        const query = document.getElementById('comp-search-denuncias').value.toLowerCase().trim();
        const filterStatus = document.getElementById('comp-filter-denuncias-status').value;

        // Filtrar
        const filtrados = state.compliance_denuncias.filter(d => {
            const matchesQuery = d.id.toLowerCase().includes(query) || d.descricao.toLowerCase().includes(query) || d.tipo.toLowerCase().includes(query);
            const matchesStatus = filterStatus === 'Todos' || d.status === filterStatus;
            return matchesQuery && matchesStatus;
        });

        // Ordenar por ID decrescente (denúncias mais recentes primeiro)
        filtrados.sort((a, b) => b.id.localeCompare(a.id));

        if (filtrados.length === 0) {
            listContainer.innerHTML = `
                <div style="text-align:center; padding: 48px 16px; color:var(--text-sub); font-weight:600; font-size:12.5px;">
                    Nenhum relato encontrado com os filtros aplicados.
                </div>
            `;
            return;
        }

        listContainer.innerHTML = filtrados.map(d => {
            const tagClass = d.status === 'Resolvido' ? 'tag-resolvido' : d.status === 'Mitigado' ? 'tag-mitigado' : 'tag-analise';
            
            // Formatando data
            const [ano, mes, dia] = d.data.split('-');
            const dataFormatada = `${dia}/${mes}/${ano}`;

            return `
                <div class="comp-list-item" onclick="openDenunciaDetailsModal('${d.id}')">
                    <div class="comp-item-header">
                        <span class="comp-item-type">${d.tipo}</span>
                        <span class="comp-tag ${tagClass}">${d.status}</span>
                    </div>
                    <p class="comp-item-desc">${d.descricao}</p>
                    <div class="comp-item-meta">
                        <span class="comp-item-id">${d.id}</span>
                        <span>Entrada: ${dataFormatada}</span>
                    </div>
                </div>
            `;
        }).join('');
    }

    function renderFornecedores() {
        const tableBody = document.getElementById('comp-fornecedores-table-body');
        if (!tableBody) return;

        const query = document.getElementById('comp-search-fornecedores').value.toLowerCase().trim();
        const filterRisco = document.getElementById('comp-filter-fornecedores-risco').value;

        const filtrados = state.compliance_fornecedores.filter(f => {
            const matchesQuery = f.fornecedor.toLowerCase().includes(query) || f.tipo.toLowerCase().includes(query);
            const matchesRisco = filterRisco === 'Todos' || f.risco === filterRisco;
            return matchesQuery && matchesRisco;
        });

        if (filtrados.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align:center; padding: 48px; color:var(--text-sub); font-weight:600;">
                        Nenhum fornecedor localizado com os critérios informados.
                    </td>
                </tr>
            `;
            return;
        }

        tableBody.innerHTML = filtrados.map(f => {
            const riscoClass = f.risco === 'Baixo' ? 'risco-baixo' : f.risco === 'Médio' ? 'risco-medio' : 'risco-alto';
            const statusTagClass = f.status === 'Certificado' ? 'tag-resolvido' : f.status === 'Pendente' ? 'tag-mitigado' : 'tag-analise';
            return `
                <tr>
                    <td style="font-weight:800; font-size:13px;">${f.fornecedor}</td>
                    <td style="color:var(--text-sub); font-size:12px; font-weight:700;">${f.tipo}</td>
                    <td style="text-align:center;">
                        <span class="risco-badge ${riscoClass}">${f.risco}</span>
                    </td>
                    <td style="text-align:center;">
                        <span class="comp-tag ${statusTagClass}">${f.status}</span>
                    </td>
                    <td style="text-align:right;">
                        <button class="ap-delete-btn" onclick="removeDueDiligence(${f.id})" style="border:none; background:transparent; cursor:pointer;" title="Excluir Diligence">
                            <i data-lucide="trash-2" style="width:14px; height:14px; color:var(--danger)"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
        if (window.lucide) lucide.createIcons();
    }

    function renderTreinamentos() {
        const trainingsContainer = document.getElementById('comp-treinamentos-container');
        if (!trainingsContainer) return;

        trainingsContainer.innerHTML = state.compliance_treinamentos.map(t => {
            return `
                <div class="training-tatile-card">
                    <div class="training-card-header">
                        <div class="training-icon-badge" style="background-color: ${t.cor};">
                            <i data-lucide="${t.icone}" style="width:16px;height:16px;"></i>
                        </div>
                        <span class="training-card-title">${t.nome}</span>
                    </div>
                    <div class="training-progress-container">
                        <div class="training-progress-fill" style="width: ${t.concluido}%; background-color: ${t.cor};"></div>
                    </div>
                    <div class="training-meta-info">
                        <span>Conclusão: ${t.concluido}%</span>
                        <span>Carga: ${t.duracao}</span>
                    </div>
                </div>
            `;
        }).join('');
        if (window.lucide) lucide.createIcons();
    }

    // ─── MODAL DETALHES DE DENÚNCIA ──────────────────────────────────────────
    window.openDenunciaDetailsModal = function(denunciaId) {
        const d = state.compliance_denuncias.find(item => item.id === denunciaId);
        if (!d) return;

        // Criar overlay do modal se não existir no body
        let modalEl = document.getElementById('comp-denuncia-modal');
        if (!modalEl) {
            modalEl = document.createElement('div');
            modalEl.id = 'comp-denuncia-modal';
            document.body.appendChild(modalEl);
        }

        const [ano, mes, dia] = d.data.split('-');
        const dataFormatada = `${dia}/${mes}/${ano}`;

        modalEl.innerHTML = `
            <div class="comp-modal-detail-overlay" onclick="closeDenunciaDetailsModal()">
                <div class="comp-modal-detail-card" onclick="event.stopPropagation()">
                    <div class="comp-modal-detail-header">
                        <h4 style="font-weight:900; letter-spacing:-0.03em; margin:0; display:flex; align-items:center; gap:8px; color:var(--text-main)">
                            <i data-lucide="shield-alert" style="color:var(--danger); width:18px;"></i>
                            <span>Investigação de Relato</span>
                        </h4>
                        <button class="close-btn" onclick="closeDenunciaDetailsModal()"><i data-lucide="x"></i></button>
                    </div>
                    <div class="comp-modal-detail-body">
                        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:16px; margin-bottom:16px;">
                            <div class="comp-detail-row">
                                <span class="comp-detail-label">ID Relato</span>
                                <span class="comp-detail-value" style="font-family:monospace; font-weight:800;">${d.id}</span>
                            </div>
                            <div class="comp-detail-row">
                                <span class="comp-detail-label">Data de Entrada</span>
                                <span class="comp-detail-value">${dataFormatada}</span>
                            </div>
                            <div class="comp-detail-row">
                                <span class="comp-detail-label">Tipo de Ocorrência</span>
                                <span class="comp-detail-value" style="font-weight:800; color:var(--brand);">${d.tipo}</span>
                            </div>
                            <div class="comp-detail-row">
                                <span class="comp-detail-label">Prioridade Corporativa</span>
                                <span class="comp-detail-value risco-badge ${d.prioridade === 'Crítica' || d.prioridade === 'Alta' ? 'risco-alto' : d.prioridade === 'Média' ? 'risco-medio' : 'risco-baixo'}" style="display:inline-block;">
                                    ${d.prioridade}
                                </span>
                            </div>
                        </div>

                        <div class="comp-detail-row" style="margin-bottom:18px;">
                            <span class="comp-detail-label">Conteúdo do Relato (Anonimizado)</span>
                            <div class="comp-detail-box">${d.descricao}</div>
                        </div>

                        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:16px; align-items:flex-end;">
                            <div class="comp-detail-row" style="margin-bottom:0;">
                                <span class="comp-detail-label">Analista Responsável</span>
                                <span class="comp-detail-value" style="font-weight:700;"><i data-lucide="user" style="width:14px; display:inline-block; vertical-align:middle; margin-right:4px;"></i>${d.responsavel}</span>
                            </div>
                            <div class="comp-detail-row" style="margin-bottom:0;">
                                <span class="comp-detail-label">Status da Investigação</span>
                                <select class="form-control" id="modal-denuncia-status-select" style="width:100%; height:36px; padding:6px 10px; font-size:12px;">
                                    <option value="Em Análise" ${d.status === 'Em Análise' ? 'selected' : ''}>Em Análise</option>
                                    <option value="Mitigado" ${d.status === 'Mitigado' ? 'selected' : ''}>Mitigado</option>
                                    <option value="Resolvido" ${d.status === 'Resolvido' ? 'selected' : ''}>Resolvido</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer" style="padding:14px 24px; border-top:1px solid var(--border-soft); background:var(--bg-app); display:flex; justify-content:flex-end; gap:10px;">
                        <button type="button" class="btn-cancel" onclick="closeDenunciaDetailsModal()">Fechar</button>
                        <button type="button" class="btn-save" onclick="saveDenunciaStatus('${d.id}')">Gravar Alterações</button>
                    </div>
                </div>
            </div>
        `;
        if (window.lucide) lucide.createIcons();
    }

    window.closeDenunciaDetailsModal = function() {
        const modal = document.getElementById('comp-denuncia-modal');
        if (modal) {
            modal.innerHTML = '';
        }
    }

    window.saveDenunciaStatus = function(denunciaId) {
        const statusSelect = document.getElementById('modal-denuncia-status-select');
        if (!statusSelect) return;

        const newStatus = statusSelect.value;
        const d = state.compliance_denuncias.find(item => item.id === denunciaId);
        if (d) {
            d.status = newStatus;
            
            // Recalcular KPIs, filtros e atualizar listas na tela principal
            renderKPIs();
            renderDenuncias();
            closeDenunciaDetailsModal();
            
            // Feedback discreto e sênior
            console.log(`Status do relato ${denunciaId} alterado para ${newStatus}.`);
        }
    }

    // ─── MODAL NOVA DUE DILIGENCE ─────────────────────────────────────────────
    window.openNewDueDiligenceModal = function() {
        let modalEl = document.getElementById('comp-diligence-modal');
        if (!modalEl) {
            modalEl = document.createElement('div');
            modalEl.id = 'comp-diligence-modal';
            document.body.appendChild(modalEl);
        }

        modalEl.innerHTML = `
            <div class="comp-modal-detail-overlay" onclick="closeNewDueDiligenceModal()">
                <div class="comp-modal-detail-card" style="width:480px;" onclick="event.stopPropagation()">
                    <div class="comp-modal-detail-header">
                        <h4 style="font-weight:900; letter-spacing:-0.03em; margin:0; display:flex; align-items:center; gap:8px; color:var(--text-main)">
                            <i data-lucide="scale" style="color:var(--brand); width:18px;"></i>
                            <span>Nova Due Diligence</span>
                        </h4>
                        <button class="close-btn" onclick="closeNewDueDiligenceModal()"><i data-lucide="x"></i></button>
                    </div>
                    <form onsubmit="saveNewDueDiligence(event)">
                        <div class="comp-modal-detail-body">
                            <div class="form-grid">
                                <div class="form-group col-12" style="margin-bottom:12px;">
                                    <label class="form-label">Razão Social / Parceiro Comercial</label>
                                    <input type="text" class="form-control" id="modal-dd-fornecedor" placeholder="Ex: TecnoClean Prestadora de Serviços Ltda..." required>
                                </div>
                                <div class="form-group col-12" style="margin-bottom:12px;">
                                    <label class="form-label">Tipo de Homologação</label>
                                    <select class="form-control" id="modal-dd-tipo">
                                        <option value="Fiscal/Trabalhista">Fiscal e Trabalhista (Fundamentos Decreto 11129/22)</option>
                                        <option value="LGPD/Segurança">Segurança da Informação e LGPD</option>
                                        <option value="Reputacional">Integridade Reputacional e Anticorrupção</option>
                                    </select>
                                </div>
                                <div class="form-group col-6" style="margin-bottom:12px;">
                                    <label class="form-label">Nível de Risco Identificado</label>
                                    <select class="form-control" id="modal-dd-risco">
                                        <option value="Baixo">Baixo Risco</option>
                                        <option value="Médio">Médio Risco</option>
                                        <option value="Alto">Alto Risco</option>
                                    </select>
                                </div>
                                <div class="form-group col-6" style="margin-bottom:12px;">
                                    <label class="form-label">Status da Certificação</label>
                                    <select class="form-control" id="modal-dd-status">
                                        <option value="Certificado">Homologado e Certificado</option>
                                        <option value="Pendente">Em Análise / Pendente</option>
                                        <option value="Rejeitado">Rejeitado (Bloqueado)</option>
                                    </select>
                                </div>
                                <div class="form-group col-12">
                                    <label class="form-label">Analista Responsável</label>
                                    <input type="text" class="form-control" id="modal-dd-analista" value="Gestor Velo" required>
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer" style="padding:14px 24px; border-top:1px solid var(--border-soft); background:var(--bg-app); display:flex; justify-content:flex-end; gap:10px;">
                            <button type="button" class="btn-cancel" onclick="closeNewDueDiligenceModal()">Cancelar</button>
                            <button type="submit" class="btn-save">Conduzir & Gravar</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        if (window.lucide) lucide.createIcons();
    }

    window.closeNewDueDiligenceModal = function() {
        const modal = document.getElementById('comp-diligence-modal');
        if (modal) {
            modal.innerHTML = '';
        }
    }

    window.saveNewDueDiligence = function(event) {
        event.preventDefault();

        const fornecedor = document.getElementById('modal-dd-fornecedor').value.trim();
        const tipo = document.getElementById('modal-dd-tipo').value;
        const risco = document.getElementById('modal-dd-risco').value;
        const status = document.getElementById('modal-dd-status').value;
        const analista = document.getElementById('modal-dd-analista').value.trim();

        if (!fornecedor) return;

        const newId = state.compliance_fornecedores.length > 0 ? Math.max(...state.compliance_fornecedores.map(f => f.id)) + 1 : 1;
        
        state.compliance_fornecedores.push({
            id: newId,
            fornecedor,
            tipo,
            risco,
            status,
            analista,
            dataAnalise: getLocalDateString()
        });

        // Recalcular tela
        renderKPIs();
        renderFornecedores();
        closeNewDueDiligenceModal();
    }

    window.removeDueDiligence = function(id) {
        if (confirm('Tem certeza que deseja excluir esta análise de Due Diligence?')) {
            state.compliance_fornecedores = state.compliance_fornecedores.filter(f => f.id !== id);
            
            // Recalcular
            renderKPIs();
            renderFornecedores();
        }
    }
}

// ==============================================================================
// ─── TELA DE GESTÃO DE SKILLS & COMPETÊNCIAS (RH) ───────────────────────────
// ==============================================================================

function renderSkills(container) {
    // 1. Inicializar Mock Data de Skills se não existir
    if (!state.skills_colaboradores) {
        state.skills_colaboradores = [
            { id: 1, nome: 'Wagner Garcia', depto: 'Comercial', cargo: 'Supervisor de Vendas', hardSkills: ['BI / Analytics', 'Gestão Comercial', 'PDV Master'], softSkills: ['Adaptabilidade', 'Resiliência', 'Liderança'], pontuacoes: [85, 90, 78, 88, 92] }, // Big Five: Extroversão, Conscienciosidade, Estabilidade Emocional, Amabilidade, Abertura
            { id: 2, nome: 'Ana Paula Souza', depto: 'Recursos Humanos', cargo: 'Business Partner Sr', hardSkills: ['Cargos & Salários', 'Due Diligence Trabalhista', 'Psicologia Org.'], softSkills: ['Empatia', 'Comunicação Assertiva', 'Inteligência Emocional'], pontuacoes: [90, 95, 88, 96, 85] },
            { id: 3, nome: 'Roberto Silva', depto: 'Tecnologia', cargo: 'Arquiteto de Sistemas', hardSkills: ['JavaScript / Node.js', 'Segurança da Informação', 'Bancos de Dados'], softSkills: ['Foco em Resultados', 'Trabalho em Equipe', 'Resolução de Problemas'], pontuacoes: [65, 92, 85, 75, 96] },
            { id: 4, nome: 'Carlos Lima', depto: 'Controladoria & Compliance', cargo: 'Auditor Interno Sênior', hardSkills: ['Lei 11.129/22', 'Normas IBGC', 'Auditoria Fiscal'], softSkills: ['Atenção aos Detalhes', 'Ética Profissional', 'Pensamento Crítico'], pontuacoes: [70, 98, 92, 82, 80] },
            { id: 5, nome: 'Juliana Mendes', depto: 'Marketing & Criação', cargo: 'Designer UI/UX Principal', hardSkills: ['Figma / Design Premium', 'Criação de Identidade', 'Pesquisa com Usuários'], softSkills: ['Criatividade Disruptiva', 'Amabilidade', 'Pensamento Lateral'], pontuacoes: [88, 85, 80, 92, 98] }
        ];
    }
    if (!state.skills_capacitacao) {
        state.skills_capacitacao = [
            { id: 1, nome: 'Liderança Criativa e Inovação', publico: 'Gerentes e Supervisores', skill: 'Liderança Criativa', progresso: 95, status: 'Concluído' },
            { id: 2, nome: 'Comunicação Assertiva no Ponto de Venda', publico: 'Frente de Caixa e Atendimento', skill: 'Comunicação', progresso: 68, status: 'Em Andamento' },
            { id: 3, nome: 'Treinamento LGPD e Segurança da Informação', publico: 'Toda a Organização', skill: 'Segurança da Informação', progresso: 85, status: 'Em Andamento' },
            { id: 4, nome: 'Resolução de Problemas Complexos no Varejo', publico: 'Líderes de Unidade e Compras', skill: 'Pensamento Crítico', progresso: 100, status: 'Concluído' },
            { id: 5, nome: 'Workshop Capacidades Dinâmicas & Renovação', publico: 'C-Level e Diretores', skill: 'Adaptabilidade', progresso: 25, status: 'Planejado' }
        ];
    }
    if (!state.skills_pipeline) {
        state.skills_pipeline = [
            { id: 1, nome: 'Felipe Rocha', cargo: 'Analista de Vendas Jr', skill: 'Comercial & Negociação', estagio: 'mapeamento', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=100&q=80' },
            { id: 2, nome: 'Mariana Costa', cargo: 'Desenvolvedora Full Stack', skill: 'JavaScript / SQL', estagio: 'avaliacao', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=100&q=80' },
            { id: 3, nome: 'Lucas Almeida', cargo: 'Supervisor de Logística', skill: 'Capacidades Dinâmicas', estagio: 'mentoria', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=100&q=80' },
            { id: 4, nome: 'Sandra Pires', cargo: 'Coordenadora Adjunta de RH', skill: 'Liderança & Empatia', estagio: 'pronto', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=100&q=80' }
        ];
    }

    // 2. Injetar estilos CSS específicos para Gestão de Skills se não existirem
    if (!document.getElementById('skills-tactile-css')) {
        const styleEl = document.createElement('style');
        styleEl.id = 'skills-tactile-css';
        styleEl.innerHTML = `
            /* Grid da tela */
            .skills-grid-layout {
                display: grid;
                grid-template-columns: repeat(12, 1fr);
                gap: 20px;
                margin-bottom: 28px;
            }
            .skills-card-3 { grid-column: span 3; }
            .skills-card-6 { grid-column: span 6; }
            .skills-card-12 { grid-column: span 12; }
            
            @media (max-width: 1024px) {
                .skills-card-3 { grid-column: span 6; }
                .skills-card-6 { grid-column: span 12; }
            }
            @media (max-width: 640px) {
                .skills-card-3 { grid-column: span 12; }
            }

            /* Acabamento Físico Tátil Premium */
            .skills-kpi-card {
                background: linear-gradient(135deg, var(--surface) 0%, var(--bg-app) 100%);
                border: 1px solid var(--border-med);
                border-bottom: 3.5px solid var(--border-med);
                border-radius: var(--radius-lg);
                padding: 18px 20px;
                position: relative;
                overflow: hidden;
                display: flex;
                flex-direction: column;
                justify-content: space-between;
                min-height: 125px;
                box-shadow: var(--shadow-soft), inset 0 1px 0 rgba(255,255,255,0.8);
                transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
            }
            .skills-kpi-card:hover {
                transform: translateY(-2px);
                box-shadow: var(--shadow-bold);
                border-bottom-width: 4.5px;
            }
            .skills-kpi-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 12px;
            }
            .skills-kpi-title {
                font-size: 11px;
                font-weight: 800;
                color: var(--text-sub);
                text-transform: uppercase;
                letter-spacing: 0.08em;
            }
            .skills-kpi-icon-wrap {
                width: 32px;
                height: 32px;
                border-radius: 8px;
                background: var(--accent);
                border: 1px solid var(--border-soft);
                display: flex;
                align-items: center;
                justify-content: center;
                color: var(--text-main);
                box-shadow: inset 0 1px 2px rgba(0,0,0,0.05);
            }
            .skills-kpi-value {
                font-size: 28px;
                font-weight: 900;
                letter-spacing: -0.04em;
                color: var(--text-main);
                line-height: 1;
                display: flex;
                align-items: baseline;
                gap: 4px;
            }
            .skills-kpi-sub {
                font-size: 11px;
                color: var(--text-sub);
                margin-top: 6px;
                font-weight: 600;
            }

            /* Painel */
            .skills-panel {
                background: var(--surface);
                border: 1px solid var(--border-med);
                border-radius: var(--radius-lg);
                padding: 24px;
                box-shadow: var(--shadow-soft);
                display: flex;
                flex-direction: column;
                height: 520px;
            }
            .skills-panel-header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                margin-bottom: 18px;
                border-bottom: 1px solid var(--border-soft);
                padding-bottom: 14px;
            }
            .skills-panel-title {
                font-size: 16px;
                font-weight: 800;
                letter-spacing: -0.02em;
                display: flex;
                align-items: center;
                gap: 8px;
                color: var(--text-main);
            }
            .skills-panel-subtitle {
                font-size: 12px;
                color: var(--text-sub);
                margin-top: 3px;
                font-weight: 500;
            }

            /* Filtros */
            .skills-filter-bar {
                display: flex;
                gap: 10px;
                margin-bottom: 16px;
            }
            .skills-input-search {
                flex: 1;
                padding: 8px 12px;
                border: 1px solid var(--border-med);
                border-radius: var(--radius-sm);
                font-size: 12px;
                font-weight: 600;
                font-family: inherit;
                background: var(--surface);
                color: var(--text-main);
                transition: border-color 0.2s;
            }
            .skills-input-search:focus {
                outline: none;
                border-color: var(--brand);
            }
            .skills-select-filter {
                padding: 8px 12px;
                border: 1px solid var(--border-med);
                border-radius: var(--radius-sm);
                font-size: 12px;
                font-weight: 600;
                font-family: inherit;
                background: var(--surface);
                color: var(--text-main);
                cursor: pointer;
            }

            /* Matriz de Competências Clickable Rows */
            .excel-row-clickable {
                cursor: pointer;
                transition: background-color 0.15s ease;
            }
            .excel-row-clickable:hover {
                background-color: var(--bg-app) !important;
            }

            /* Tags Premium Fosco */
            .skills-tag {
                padding: 2.5px 8px;
                border-radius: 4px;
                font-size: 10px;
                font-weight: 800;
                text-transform: uppercase;
                letter-spacing: 0.04em;
                display: inline-flex;
                align-items: center;
                border: 1px solid transparent;
                margin-right: 4px;
                margin-bottom: 4px;
            }
            .tag-soft {
                background: rgba(79, 70, 229, 0.06);
                color: #4f46e5;
                border-color: rgba(79, 70, 229, 0.12);
            }
            .tag-hard {
                background: rgba(37, 99, 235, 0.06);
                color: #2563eb;
                border-color: rgba(37, 99, 235, 0.12);
            }
            .tag-nivel {
                background: rgba(118, 114, 103, 0.08);
                color: #5a5955;
                font-weight: 900;
            }

            /* Upskilling Progress Bar */
            .progress-container-sutil {
                height: 6px;
                background: var(--accent);
                border-radius: 3px;
                overflow: hidden;
                box-shadow: inset 0 1px 1px rgba(0,0,0,0.05);
            }
            .progress-fill-sutil {
                height: 100%;
                border-radius: 3px;
                background: var(--brand);
                transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1);
            }

            /* Rolagem dedicada e robusta para a Matriz de Competências de Skills */
            .skills-table-scroll {
                flex: 1;
                overflow: auto; /* Rolagem em ambos os eixos */
                max-height: 330px; /* Impede o vazamento vertical */
                width: 100%;
                border: 1px solid var(--border-soft);
                border-radius: var(--radius-md);
                background: var(--bg-app);
            }
            .skills-table-scroll::-webkit-scrollbar { width: 5px; height: 5px; }
            .skills-table-scroll::-webkit-scrollbar-track { background: transparent; }
            .skills-table-scroll::-webkit-scrollbar-thumb { background: var(--border-med); border-radius: 4px; }

            .skills-table {
                width: 100%;
                min-width: 650px; /* Garante espaço horizontal para as tags não espremerem e rola de forma elegante */
                border-collapse: collapse;
                font-size: 12.5px;
            }
            .skills-table th {
                padding: 10px 12px;
                font-size: 11px;
                font-weight: 700;
                color: var(--text-sub);
                text-transform: uppercase;
                letter-spacing: 0.05em;
                border-bottom: 1.5px solid var(--border-med);
                background: var(--bg-app);
                text-align: left;
                position: sticky;
                top: 0;
                z-index: 1;
            }
            .skills-table td {
                padding: 10px 12px;
                border-bottom: 0.5px solid var(--border-soft);
                font-weight: 600;
                color: var(--text-main);
            }
            
            /* Ajuste nas tags de skills dentro da tabela para se acomodarem em linha */
            .skills-tags-td-container {
                display: flex;
                flex-wrap: wrap;
                gap: 4px;
                max-width: 250px; /* Impede as tags de se estenderem muito */
            }

            /* Drawer Lateral Deslizante Científico */
            .skills-drawer {
                position: fixed;
                top: 0;
                right: -450px; /* Escondido */
                width: 450px;
                max-width: 100vw;
                height: 100vh;
                background: var(--surface);
                border-left: 1px solid var(--border-med);
                box-shadow: var(--shadow-bold);
                z-index: 1100;
                transition: right 0.35s cubic-bezier(0.25, 0.8, 0.25, 1);
                display: flex;
                flex-direction: column;
                padding: 24px;
                background-image: var(--texture-concrete);
                background-size: var(--texture-concrete-size);
            }
            .skills-drawer.open {
                right: 0;
            }
            .skills-drawer-overlay {
                position: fixed;
                top: 0; left: 0; right: 0; bottom: 0;
                background: rgba(0,0,0,0.3);
                z-index: 1090;
                opacity: 0;
                visibility: hidden;
                backdrop-filter: blur(2px);
                transition: all 0.3s ease;
            }
            .skills-drawer-overlay.open {
                opacity: 1;
                visibility: visible;
            }
            .skills-drawer-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-bottom: 1px solid var(--border-soft);
                padding-bottom: 14px;
                margin-bottom: 20px;
            }
            .skills-drawer-body {
                flex: 1;
                overflow-y: auto;
                padding-right: 2px;
                scrollbar-width: thin;
                scrollbar-color: var(--border-med) transparent;
            }
            .skills-drawer-body::-webkit-scrollbar { width: 4px; }
            .skills-drawer-body::-webkit-scrollbar-thumb { background: var(--border-med); border-radius: 4px; }

            /* Pipeline de Talentos (Kanban Rodapé) */
            .pipeline-section-container {
                background: var(--surface);
                border: 1px solid var(--border-med);
                border-radius: var(--radius-lg);
                padding: 24px;
                box-shadow: var(--shadow-soft);
            }
            .kanban-board {
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: 16px;
                margin-top: 16px;
            }
            @media (max-width: 1024px) {
                .kanban-board { grid-template-columns: repeat(2, 1fr); }
            }
            @media (max-width: 640px) {
                .kanban-board { grid-template-columns: 1fr; }
            }

            .kanban-column {
                background: var(--bg-app);
                border: 1px solid var(--border-soft);
                border-radius: var(--radius-lg);
                padding: 16px;
                display: flex;
                flex-direction: column;
                min-height: 220px;
                box-shadow: inset 0 1px 2px rgba(0,0,0,0.02);
            }
            .kanban-column-header {
                font-size: 11px;
                font-weight: 800;
                color: var(--text-sub);
                text-transform: uppercase;
                letter-spacing: 0.06em;
                margin-bottom: 14px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-bottom: 1.5px solid var(--border-soft);
                padding-bottom: 8px;
                font-family: 'Plus Jakarta Sans', sans-serif;
            }
            .kanban-column-count {
                background: var(--border-med);
                color: var(--text-main);
                padding: 2px 6px;
                border-radius: 20px;
                font-size: 10px;
                font-weight: 900;
            }
            .kanban-card {
                background: var(--surface);
                border: 1px solid var(--border-med);
                border-bottom: 2.5px solid var(--border-med);
                border-radius: var(--radius-md);
                padding: 12px;
                margin-bottom: 10px;
                box-shadow: var(--shadow-soft), inset 0 1px 0 rgba(255,255,255,0.8);
                transition: all 0.2s ease;
                display: flex;
                align-items: center;
                gap: 12px;
            }
            .kanban-card:hover {
                transform: translateY(-1px);
                box-shadow: var(--shadow-bold);
                border-bottom-width: 3.5px;
            }
            .kanban-avatar {
                width: 36px;
                height: 36px;
                border-radius: 50%;
                border: 1.5px solid var(--border-soft);
                object-fit: cover;
                box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            }
            .kanban-info {
                display: flex;
                flex-direction: column;
                gap: 2px;
                flex: 1;
            }
            .kanban-name {
                font-size: 12.5px;
                font-weight: 800;
                color: var(--text-main);
                font-family: 'Plus Jakarta Sans', sans-serif;
            }
            .kanban-role {
                font-size: 10px;
                color: var(--text-sub);
                font-weight: 600;
            }
            .kanban-skill {
                font-size: 9px;
                font-weight: 800;
                color: var(--brand);
                background: rgba(37, 99, 235, 0.06);
                padding: 1px 6px;
                border-radius: 4px;
                align-self: flex-start;
                margin-top: 2px;
                border: 0.5px solid rgba(37, 99, 235, 0.12);
            }
        `;
        document.head.appendChild(styleEl);
    }

    // 3. Renderizar Casca do HTML de Gestão de Skills
    container.innerHTML = `
        <div style="margin-bottom: 24px;">
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px;">
                <div>
                    <h3 style="font-weight:900; letter-spacing:-0.04em; font-family:'Plus Jakarta Sans', sans-serif; font-size: 20px; color: var(--text-main)">
                        Mapeamento Científico de Competências & Skills
                    </h3>
                    <p style="font-size: 12px; color: var(--text-sub); font-weight: 600; margin-top:4px;">
                        Análise baseada no Modelo dos Big Five, Capacidades Dinâmicas e Soft Skills da Indústria 4.0
                    </p>
                </div>
                <div style="display:flex; align-items:center; gap:8px;">
                    <span class="skills-tag tag-soft" style="font-weight:800; font-size:10px; margin:0;">
                        <i data-lucide="award" style="width:12px; margin-right:4px;"></i> Big Five Homologado
                    </span>
                    <span class="skills-tag tag-nivel" style="font-weight:800; font-size:10px; margin:0;">
                        Renovação de Capacidades
                    </span>
                </div>
            </div>
        </div>

        <!-- 1. DASHBOARD DE ATRIBUTOS E SKILLS (Topo da Tela) -->
        <div class="skills-grid-layout" id="skills-kpis-container">
            <!-- Injetado via JS -->
        </div>

        <!-- CENTRAL ESQUERDA (MATRIZ ATUAL) E CENTRAL DIREITA (UP-RESKILLING) -->
        <div class="skills-grid-layout" style="margin-bottom: 28px;">
            <!-- Matriz de Competências Atuais -->
            <div class="skills-card-6 skills-panel">
                <div class="skills-panel-header">
                    <div>
                        <div class="skills-panel-title">
                            <i data-lucide="users-2" style="color:var(--brand); width:18px;"></i>
                            <span>Matriz de Competências Atuais</span>
                        </div>
                        <p class="skills-panel-subtitle">Profissionais homologados. Clique na linha para abrir o Gráfico de Radar (Big Five)</p>
                    </div>
                </div>

                <!-- Busca e Filtro de Colaboradores -->
                <div class="skills-filter-bar">
                    <input type="text" class="skills-input-search" id="skills-search-colaboradores" oninput="filterColaboradores()" placeholder="Buscar colaborador ou departamento...">
                    <select class="skills-select-filter" id="skills-filter-colaboradores-nivel" onchange="filterColaboradores()">
                        <option value="Todos">Todos os Níveis</option>
                        <option value="Júnior">Júnior</option>
                        <option value="Pleno">Pleno</option>
                        <option value="Sênior">Sênior</option>
                        <option value="Especialista">Especialista</option>
                    </select>
                </div>

                <!-- Tabela de Competências -->
                <div class="skills-table-scroll">
                    <table class="skills-table">
                        <thead>
                            <tr>
                                <th>Colaborador</th>
                                <th>Departamento</th>
                                <th>Nível</th>
                                <th>Hard Skills Principais</th>
                                <th>Soft Skills Mapeadas</th>
                            </tr>
                        </thead>
                        <tbody id="skills-colaboradores-table-body">
                            <!-- Injetado dinamicamente -->
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Plano de Aperfeiçoamento e Capacitação -->
            <div class="skills-card-6 skills-panel">
                <div class="skills-panel-header">
                    <div>
                        <div class="skills-panel-title">
                            <i data-lucide="graduation-cap" style="color:var(--success); width:18px;"></i>
                            <span>Plano de Capacitação & Upskilling</span>
                        </div>
                        <p class="skills-panel-subtitle">Renovação estratégica e desenvolvimento de Capacidades Dinâmicas</p>
                    </div>
                    <button class="btn-pill-action" onclick="openNewCapacitacaoModal()">
                        <i data-lucide="plus" style="width:14px; height:14px;"></i>
                        <span>+ Criar Trilha</span>
                    </button>
                </div>

                <!-- Busca e Filtro de Capacitação -->
                <div class="skills-filter-bar">
                    <input type="text" class="skills-input-search" id="skills-search-capacitacao" oninput="filterCapacitacao()" placeholder="Buscar por treinamento ou depto...">
                    <select class="skills-select-filter" id="skills-filter-capacitacao-status" onchange="filterCapacitacao()">
                        <option value="Todos">Todos os Status</option>
                        <option value="Planejado">Planejado</option>
                        <option value="Em Andamento">Em Andamento</option>
                        <option value="Concluído">Concluído</option>
                    </select>
                </div>

                <!-- Tabela de Capacitação -->
                <div class="excel-table-scroll">
                    <table class="excel-table">
                        <thead>
                            <tr>
                                <th>Trilha / Treinamento</th>
                                <th>Skill Focada</th>
                                <th>Progresso Turma</th>
                                <th>Status</th>
                                <th style="width:40px;"></th>
                            </tr>
                        </thead>
                        <tbody id="skills-capacitacao-table-body">
                            <!-- Injetado dinamicamente -->
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <!-- 4. PIPELINE DE TALENTOS FUTUROS (RODAPÉ) -->
        <div class="pipeline-section-container">
            <div style="margin-bottom:18px; border-bottom:1px solid var(--border-soft); padding-bottom:12px;">
                <h4 style="font-weight:800; letter-spacing:-0.03em; font-family:'Plus Jakarta Sans', sans-serif; display:flex; align-items:center; gap:8px;">
                    <i data-lucide="git-branch" style="color:var(--brand); width:18px;"></i>
                    <span>Pipeline de Talentos & Sucessão Estratégica</span>
                </h4>
                <p style="font-size:12px; color:var(--text-sub); margin-top:2px; font-weight:600;">Esteira de atração, lapidação comportamental e mentoria de talentos internos e externos</p>
            </div>
            
            <div class="kanban-board">
                <!-- Estágio 1 -->
                <div class="kanban-column">
                    <div class="kanban-column-header">
                        <span>Mapeamento Inicial</span>
                        <span class="kanban-column-count" id="skills-count-mapeamento">0</span>
                    </div>
                    <div id="skills-col-mapeamento" style="flex:1;">
                        <!-- Injetado dinamicamente -->
                    </div>
                </div>

                <!-- Estágio 2 -->
                <div class="kanban-column">
                    <div class="kanban-column-header">
                        <span>Avaliação Comportamental</span>
                        <span class="kanban-column-count" id="skills-count-avaliacao">0</span>
                    </div>
                    <div id="skills-col-avaliacao" style="flex:1;">
                        <!-- Injetado dinamicamente -->
                    </div>
                </div>

                <!-- Estágio 3 -->
                <div class="kanban-column">
                    <div class="kanban-column-header">
                        <span>Trilha de Mentorias</span>
                        <span class="kanban-column-count" id="skills-count-mentoria">0</span>
                    </div>
                    <div id="skills-col-mentoria" style="flex:1;">
                        <!-- Injetado dinamicamente -->
                    </div>
                </div>

                <!-- Estágio 4 -->
                <div class="kanban-column">
                    <div class="kanban-column-header">
                        <span>Pronto para Promoção</span>
                        <span class="kanban-column-count" id="skills-count-pronto">0</span>
                    </div>
                    <div id="skills-col-pronto" style="flex:1;">
                        <!-- Injetado dinamicamente -->
                    </div>
                </div>
            </div>
        </div>

        <!-- DRAWER LATERAL DESLIZANTE PARA DETALHES E GRÁFICO DE RADAR -->
        <div class="skills-drawer-overlay" id="skills-drawer-overlay" onclick="closeSkillsDrawer()"></div>
        <div class="skills-drawer" id="skills-drawer">
            <div class="skills-drawer-header">
                <h4 style="font-weight:900; letter-spacing:-0.03em; margin:0; display:flex; align-items:center; gap:8px; color:var(--text-main); font-family:'Plus Jakarta Sans', sans-serif;">
                    <i data-lucide="shield-check" style="color:var(--brand); width:18px;"></i>
                    <span>Diagnóstico Científico</span>
                </h4>
                <button class="close-btn" onclick="closeSkillsDrawer()"><i data-lucide="x"></i></button>
            </div>
            <div class="skills-drawer-body">
                <div style="margin-bottom:20px; border-bottom:1px solid var(--border-soft); padding-bottom:14px; text-align:center;">
                    <div id="drawer-user-avatar" style="width:64px; height:64px; border-radius:50%; background:#var(--brand); color:white; display:flex; align-items:center; justify-content:center; font-size:24px; font-weight:900; margin:0 auto 12px; box-shadow:0 3px 6px rgba(0,0,0,0.1); text-transform:uppercase; font-family:'Plus Jakarta Sans', sans-serif;">WG</div>
                    <h4 id="drawer-col-nome" style="font-weight:900; letter-spacing:-0.02em; margin:0; color:var(--text-main); font-family:'Plus Jakarta Sans', sans-serif; font-size:16px;">Wagner Garcia</h4>
                    <p id="drawer-col-cargo-depto" style="font-size:12px; color:var(--text-sub); font-weight:600; margin-top:4px;">Supervisor de Vendas | Comercial</p>
                </div>

                <div class="comp-detail-row">
                    <span class="comp-detail-label">Hard Skills Principais</span>
                    <div id="drawer-col-hardskills" style="display:flex; flex-wrap:wrap; margin-top:4px;">
                        <!-- Injetado -->
                    </div>
                </div>

                <div class="comp-detail-row" style="margin-bottom:24px;">
                    <span class="comp-detail-label">Soft Skills Mapeadas</span>
                    <div id="drawer-col-softskills" style="display:flex; flex-wrap:wrap; margin-top:4px;">
                        <!-- Injetado -->
                    </div>
                </div>

                <div class="comp-detail-row">
                    <span class="comp-detail-label" style="margin-bottom:12px;">Mapeamento comportamental Big Five</span>
                    <div style="background:var(--bg-app); border:1px solid var(--border-soft); border-radius:var(--radius-lg); padding:16px; min-height:240px; display:flex; align-items:center; justify-content:center; box-shadow:inset 0 1px 2px rgba(0,0,0,0.02);">
                        <canvas id="drawer-radar-chart" style="max-width:320px; max-height:320px;"></canvas>
                    </div>
                    <span style="font-size:10px; color:var(--text-sub); margin-top:6px; display:block; text-align:center; font-weight:600;">Eixo 0-100 para correspondência de fit de competência corporativa</span>
                </div>
            </div>
        </div>
    `;

    // 4. Iniciar a Renderização de Componentes Dinâmicos
    renderKPIs();
    renderColaboradores();
    renderCapacitacao();
    renderPipeline();

    // 5. Funções de Filtro
    window.filterColaboradores = function() {
        renderColaboradores();
    };

    window.filterCapacitacao = function() {
        renderCapacitacao();
    };

    function renderKPIs() {
        const kpisContainer = document.getElementById('skills-kpis-container');
        if (!kpisContainer) return;

        // KPI 1: Índice de Soft Skills (Média das pontuações de todos)
        const totalPontos = state.skills_colaboradores.reduce((acc, c) => acc + c.pontuacoes.reduce((x, y) => x + y, 0) / 5, 0);
        const indiceSoftSkills = (totalPontos / state.skills_colaboradores.length).toFixed(1);

        // KPI 2: Liderança Criativa (Mapeamento de abertura e extroversão média na liderança/gerentes, ex: Wagner e Juliana)
        const lideres = state.skills_colaboradores.filter(c => c.cargo.includes('Supervisor') || c.cargo.includes('Principal') || c.cargo.includes('Sr'));
        const totalLideranca = lideres.reduce((acc, c) => acc + (c.pontuacoes[4] + c.pontuacoes[0]) / 2, 0);
        const liderancaCriativa = lideres.length > 0 ? (totalLideranca / lideres.length).toFixed(1) : 80;

        // KPI 3: Lacunas de Competência (Skill Gaps)
        const skillGaps = state.skills_capacitacao.filter(t => t.status !== 'Concluído').length;

        // KPI 4: Banco de Talentos (Pipeline no Kanban)
        const totalPipeline = state.skills_pipeline.length;

        kpisContainer.innerHTML = `
            <!-- KPI 1 -->
            <div class="skills-card-3 skills-kpi-card">
                <div class="skills-kpi-header">
                    <span class="skills-kpi-title">Índice de Soft Skills</span>
                    <div class="skills-kpi-icon-wrap" style="color: #4f46e5;">
                        <i data-lucide="award" style="width:16px;height:16px;"></i>
                    </div>
                </div>
                <div>
                    <span class="skills-kpi-value" style="color: #4f46e5;">${indiceSoftSkills}%</span>
                    <span class="skills-kpi-sub">Prontidão comportamental média</span>
                </div>
            </div>

            <!-- KPI 2 -->
            <div class="skills-card-3 skills-kpi-card">
                <div class="skills-kpi-header">
                    <span class="skills-kpi-title">Liderança Criativa</span>
                    <div class="skills-kpi-icon-wrap" style="color: #db2777;">
                        <i data-lucide="sparkles" style="width:16px;height:16px;"></i>
                    </div>
                </div>
                <div>
                    <span class="skills-kpi-value" style="color: #db2777;">${liderancaCriativa}%</span>
                    <span class="skills-kpi-sub">Fomento e suporte à inovação</span>
                </div>
            </div>

            <!-- KPI 3 -->
            <div class="skills-card-3 skills-kpi-card">
                <div class="skills-kpi-header">
                    <span class="skills-kpi-title">Skill Gaps Ativos</span>
                    <div class="skills-kpi-icon-wrap" style="color: #ea580c;">
                        <i data-lucide="alert-triangle" style="width:16px;height:16px;"></i>
                    </div>
                </div>
                <div>
                    <span class="skills-kpi-value" style="color: #ea580c;">${skillGaps}</span>
                    <span class="skills-kpi-sub">Trilhas de upskilling pendentes</span>
                </div>
            </div>

            <!-- KPI 4 -->
            <div class="skills-card-3 skills-kpi-card">
                <div class="skills-kpi-header">
                    <span class="skills-kpi-title">Banco de Talentos Pool</span>
                    <div class="skills-kpi-icon-wrap" style="color: #059669;">
                        <i data-lucide="users-2" style="width:16px;height:16px;"></i>
                    </div>
                </div>
                <div>
                    <span class="skills-kpi-value" style="color: #059669;">${totalPipeline}</span>
                    <span class="skills-kpi-sub">Profissionais sendo lapidados</span>
                </div>
            </div>
        `;
        if (window.lucide) lucide.createIcons();
    }

    function renderColaboradores() {
        const tableBody = document.getElementById('skills-colaboradores-table-body');
        if (!tableBody) return;

        const query = document.getElementById('skills-search-colaboradores').value.toLowerCase().trim();
        const filterNivel = document.getElementById('skills-filter-colaboradores-nivel').value;

        const filtrados = state.skills_colaboradores.filter(c => {
            const matchesQuery = c.nome.toLowerCase().includes(query) || c.depto.toLowerCase().includes(query) || c.cargo.toLowerCase().includes(query);
            
            const matchesNivel = filterNivel === 'Todos' || c.cargo.includes(filterNivel) || (filterNivel === 'Júnior' && c.cargo.includes('Jr')) || (filterNivel === 'Especialista' && c.cargo.includes('Principal'));
            
            return matchesQuery && matchesNivel;
        });

        if (filtrados.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align:center; padding: 48px; color:var(--text-sub); font-weight:600;">
                        Nenhum colaborador localizado com os critérios informados.
                    </td>
                </tr>
            `;
            return;
        }

        tableBody.innerHTML = filtrados.map(c => {
            const nivelGeral = c.cargo.includes('Jr') || c.cargo.includes('Júnior') ? 'Júnior' : c.cargo.includes('Sênior') || c.cargo.includes('Sr') ? 'Sênior' : c.cargo.includes('Principal') ? 'Especialista' : 'Pleno';
            return `
                <tr class="excel-row-clickable" onclick="openColaboradorSkillsDrawer(${c.id})">
                    <td style="font-weight:800; font-size:13px; font-family:'Plus Jakarta Sans', sans-serif;">${c.nome}</td>
                    <td style="color:var(--text-sub); font-size:12px; font-weight:700;">${c.depto} <span style="font-weight:500; font-size:11px;">(${c.cargo})</span></td>
                    <td style="text-align:left;">
                        <span class="skills-tag tag-nivel">${nivelGeral}</span>
                    </td>
                    <td>
                        <div class="skills-tags-td-container">
                            ${c.hardSkills.map(h => `<span class="skills-tag tag-hard">${h}</span>`).join('')}
                        </div>
                    </td>
                    <td>
                        <div class="skills-tags-td-container">
                            ${c.softSkills.map(s => `<span class="skills-tag tag-soft">${s}</span>`).join('')}
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    function renderCapacitacao() {
        const tableBody = document.getElementById('skills-capacitacao-table-body');
        if (!tableBody) return;

        const query = document.getElementById('skills-search-capacitacao').value.toLowerCase().trim();
        const filterStatus = document.getElementById('skills-filter-capacitacao-status').value;

        const filtrados = state.skills_capacitacao.filter(t => {
            const matchesQuery = t.nome.toLowerCase().includes(query) || t.publico.toLowerCase().includes(query) || t.skill.toLowerCase().includes(query);
            const matchesStatus = filterStatus === 'Todos' || t.status === filterStatus;
            return matchesQuery && matchesStatus;
        });

        if (filtrados.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align:center; padding: 48px; color:var(--text-sub); font-weight:600;">
                        Nenhuma trilha de capacitação localizada.
                    </td>
                </tr>
            `;
            return;
        }

        tableBody.innerHTML = filtrados.map(t => {
            const statusTagClass = t.status === 'Concluído' ? 'tag-resolvido' : t.status === 'Em Andamento' ? 'tag-mitigado' : 'tag-analise';
            return `
                <tr>
                    <td style="font-weight:800; font-size:13px;">${t.nome} <br><span style="font-size:10px; color:var(--text-sub); font-weight:500;">Público: ${t.publico}</span></td>
                    <td style="color:var(--text-sub); font-size:12px; font-weight:700;">${t.skill}</td>
                    <td style="vertical-align:middle; width:120px;">
                        <div style="display:flex; align-items:center; gap:8px;">
                            <div class="progress-container-sutil" style="flex:1;">
                                <div class="progress-fill-sutil" style="width: ${t.progresso}%;"></div>
                            </div>
                            <span style="font-size:11px; font-weight:700; color:var(--text-main); font-family:monospace; min-width:28px; text-align:right;">${t.progresso}%</span>
                        </div>
                    </td>
                    <td style="text-align:center;">
                        <span class="skills-tag ${statusTagClass}" style="margin:0;">${t.status}</span>
                    </td>
                    <td style="text-align:right;">
                        <button class="ap-delete-btn" onclick="removeCapacitacaoTrilha(${t.id})" style="border:none; background:transparent; cursor:pointer;" title="Excluir Trilha">
                            <i data-lucide="trash-2" style="width:14px; height:14px; color:var(--danger)"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
        if (window.lucide) lucide.createIcons();
    }

    function renderPipeline() {
        // Estágios: mapeamento -> avaliacao -> mentoria -> pronto
        const estagios = ['mapeamento', 'avaliacao', 'mentoria', 'pronto'];

        estagios.forEach(e => {
            const containerCol = document.getElementById(`skills-col-${e}`);
            const countLabel = document.getElementById(`skills-count-${e}`);
            if (!containerCol || !countLabel) return;

            const items = state.skills_pipeline.filter(p => p.estagio === e);
            countLabel.textContent = items.length;

            if (items.length === 0) {
                containerCol.innerHTML = `
                    <div style="text-align:center; padding: 24px 8px; color:var(--text-sub); font-weight:600; font-size:11px; border:1px dashed var(--border-soft); border-radius:var(--radius-md);">
                        Nenhum talento
                    </div>
                `;
                return;
            }

            containerCol.innerHTML = items.map(p => {
                return `
                    <div class="kanban-card">
                        <img class="kanban-avatar" src="${p.avatar}" alt="${p.nome}">
                        <div class="kanban-info">
                            <span class="kanban-name">${p.nome}</span>
                            <span class="kanban-role">${p.cargo}</span>
                            <span class="kanban-skill">${p.skill}</span>
                        </div>
                    </div>
                `;
            }).join('');
        });
    }

    // ─── DRAWER GRÁFICO DE RADAR ──────────────────────────────────────────────
    window.openColaboradorSkillsDrawer = function(colaboradorId) {
        const c = state.skills_colaboradores.find(item => item.id === colaboradorId);
        if (!c) return;

        // Injetar dados no Drawer
        const avatarSigla = c.nome.split(' ').map(n => n[0]).join('').slice(0,2);
        document.getElementById('drawer-user-avatar').textContent = avatarSigla;
        document.getElementById('drawer-col-nome').textContent = c.nome;
        document.getElementById('drawer-col-cargo-depto').textContent = `${c.cargo} | ${c.depto}`;

        document.getElementById('drawer-col-hardskills').innerHTML = c.hardSkills.map(h => `<span class="skills-tag tag-hard">${h}</span>`).join('');
        document.getElementById('drawer-col-softskills').innerHTML = c.softSkills.map(s => `<span class="skills-tag tag-soft">${s}</span>`).join('');

        // Exibir Drawer
        document.getElementById('skills-drawer').classList.add('open');
        document.getElementById('skills-drawer-overlay').classList.add('open');

        // Plotar gráfico de radar (destrói o anterior se existir)
        if (window.skillsRadarChart) {
            window.skillsRadarChart.destroy();
        }

        setTimeout(() => {
            const ctx = document.getElementById('drawer-radar-chart').getContext('2d');
            
            const isDark = document.body.classList.contains('dark-mode');
            const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
            const angleLineColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
            const labelColor = isDark ? '#8e8e93' : '#5a5955';

            window.skillsRadarChart = new Chart(ctx, {
                type: 'radar',
                data: {
                    labels: ['Extroversão', 'Conscienciosidade', 'Estabilidade', 'Amabilidade', 'Abertura'],
                    datasets: [{
                        label: 'Atributos Big Five',
                        data: c.pontuacoes,
                        backgroundColor: 'rgba(79, 70, 229, 0.16)', // Muted Indigo
                        borderColor: '#4f46e5', // Indigo
                        borderWidth: 2,
                        pointBackgroundColor: '#4f46e5',
                        pointBorderColor: '#fff',
                        pointHoverBackgroundColor: '#fff',
                        pointHoverBorderColor: '#4f46e5',
                        pointRadius: 3
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false }
                    },
                    scales: {
                        r: {
                            min: 0,
                            max: 100,
                            ticks: {
                                stepSize: 20,
                                display: false
                            },
                            grid: {
                                color: gridColor
                            },
                            angleLines: {
                                color: angleLineColor
                            },
                            pointLabels: {
                                color: labelColor,
                                font: {
                                    family: "'Outfit', sans-serif",
                                    size: 9.5,
                                    weight: '700'
                                }
                            }
                        }
                    }
                }
            });
        }, 150);
    }

    window.closeSkillsDrawer = function() {
        document.getElementById('skills-drawer').classList.remove('open');
        document.getElementById('skills-drawer-overlay').classList.remove('open');
    }

    // ─── MODAL NOVA TRILHA CAPACITAÇÃO ────────────────────────────────────────
    window.openNewCapacitacaoModal = function() {
        let modalEl = document.getElementById('skills-capacitacao-modal');
        if (!modalEl) {
            modalEl = document.createElement('div');
            modalEl.id = 'skills-capacitacao-modal';
            document.body.appendChild(modalEl);
        }

        modalEl.innerHTML = `
            <div class="comp-modal-detail-overlay" onclick="closeNewCapacitacaoModal()">
                <div class="comp-modal-detail-card" style="width:480px;" onclick="event.stopPropagation()">
                    <div class="comp-modal-detail-header">
                        <h4 style="font-weight:900; letter-spacing:-0.03em; margin:0; display:flex; align-items:center; gap:8px; color:var(--text-main); font-family:'Plus Jakarta Sans', sans-serif;">
                            <i data-lucide="graduation-cap" style="color:var(--success); width:18px;"></i>
                            <span>Nova Trilha de Aperfeiçoamento</span>
                        </h4>
                        <button class="close-btn" onclick="closeNewCapacitacaoModal()"><i data-lucide="x"></i></button>
                    </div>
                    <form onsubmit="saveNewCapacitacao(event)">
                        <div class="comp-modal-detail-body">
                            <div class="form-grid">
                                <div class="form-group col-12" style="margin-bottom:12px;">
                                    <label class="form-label">Nome da Trilha / Treinamento</label>
                                    <input type="text" class="form-control" id="modal-sc-nome" placeholder="Ex: Treinamento Liderança Dinâmica..." required>
                                </div>
                                <div class="form-group col-12" style="margin-bottom:12px;">
                                    <label class="form-label">Público-Alvo</label>
                                    <input type="text" class="form-control" id="modal-sc-publico" placeholder="Ex: Gestores e Business Partners..." required>
                                </div>
                                <div class="form-group col-12" style="margin-bottom:12px;">
                                    <label class="form-label">Competência Sócioemocional Focada</label>
                                    <input type="text" class="form-control" id="modal-sc-skill" placeholder="Ex: Resiliência / Inteligência Emocional..." required>
                                </div>
                                <div class="form-group col-6" style="margin-bottom:12px;">
                                    <label class="form-label">Progresso Inicial (%)</label>
                                    <input type="number" min="0" max="100" class="form-control" id="modal-sc-progresso" value="0" required>
                                </div>
                                <div class="form-group col-6" style="margin-bottom:12px;">
                                    <label class="form-label">Status</label>
                                    <select class="form-control" id="modal-sc-status">
                                        <option value="Planejado">Planejado</option>
                                        <option value="Em Andamento">Em Andamento</option>
                                        <option value="Concluído">Concluído</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer" style="padding:14px 24px; border-top:1px solid var(--border-soft); background:var(--bg-app); display:flex; justify-content:flex-end; gap:10px;">
                            <button type="button" class="btn-cancel" onclick="closeNewCapacitacaoModal()">Cancelar</button>
                            <button type="submit" class="btn-save">Criar Trilha</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        if (window.lucide) lucide.createIcons();
    }

    window.closeNewCapacitacaoModal = function() {
        const modal = document.getElementById('skills-capacitacao-modal');
        if (modal) {
            modal.innerHTML = '';
        }
    }

    window.saveNewCapacitacao = function(event) {
        event.preventDefault();

        const nome = document.getElementById('modal-sc-nome').value.trim();
        const publico = document.getElementById('modal-sc-publico').value.trim();
        const skill = document.getElementById('modal-sc-skill').value.trim();
        const progresso = parseInt(document.getElementById('modal-sc-progresso').value || 0);
        const status = document.getElementById('modal-sc-status').value;

        if (!nome) return;

        const newId = state.skills_capacitacao.length > 0 ? Math.max(...state.skills_capacitacao.map(t => t.id)) + 1 : 1;

        state.skills_capacitacao.push({
            id: newId,
            nome,
            publico,
            skill,
            progresso,
            status
        });

        // Recalcular
        renderKPIs();
        renderCapacitacao();
        closeNewCapacitacaoModal();
    }

    window.removeCapacitacaoTrilha = function(id) {
        if (confirm('Deseja excluir permanentemente esta trilha de desenvolvimento?')) {
            state.skills_capacitacao = state.skills_capacitacao.filter(t => t.id !== id);
            
            // Recalcular
            renderKPIs();
            renderCapacitacao();
        }
    }
}







