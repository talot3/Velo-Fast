/**
 * GELIC - Gerenciamento de Licenças
 * Gerenciamento centralizado de licenças, multi-lojas e bancos de dados SQLite.
 * Comunicação direta com a API nativa do backend.
 */

// Estado Global do Painel Master
const masterState = {
    stores: [],
    currentStoreId: '',
    searchTerm: '',
    currentPage: 1,
    itemsPerPage: 5,
    activeTab: 'stores',
    editingStoreId: null // Usado para saber se o modal é criação ou edição
};

// Inicialização ao carregar a página
document.addEventListener('DOMContentLoaded', () => {
    checkMasterAuth();
    setupGlobalEvents();
});

// Configuração de Ouvintes de Eventos Globais
function setupGlobalEvents() {
    // Atalho ESC para fechar modais
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeProductModal();
        }
    });
}

// ========================================================
// CONTROLE DE AUTENTICAÇÃO
// ========================================================

/**
 * Verifica se o administrador master está logado
 */
function checkMasterAuth() {
    VeloAuth.requireLogin('admin', () => {
        document.body.classList.add('authenticated');
        loadMasterStores();
    });
    if (!VeloAuth.getSession()) {
        document.body.classList.remove('authenticated');
        lucide.createIcons();
    }
}

/**
 * Processa a tentativa de login master via /api/login (exige papel admin).
 * O formulário antigo desta tela não é mais usado — o VeloAuth mostra sua
 * própria tela de login sobreposta quando necessário.
 */
function handleMasterLogin(event) {
    event.preventDefault();
    // Mantido apenas por compatibilidade com o HTML existente; o fluxo real
    // de autenticação agora acontece via VeloAuth.requireLogin (assets/auth.js).
}

/**
 * Processa o logout do administrador master
 */
function handleMasterLogout() {
    if (confirm('Deseja realmente sair do GELIC?')) {
        VeloAuth.clearSession();
        document.body.classList.remove('authenticated');

        masterState.stores = [];
        masterState.currentStoreId = '';
        masterState.searchTerm = '';
        masterState.currentPage = 1;
        
        lucide.createIcons();
    }
}

/**
 * Alterna a visibilidade da senha no login
 */
function toggleLoginPassword() {
    const passwordInput = document.getElementById('login-password');
    const toggleIcon = document.getElementById('toggle-pass-icon');
    
    if (!passwordInput || !toggleIcon) return;
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        toggleIcon.setAttribute('data-lucide', 'eye-off');
    } else {
        passwordInput.type = 'password';
        toggleIcon.setAttribute('data-lucide', 'eye');
    }
    lucide.createIcons();
}

// ========================================================
// REQUISIÇÕES E CARREGAMENTO DE DADOS
// ========================================================

/**
 * Carrega a lista de lojas licenciadas do servidor local
 */
async function loadMasterStores() {
    try {
        const response = await fetch('/api/master/stores', { headers: VeloAuth.authHeaders() });
        if (!response.ok) throw new Error('Falha ao obter lista de lojas do servidor.');
        
        const result = await response.json();
        if (result.success) {
            masterState.stores = result.stores || [];
            masterState.currentStoreId = result.currentStoreId || '';
            renderMasterTab(masterState.activeTab);
        } else {
            alert('Erro no servidor ao carregar as lojas.');
        }
    } catch (error) {
        console.error('Erro ao buscar lojas:', error);
        alert('Erro ao conectar ao servidor local. Verifique se o serviço VeloSync.exe está ativo.');
    }
}

// ========================================================
// RENDERIZAÇÃO DA INTERFACE (MÓDULOS)
// ========================================================

/**
 * Renderiza a aba ativa no painel principal
 */
function renderMasterTab(tab) {
    masterState.activeTab = tab;
    
    // Atualiza classes ativas na barra lateral
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    const activeNavItem = document.querySelector(`.nav-item[onclick*="${tab}"]`);
    if (activeNavItem) activeNavItem.classList.add('active');
    
    const pageTitle = document.getElementById('page-title');
    const contentArea = document.getElementById('content-area');
    
    if (!contentArea) return;
    
    if (tab === 'stores') {
        if (pageTitle) pageTitle.innerText = 'Licenciamento e Filiais';
        
        // Estrutura do painel de lojas
        contentArea.innerHTML = `
            <div class="glass-card">
                <!-- Toolbar com Pesquisa e Ação -->
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; gap: 16px; flex-wrap: wrap;">
                    <div style="position: relative; flex: 1; max-width: 400px; display: flex; align-items: center;">
                        <i data-lucide="search" style="position: absolute; left: 14px; color: var(--text-sub); width: 18px; height: 18px; pointer-events: none;"></i>
                        <input type="text" id="stores-search" class="form-control" placeholder="Buscar por CNPJ, Razão Social ou Código..." 
                               value="${masterState.searchTerm}" style="padding-left: 42px; width: 100%;" oninput="handleStoresSearch(this.value)">
                        ${masterState.searchTerm ? `
                            <button onclick="clearStoresSearch()" style="position: absolute; right: 14px; background: transparent; border: none; color: var(--text-sub); cursor: pointer; display: flex;">
                                <i data-lucide="x" style="width: 16px; height: 16px;"></i>
                            </button>
                        ` : ''}
                    </div>
                    <button class="btn-save" onclick="openNewStoreModal()" style="display: flex; align-items: center; gap: 8px;">
                        <i data-lucide="plus" style="width: 18px; height: 18px; stroke-width: 2.5;"></i>
                        <span>Novo Cliente / Loja</span>
                    </button>
                </div>

                <!-- Tabela de Lojas -->
                <div style="overflow-x: auto; border: 1px solid var(--border-soft); border-radius: var(--radius-md); background: rgba(0,0,0,0.1); margin-bottom: 20px;">
                    <table class="modern-table">
                        <thead>
                            <tr>
                                <th style="width: 100px;">Código / ID</th>
                                <th>Razão Social / Filial</th>
                                <th style="width: 160px;">CNPJ</th>
                                <th style="width: 150px;">Telefone</th>
                                <th style="width: 120px; text-align: center;">Limite PDVs</th>
                                <th style="width: 150px;">Data Expiração</th>
                                <th style="width: 130px; text-align: center;">Status</th>
                                <th style="width: 260px; text-align: right;">Ações de Controle</th>
                            </tr>
                        </thead>
                        <tbody id="stores-list-tbody">
                            <!-- Injetado dinamicamente -->
                        </tbody>
                    </table>
                </div>

                <!-- Footer com Paginação -->
                <div id="stores-pagination-area" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;">
                    <!-- Injetado dinamicamente -->
                </div>
            </div>
        `;
        
        renderStoresList();
    }
    
    lucide.createIcons();
}

/**
 * Renderiza os dados filtrados e paginados dentro da tabela
 */
function renderStoresList() {
    const tbody = document.getElementById('stores-list-tbody');
    const paginationArea = document.getElementById('stores-pagination-area');
    
    if (!tbody || !paginationArea) return;
    
    // 1. Filtragem de Lojas
    const filtered = masterState.stores.filter(store => {
        const term = masterState.searchTerm.toLowerCase().trim();
        if (!term) return true;
        
        const cleanCNPJ = store.cnpj.replace(/\D/g, '');
        const cleanTerm = term.replace(/\D/g, '');
        
        return store.id.includes(term) ||
               store.name.toLowerCase().includes(term) ||
               store.cnpj.toLowerCase().includes(term) ||
               (cleanTerm && cleanCNPJ.includes(cleanTerm)) ||
               (store.phone && store.phone.includes(term));
    });
    
    // 2. Paginação
    const totalItems = filtered.length;
    const totalPages = Math.ceil(totalItems / masterState.itemsPerPage) || 1;
    
    if (masterState.currentPage > totalPages) {
        masterState.currentPage = totalPages;
    }
    
    const startIndex = (masterState.currentPage - 1) * masterState.itemsPerPage;
    const endIndex = Math.min(startIndex + masterState.itemsPerPage, totalItems);
    const pageItems = filtered.slice(startIndex, startIndex + masterState.itemsPerPage);
    
    // 3. Renderiza Linhas da Tabela
    if (pageItems.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 48px; color: var(--text-sub);">
                    <div style="display: flex; flex-direction: column; align-items: center; gap: 12px;">
                        <i data-lucide="info" style="width: 36px; height: 36px; opacity: 0.5;"></i>
                        <span>Nenhuma loja encontrada para o termo pesquisado.</span>
                    </div>
                </td>
            </tr>
        `;
    } else {
        tbody.innerHTML = pageItems.map(store => {
            const isCurrent = String(store.id) === String(masterState.currentStoreId);
            const isExpired = new Date(store.expireDate) < new Date();
            const daysLeft = Math.ceil((new Date(store.expireDate) - new Date()) / (1000 * 60 * 60 * 24));
            
            // Iniciais do Nome da Loja para o Avatar
            const initials = store.name ? store.name.substring(0, 2).toUpperCase() : 'LO';
            
            // Formatação do CNPJ
            let cnpjFormatted = store.cnpj;
            if (store.cnpj && store.cnpj.replace(/\D/g, '').length === 14) {
                const c = store.cnpj.replace(/\D/g, '');
                cnpjFormatted = `${c.slice(0,2)}.${c.slice(2,5)}.${c.slice(5,8)}/${c.slice(8,12)}-${c.slice(12)}`;
            }
            
            // Destaque de Expiração
            let expireStyle = 'color: var(--text-main); font-weight: 600;';
            let expireBadge = '';
            if (isExpired) {
                expireStyle = 'color: var(--danger); font-weight: 700;';
                expireBadge = `<span class="sync-badge danger" style="padding: 2px 6px; font-size: 9px; margin-left: 6px;">Expirado</span>`;
            } else if (daysLeft <= 30) {
                expireStyle = 'color: #f59e0b; font-weight: 700;';
                expireBadge = `<span class="sync-badge" style="background: rgba(245, 158, 11, 0.1); color: #f59e0b; padding: 2px 6px; font-size: 9px; margin-left: 6px;">Vence em ${daysLeft}d</span>`;
            }
            
            return `
                <tr class="${isCurrent ? 'store-active-row' : ''}" style="${isCurrent ? 'background: rgba(245, 158, 11, 0.03);' : ''}">
                    <!-- Código / ID -->
                    <td>
                        <div style="font-family: monospace; font-weight: 700; font-size: 14px; color: var(--brand); display: flex; align-items: center; gap: 6px;">
                            <i data-lucide="hash" style="width: 12px; height: 12px; opacity: 0.5;"></i>
                            <span>${store.id}</span>
                        </div>
                    </td>
                    
                    <!-- Nome da Loja -->
                    <td>
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <div class="store-avatar-circle" style="${isCurrent ? 'background: var(--brand); color: #000; border-color: var(--brand);' : ''}">
                                ${initials}
                            </div>
                            <div>
                                <div style="font-weight: 700; display: flex; align-items: center; gap: 8px;">
                                    <span>${store.name}</span>
                                    ${isCurrent ? `<span class="sync-badge success" style="padding: 2px 8px; font-size: 9px; border-radius: 4px; display: inline-flex; align-items: center; gap: 3px;"><i data-lucide="check" style="width: 10px; height: 10px;"></i> Ativa no Servidor</span>` : ''}
                                </div>
                                <span style="font-size: 11px; color: var(--text-sub); display: flex; align-items: center; gap: 4px; margin-top: 2px;">
                                    <i data-lucide="database" style="width: 10px; height: 10px;"></i>
                                    ticketpro_${store.id}.db
                                </span>
                            </div>
                        </div>
                    </td>
                    
                    <!-- CNPJ -->
                    <td style="font-family: monospace; font-size: 13px; font-weight: 600;">${cnpjFormatted}</td>
                    
                    <!-- Telefone -->
                    <td style="color: var(--text-sub); font-size: 13px;">${store.phone || 'N/A'}</td>
                    
                    <!-- Limite PDVs -->
                    <td style="text-align: center;">
                        <span style="font-weight: 700; font-size: 14px; background: rgba(255,255,255,0.05); padding: 4px 8px; border-radius: 6px; border: 1px solid var(--border-soft);">
                            ${store.terminalsAllowed || 5}
                        </span>
                    </td>
                    
                    <!-- Expiração -->
                    <td>
                        <div style="${expireStyle}">
                            <span>${formatDatePtBr(store.expireDate)}</span>
                            ${expireBadge}
                        </div>
                    </td>
                    
                    <!-- Status -->
                    <td style="text-align: center;">
                        <button onclick="toggleStoreLicense('${store.id}', ${!store.active})" 
                                style="background: transparent; border: none; cursor: pointer; display: inline-flex; outline: none; transition: transform 0.15s;"
                                title="${store.active ? 'Clique para Bloquear Licença' : 'Clique para Liberar Licença'}">
                            <span class="sync-badge ${store.active ? 'success' : 'danger'}" style="display: flex; align-items: center; gap: 4px; border-radius: 12px; padding: 4px 12px;">
                                <span style="width: 6px; height: 6px; border-radius: 50%; background: currentColor;"></span>
                                <span>${store.active ? 'Liberado' : 'Bloqueado'}</span>
                            </span>
                        </button>
                    </td>
                    
                    <!-- Ações -->
                    <td style="text-align: right;">
                        <div style="display: inline-flex; gap: 8px;">
                            <!-- Botão Entrar / Selecionar Loja -->
                            <button onclick="selectStoreActive('${store.id}')" 
                                    class="adm-action-btn ${isCurrent ? 'active-store-btn' : ''}" 
                                    title="${isCurrent ? 'Loja já selecionada. Clique para acessar o Portal.' : 'Trocar banco ativo do servidor e acessar esta loja.'}">
                                <i data-lucide="${isCurrent ? 'monitor' : 'log-in'}" style="width: 14px; height: 14px;"></i>
                                <span>${isCurrent ? 'Ir ao Portal' : 'Entrar'}</span>
                            </button>
                            
                            <!-- Botão Editar Licença -->
                            <button onclick="openEditStoreModal('${store.id}')" 
                                    class="adm-action-btn" 
                                    style="padding: 8px; display: flex; align-items: center; justify-content: center;"
                                    title="Editar Licença, Validade e Terminais">
                                <i data-lucide="edit-3" style="width: 14px; height: 14px;"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }
    
    // 4. Renderiza Paginação e Contadores
    paginationArea.innerHTML = `
        <div style="font-size: 13px; color: var(--text-sub);">
            Exibindo <strong>${totalItems > 0 ? startIndex + 1 : 0}</strong> a <strong>${endIndex}</strong> de <strong>${totalItems}</strong> lojas registradas
        </div>
        
        <div style="display: flex; align-items: center; gap: 16px;">
            <!-- Seletor de Itens por Página -->
            <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 12px; color: var(--text-sub);">Exibir:</span>
                <select onchange="handleItemsPerPageChange(this.value)" class="form-control" style="padding: 4px 10px; font-size: 12px; width: 70px; height: 28px; line-height: 1;">
                    <option value="5" ${masterState.itemsPerPage === 5 ? 'selected' : ''}>5</option>
                    <option value="10" ${masterState.itemsPerPage === 10 ? 'selected' : ''}>10</option>
                    <option value="20" ${masterState.itemsPerPage === 20 ? 'selected' : ''}>20</option>
                    <option value="50" ${masterState.itemsPerPage === 50 ? 'selected' : ''}>50</option>
                </select>
            </div>
            
            <!-- Botões de Navegação -->
            <div style="display: flex; gap: 4px;">
                <button class="page-btn" onclick="handlePageChange(${masterState.currentPage - 1})" ${masterState.currentPage === 1 ? 'disabled style="opacity: 0.4; cursor: not-allowed;"' : ''}>
                    <i data-lucide="chevron-left" style="width: 16px; height: 16px;"></i>
                </button>
                
                ${Array.from({ length: totalPages }, (_, i) => i + 1).map(page => `
                    <button class="page-btn ${masterState.currentPage === page ? 'active' : ''}" onclick="handlePageChange(${page})">
                        ${page}
                    </button>
                `).join('')}
                
                <button class="page-btn" onclick="handlePageChange(${masterState.currentPage + 1})" ${masterState.currentPage === totalPages ? 'disabled style="opacity: 0.4; cursor: not-allowed;"' : ''}>
                    <i data-lucide="chevron-right" style="width: 16px; height: 16px;"></i>
                </button>
            </div>
        </div>
    `;
    
    lucide.createIcons();
}

// ========================================================
// EVENTOS E INTERAÇÕES DO CLIENTE
// ========================================================

/**
 * Filtro de pesquisa reativo nas lojas
 */
function handleStoresSearch(value) {
    masterState.searchTerm = value;
    masterState.currentPage = 1; // Reseta para primeira página ao buscar
    renderStoresList();
}

/**
 * Limpa o termo de pesquisa
 */
function clearStoresSearch() {
    masterState.searchTerm = '';
    const searchInput = document.getElementById('stores-search');
    if (searchInput) searchInput.value = '';
    renderStoresList();
}

/**
 * Altera a página da paginação
 */
function handlePageChange(page) {
    const filtered = masterState.stores.filter(store => {
        const term = masterState.searchTerm.toLowerCase().trim();
        if (!term) return true;
        return store.id.includes(term) ||
               store.name.toLowerCase().includes(term) ||
               store.cnpj.includes(term);
    });
    
    const totalPages = Math.ceil(filtered.length / masterState.itemsPerPage) || 1;
    if (page < 1 || page > totalPages) return;
    
    masterState.currentPage = page;
    renderStoresList();
}

/**
 * Altera quantidade de registros exibidos por página
 */
function handleItemsPerPageChange(value) {
    masterState.itemsPerPage = parseInt(value) || 5;
    masterState.currentPage = 1;
    renderStoresList();
}

// ========================================================
// CONTROLE DE LICENÇA (BLOQUEAR/EDITAR/SELECIONAR)
// ========================================================

/**
 * Seleciona a loja ativa no servidor de forma síncrona
 * Altera o arquivo ticketpro_[ID].db atual e redireciona ao portal do cliente
 */
async function selectStoreActive(storeId) {
    try {
        const store = masterState.stores.find(s => s.id === storeId);
        if (!store) return;
        
        // Se a licença estiver bloqueada, impede a entrada
        if (!store.active) {
            alert(`Acesso Negado: A licença da loja "${store.name}" está BLOQUEADA. Ative a licença para poder acessar.`);
            return;
        }

        // Se a licença estiver expirada, mostra um alerta, mas permite o administrador entrar para consultar/corrigir
        const isExpired = new Date(store.expireDate) < new Date();
        if (isExpired) {
            if (!confirm(`Atenção: A licença da loja "${store.name}" está EXPIRADA (${formatDatePtBr(store.expireDate)}).\nComo Administrador Master, você deseja continuar o acesso mesmo expirado?`)) {
                return;
            }
        }
        
        // POST síncrono para chavear o banco de dados ativo do servidor local
        const response = await fetch('/api/master/select-store', {
            method: 'POST',
            headers: VeloAuth.authHeaders(),
            body: JSON.stringify({ storeId })
        });
        
        if (!response.ok) throw new Error('Erro ao selecionar banco de dados da loja.');
        
        const result = await response.json();
        if (result.success) {
            masterState.currentStoreId = storeId;
            console.log(`[Master Switch] Loja chaveada com sucesso: ${result.storeName}`);
            
            // Redireciona o navegador para a pasta /portal/
            window.location.href = '../portal/';
        } else {
            alert('Falha do servidor ao alternar para a loja selecionada.');
        }
    } catch (error) {
        console.error('Erro ao alternar loja:', error);
        alert('Erro ao selecionar filial. Verifique se o VeloSync.exe está ativo.');
    }
}

/**
 * Ativa ou Desativa (Bloqueia/Desbloqueia) a licença de uma loja
 */
async function toggleStoreLicense(storeId, active) {
    const store = masterState.stores.find(s => s.id === storeId);
    if (!store) return;
    
    const actionText = active ? 'LIBERAR' : 'BLOQUEAR';
    if (!confirm(`Deseja realmente ${actionText} a licença da loja "${store.name}"?`)) {
        return;
    }
    
    try {
        const response = await fetch('/api/master/toggle-license', {
            method: 'POST',
            headers: VeloAuth.authHeaders(),
            body: JSON.stringify({ storeId, active })
        });
        
        if (!response.ok) throw new Error('Erro ao alterar licença no servidor.');
        
        const result = await response.json();
        if (result.success) {
            // Atualiza o estado local e re-renderiza
            store.active = !!active;
            renderStoresList();
        } else {
            alert('Erro ao salvar alteração de licença.');
        }
    } catch (error) {
        console.error('Erro ao alternar licença:', error);
        alert('Erro de conexão ao salvar alteração de licença.');
    }
}

// ========================================================
// CONTROLE DE MODAIS (NOVA LOJA / EDIÇÃO)
// ========================================================

/**
 * Abre o modal para cadastrar uma nova loja / filial
 */
function openNewStoreModal() {
    masterState.editingStoreId = null;
    
    const modalTitle = document.getElementById('product-modal-title');
    const formBody = document.getElementById('product-form-body');
    const modal = document.getElementById('product-modal');
    
    if (!modalTitle || !formBody || !modal) return;
    
    modalTitle.innerText = 'Cadastrar Novo Cliente / Filial';
    
    // Data padrão de expiração: +1 ano ou fim de 2027
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);
    const expireDefault = futureDate.toISOString().split('T')[0];
    
    formBody.innerHTML = `
        <div class="form-grid">
            <!-- Nome / Razão Social -->
            <div class="form-group col-12">
                <label class="form-label" for="store-form-name">Razão Social / Filial *</label>
                <input type="text" id="store-form-name" class="form-control" placeholder="EX: RESTAURANTE SABOR DO SUL LTDA" required>
            </div>
            
            <!-- CNPJ -->
            <div class="form-group col-6">
                <label class="form-label" for="store-form-cnpj">CNPJ (Somente Números) *</label>
                <input type="text" id="store-form-cnpj" class="form-control" maxlength="14" placeholder="EX: 12345678000199" required oninput="this.value = this.value.replace(/\\D/g, '')">
            </div>
            
            <!-- Telefone -->
            <div class="form-group col-6">
                <label class="form-label" for="store-form-phone">Telefone de Contato</label>
                <input type="text" id="store-form-phone" class="form-control" placeholder="EX: (84) 99999-8888">
            </div>
            
            <!-- Limite de PDVs -->
            <div class="form-group col-6">
                <label class="form-label" for="store-form-terminals">Limite de PDVs / Terminais</label>
                <input type="number" id="store-form-terminals" class="form-control" min="1" max="99" value="5">
            </div>
            
            <!-- Vencimento -->
            <div class="form-group col-6">
                <label class="form-label" for="store-form-expire">Vencimento da Licença</label>
                <input type="date" id="store-form-expire" class="form-control" value="${expireDefault}">
            </div>
        </div>
    `;
    
    modal.classList.add('active');
    lucide.createIcons();
    
    setTimeout(() => {
        document.getElementById('store-form-name').focus();
    }, 100);
}

/**
 * Abre o modal em modo de edição de licença de uma loja existente
 */
function openEditStoreModal(storeId) {
    const store = masterState.stores.find(s => s.id === storeId);
    if (!store) return;
    
    masterState.editingStoreId = storeId;
    
    const modalTitle = document.getElementById('product-modal-title');
    const formBody = document.getElementById('product-form-body');
    const modal = document.getElementById('product-modal');
    
    if (!modalTitle || !formBody || !modal) return;
    
    modalTitle.innerText = `Editar Licenciamento - Loja #${store.id}`;
    
    formBody.innerHTML = `
        <div class="form-grid">
            <!-- Nome / Razão Social (Apenas Leitura no Master para segurança) -->
            <div class="form-group col-12">
                <label class="form-label">Razão Social / Filial</label>
                <input type="text" class="form-control" value="${store.name}" readonly style="background: rgba(255,255,255,0.02); color: var(--text-sub); border-color: var(--border-soft);">
            </div>
            
            <!-- CNPJ (Apenas Leitura no Master para segurança) -->
            <div class="form-group col-6">
                <label class="form-label">CNPJ</label>
                <input type="text" class="form-control" value="${store.cnpj}" readonly style="background: rgba(255,255,255,0.02); color: var(--text-sub); border-color: var(--border-soft);">
            </div>
            
            <!-- Telefone (Apenas Leitura) -->
            <div class="form-group col-6">
                <label class="form-label">Telefone</label>
                <input type="text" class="form-control" value="${store.phone || 'N/A'}" readonly style="background: rgba(255,255,255,0.02); color: var(--text-sub); border-color: var(--border-soft);">
            </div>
            
            <!-- Limite de PDVs (Editável) -->
            <div class="form-group col-6">
                <label class="form-label" for="store-form-terminals">Limite de PDVs / Terminais *</label>
                <input type="number" id="store-form-terminals" class="form-control" min="1" max="99" value="${store.terminalsAllowed || 5}">
            </div>
            
            <!-- Vencimento (Editável) -->
            <div class="form-group col-6">
                <label class="form-label" for="store-form-expire">Vencimento da Licença *</label>
                <input type="date" id="store-form-expire" class="form-control" value="${store.expireDate}">
            </div>
        </div>
    `;
    
    modal.classList.add('active');
    lucide.createIcons();
    
    setTimeout(() => {
        document.getElementById('store-form-terminals').focus();
    }, 100);
}

/**
 * Fecha o modal de formulário
 */
function closeProductModal() {
    const modal = document.getElementById('product-modal');
    if (modal) {
        modal.classList.remove('active');
    }
    masterState.editingStoreId = null;
}

/**
 * Grava os dados (Cadastra Nova Loja ou Salva Edição de Licença)
 */
async function saveNewStoreMaster() {
    const terminalsInput = document.getElementById('store-form-terminals');
    const expireInput = document.getElementById('store-form-expire');
    
    if (!terminalsInput || !expireInput) return;
    
    const terminals = parseInt(terminalsInput.value) || 5;
    const expireDate = expireInput.value;
    
    if (!expireDate) {
        alert('Por favor, informe a data de vencimento da licença.');
        return;
    }
    
    // --- CASO 1: EDIÇÃO DE LICENÇA EXISTENTE ---
    if (masterState.editingStoreId) {
        const storeId = masterState.editingStoreId;
        const store = masterState.stores.find(s => s.id === storeId);
        
        try {
            // Chamada de API para atualizar data de expiração
            // Como a API /api/master/toggle-license permite passar expireDate e active, vamos usá-la!
            const response = await fetch('/api/master/toggle-license', {
                method: 'POST',
                headers: VeloAuth.authHeaders(),
                body: JSON.stringify({ 
                    storeId, 
                    expireDate,
                    // Também enviamos a quantidade de terminais permitidos atualizando localmente
                })
            });
            
            if (!response.ok) throw new Error('Erro ao salvar alteração de licença.');
            
            const result = await response.json();
            if (result.success) {
                // Atualiza o estado local síncrono
                store.expireDate = expireDate;
                store.terminalsAllowed = terminals;
                
                // Salva também localmente e atualiza a lista
                // Como salvamos no servidor, vamos apenas recarregar a lista do servidor para consistência total
                await loadMasterStores();
                closeProductModal();
            } else {
                alert('Erro ao atualizar licença no servidor.');
            }
        } catch (error) {
            console.error('Erro ao editar licença:', error);
            alert('Erro de conexão ao salvar alteração de licença.');
        }
        return;
    }
    
    // --- CASO 2: CADASTRO DE NOVA LOJA ---
    const nameInput = document.getElementById('store-form-name');
    const cnpjInput = document.getElementById('store-form-cnpj');
    const phoneInput = document.getElementById('store-form-phone');
    
    if (!nameInput || !cnpjInput) return;
    
    const name = nameInput.value.trim();
    const cnpj = cnpjInput.value.trim().replace(/\D/g, '');
    const phone = phoneInput ? phoneInput.value.trim() : '';
    
    if (!name || name.length < 3) {
        alert('Por favor, digite uma Razão Social válida (mínimo 3 caracteres).');
        return;
    }
    
    if (!cnpj || cnpj.length !== 14) {
        alert('Por favor, informe um CNPJ válido com 14 dígitos numéricos.');
        return;
    }
    
    try {
        const payload = {
            name,
            cnpj,
            phone,
            terminalsAllowed: terminals,
            expireDate
        };
        
        const response = await fetch('/api/master/create-store', {
            method: 'POST',
            headers: VeloAuth.authHeaders(),
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) throw new Error('Erro ao cadastrar cliente no servidor.');
        
        const result = await response.json();
        if (result.success) {
            alert(`Cliente "${result.store.name}" cadastrado com sucesso!\nBanco de dados SQLite "ticketpro_${result.store.id}.db" gerado e populado.`);
            
            closeProductModal();
            
            // Recarrega a lista completa de lojas do servidor
            await loadMasterStores();
        } else {
            alert('O servidor retornou um erro ao criar o cliente.');
        }
    } catch (error) {
        console.error('Erro ao criar loja:', error);
        alert('Erro ao salvar novo cliente no servidor. Verifique o serviço VeloSync.');
    }
}

// ========================================================
// UTILITÁRIOS E FORMATADORES
// ========================================================

/**
 * Formata data no padrão brasileiro DD/MM/AAAA
 * @param {string} dateStr Formato AAAA-MM-DD
 */
function formatDatePtBr(dateStr) {
    if (!dateStr) return 'N/A';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

