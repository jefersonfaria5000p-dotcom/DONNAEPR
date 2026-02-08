// ============================================================
// 1. INICIALIZAÇÃO E VARIÁVEIS GLOBAIS
// ============================================================

// Verifica se o Supabase carregou
if (typeof supabase === 'undefined') {
    console.error("❌ ERRO CRÍTICO: Biblioteca Supabase não encontrada!");
    alert("Erro de conexão com o banco de dados.");
}

const { createClient } = supabase;

// ⚠️ SUAS CHAVES (Mantenha as suas se já estiverem funcionando)
const SUPABASE_URL = 'https://adluzpbcaaupjexfsrll.supabase.co'; 
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFkbHV6cGJjYWF1cGpleGZzcmxsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1NDg4NDcsImV4cCI6MjA4NTEyNDg0N30.HKicaWu9hngcNWf6EODcUNCs039KOHiakjt0HTTyIDU'; 

var sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
console.log("✅ Supabase Admin Conectado!");

// Variáveis para guardar dados na memória
let manageUsersData = []; // Lista de usuários
let globalPlans = [];     // Lista de planos reais do banco
let chartInstance = null; // Gráfico

// ============================================================
// 2. INICIALIZAÇÃO DA PÁGINA
// ============================================================
document.addEventListener('DOMContentLoaded', async () => {
    console.log("🚀 Admin Iniciado");
    
    // 1. Busca os planos reais imediatamente
    await fetchRealPlans();

    // 2. Carrega a seção inicial (Dashboard)
    showSection('dashboard');

    // 3. Remove tela de carregamento
    setTimeout(() => {
        const loading = document.getElementById('loading');
        if (loading) {
            loading.style.opacity = '0';
            setTimeout(() => loading.style.display = 'none', 500);
        }
    }, 500);
});

// ============================================================
// NAVEGAÇÃO SEGURA ENTRE ABAS
// ============================================================
window.showSection = function(sectionId) {
    console.log("Navegando para:", sectionId);

    // 1. Lista de TODAS as abas que existem no seu HTML
    // Se você mudar o ID no HTML, tem que mudar aqui também!
    const allSections = [
        'dashboard-section', 
        'plans-section', 
        'users-manage-section', 
        'config-section' // <--- Certifique-se que esta está na lista
    ];

    // 2. Esconde todas (Com verificação de segurança)
    allSections.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.classList.add('hidden'); // Esconde se existir
        } else {
            console.warn(`⚠️ Aviso: A seção '${id}' não foi encontrada no HTML.`);
        }
    });

    // 3. Mostra a aba clicada
    const targetId = sectionId + '-section';
    const target = document.getElementById(targetId);
    
    if (target) {
        target.classList.remove('hidden'); // Mostra
    } else {
        console.error("❌ ERRO: Não existe uma div com id='" + targetId + "' no HTML.");
        return; // Para aqui se não achar
    }

    // 4. Carrega os dados daquela aba
    if(sectionId === 'plans') {
        if(typeof loadPlans === 'function') loadPlans();
    } else if(sectionId === 'users-manage') {
        if(typeof loadManageUsers === 'function') loadManageUsers();
    } else if(sectionId === 'config') {
        if(typeof loadConfig === 'function') loadConfig();
    } else {
        // Padrão: Dashboard
        if(typeof loadDashboardMetrics === 'function') loadDashboardMetrics();
    }
}

// ==========================================
// FUNÇÕES DE CONFIGURAÇÃO (NOVO)
// ==========================================

async function loadConfig() {
    console.log("⚙️ Carregando configurações...");
    try {
        // Pega a linha com ID 1
        const { data, error } = await sb.from('app_config').select('*').eq('id', 1).single();
        
        if (error) throw error;
        if (data) {
            document.getElementById('cfg_support_phone').value = data.support_phone || '';
            document.getElementById('cfg_admin_email').value = data.admin_email || '';
            document.getElementById('cfg_pix_key').value = data.pix_key || '';
            document.getElementById('cfg_maintenance').checked = data.maintenance_mode;
        }
    } catch (e) {
        console.error("Erro ao carregar config:", e);
        // Se não existir, cria a primeira linha
        await sb.from('app_config').insert([{ id: 1, support_phone: '' }]);
    }
}

window.saveConfig = async () => {
    const phone = document.getElementById('cfg_support_phone').value;
    const email = document.getElementById('cfg_admin_email').value;
    const pix = document.getElementById('cfg_pix_key').value;
    const maint = document.getElementById('cfg_maintenance').checked;

    const btn = event.target;
    btn.innerHTML = "Salvando...";
    btn.disabled = true;

    try {
        const { error } = await sb.from('app_config').update({
            support_phone: phone,
            admin_email: email,
            pix_key: pix,
            maintenance_mode: maint
        }).eq('id', 1);

        if(error) throw error;

        Swal.fire('Sucesso', 'Configurações atualizadas!', 'success');
    } catch (e) {
        console.error(e);
        Swal.fire('Erro', 'Falha ao salvar.', 'error');
    } finally {
        btn.innerHTML = '<i class="fas fa-save"></i> SALVAR CONFIGURAÇÕES';
        btn.disabled = false;
    }
}

// ============================================================
// 4. FUNÇÕES AUXILIARES DE BUSCA (DADOS REAIS)
// ============================================================

// Busca Planos do Banco (Fundamental para o Modal funcionar)
async function fetchRealPlans() {
    console.log("🔄 Buscando planos no banco...");
    const { data, error } = await sb.from('plans').select('*');
    if (!error && data) {
        globalPlans = data;
        console.log(`✅ ${globalPlans.length} planos carregados.`);
    } else {
        console.error("Erro ao buscar planos:", error);
    }
}

// ============================================================
// 5. DASHBOARD (MÉTRICAS E GRÁFICOS)
// ============================================================
// Variáveis para guardar as instâncias dos gráficos (para poder destruir e recriar)
let chartPlanosInstance = null;
let chartVendasInstance = null;

async function loadDashboardMetrics() {
    console.log("📊 Carregando Dashboard Pro...");
    
    // Indicador visual de carregamento nos números
    ['kpi-total-lojas', 'kpi-gmv', 'kpi-mrr'].forEach(id => {
        const el = document.getElementById(id);
        if(el) el.style.opacity = '0.5';
    });

    try {
        // 1. Garante planos carregados (para calcular MRR certo)
        if (globalPlans.length === 0) await fetchRealPlans();

        // 2. DEFINIÇÃO DE DATAS
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        
        // Data de 30 dias atrás (para o gráfico de linha)
        const trintaDiasAtras = new Date();
        trintaDiasAtras.setDate(now.getDate() - 30);
        const trintaDiasIso = trintaDiasAtras.toISOString();

        // 3. BUSCAS PARALELAS (MAIS RÁPIDO)
        const [resUsers, resTenants, resSales30d] = await Promise.all([
            sb.from('users').select('*'),
            sb.from('tenants').select('id, plan_status, tenant_id, company_name, created_at'),
            // Buscamos vendas dos últimos 30 dias (para gráfico e GMV recente)
            sb.from('sales').select('total_amount, created_at, tenant_id').gte('created_at', trintaDiasIso)
        ]);

        const users = resUsers.data || [];
        const tenants = resTenants.data || [];
        const sales = resSales30d.data || [];

        // --- CÁLCULOS DOS CARDS ---

        // A. Base de Lojas
        const totalLojas = tenants.length;
        const ativas = tenants.filter(t => t.plan_status === 'active').length;
        
        // Novas lojas este mês
        const novasLojasMes = tenants.filter(t => t.created_at >= startOfMonth).length;
        
        // Taxa de Atividade
        const taxaAtividade = totalLojas > 0 ? ((ativas / totalLojas) * 100).toFixed(0) : 0;

        // B. GMV (Volume dos últimos 30 dias)
        const gmvTotal = sales.reduce((acc, curr) => acc + (parseFloat(curr.total_amount) || 0), 0);

        // C. MRR (Receita Recorrente Mensal)
        let mrr = 0;
        const planCounts = {};
        
        // Cria mapa de preços
        const priceMap = {};
        globalPlans.forEach(p => { priceMap[p.id] = parseFloat(p.price) || 0; planCounts[p.name] = 0; });
        priceMap['free'] = 0; planCounts['Free/Outros'] = 0;

        users.forEach(u => {
            const pid = u.plan_type || 'free';
            // Soma MRR se ativo
            if (u.plan_status === 'active' && priceMap[pid]) {
                mrr += priceMap[pid];
            }
            // Conta Plano
            const pName = globalPlans.find(p => p.id === pid)?.name || 'Free/Outros';
            if (planCounts[pName] !== undefined) planCounts[pName]++;
            else planCounts[pName] = 1;
        });

        // --- ATUALIZAÇÃO DA TELA (DOM) ---
        
        // MRR
        animateValue("kpi-mrr", mrr, true);
        
        // GMV
        animateValue("kpi-gmv", gmvTotal, true);
        
        // Lojas
        document.getElementById('kpi-total-lojas').innerText = totalLojas;
        document.getElementById('badge-novas-lojas').innerText = `+${novasLojasMes}`;
        
        // Ativas
        document.getElementById('kpi-lojas-ativas').innerText = ativas;
        document.getElementById('taxa-atividade').innerText = `${taxaAtividade}% da base total`;

        // Restaura opacidade
        ['kpi-total-lojas', 'kpi-gmv', 'kpi-mrr'].forEach(id => document.getElementById(id).style.opacity = '1');

        // --- GRÁFICO 1: VENDAS POR DIA (Últimos 30 dias) ---
        prepareSalesChart(sales, trintaDiasAtras);

        // --- GRÁFICO 2: PLANOS (Pizza) ---
        renderChartPlanos(planCounts);

        // --- TABELA TOP LOJAS ---
        renderTopStores(sales, tenants, users);

        // --- TABELA RECENTES ---
        renderRecentUsers(users);

    } catch (error) {
        console.error("Erro Dashboard:", error);
    }
}

// ============================================================
// FUNÇÕES DE GRÁFICOS E TABELAS AVANÇADAS
// ============================================================

function prepareSalesChart(salesData, startDate) {
    const ctx = document.getElementById('chartVendas');
    if(!ctx) return;

    // 1. Prepara os dias (eixo X) e zera os valores
    const days = [];
    const values = [];
    const today = new Date();
    
    // Loop de 0 a 30 dias
    for(let i=0; i<=30; i++) {
        const d = new Date(startDate);
        d.setDate(d.getDate() + i);
        // String YYYY-MM-DD para comparar
        const dateStr = d.toISOString().split('T')[0]; 
        // String DD/MM para exibir
        const displayStr = `${d.getDate()}/${d.getMonth()+1}`;
        
        days.push(displayStr);
        
        // Soma vendas desse dia
        const totalDia = salesData
            .filter(s => s.created_at.startsWith(dateStr))
            .reduce((acc, curr) => acc + (parseFloat(curr.total_amount)||0), 0);
            
        values.push(totalDia);
    }

    if(chartVendasInstance) chartVendasInstance.destroy();

    chartVendasInstance = new Chart(ctx, {
        type: 'line', // Linha fica mais bonito para tendências
        data: {
            labels: days,
            datasets: [{
                label: 'Vendas (R$)',
                data: values,
                borderColor: '#3b82f6', // Azul Tailwind
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                borderWidth: 2,
                tension: 0.4, // Curva suave
                fill: true,
                pointRadius: 0, // Esconde bolinhas (só mostra no hover)
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, grid: { borderDash: [2, 2] } },
                x: { grid: { display: false } }
            },
            interaction: {
                intersect: false,
                mode: 'index',
            },
        }
    });
}

function renderChartPlanos(counts) {
    const ctx = document.getElementById('chartPlanos');
    if(!ctx) return;
    
    if(chartPlanosInstance) chartPlanosInstance.destroy();

    const labels = Object.keys(counts);
    const data = Object.values(counts);
    // Cores profissionais
    const colors = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#6b7280'];

    chartPlanosInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{ 
                data: data, 
                backgroundColor: colors, 
                borderWidth: 0,
                hoverOffset: 4
            }]
        },
        options: { 
            responsive: true, 
            maintainAspectRatio: false, 
            plugins: { 
                legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8 } } 
            },
            cutout: '70%' // Rosca mais fina (moderno)
        }
    });
}

function renderTopStores(sales, tenants, users) {
    const list = document.getElementById('top-stores-list');
    if(!list) return;

    // Agrupa vendas por loja
    const salesMap = {};
    sales.forEach(s => {
        if(!salesMap[s.tenant_id]) salesMap[s.tenant_id] = 0;
        salesMap[s.tenant_id] += (parseFloat(s.total_amount) || 0);
    });

    // Converte para array e ordena
    const ranked = Object.keys(salesMap).map(tid => {
        const loja = tenants.find(t => t.tenant_id === tid || t.id === tid);
        // Acha o user para ver o plano
        const user = users.find(u => u.email === (loja?.email)); 
        return {
            name: loja ? loja.company_name : 'Loja Desconhecida',
            total: salesMap[tid],
            plan: user ? (user.plan_type || 'free') : '?'
        };
    }).sort((a,b) => b.total - a.total).slice(0, 5);

    list.innerHTML = '';
    if(ranked.length === 0) {
        list.innerHTML = '<tr><td colspan="3" class="p-4 text-center text-gray-400 text-xs">Nenhuma venda nos últimos 30 dias.</td></tr>';
        return;
    }

    ranked.forEach((store, i) => {
        const medal = i === 0 ? '🥇' : (i === 1 ? '🥈' : (i === 2 ? '🥉' : `#${i+1}`));
        const planBadge = store.plan === 'free' ? 'bg-gray-100 text-gray-500' : 'bg-purple-100 text-purple-600';
        
        list.innerHTML += `
            <tr class="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition">
                <td class="p-3">
                    <div class="flex items-center gap-2">
                        <span class="text-sm font-bold w-6">${medal}</span>
                        <div>
                            <div class="font-bold text-gray-800 text-sm">${store.name}</div>
                            <span class="text-[10px] uppercase font-bold px-1.5 rounded ${planBadge}">${store.plan}</span>
                        </div>
                    </div>
                </td>
                <td class="p-3 text-right font-bold text-gray-700">
                    ${store.total.toLocaleString('pt-BR', {style:'currency', currency:'BRL'})}
                </td>
            </tr>
        `;
    });
}

// Função para animar números (Efeito visual profissional)
function animateValue(id, endValue, isCurrency = false) {
    const obj = document.getElementById(id);
    if(!obj) return;
    
    // Se for 0, mostra logo
    if(endValue === 0) {
        obj.innerHTML = isCurrency ? "R$ 0,00" : "0";
        return;
    }
    
    // Atualiza apenas o texto formatado
    obj.innerHTML = isCurrency 
        ? endValue.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})
        : endValue;
}

function renderChartDynamic(counts) {
    const ctx = document.getElementById('chartPlanos');
    if(!ctx) return;
    
    if(chartInstance) chartInstance.destroy();

    const labels = Object.keys(counts);
    const data = Object.values(counts);
    const colors = labels.map((_, i) => `hsl(${i * 60 + 200}, 70%, 60%)`);

    chartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{ data: data, backgroundColor: colors, borderWidth: 0 }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' } } }
    });
}

function renderRecentUsers(users) {
    const lista = document.getElementById('recent-users-list');
    if(!lista) return;
    
    // Ordena por data (mais recente primeiro) e pega 5
    const recentes = users.sort((a,b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5);
    
    lista.innerHTML = '';
    recentes.forEach(u => {
        const statusColor = u.plan_status === 'active' ? 'text-green-600' : 'text-red-500';
        lista.innerHTML += `
            <tr class="border-b border-gray-100 text-sm">
                <td class="py-2 px-2">${u.company_name || 'Sem nome'}</td>
                <td class="py-2 px-2 text-gray-500 text-xs">${new Date(u.created_at).toLocaleDateString('pt-BR')}</td>
                <td class="py-2 px-2 text-center font-bold text-xs ${statusColor}">${u.plan_status || '-'}</td>
            </tr>`;
    });
}

// ============================================================
// 6. GESTÃO DE USUÁRIOS (TABELA E MODAL)
// ============================================================

// Carrega a tabela de usuários
async function loadManageUsers() {
    const list = document.getElementById('manage-users-list');
    if(!list) return;

    list.innerHTML = `<tr><td colspan="5" class="text-center py-10">Carregando...</td></tr>`;

    try {
        const { data: users, error } = await sb.from('users').select('*').order('created_at', {ascending: false});
        if(error) throw error;
        
        manageUsersData = users || []; // Salva na global
        
        if(manageUsersData.length === 0) {
            list.innerHTML = `<tr><td colspan="5" class="text-center py-10">Nenhum usuário.</td></tr>`;
            return;
        }

        list.innerHTML = '';
        manageUsersData.forEach((u, index) => {
            const planName = u.plan_type ? u.plan_type.toUpperCase() : 'FREE';
            const statusBadge = u.plan_status === 'active' 
                ? '<span class="text-green-600 font-bold text-xs bg-green-100 px-2 py-1 rounded">ATIVO</span>' 
                : '<span class="text-red-600 font-bold text-xs bg-red-100 px-2 py-1 rounded">INATIVO</span>';

            list.innerHTML += `
                <tr class="hover:bg-gray-50 border-b transition">
                    <td class="py-3 px-4">
                        <div class="font-bold text-gray-800">${u.company_name || 'Sem Nome'}</div>
                        <div class="text-xs text-gray-500">${u.email}</div>
                    </td>
                    <td class="py-3 px-4 text-xs font-bold text-gray-700">${planName}</td>
                    <td class="py-3 px-4 text-center">${statusBadge}</td>
                    <td class="py-3 px-4 text-right">
                         <button onclick="openEditUser(${index})" class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs font-bold">
                            <i class="fas fa-cog"></i> Gerenciar
                        </button>
                    </td>
                </tr>`;
        });

    } catch (e) {
        console.error(e);
        list.innerHTML = `<tr><td colspan="5" class="text-center text-red-500">Erro ao carregar lista.</td></tr>`;
    }
}

// --- ABRIR MODAL DE EDIÇÃO (CORRIGIDO E DINÂMICO) ---
// --- FUNÇÃO AUXILIAR: DAR 30 DIAS DE BENEFÍCIO ---
window.add30Days = () => {
    const input = document.getElementById('edit-period-end');
    const hoje = new Date();
    hoje.setDate(hoje.getDate() + 30); // Soma 30 dias
    input.value = hoje.toISOString().split('T')[0]; // Formata YYYY-MM-DD
}

// --- ABRIR MODAL (ATUALIZADA COM DATA) ---
window.openEditUser= async (index) => {
    const user = manageUsersData[index];
    if(!user) return;

    if (globalPlans.length === 0) await fetchRealPlans();

    // ... (Lógica do Select de Planos continua igual) ...
    const selectPlan = document.getElementById('edit-plan-type');
    if (selectPlan) {
        selectPlan.innerHTML = ''; 
        selectPlan.innerHTML += `<option value="free">Grátis (Padrão)</option>`;
        globalPlans.forEach(p => {
            if(p.id !== 'free') {
                const preco = parseFloat(p.price).toLocaleString('pt-BR', {style:'currency', currency:'BRL'});
                selectPlan.innerHTML += `<option value="${p.id}">${p.name} - ${preco}</option>`;
            }
        });
        selectPlan.value = user.plan_type || 'free';
    }
    // ... (Fim da lógica do select) ...

    // Preenchimento Padrão
    document.getElementById('modal-user-id').innerText = "ID: " + user.id;
    document.getElementById('edit-user-id').value = user.id;
    document.getElementById('edit-company-name').value = user.company_name || '';
    document.getElementById('edit-email').value = user.email || '';
    document.getElementById('edit-doc').value = user.doc || '';
    document.getElementById('edit-phone').value = user.phone || '';
    document.getElementById('edit-plan-status').value = user.plan_status || 'active';
    document.getElementById('edit-custom-limit').value = user.custom_limit || 0;

    // --- NOVO: PREENCHER DATA DE VENCIMENTO ---
    const dateInput = document.getElementById('edit-period-end');
    if (user.current_period_end) {
        // O Supabase devolve Data com Hora (ISO). O input date só aceita YYYY-MM-DD.
        // Cortamos a string para pegar só a data.
        dateInput.value = user.current_period_end.split('T')[0];
    } else {
        dateInput.value = ""; // Sem data definida
    }

    // Botão Zap
    const btnZap = document.getElementById('btn-whatsapp');
    if(btnZap && user.phone) {
        let nums = user.phone.replace(/\D/g, '');
        if(nums.length >= 10) {
            if(nums.length <= 11) nums = '55' + nums;
            btnZap.href = `https://wa.me/${nums}`;
            btnZap.classList.remove('opacity-50', 'pointer-events-none');
        }
    }

    document.getElementById('userEditModal').classList.remove('hidden');
}

// --- SALVAR (ATUALIZADA COM DATA) ---
window.saveUserChanges = async () => {
    const id = document.getElementById('edit-user-id').value;
    
    const company_name = document.getElementById('edit-company-name').value;
    const phone = document.getElementById('edit-phone').value;
    const doc = document.getElementById('edit-doc').value;
    const plan_type = document.getElementById('edit-plan-type').value;
    let plan_status = document.getElementById('edit-plan-status').value;
    const custom_limit = parseInt(document.getElementById('edit-custom-limit').value) || 0;
    
    // --- NOVO: PEGAR A DATA ---
    const dateValue = document.getElementById('edit-period-end').value;
    let current_period_end = null;

    if (dateValue) {
        // Adiciona hora final do dia para garantir que valha até o fim do dia
        current_period_end = new Date(dateValue + "T23:59:59").toISOString();
        
        // LÓGICA DE BLOQUEIO AUTOMÁTICO NO SALVAMENTO
        // Se a data que você colocou já passou, muda o status para "overdue" (vencido)
        if (new Date(current_period_end) < new Date()) {
            plan_status = 'overdue'; 
            // Opcional: Avisar o admin que ele está salvando um usuário já vencido
        } else if (plan_status === 'overdue') {
            // Se você renovou a data (futuro), reativa o status automaticamente
            plan_status = 'active';
        }
    }

    const btn = event.target || document.querySelector('#userEditModal button.bg-blue-600');
    if(btn) { btn.innerHTML = 'Salvando...'; btn.disabled = true; }

    try {
        const { error } = await sb.from('users').update({
            company_name,
            phone,
            doc,
            plan_type,
            plan_status, // Status pode ter mudado automaticamente aqui
            custom_limit,
            current_period_end, // Salva a data nova
            updated_at: new Date()
        }).eq('id', id);

        if (error) throw error;

        Swal.fire({
            icon: 'success',
            title: 'Salvo!',
            text: 'Plano e vencimento atualizados.',
            timer: 1500,
            showConfirmButton: false
        });

        document.getElementById('userEditModal').classList.add('hidden');
        loadManageUsers(); 
        loadDashboardMetrics();

    } catch (e) {
        console.error(e);
        Swal.fire('Erro', e.message, 'error');
    } finally {
        if(btn) { btn.innerHTML = 'SALVAR DADOS'; btn.disabled = false; }
    }
}

window.closeEditModal = () => {
    document.getElementById('userEditModal').classList.add('hidden');
}

// --- SALVAR ALTERAÇÕES (ENVIANDO PARA SUPABASE) ---


// ============================================================
// 7. GESTÃO DE PLANOS (CRUD BÁSICO)
// ============================================================
// (Mantive sua lógica de planos, mas adicionei a recarga global)

async function loadPlans() {
    const list = document.getElementById('plans-list');
    if(!list) return;
    
    list.innerHTML = 'Carregando...';
    
    // Busca planos reais
    await fetchRealPlans(); // Atualiza a global
    const plans = globalPlans;

    list.innerHTML = '';
    if(plans.length === 0) {
        list.innerHTML = '<p class="text-gray-500">Nenhum plano criado.</p>';
        return;
    }

    plans.forEach(p => {
        const pStr = encodeURIComponent(JSON.stringify(p));
        list.innerHTML += `
            <div class="flex justify-between items-center bg-gray-50 p-3 rounded mb-2 border">
                <div>
                    <strong class="text-gray-800">${p.name}</strong>
                    <div class="text-xs text-gray-500">R$ ${p.price} / ${p.period}</div>
                </div>
                <div class="flex gap-2">
                    <button onclick="deletePlan('${p.id}')" class="text-red-500 hover:text-red-700"><i class="fas fa-trash"></i></button>
                </div>
            </div>`;
    });
}

// Criar Plano (Simplificado para o exemplo)
window.createPlan = async (e) => {
    e.preventDefault();
    // (Adicione aqui sua lógica de criar plano que você já tinha)
    // No final, chame await fetchRealPlans() para atualizar a lista global
    alert("Use a função de criar plano que você já tinha configurado. O importante é recarregar a página ou chamar fetchRealPlans() depois.");
}

window.deletePlan = async (id) => {
    if(!confirm("Tem certeza?")) return;
    const { error } = await sb.from('plans').delete().eq('id', id);
    if(!error) {
        loadPlans(); // Recarrega
        alert("Plano deletado.");
    }
}

window.logout = function() {
    window.location.href = '/index.html';
}