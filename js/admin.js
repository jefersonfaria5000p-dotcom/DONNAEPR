// ============================================================
// 👑 DONNA MASTER ENGINE - FINAL (CORRIGIDO)
// ============================================================

// 1. Configuração do Supabase
const sb = supabase.createClient(
    'https://adluzpbcaaupjexfsrll.supabase.co', 
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFkbHV6cGJjYWF1cGpleGZzcmxsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1NDg4NDcsImV4cCI6MjA4NTEyNDg0N30.HKicaWu9hngcNWf6EODcUNCs039KOHiakjt0HTTyIDU',
    {
        auth: {
            persistSession: true,
            storageKey: 'donna-auth-token',
            storage: window.localStorage,
            autoRefreshToken: true,
            detectSessionInUrl: true
        }
    }
);

const sa = {
    // --- INICIALIZAÇÃO BLINDADA ---
    init: async () => {
        const boot = document.getElementById('boot-screen');
        if(boot) { boot.style.opacity = '1'; boot.style.display = 'flex'; }

        console.log("👮‍♂️ Verificando permissões...");

        const MASTER_EMAIL = 'admin@donna.com';
        const localData = localStorage.getItem('donna_user');
        let emailDetectado = null;

        if (localData) {
            try {
                const u = JSON.parse(localData);
                emailDetectado = u.email ? u.email.trim().toLowerCase() : null;
            } catch (e) { console.error("Dados corrompidos."); }
        }

        // BLOQUEIO DE SEGURANÇA
        if (!emailDetectado || emailDetectado !== MASTER_EMAIL) {
            console.warn(`⛔ Bloqueio Ativado.`);
            alert("⛔ ACESSO NEGADO ⛔\nPainel exclusivo para administradores.");
            localStorage.removeItem('donna_user');
            window.location.href = 'index.html';
            return;
        }

        console.log("✅ Credencial Válida. Acesso Liberado.");

        await sa.loadData();
        sa.initRealtime();
        sa.setupSparklines();
        sa.updateClock(); 
        setInterval(sa.updateClock, 1000);

        if(boot) {
            boot.style.opacity = '0';
            setTimeout(() => boot.style.display = 'none', 500);
        }

        // Busca na tabela
        document.getElementById('search-input')?.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            document.querySelectorAll('#table-tenants-body tr').forEach(row => {
                row.style.display = row.innerText.toLowerCase().includes(term) ? '' : 'none';
            });
        });
    },

    logout: async () => {
        await sb.auth.signOut();
        localStorage.removeItem('donna_user');
        localStorage.removeItem('donna-auth-token'); 
        window.location.href = 'index.html';
    },

    // --- NAVEGAÇÃO CORRIGIDA ---
    nav: (view, btn) => {
        // Visual dos botões
        document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
        if(btn) btn.classList.add('active');
        
        // Título da página
        const titleEl = document.getElementById('page-title');
        if(titleEl && btn) titleEl.innerText = btn.innerText;
        
        // Troca de Telas
        document.querySelectorAll('.view-section').forEach(v => v.classList.remove('active'));
        const target = document.getElementById('view-' + view);
        if(target) target.classList.add('active');

        // Carregamentos específicos
        if (view === 'planos') sa.loadPlansManager();
        if (view === 'lojas') sa.loadData();
    },

    updateClock: () => {
        const el = document.getElementById('live-clock');
        if(el) el.innerText = new Date().toLocaleTimeString();
    },

    // --- CARREGAMENTO DE DADOS ---
    loadData: async () => {
        try {
            const { data: tenants } = await sb.from('tenants').select('*').order('created_at', {ascending:false});
            const { data: sales } = await sb.from('sales').select('total_amount, tenant_id, created_at').limit(1000);

            const listTenants = tenants || [];
            const listSales = sales || [];

            // KPIs
            const pro = listTenants.filter(t => t.plan_type === 'pro' || t.plan_type === 'vip').length;
            const mrr = pro * 49.90;
            const hoje = new Date().toDateString();
            const vendasHoje = listSales.filter(s => new Date(s.created_at).toDateString() === hoje)
                                        .reduce((a, b) => a + b.total_amount, 0);

            sa.animateValue("kpi-mrr", mrr, "R$ ");
            sa.animateValue("kpi-tenants", listTenants.length);
            sa.animateValue("kpi-pro", pro);
            sa.animateValue("kpi-sales-today", vendasHoje, "R$ ");

            sa.renderTable(listTenants, listSales);
            sa.renderChart(listSales);

        } catch (e) { 
            console.error("Erro ao carregar dados:", e); 
        }
    },

    renderTable: (tenants, allSales) => {
        const tbody = document.getElementById('table-tenants-body');
        if(!tbody) return;
        tbody.innerHTML = '';

        tenants.forEach(t => {
            const qtdVendas = allSales.filter(s => s.tenant_id === t.tenant_id).length;
            
            // Define cor e texto do status visual
            let statusClass = 'suspended';
            if (t.plan_status === 'active') statusClass = 'active';
            if (t.plan_status === 'pending') statusClass = 'pending'; // Você pode criar css para .pending (amarelo)

            // Tratamento do Limite Manual
            const limiteDisplay = (t.custom_limit && t.custom_limit > 0) 
                ? `<span style="color:var(--primary); font-weight:bold;">${t.custom_limit} (Manual)</span>` 
                : (t.plan_type || 'FREE').toUpperCase();

            // --- LÓGICA DO BOTÃO MÁGICO ---
            let btnAction = '';
            if (t.plan_status === 'pending') {
                // Se pendente -> Botão Verde de Aprovar
                btnAction = `<button class="btn-icon" style="color:#00e054; border:1px solid #00e054; margin-right:5px;" onclick="sa.toggleStatus('${t.id}', 'active')" title="APROVAR PAGAMENTO"><i class="fa-solid fa-check"></i></button>`;
            } else if (t.plan_status === 'active') {
                // Se ativo -> Botão Vermelho de Suspender
                btnAction = `<button class="btn-icon" style="color:#ff3e4e; margin-right:5px;" onclick="sa.toggleStatus('${t.id}', 'suspended')" title="SUSPENDER LOJA"><i class="fa-solid fa-ban"></i></button>`;
            } else {
                // Se suspenso -> Botão Amarelo de Reativar
                btnAction = `<button class="btn-icon" style="color:#ffb302; margin-right:5px;" onclick="sa.toggleStatus('${t.id}', 'active')" title="REATIVAR"><i class="fa-solid fa-rotate-left"></i></button>`;
            }

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>
                    <div style="display:flex; align-items:center; gap:12px;">
                        <div class="avatar-circle">${t.company_name ? t.company_name[0] : '?'}</div>
                        <div>
                            <div style="font-weight:600; color:white;">${t.company_name || 'Sem Nome'}</div>
                            <div style="font-size:11px; color:#666; font-family:monospace;">${t.tenant_id.substring(0,8)}...</div>
                        </div>
                    </div>
                </td>
                <td>
                    <div style="font-size:11px; color:#aaa; margin-bottom:4px;">${qtdVendas} reqs/mês</div>
                    <div style="width:100px; height:4px; background:#222; border-radius:2px;">
                        <div style="width:${Math.min(qtdVendas, 100)}%; height:100%; background:${qtdVendas > 50 ? 'var(--primary)' : '#444'}; border-radius:2px;"></div>
                    </div>
                </td>
                <td><span style="font-family:monospace; font-size:11px; color:#ccc">${limiteDisplay}</span></td>
                <td><div class="status-pill ${statusClass}"><div class="dot"></div> ${t.plan_status.toUpperCase()}</div></td>
                <td style="text-align:right;">
                    ${btnAction} <button class="btn-icon" onclick="sa.openSlide('${t.id}')"><i class="fa-solid fa-pen"></i></button>
                    <button class="btn-icon" onclick="sa.whatsapp('${t.phone}')"><i class="fa-brands fa-whatsapp"></i></button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    },
    // --- FUNÇÃO RÁPIDA PARA APROVAR/SUSPENDER ---
    // --- FUNÇÃO DE STATUS (COM DEBUG) ---
    toggleStatus: async (id, newStatus) => {
        console.log("Tentando mudar status...", { id, newStatus });

        const labels = {
            'active': 'ATIVAR (Liberar Acesso)',
            'suspended': 'SUSPENDER (Bloquear Acesso)',
            'pending': 'Tornar PENDENTE'
        };
        
        if(!confirm(`Tem certeza que deseja ${labels[newStatus] || newStatus} esta loja?`)) return;

        try {
            // 1. Tenta atualizar
            const { data, error } = await sb
                .from('tenants')
                .update({ plan_status: newStatus })
                .eq('id', id)
                .select(); // O .select() é importante para saber se funcionou

            // 2. Verifica Erros de Permissão
            if (error) {
                console.error("Erro Supabase:", error);
                throw new Error(error.message);
            }

            // 3. Verifica se achou a linha
            if (!data || data.length === 0) {
                alert("ERRO: O comando foi enviado, mas nenhuma linha foi alterada.\nIsso geralmente é bloqueio de RLS (Row Level Security).\n\nRode o SQL de liberação no Supabase!");
                return;
            }

            // 4. Sucesso
            sa.toast(`Sucesso! Status mudado para: ${newStatus.toUpperCase()}`);
            sa.loadData(); // Recarrega a tabela

        } catch (e) {
            alert("ERRO TÉCNICO: " + e.message);
        }
    },

    // --- AQUI ESTAVA O ERRO: A FUNÇÃO OPENSLIDE ESTAVA FALTANDO! ---
    // Recoloquei ela aqui corrigida para buscar planos do banco
    // --- FUNÇÃO BLINDADA DE ABRIR O SLIDE ---
    openSlide: async (id) => {
        console.log("🟢 Iniciando abertura do slide...");
        
        const slide = document.getElementById('admin-slide');
        const content = document.getElementById('slide-content'); // ONDE VAI O TEXTO
        const overlay = document.getElementById('slide-overlay');
        
        // 1. Diagnóstico de Elementos
        if (!slide) return alert("ERRO: Não achei <div id='admin-slide'> no HTML");
        if (!content) return alert("ERRO: Não achei <div id='slide-content'> no HTML. Verifique se apagou sem querer.");

        // 2. Abre a gaveta vazia primeiro (Visual)
        slide.style.right = '0';
        if(overlay) overlay.style.display = 'block';
        
        // 3. Força visibilidade
        content.style.display = 'block';
        content.style.color = 'white';
        content.innerHTML = '<h3 style="padding:20px; color:yellow">🔄 Carregando dados... Aguarde.</h3>';

        try {
            console.log("🔍 Buscando dados no banco para ID:", id);

            // A. Busca Dados
            const { data: t, error: errT } = await sb.from('tenants').select('*').eq('id', id).single();
            if (errT) throw new Error("Erro ao baixar loja: " + errT.message);

            const { data: plans } = await sb.from('plans').select('*');
            
            console.log("✅ Dados recebidos. Montando HTML...");

            // B. Prepara Variáveis (Evita travar se algo for null)
            const nomeLoja = t.company_name || "Loja Sem Nome";
            const emailLoja = t.email || "Sem email";
            const limiteExtra = t.custom_limit || 0;
            const dataVencimento = t.valid_until ? t.valid_until.split('T')[0] : '';

            // C. Monta Opções do Plano
            let optionsHtml = '';
            if (plans && plans.length > 0) {
                plans.forEach(p => {
                    const isSelected = t.plan_type === p.id ? 'selected' : '';
                    optionsHtml += `<option value="${p.id}" ${isSelected}>${p.name} (R$ ${p.price})</option>`;
                });
            } else {
                optionsHtml = '<option value="start">Padrão</option>';
            }

            // D. Monta o HTML Final (String Segura)
            const finalHTML = `
                <div style="padding:25px;">
                    <h2 style="color:white; margin-top:0; border-bottom:1px solid #333; padding-bottom:10px;">
                        ${nomeLoja}
                    </h2>
                    
                    <div style="margin-top:20px;">
                        <label style="display:block; color:#888; font-size:12px; margin-bottom:5px;">Login (Email)</label>
                        <input class="input-dark" value="${emailLoja}" readonly style="width:100%; opacity:0.5; cursor:not-allowed; background:#222; border:1px solid #444; color:white; padding:10px; border-radius:5px;">
                        
                        <br><br>

                        <label style="display:block; color:#888; font-size:12px; margin-bottom:5px;">Plano Atual</label>
                        <select id="adm-plan" class="input-dark" style="width:100%; background:#222; border:1px solid #444; color:white; padding:10px; border-radius:5px;">
                            ${optionsHtml}
                        </select>

                        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:15px; margin-top:15px;">
                            <div>
                                <label style="display:block; color:#888; font-size:12px; margin-bottom:5px;">Status</label>
                                <select id="adm-status" style="width:100%; background:#222; border:1px solid #444; color:white; padding:10px; border-radius:5px;">
                                    <option value="active" ${t.plan_status==='active'?'selected':''}>Ativo</option>
                                    <option value="suspended" ${t.plan_status==='suspended'?'selected':''}>Suspenso</option>
                                </select>
                            </div>
                            <div>
                                <label style="display:block; color:var(--primary); font-size:12px; margin-bottom:5px;">Limite Extra</label>
                                <input type="number" id="adm-limit" value="${limiteExtra}" style="width:100%; background:#222; border:1px solid #444; color:white; padding:10px; border-radius:5px;">
                            </div>
                        </div>

                        <br>
                        <label style="display:block; color:#888; font-size:12px; margin-bottom:5px;">Vencimento</label>
                        <input type="date" id="adm-valid" value="${dataVencimento}" style="width:100%; background:#222; border:1px solid #444; color:white; padding:10px; border-radius:5px;">

                        <button onclick="sa.saveTenantChanges('${t.id}')" style="width:100%; margin-top:25px; padding:15px; background:var(--primary); border:none; color:black; font-weight:bold; cursor:pointer; border-radius:5px;">
                            SALVAR ALTERAÇÕES
                        </button>

                        <div style="margin-top:30px; border-top:1px solid #333; padding-top:20px;">
                            <button onclick="sa.deleteTenant('${t.id}')" style="width:100%; background:#ef4444; border:none; color:white; padding:10px; border-radius:5px; cursor:pointer;">
                                <i class="fa-solid fa-trash"></i> EXCLUIR LOJA
                            </button>
                        </div>
                    </div>
                </div>
            `;

            // E. Injeta na Tela
            content.innerHTML = finalHTML;
            console.log("✅ HTML Injetado com sucesso!");

        } catch (e) {
            console.error(e);
            content.innerHTML = `<div style="padding:20px; color:red; font-size:14px;">❌ ERRO CRÍTICO:<br>${e.message}</div>`;
        }
    },
    closeSlide: () => {
        const slide = document.getElementById('admin-slide');
        const overlay = document.getElementById('slide-overlay');
        if(slide) slide.style.right = '-500px';
        if(overlay) overlay.style.display = 'none';
    },

    // --- SALVA AS ALTERAÇÕES DA LOJA ---
    saveTenantChanges: async (id) => {
        const btn = event.target;
        btn.innerText = "Salvando...";
        btn.disabled = true;

        try {
            const payload = {
                plan_type: document.getElementById('adm-plan').value,
                plan_status: document.getElementById('adm-status').value,
                custom_limit: parseInt(document.getElementById('adm-limit').value) || 0,
                valid_until: document.getElementById('adm-valid').value ? new Date(document.getElementById('adm-valid').value).toISOString() : null
            };

            const { error } = await sb.from('tenants').update(payload).eq('id', id);

            if (error) throw error;

            sa.toast("Dados atualizados!");
            sa.closeSlide();
            sa.loadData(); 

        } catch (e) {
            alert("Erro: " + e.message);
        } finally {
            btn.innerText = "SALVAR ALTERAÇÕES";
            btn.disabled = false;
        }
    },

    deleteTenant: async (id) => {
        if(confirm("TEM CERTEZA? Isso deleta a loja para sempre.")) {
            await sb.from('tenants').delete().eq('id', id);
            sa.toast("Loja excluída.");
            sa.closeSlide();
            sa.loadData();
        }
    },

    // --- GESTOR DE PLANOS ---
    loadPlansManager: async () => {
        const tbody = document.getElementById('table-plans-body');
        if(!tbody) return;
        tbody.innerHTML = '<tr><td colspan="6" style="padding:20px; text-align:center; color:#666;">Carregando...</td></tr>';

        const { data: plans } = await sb.from('plans').select('*').order('price', {ascending:true});
        
        tbody.innerHTML = '';
        if(plans) {
            plans.forEach(p => {
                tbody.innerHTML += `
                    <tr style="border-bottom:1px solid #222;">
                        <td style="padding:15px; font-family:monospace; color:var(--accent);">${p.id}</td>
                        <td style="padding:15px; font-weight:bold; color:white;">${p.name}</td>
                        <td style="padding:15px;">R$ ${parseFloat(p.price).toFixed(2)}</td>
                        <td style="padding:15px;">${p.monthly_limit > 900000 ? '∞' : p.monthly_limit}</td>
                        <td style="padding:15px; font-size:10px; color:#666;">${p.payment_link || '-'}</td>
                        <td style="padding:15px; text-align:right;">
                            <button class="btn-icon" onclick="sa.editPlan('${p.id}')"><i class="fa-solid fa-pen"></i></button>
                            <button class="btn-icon" style="color:#ef4444;" onclick="sa.deletePlan('${p.id}')"><i class="fa-solid fa-trash"></i></button>
                        </td>
                    </tr>
                `;
            });
        }
    },

    openPlanModal: (id = null) => {
        document.getElementById('modal-plan').style.display = 'flex';
        document.getElementById('plan-id').value = '';
        document.getElementById('plan-id').disabled = false;
        document.getElementById('plan-name').value = '';
        document.getElementById('plan-price').value = '';
        document.getElementById('plan-limit').value = '';
        document.getElementById('plan-link').value = '';
    },

    editPlan: async (id) => {
        const { data: p } = await sb.from('plans').select('*').eq('id', id).single();
        if(p) {
            sa.openPlanModal();
            document.getElementById('plan-id').value = p.id;
            document.getElementById('plan-id').disabled = true;
            document.getElementById('plan-name').value = p.name;
            document.getElementById('plan-price').value = p.price;
            document.getElementById('plan-limit').value = p.monthly_limit;
            document.getElementById('plan-link').value = p.payment_link;
        }
    },

    savePlan: async () => {
        const id = document.getElementById('plan-id').value.trim();
        const payload = {
            id: id,
            name: document.getElementById('plan-name').value,
            price: parseFloat(document.getElementById('plan-price').value),
            monthly_limit: parseInt(document.getElementById('plan-limit').value),
            payment_link: document.getElementById('plan-link').value
        };

        if(!payload.id || !payload.name) return alert("Preencha ID e Nome.");

        const { error } = await sb.from('plans').upsert([payload]);
        
        if(error) alert("Erro: " + error.message);
        else {
            sa.toast("Plano salvo!");
            document.getElementById('modal-plan').style.display = 'none';
            sa.loadPlansManager();
        }
    },

    deletePlan: async (id) => {
        if(confirm(`Excluir o plano ${id.toUpperCase()}?`)) {
            await sb.from('plans').delete().eq('id', id);
            sa.toast("Plano excluído.");
            sa.loadPlansManager();
        }
    },

    whatsapp: (phone) => {
        if(phone) window.open(`https://wa.me/55${phone.replace(/\D/g,'')}`);
        else sa.toast('Sem telefone', 'error');
    },

    toast: (msg, type='success') => {
        const box = document.createElement('div');
        box.className = 'toast';
        box.innerHTML = `<i class="fa-solid ${type==='success'?'fa-check':'fa-exclamation-circle'}"></i> ${msg}`;
        document.getElementById('toast-container').appendChild(box);
        setTimeout(() => box.remove(), 3000);
    },
    // --- MENU MOBILE ---
    toggleMenu: () => {
        const sb = document.getElementById('sidebar');
        // Se tiver a classe, tira. Se não tiver, coloca.
        sb.classList.toggle('mobile-active');
        
        // Cria um fundo escuro para fechar ao clicar fora (Opcional mas recomendado)
        let overlay = document.getElementById('mobile-overlay');
        if(!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'mobile-overlay';
            overlay.style.cssText = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:9998;";
            overlay.onclick = app.toggleMenu; // Fecha ao clicar
            document.body.appendChild(overlay);
        } else {
            overlay.remove(); // Remove se já existir
        }
    },

    initRealtime: () => {
        // ... (seu código realtime, mantido simplificado aqui)
    },

    setupSparklines: () => {
        // ... (seu código sparklines, mantido simplificado)
    },

    animateValue: (id, end, prefix='') => {
        const obj = document.getElementById(id);
        if(obj) obj.innerText = prefix + end.toLocaleString('pt-BR', {minimumFractionDigits: 2});
    },

    renderChart: (sales) => {
        // ... (seu código chart, mantido)
    }
};

document.addEventListener('DOMContentLoaded', sa.init);