// ============================================================
// 1. CONFIGURAÇÕES GERAIS
// ============================================================
// No Vercel, deixamos vazio para ele usar o próprio domínio
const API_URL = ''; 

// ⚠️ SUA CHAVE PÚBLICA DO STRIPE (Começa com pk_test_...)
const STRIPE_PUBLIC_KEY = 'pk_live_51Sul3wPxYLYY7VSJsFIKHOgTa9B64sA37bPfNip8uMdNJhOSOk6CwSpNvp0qxvOrBqBn26tiFwUWU3G5aheb9ZBt004gi07urt';

// CONFIGURAÇÃO DO SUPABASE (Versão Navegador)
const SUPABASE_URL = 'https://adluzpbcaaupjexfsrll.supabase.co'; 
const SUPABASE_KEY = 'sb_publishable_KWS3d_CTWaUM9CDOQG2Rrw_xR3CfeGX';

// Inicializa o Supabase usando a variável global 'supabase' carregada pelo HTML
let sb; 
try { 
    if (typeof supabase !== 'undefined') {
        sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY); 
    } else {
        console.error("CRÍTICO: A biblioteca do Supabase não foi carregada no HTML.");
    }
} catch(e) { console.error(e); }

// ============================================================
// 2. LANDING PAGE (LP)
// ============================================================
const lp = {
    plans: [], 
    cycle: 'monthly',

    // Controla qual tela aparece
    // Controla qual tela aparece
    show: (screenId) => {
        // 1. Esconde todas as telas
        ['landing-page', 'login-screen', 'checkout-flow', 'app-wrapper'].forEach(id => {
            const el = document.getElementById(id);
            if(el) {
                el.style.display = 'none';
                el.classList.remove('active');
            }
        });

        // 2. Mostra a tela escolhida com o display correto
        const target = document.getElementById(screenId);
        if(target) {
            if (screenId === 'checkout-flow') {
                target.style.display = 'flex'; // <--- OBRIGATÓRIO PARA O NOVO LAYOUT
            } else if (screenId === 'app-wrapper') {
                target.style.display = 'flex'; // O ERP também usa flex (sidebar + conteudo)
            } else {
                target.style.display = 'block'; // Landing page e Login usam block
            }
            target.classList.add('active');
        }
    },

    goToLogin: () => { lp.show('login-screen'); },
    backToHome: () => { 
        // 1. Esconde o checkout
        document.getElementById('checkout-flow').style.display = 'none';
        
        // 2. Garante que o ERP também suma
        document.getElementById('app-wrapper').style.display = 'none';
        document.getElementById('app-wrapper').classList.remove('active');

        // 3. Mostra a Landing Page
        lp.show('landing-page'); 
    },

    fetchPlans: async () => {
        const container = document.getElementById('lp-plans-list');
        if(!container) return;
        container.innerHTML = '<div style="color:white; text-align:center; padding:20px;">🔄 Carregando planos...</div>';

        try {
            const { data, error } = await sb.from('plans').select('*').order('price', {ascending: true});
            if (error) throw error;

            if (!data || data.length === 0) {
                container.innerHTML = '<div style="color:yellow; text-align:center;">⚠️ Nenhum plano cadastrado no Banco de Dados.</div>';
                return;
            }

            lp.plans = data;
            lp.renderPlans();

        } catch (e) {
            console.error("Erro planos:", e);
            container.innerHTML = `<div style="color:red; text-align:center;">Erro ao conectar: ${e.message}</div>`;
        }
    },

    renderPlans: () => {
        const list = document.getElementById('lp-plans-list');
        if(!list) return;
        list.innerHTML = '';
        

        lp.plans.forEach(p => {
    const isMonthly = lp.cycle === 'monthly';
    
    // --- CORREÇÃO AQUI ---
    // Converte para string primeiro, troca vírgula por ponto, depois vira número
    const safePriceString = String(p.price).replace(',', '.'); 
    const basePrice = parseFloat(safePriceString) || 0;
    // ---------------------

    const price = isMonthly ? basePrice : (basePrice * 12 * 0.8);
            // 1. Lógica de Preço (Mantida igual a sua)
                      
            const label = isMonthly ? '/mês' : '/ano';
            const btnText = basePrice === 0 ? 'CRIAR CONTA GRÁTIS' : 'ASSINAR AGORA';
            
            // 2. Estilo do Card (Mantido)
            const isPro = basePrice > 0;
            const border = isPro ? 'border: 1px solid var(--primary); box-shadow: 0 0 20px rgba(0, 243, 255, 0.2);' : 'border: 1px solid #333; opacity: 0.9;';
            const badge = isPro ? '<div style="position:absolute; top:-10px; right:20px; background:var(--primary); color:black; font-weight:bold; font-size:10px; padding:4px 8px; border-radius:4px;">RECOMENDADO</div>' : '';

            // --- 3. NOVA PARTE: TRATAMENTO DA LISTA DE BENEFÍCIOS ---
            let featuresList = p.features;

            // Garante que é uma lista (mesmo se vier texto ou null)
            if (typeof featuresList === 'string') featuresList = featuresList.split(',');
            if (!Array.isArray(featuresList)) featuresList = [];

            // Cria o HTML dos itens (<li>)
            const featuresHTML = featuresList.map(feat => 
                `<li style="display:flex; align-items:center; gap:8px; color:#ccc; font-size:14px; margin-bottom:8px; text-align:left;">
                    <span style="color:var(--primary); font-weight:bold;">✔</span> 
                    ${feat.trim()}
                </li>`
            ).join('');
            // --------------------------------------------------------

            // 4. Montagem do HTML Final
            list.innerHTML += `
                <div class="lp-plan-card" style="position:relative; background:#18181b; padding:30px; border-radius:16px; min-width:260px; text-align:center; display:flex; flex-direction:column; gap:15px; ${border}">
                    ${badge}
                    
                    <h3 style="margin:0; color:white; font-size:22px; font-family:'Rajdhani'">${p.name}</h3>
                    
                    <div>
                        <span style="font-size:36px; font-weight:800; color:white;">R$ ${parseFloat(price).toFixed(2)}</span>
                        <span style="font-size:14px; color:#888;">${label}</span>
                    </div>

                    <ul style="list-style:none; padding:0; margin:10px 0; flex-grow:1;">
                        ${featuresHTML}
                    </ul>

                    <button class="btn btn-primary" style="width:100%; padding:12px; font-weight:bold; cursor:pointer;" onclick="window.chk.init('${p.id}')">
                        ${btnText}
                    </button>
                </div>
            `;
        });
    },
    toggleCycle: (c) => { lp.cycle = c; lp.renderPlans(); }
};

// ============================================================
// 3. CHECKOUT (STRIPE)
// ============================================================
// ============================================================
// 3. CHECKOUT STRIPE (CORREÇÃO DEFINITIVA)
// ============================================================
// ============================================================
// 3. CHECKOUT STRIPE (VERSÃO FINAL BLINDADA)
// ============================================================
// ============================================================
// 3. CHECKOUT STRIPE (INTELIGENTE E CORRIGIDO)
// ============================================================
// ============================================================
// 3. CHECKOUT & CADASTRO (CORREÇÃO DO PLANO ERRADO)
// ============================================================
window.chk = {
    stripe: null,
    elements: null,
    tempUserData: null, 
    selectedPlan: null,

    // --- 1. INICIALIZAÇÃO (Vindo da Landing Page) ---
    init: async (pid) => {
        console.log("🚀 Iniciando fluxo LP:", pid);
        localStorage.removeItem('donna_user');
        app.currentUser = null;
        try { await sb.auth.signOut(); } catch(e){}

        // Busca o plano na lista carregada
        window.chk.selectedPlan = lp.plans.find(x => x.id === pid);
        
        // Proteção: Se não achar, tenta forçar um objeto básico com o ID
        if (!window.chk.selectedPlan) {
            console.warn("Plano não achado na lista, usando ID direto:", pid);
            window.chk.selectedPlan = { id: pid, name: 'PLANO SELECIONADO', price: 0 };
        }

        // Atualiza textos visuais
        const elName = document.getElementById('chk-display-name');
        const elPrice = document.getElementById('chk-display-price');
        
        if (elName) elName.innerText = window.chk.selectedPlan.name.toUpperCase();
        if (elPrice) elPrice.innerText = 'R$ ' + parseFloat(window.chk.selectedPlan.price).toFixed(2);

        document.getElementById('chk-step-1').style.display = 'block';
        document.getElementById('chk-step-2').style.display = 'none';
        lp.show('checkout-flow');
    },

    // --- 2. VALIDAÇÃO (Passo 1 -> Passo 2) ---
    validateStep1: async (event) => {
        const btn = event.target;
        const txt = btn.innerText;
        btn.innerText = "VERIFICANDO...";
        btn.disabled = true;

        try {
            const company = document.getElementById('reg-company').value.trim();
            const email = document.getElementById('reg-email').value.trim();
            const phone = document.getElementById('reg-phone').value.trim();
            const pass1 = document.getElementById('reg-password').value;
            const pass2 = document.getElementById('reg-password-confirm').value;
            const fullAddress = `${document.getElementById('reg-rua').value}, ${document.getElementById('reg-num').value} - ${document.getElementById('reg-bairro').value} - ${document.getElementById('reg-cidade').value} - CEP: ${document.getElementById('reg-cep').value}`;

            if(!company || !email || !pass1) throw new Error("Preencha todos os campos.");
            if (pass1.length < 6) throw new Error("Senha muito curta (min 6).");
            if (pass1 !== pass2) throw new Error("Senhas não conferem.");

            // AQUI ESTÁ A CHAVE: SALVAMOS O ID DO PLANO COM SEGURANÇA
            window.chk.tempUserData = {
                company_name: company,
                email: email,
                phone: phone,
                address: fullAddress,
                password: pass1,
                plan_id: window.chk.selectedPlan.id, // <--- GUARDA O ID AQUI
                plan_price: window.chk.selectedPlan.price // Guarda o preço também
            };

            const price = parseFloat(window.chk.selectedPlan.price);
            const priceInCents = Math.round(price * 100);

            // Se for grátis (preço 0 ou menor), cria direto
            if (price <= 0) {
                await window.chk.registerFreeUser(window.chk.tempUserData);
                return; 
            }

            // Se for pago, chama API
            const response = await fetch('/api/checkout', { 
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: email, name: company, priceInCents: priceInCents,
                    metadata: { plan_name: window.chk.selectedPlan.name }
                }),
            });
            const data = await response.json();
            if (data.error) throw new Error(data.error);

            // Vai para o pagamento
            document.getElementById('chk-step-1').style.display = 'none';
            document.getElementById('chk-step-2').style.display = 'block';
            
            // Carrega o Stripe na caixa da LP
            window.chk.loadBrick(data.clientSecret, 'box_pagamento_lp'); 

        } catch (error) {
            alert(error.message);
        } finally {
            btn.innerText = txt; btn.disabled = false;
        }
    },

    // --- 3. CARREGA O STRIPE ---
    loadBrick: async (clientSecret, containerID) => {
        console.log(`💳 Montando Stripe em: ${containerID}`);
        if (!clientSecret) return alert("Erro: Sem chave de pagamento.");

        if (!window.chk.stripe) {
            window.chk.stripe = Stripe('pk_live_51Sul3wPxYLYY7VSJsFIKHOgTa9B64sA37bPfNip8uMdNJhOSOk6CwSpNvp0qxvOrBqBn26tiFwUWU3G5aheb9ZBt004gi07urt')
        }

        let container = document.getElementById(containerID);
        if(!container) container = document.getElementById('stripe_mount_point'); // Fallback
        
        if (!container) return alert(`ERRO: Caixa '${containerID}' não existe.`);

        container.innerHTML = ''; 

        const appearance = {
            theme: 'night',
            variables: { colorPrimary: '#00e054', colorBackground: '#1a1a1a', colorText: '#ffffff' }
        };

        try {
            window.chk.elements = window.chk.stripe.elements({ clientSecret, appearance });
            const paymentElement = window.chk.elements.create('payment', { layout: 'tabs' });
            paymentElement.mount("#" + container.id);
            window.chk.paymentElement = paymentElement;
        } catch (error) {
            console.error(error);
            alert("Erro Stripe: " + error.message);
        }
    },

    // --- 4. PAGAR ---
    pay: async () => {
        const btns = document.querySelectorAll('button');
        btns.forEach(b => { if(b.innerText.includes('PAGAR')) { b.disabled=true; b.innerText='PROCESSANDO...'; }});

        if (!window.chk.stripe || !window.chk.elements) return alert("Stripe não carregado.");

        try {
            const { error, paymentIntent } = await window.chk.stripe.confirmPayment({
                elements: window.chk.elements,
                confirmParams: { return_url: window.location.href },
                redirect: 'if_required'
            });

            if (error) {
                if(error.payment_intent && error.payment_intent.status === 'succeeded') {
                    await window.chk.handleSuccess();
                    return;
                }
                alert("❌ " + error.message);
                btns.forEach(b => { if(b.innerText.includes('PROCESSANDO')) { b.disabled=false; b.innerText='PAGAR AGORA'; }});
                return;
            }

            if (paymentIntent && paymentIntent.status === 'succeeded') {
                await window.chk.handleSuccess(paymentIntent.id);
            }

        } catch (e) {
            alert("Erro: " + e.message);
        }
    },

    // --- 5. SUCESSO ---
    handleSuccess: async (stripeId) => {
        const dados = window.chk.tempUserData;
        if(!dados) {
            alert("Pagamento ok, mas dados perdidos. Recarregando...");
            location.reload(); return;
        }

        if (dados.is_upgrade) {
            await app.updateLocalPlan(dados.new_plan_id);
            alert("🎉 Plano atualizado!");
            location.reload();
        } else {
            dados.stripe_id = stripeId;
            dados.status_pagamento = 'active';
            await window.chk.registerFreeUser(dados);
        }
    },
    
    // --- 6. REGISTRAR NO BANCO (CORRIGIDO O TIPO DE PLANO) ---
    registerFreeUser: async (userData) => {
        try {
            console.log("Criando usuário...", userData);
            
            // A CORREÇÃO PRINCIPAL ESTÁ AQUI:
            // Usamos userData.plan_id (que foi salvo lá no passo 1) 
            // Se ele não existir, usamos 'pro' como fallback seguro.
            const planToSave = userData.plan_id || 'pro'; 

            const { data: authData, error: authError } = await sb.auth.signUp({
                email: userData.email, password: userData.password
            });

            let userId = authData?.user?.id;

            if (authError) {
                if(authError.message.includes('already')) {
                    const { data: loginData } = await sb.auth.signInWithPassword({
                        email: userData.email, password: userData.password
                    });
                    userId = loginData?.user?.id;
                } else {
                    throw authError;
                }
            }

            if(!userId) throw new Error("Falha ao obter ID do usuário.");

            const newTenant = {
                id: userId,
                tenant_id: 't_' + Date.now(),
                email: userData.email,
                company_name: userData.company_name,
                phone: userData.phone,
                address: userData.address,
                
                // --- AQUI ESTAVA O ERRO ---
                // Antes pegava de window.chk.selectedPlan (que podia estar vazio)
                // Agora pega da variável corrigida:
                plan_type: planToSave, 
                
                plan_status: userData.status_pagamento || 'active',
                stripe_customer_id: userData.stripe_customer_id || userData.stripe_id || null,
                created_at: new Date().toISOString()
            };

            const { error: dbError } = await sb.from('tenants').insert([newTenant]);
            if(dbError) throw dbError;

            // Loga e entra
            app.currentUser = newTenant;
            localStorage.setItem('donna_user', JSON.stringify(newTenant));
            
            alert("🎉 Conta Criada com Sucesso!");
            document.getElementById('checkout-flow').style.display = 'none';
            window.location.href = window.location.href.split('?')[0]; // Limpa URL e recarrega
            
        } catch(e) { 
            console.error(e);
            alert("Erro no cadastro final: "+e.message); 
        }
    }
};

// --- E AQUI ESTÁ A CORREÇÃO PARA O "TROCAR PLANO" ---


// ============================================================
// 4. APP ERP (SISTEMA INTERNO)
// ============================================================
const app = {
    currentUser: null, cart: [], orcItems: [], cache: { clients: [], products: [] }, varSelectContext: null,
    changePlan: async (planId, planName, planPrice, stripePriceId) => {
    console.log(`🔄 Iniciando troca para: ${planName}`);
    if(!confirm(`Mudar para ${planName}?`)) return;

    // Preenche o Modal
    const elTitle = document.getElementById('checkout_plan_name');
    const elPrice = document.getElementById('checkout_plan_price');
    const modal = document.getElementById('modal-checkout');

    if (elTitle) elTitle.innerText = planName; 
    if (elPrice) elPrice.innerText = `R$ ${planPrice}`;
    if (modal) modal.style.display = 'flex';
    
    // Limpa a caixa DO MODAL
    const container = document.getElementById('box_pagamento_modal');
    if(container) container.innerHTML = '<div style="text-align:center; padding:40px; color:#666;">Carregando...</div>';

    // API
    const user = app.currentUser;
    const priceInCents = Math.round(parseFloat(planPrice) * 100);

    try {
        const response = await fetch('/api/create-subscription', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: user.email,
                name: user.company_name,
                existingStripeId: user.stripe_customer_id, 
                stripePriceId: stripePriceId, 
                priceInCents: priceInCents,
                metadata: { tenant_id: user.tenant_id, plan_name: planName, new_plan_id: planId }
            }),
        });

        const data = await response.json();
        if (data.error) throw new Error(data.error.message || data.error);

        if (data.clientSecret) {
            window.chk.tempUserData = { ...user, new_plan_id: planId, is_upgrade: true };
            
            // --- AQUI ESTÁ O SEGREDO: MANDA USAR A CAIXA DO MODAL ---
            window.chk.loadBrick(data.clientSecret, 'box_pagamento_modal'); 
        } 
        else if (data.status === 'active') {
            alert("✅ Sucesso!");
            app.updateLocalPlan(planId);
        }

    } catch (error) {
        alert("Erro: " + error.message);
        if(modal) modal.style.display = 'none';
    }
},
    // --- UTILITÁRIOS ---
    parseMoney: (str) => {
        if (!str) return 0;
        if (typeof str === 'number') return str;
        let clean = str.replace(/[^\d,-]/g, "").replace(",", ".");
        return parseFloat(clean) || 0;
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
    maskMoney: (el) => {
        let v = el.value.replace(/\D/g, '');
        v = (v / 100).toFixed(2) + '';
        v = v.replace(".", ",");
        v = v.replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1.");
        el.value = "R$ " + v;
        if(app.calcRestante) app.calcRestante(); 
    },
    notify: (m,t='success') => { 
        const o=document.getElementById('toast'); 
        if(o){ o.innerText=m; o.style.borderLeftColor=t=='error'?'var(--danger)':'var(--success)'; o.classList.add('show'); setTimeout(()=>o.classList.remove('show'),3000); }
    },

    // --- MODAIS ---
    openModal: (t, p1) => { 
        const m = document.getElementById('modal-'+t); if(m) m.style.display = 'flex';
        if(t==='prod') { app.addVarRow(); app.loadCats(); } 
        if(t==='mov') { 
            document.getElementById('mov-type').value = p1;  
            document.getElementById('mov-title').style.color = p1=='entrada'?'var(--success)':'var(--danger)'; 
            document.getElementById('mov-title').innerText = p1=='entrada'?'Nova Receita':'Nova Despesa';
        } 
    },
    closeModal: (t) => { 
        const m = document.getElementById('modal-'+t); if(m) m.style.display = 'none';
        if(t=='cli') app.clearCli(); 
        if(t=='prod') app.clearProd();
        if(t=='details') document.getElementById('det-new-pay').value = ''; 
        if(t=='mov') {['mov-desc','mov-val','mov-cat','mov-date'].forEach(i=>document.getElementById(i).value='');} 
        if(t=='bill') {['bill-desc','bill-val','bill-cat','bill-due'].forEach(i=>document.getElementById(i).value='');} 
        if(t=='convert') {['conv-entry','conv-due'].forEach(i=>document.getElementById(i).value='');} 
    },

    // --- NAVEGAÇÃO E INICIALIZAÇÃO ---
    // --- INICIALIZAÇÃO SEGURA ---
    start: () => { 
        console.log("🚀 Iniciando App...");
        
        // 1. Prepara Visual
        lp.show('app-wrapper'); 
        
        // 2. Verifica Status do Usuário
        if(app.currentUser) {
            const status = app.currentUser.plan_status;
            console.log("Status da Conta:", status);

            // SE TIVER PENDENTE (PAGAMENTO NÃO CONFIRMADO)
            if (status === 'pending') {
                // 🔒 BLOQUEIO TOTAL: Esconde o menu para ele não clicar em nada
                document.getElementById('sidebar').style.display = 'none'; 
                document.getElementById('mobile-menu-btn').style.display = 'none';
                
                // Manda para a tela de bloqueio
                app.nav('assinatura');
                app.showPaymentBlocker();
            } 
            // SE TIVER SUSPENSO/CANCELADO
            else if (status === 'canceled' || status === 'suspended') {
                document.getElementById('sidebar').style.display = 'none';
                alert("Sua assinatura está suspensa. Entre em contato.");
                app.nav('assinatura');
            }
            // SE TIVER ATIVO (LIBERADO)
            else {
                // 🔓 LIBERA GERAL
                document.getElementById('sidebar').style.display = 'flex'; // Mostra o menu
                document.getElementById('mobile-menu-btn').style.display = 'block';
                app.nav('dash'); 
                
                if(app.startKanbanAutoDelete) app.startKanbanAutoDelete();
            }
        }
    },
    // --- VERIFICAR SE O PAGAMENTO CAIU (FORÇA BRUTA NO BANCO) ---
    verifyPayment: async () => {
        const btn = event.target;
        const textoOriginal = btn.innerHTML;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Verificando...';
        btn.disabled = true;

        try {
            console.log("Consultando banco de dados...");
            
            // 1. Vai no Supabase buscar o status MAIS ATUAL
            const { data, error } = await sb
                .from('tenants')
                .select('*')
                .eq('tenant_id', app.currentUser.tenant_id)
                .single();

            if (error) throw error;

            if (data) {
                console.log("Status no banco:", data.plan_status);

                // 2. Atualiza a memória do navegador (LocalStorage)
                app.currentUser = data;
                localStorage.setItem('donna_user', JSON.stringify(data));

                // 3. Decide o que fazer
                if (data.plan_status === 'active') {
                    alert("✅ Pagamento Confirmado! Acesso Liberado.");
                    location.reload(); // Recarrega a página para entrar no painel
                } else {
                    alert("⚠️ O sistema ainda consta como PENDENTE.\n\nSe você liberou no Admin, aguarde alguns segundos e tente novamente.");
                }
            }
        } catch (e) {
            console.error(e);
            alert("Erro de conexão: " + e.message);
        } finally {
            btn.innerHTML = textoOriginal;
            btn.disabled = false;
        }
    },
    showPaymentBlocker: () => {
        const container = document.getElementById('view-assinatura');
        if(container) {
            container.innerHTML = `
                <div style="height:100vh; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; color:white;">
                    <i class="fa-solid fa-lock fa-5x" style="color:#f39c12; margin-bottom:30px;"></i>
                    <h1 style="font-family:'Rajdhani'; font-size:40px;">Aguardando Pagamento</h1>
                    <p style="color:#aaa; max-width:500px; margin-bottom:30px; font-size:16px;">
                        Identificamos que sua conta foi criada, mas o pagamento do plano <strong>PRO</strong> ainda não foi confirmado.<br>
                        Se você já pagou via Pix, aguarde alguns instantes e atualize.
                    </p>
                    <button class="btn btn-primary btn-lg" onclick="app.verifyPayment()" style="padding:15px 40px; margin-top:20px;">
    <i class="fa-solid fa-rotate"></i> VERIFICAR AGORA
</button>
                    <br>
                    <button class="btn btn-outline" onclick="app.logout()" style="margin-top:20px; border:none; color:#666;">Sair da Conta</button>
                </div>
            `;
        }
    },

    
    // --- NAVEGAÇÃO CORRIGIDA PARA O SEU HTML ---
    // --- NAVEGAÇÃO ENTRE TELAS (CORRIGIDA) ---
    nav: async (v) => { 
        if(!app.currentUser) return app.logout();

        // 🛡️ SEGURANÇA: Se tiver pendente e tentar sair da assinatura, BLOQUEIA.
        if (app.currentUser.plan_status === 'pending' && v !== 'assinatura') {
            console.warn("Tentativa de acesso bloqueada.");
            return app.start(); // Joga de volta pro bloqueio
        }

        console.log("Navegando para:", v);

        // 1. Limpa TUDO visualmente
        document.querySelectorAll('.view, .view-section').forEach(x => {
            x.style.display = 'none';
            x.classList.remove('active');
        });
        document.querySelectorAll('.nav-btn').forEach(x => x.classList.remove('active')); 

        // 2. Prepara Nomes
        let cleanName = v.replace('view-', ''); 
        let targetId = 'view-' + cleanName;
        let btnId = 'btn-nav-' + cleanName;

        // 3. Mostra Tela
        const targetDiv = document.getElementById(targetId);
        if (targetDiv) {
            targetDiv.style.display = 'block';
            targetDiv.classList.add('active');
        } else {
            console.error("ERRO: Tela não encontrada ID:", targetId);
            // Se der erro e for assinatura, evita loop infinito
            if(cleanName !== 'assinatura') app.nav('dash');
            return;
        }

        // 4. Ativa Botão (Se existir menu)
        const btn = document.getElementById(btnId);
        if (btn) btn.classList.add('active');

        // 5. Carrega Dados (Com tratamento de erro)
        try {
            if(cleanName === 'dash') { await app.loadDash(); app.toggleDash('visao'); } 
            else if(cleanName === 'loja') app.loadShop(); 
            else if(cleanName === 'clientes') app.loadCli(); 
            else if(cleanName === 'produtos') app.loadProd(); 
            else if(cleanName === 'producao') app.loadKanban(); 
            else if(cleanName === 'orcamentos') { await app.loadShop(); app.updateOrcLists(); app.loadOrcamentos(); }
            else if(cleanName === 'config') app.loadConfig();
            else if(cleanName === 'aprovacoes') app.renderAprovacoes();
            else if(cleanName === 'catalogo-config') app.loadCatalogConfig();
            else if(cleanName === 'assinatura') await app.renderAssinatura();
            
        } catch (error) {
            console.error("Erro ao carregar dados da tela:", error);
        }
    },
    // --- LÓGICA DE ASSINATURA ---

    // --- LÓGICA DE ASSINATURA (VISUAL PREMIUM) ---
    // --- LÓGICA DE ASSINATURA (100% DINÂMICA) ---
    // --- LÓGICA DE ASSINATURA COM BARRA DE PROGRESSO ---
// ... (suas outras funções start, loadProd, etc) ...

    // --- COLE ISSO DENTRO DO SEU "const app = {" ---
    
    renderAssinatura: async () => {
        if(app.currentUser.plan_status === 'pending') return;

        console.log("📊 INICIANDO RENDERIZAÇÃO DE ASSINATURA...");
        const u = app.currentUser;
        const listContainer = document.getElementById('inner-plans-list');
        const elName = document.getElementById('current-plan-name');
        const elStatus = document.getElementById('current-plan-status');
        
        // 1. BUSCA PLANOS E SALVA EM CACHE
        const { data: plansDb, error: plansError } = await sb
            .from('plans')
            .select('*')
            .order('price', { ascending: true });

        if (plansError) {
            console.error(plansError);
            if(listContainer) listContainer.innerHTML = `<div class="alert alert-danger">Erro: ${plansError.message}</div>`;
            return;
        }

        // --- SALVA OS PLANOS NA MEMÓRIA PARA O CLIQUE FUNCIONAR ---
        app.cachedPlans = plansDb; 
        console.log("✅ Planos carregados e cacheados:", app.cachedPlans);

        // 2. DADOS DO USUÁRIO
        const { data: userDb } = await sb.from('tenants').select('*').eq('tenant_id', u.tenant_id).single();
        if(userDb) {
            app.currentUser = userDb; 
            localStorage.setItem('donna_user', JSON.stringify(userDb));
        }

        // 3. IDENTIFICA PLANO ATUAL
        let currentPlanId = app.currentUser.plan_type || 'start';
        if(currentPlanId.length > 10) currentPlanId = 'start'; 
        
        let currentPlanObj = plansDb.find(p => p.id === currentPlanId);
        if (!currentPlanObj) currentPlanObj = { id: 'unknown', name: 'Plano Desconhecido', price: 0, monthly_limit: 10 };

        // Limites e Consumo
        const planLimit = currentPlanObj.monthly_limit || 10;
        const finalLimit = (app.currentUser.custom_limit > 0) ? app.currentUser.custom_limit : planLimit;

        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const { count } = await sb.from('sales').select('*', { count: 'exact', head: true }).eq('tenant_id', u.tenant_id).gte('created_at', startOfMonth);
        const usage = count || 0;
        
        // Atualiza Texto
        if(elName) elName.innerText = currentPlanObj.name;
        if(elStatus) elStatus.innerHTML = '<span class="badge badge-success">ATIVO</span>';

        // 4. RENDERIZA
        if(listContainer) {
            let percent = Math.min(100, Math.round((usage / finalLimit) * 100));
            
            // Barra (Simplificada para economizar espaço aqui)
            let barHtml = (finalLimit > 900000) 
                ? `<div style="background:#111; padding:20px; border-radius:12px; margin-bottom:30px; border:1px solid #333;"><div style="color:#888; font-size:12px;">CONSUMO</div><div style="font-size:32px; color:white; font-weight:700;">${usage} <small style="font-size:14px; color:#666">pedidos</small></div></div>`
                : `<div style="background:#111; padding:20px; border-radius:12px; margin-bottom:30px; border:1px solid #333;"><div style="display:flex; justify-content:space-between; color:#888; font-size:12px;"><span>${usage}/${finalLimit}</span><span>${percent}%</span></div><div style="width:100%; height:8px; background:#000; border-radius:4px; overflow:hidden; margin-top:5px;"><div style="width:${percent}%; height:100%; background:${percent>90?'red':'#00e054'};"></div></div></div>`;

            let cardsHtml = '<h3 style="color:white; margin-bottom:20px;">Melhore seu Plano</h3><div class="plans-grid">';

            plansDb.forEach(p => {
                if(p.id !== currentPlanId && p.id !== 'start' && p.id !== 'free') { 
                    
                    const priceFormatted = Number(p.price).toFixed(2).replace('.', ',');
                    const periodText = p.period || '/mês';
                    const feats = p.features || ['Benefícios não cadastrados'];
                    const featuresListHtml = feats.map(f => `<li><i class="fa-solid fa-check"></i> ${f}</li>`).join('');
                    const isHighlight = p.is_recommended ? 'highlight' : '';

                    // --- A CORREÇÃO MÁGICA ESTÁ AQUI EMBAIXO ---
                    // Em vez de passar (id, nome, preço), passamos SÓ O ID.
                    
                    cardsHtml += `
                        <div class="plan-card ${isHighlight}">
                            <div class="plan-name">${p.name}</div>
                            <div class="plan-price"><small>R$</small> ${priceFormatted} <small>${periodText}</small></div>
                            <ul class="plan-features">${featuresListHtml}</ul>
                            
                            <button class="btn-plan btn-plan-outline" 
                                onclick="app.clickChangePlan('${p.id}')">
                                QUERO ESTE
                            </button>
                        </div>
                    `;
                }
            });
            cardsHtml += '</div>';
            listContainer.innerHTML = barHtml + cardsHtml;
        }
    },
    clickChangePlan: (planId) => {
        console.log("🔄 Iniciando mudança de plano para ID:", planId);
        // 1. Procura o plano na lista que carregamos do banco
        const plan = app.cachedPlans.find(p => p.id === planId);
        
        if (!plan) {
            alert("Erro: Plano não encontrado na memória.");
            return;
        }

        console.log("Selecionado:", plan);

        // 2. Chama a função de mudança passando os dados certinhos
        // (Preço formatado para string com ponto, para cálculo correto)
        const priceString = String(plan.price); 
        
        app.changePlan(plan.id, plan.name, priceString);
    },

    // Sua função changePlan original continua aqui...
    // --- FUNÇÃO DE TROCA DE PLANO (CORRIGIDA) ---
    changePlan: async (planId, planName, planPrice, stripePriceId) => {
        console.log(`🔄 Iniciando troca para: ${planName}`);
        
        if(!confirm(`Confirmar mudança para ${planName}?`)) return;

        // 1. --- AQUI ESTAVA FALTANDO: ATUALIZA O VISUAL DO MODAL ---
        // Pega os elementos pelo ID NOVO do HTML que te mandei
        const elTitle = document.getElementById('checkout_plan_name');
        const elPrice = document.getElementById('checkout_plan_price');
        const modal = document.getElementById('modal-checkout');

        // Escreve o nome e o preço na tela
        if (elTitle) elTitle.innerText = planName; 
        if (elPrice) elPrice.innerText = `R$ ${planPrice}`;

        // Abre a janela do modal
        if (modal) modal.style.display = 'block';
        
        // Coloca um "Carregando..." onde vai aparecer o cartão depois
        const container = document.getElementById('paymentBrick_container');
        if(container) container.innerHTML = '<div style="text-align:center; padding:40px; color:#666;"><i class="fas fa-spinner fa-spin fa-2x"></i><br><br>Iniciando pagamento seguro...</div>';

        // 2. PREPARA OS DADOS
        const user = app.currentUser;
        const priceInCents = Math.round(parseFloat(planPrice) * 100);

        try {
            // 3. CHAMA A API
            const response = await fetch('/api/create-subscription', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: user.email,
                    name: user.company_name || user.name,
                    existingStripeId: user.stripe_customer_id, 
                    stripePriceId: stripePriceId, 
                    priceInCents: priceInCents,
                    metadata: { 
                        tenant_id: user.tenant_id, 
                        plan_name: planName, 
                        new_plan_id: planId 
                    }
                }),
            });

            const data = await response.json();

            if (data.error) throw new Error(data.error.message || data.error);

            // 4. SE A API RESPONDEU, DESENHA O CARTÃO
            if (data.clientSecret) {
                // Configura dados temporários para caso precise salvar depois
                window.chk.tempUserData = { ...user, new_plan_id: planId, is_upgrade: true };
                
                // Chama o Stripe para desenhar o formulário
                window.chk.loadBrick(data.clientSecret, 'box_pagamento_modal');
            } else if (data.status === 'active') {
                alert("✅ Seu plano foi atualizado com sucesso!");
                location.reload();
            }

        } catch (error) {
            console.error(error);
            alert("Erro: " + error.message);
            // Fecha o modal se deu erro
            if(modal) modal.style.display = 'none';
        }
    },

    
    updateLocalPlan: async (newPlanId) => {
        await sb.from('tenants').update({ plan_type: newPlanId, plan_status: 'active' }).eq('id', app.currentUser.id);
        app.currentUser.plan_type = newPlanId;
        localStorage.setItem('donna_user', JSON.stringify(app.currentUser));
        window.location.reload();
    },

    // ... (fechamento do objeto app)

    // Nova função auxiliar para abrir o link certo
    subscribeTo: (link) => {
        if(!link || link.length < 5) return alert("Este plano ainda não tem link de pagamento configurado no Admin.");
        
        const btn = event.target;
        btn.innerText = "Abrindo...";
        window.open(link, '_blank');
        
        alert("Aba de pagamento aberta!\nAssim que pagar, seu plano atualizará automaticamente.");
        setTimeout(() => btn.innerText = "FAZER UPGRADE", 2000);
    },

    subscribePro: async () => {
        const btn = document.getElementById('btn-plan-pro');
        btn.innerText = "Gerando Link...";
        btn.disabled = true;

        try {
            // AQUI É O PULO DO GATO:
            // Como não temos Backend Node.js rodando aqui, vamos usar um Link de Assinatura Direto.
            // Para "produção real" automatizada, você precisaria criar o plano via API.
            
            // 1. Você deve ir no Painel do Mercado Pago > Assinaturas > Criar Plano.
            // 2. Copie o "Link de Assinatura" (Checkout) que eles geram.
            // 3. Coloque esse link abaixo na variável LINK_DO_MERCADO_PAGO.
            
            // Exemplo de link (substitua pelo seu real):
            const LINK_DO_MERCADO_PAGO = "https://www.mercadopago.com.br/subscriptions/checkout?preapproval_plan_id=2c9380847f..."; 
            
            if (LINK_DO_MERCADO_PAGO.includes("...")) {
                alert("ERRO: Você precisa configurar o Link de Assinatura no código (js/main.js linha ~subscribePro)");
                return;
            }

            // Abre o checkout em nova aba
            window.open(LINK_DO_MERCADO_PAGO, '_blank');

            // Simula "Aguardando pagamento" (Na vida real, usaremos Webhooks para confirmar)
            alert("A aba de pagamento foi aberta!\n\nAssim que você concluir, o sistema atualizará seu plano automaticamente em alguns instantes.");
            
        } catch (error) {
            console.error(error);
            alert("Erro ao iniciar pagamento.");
        } finally {
            btn.innerText = "ASSINAR AGORA";
            btn.disabled = false;
        }
    },

    cancelSubscription: async () => {
        if(!confirm("Tem certeza? Ao cancelar, você perderá acesso às funções PRO no fim do ciclo.")) return;

        // Aqui, na versão simples, apenas marcamos no banco. 
        // Na versão real, precisaríamos chamar a API do MP para parar a cobrança no cartão.
        alert("Para sua segurança, entre em contato com o suporte para confirmar o cancelamento no cartão.");
        window.open("https://wa.me/5541SEUNUMERO", "_blank");
    },
    
    // --- PEDIDOS SITE (APROVAÇÃO) ---
    // --- VERSÃO DETETIVE (PARA ACHAR O PEDIDO) ---
    renderAprovacoes: async () => {
        console.log("--- INICIANDO BUSCA DE APROVAÇÕES ---");
        const lista = document.getElementById('lista-aprovacoes');
        
        if(!lista) {
            console.error("ERRO: Não achei a div 'lista-aprovacoes' no HTML");
            return;
        }
        
        lista.innerHTML = '<div style="color:white">Buscando pedidos...</div>';

        try {
            // 1. Vamos buscar TUDO que não é Pendente nem Concluído para ver o que tem
            const { data: sales, error } = await sb.from('sales')
                .select('*')
                .eq('tenant_id', app.currentUser.tenant_id)
                .order('created_at', { ascending: false });

            if(error) throw error;

            console.log("Total de vendas encontradas:", sales.length);

            // 2. Filtrar manualmente para ver o status exato
            const pedidosParaAprovar = sales.filter(s => {
                console.log(`Pedido ${s.client_name} - Status: "${s.status}"`); // Mostra o status real no console
                return s.status === 'Aguardando Aprovação'; 
            });

            console.log("Pedidos filtrados para aprovação:", pedidosParaAprovar.length);

            lista.innerHTML = ''; 
            
            // Atualiza bolinha vermelha
            const badge = document.getElementById('badge-online');
            if(badge) {
                badge.innerText = pedidosParaAprovar.length;
                badge.style.display = pedidosParaAprovar.length > 0 ? 'inline-block' : 'none';
            }

            if (pedidosParaAprovar.length === 0) {
                lista.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:40px; background:#1a1a1a; border-radius:10px; border:1px dashed #333;"><h3 style="color:#fff; margin:0;">Nenhum pedido novo</h3><p style="color:#666;">Aguardando novos pedidos...</p></div>`;
                return;
            }

            // Renderiza
            pedidosParaAprovar.forEach(sale => {
                // ... (código visual do card igual ao anterior) ...
                let itensHtml = '';
                if (sale.items_json && Array.isArray(sale.items_json)) {
                    sale.items_json.forEach(i => { itensHtml += `<li style="font-size:13px; color:#bbb; margin-bottom:4px;">• <b>${i.qty}x</b> ${i.name}</li>`; });
                }
                
                const card = document.createElement('div');
                card.style = "background: #1e1e1e; border: 1px solid #333; border-radius: 12px; padding: 20px; display: flex; flex-direction: column; box-shadow:0 4px 10px rgba(0,0,0,0.2)";
                card.innerHTML = `
                    <div style="display:flex; justify-content:space-between; margin-bottom:15px; border-bottom:1px solid #333; padding-bottom:10px;">
                        <strong style="color:var(--primary); font-size:16px;">${sale.client_name}</strong>
                        <span style="font-size:12px; color:#666;">${new Date(sale.created_at).toLocaleDateString()}</span>
                    </div>
                    <div style="margin-bottom:20px; flex:1;">
                        <div style="margin-bottom:10px; color:#fff; font-size:14px;"><i class="fa-brands fa-whatsapp" style="color:#25D366"></i> ${sale.client_phone}</div>
                        <div style="background:#111; padding:10px; border-radius:6px;"><ul style="padding-left:0; list-style:none; margin:0;">${itensHtml}</ul></div>
                        <div style="margin-top:15px; font-weight:800; font-size:18px; color:white; text-align:right;">R$ ${parseFloat(sale.total_amount).toFixed(2)}</div>
                    </div>
                    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
                        <button class="btn" style="background:transparent; border:1px solid #444; color:#f55;" onclick="app.actionOrder('${sale.id}', 'rejeitar')">Rejeitar</button>
                        <button class="btn btn-primary" onclick="app.openSiteApproval('${sale.id}')">APROVAR</button>
                    </div>`;
                lista.appendChild(card);
            });

        } catch (e) { 
            console.error("Erro na renderização:", e);
            lista.innerHTML = '<div style="color:red">Erro ao buscar pedidos. Veja o console.</div>'; 
        }
    },
    // --- 1. ABRE A JANELA DE APROVAÇÃO ---
    openSiteApproval: (id) => {
        document.getElementById('site-apr-id').value = id;
        document.getElementById('site-apr-entry').value = ''; // Limpa valor anterior
        document.getElementById('site-apr-date').value = '';  // Limpa data anterior
        
        // Abre o modal
        const modal = document.getElementById('modal-approve-site');
        if(modal) modal.style.display = 'flex';
    },

    // --- 2. FINALIZA: SALVA O DINHEIRO E MANDA PRO KANBAN ---
    finishSiteApproval: async () => {
        const id = document.getElementById('site-apr-id').value;
        const entryVal = app.parseMoney(document.getElementById('site-apr-entry').value);
        const dueDate = document.getElementById('site-apr-date').value;

        const btn = event.target; 
        btn.innerText = "..."; btn.disabled = true;

        try {
            // A. Busca dados originais para a descrição do caixa
            const { data: sale } = await sb.from('sales').select('client_name').eq('id', id).single();

            // B. Atualiza o Pedido (Status -> Pendente)
            const updateData = {
                status: 'Pendente', // Manda pro Kanban!
                amount_paid: entryVal, // Registra quanto pagou
                due_date: dueDate || null // Registra quando vence o resto
            };

            const { error } = await sb.from('sales').update(updateData).eq('id', id);
            if(error) throw error;

            // C. Se teve entrada, lança no Financeiro (Caixa)
            if (entryVal > 0) {
                await sb.from('fin_movs').insert([{
                    tenant_id: app.currentUser.tenant_id,
                    type: 'entrada',
                    description: `Sinal Site: ${sale.client_name}`,
                    amount: entryVal,
                    category: 'Vendas',
                    date: new Date().toISOString()
                }]);
            }

            // D. Fecha tudo e atualiza
            document.getElementById('modal-approve-site').style.display = 'none';
            app.notify("Pedido Aprovado e Enviado para Produção!");
            app.renderAprovacoes(); // Atualiza a lista de aprovações
            
        } catch (e) {
            alert("Erro ao aprovar: " + e.message);
        } finally {
            btn.innerText = "CONFIRMAR"; btn.disabled = false;
        }
    },
    actionOrder: async (id, action) => {
        if(!confirm(action === 'aprovar' ? 'Aprovar e enviar para produção?' : 'Deseja realmente rejeitar este pedido?')) return;
        const newStatus = action === 'aprovar' ? 'Pendente' : 'Cancelado';
        try {
            const { error } = await sb.from('sales').update({ status: newStatus }).eq('id', id);
            if(error) throw error;
            app.notify(action === 'aprovar' ? "Pedido Aprovado! Foi para o Kanban." : "Pedido Rejeitado.");
            app.renderAprovacoes(); 
            if(typeof app.loadKanban === 'function') app.loadKanban(); 
        } catch(e) { alert("Erro: " + e.message); }
    },
    loadCatalogConfig: async () => {
        const u = app.currentUser;
        if (!u) return;
        const setSrc = (id, v) => { const el = document.getElementById(id); if(el) el.src = v || 'https://placehold.co/100'; };
        const setVal = (id, v) => { const el = document.getElementById(id); if(el) el.value = v || ''; };

        try {
            setSrc('preview-logo', u.logo_url);
            setSrc('preview-banner', u.banner_url);
            setVal('val-cat-logo', u.logo_url);
            setVal('val-cat-banner', u.banner_url);
            setVal('val-cat-insta', u.instagram);
            setVal('val-store-bio', u.store_bio);
            setVal('val-store-color', u.store_color || '#000000');
            const cfg = u.theme_config || {};
            
            const ids = [ 'cfg-header-bg', 'cfg-header-size', 'cfg-banner-height', 'cfg-price-size', 'cfg-body-bg', 'cfg-footer-bg', 'cfg-footer-text-color', 'cfg-footer-l1', 'cfg-footer-l2', 'cfg-footer-l3' ];
            ids.forEach(id => {
                if(cfg[id]) {
                    setVal(id, cfg[id]);
                    const el = document.getElementById(id);
                    if(el && el.type === 'range') el.nextElementSibling.innerText = cfg[id] + 'px';
                }
            });
        } catch(e) { console.warn("Erro ao carregar builder", e); }
    },
    saveCatalogConfig: async () => {
        const btn = event.target;
        btn.innerHTML = 'SALVANDO...'; btn.disabled = true;
        try {
            const getVal = (id) => { const el = document.getElementById(id); return el ? el.value : ''; };
            const themeConfig = {};
            const inputs = document.querySelectorAll('[id^="cfg-"]'); 
            inputs.forEach(input => themeConfig[input.id] = input.value);

            const payload = {
                logo_url: getVal('val-cat-logo'),
                banner_url: getVal('val-cat-banner'),
                instagram: getVal('val-cat-insta'),
                store_bio: getVal('val-store-bio'),
                store_color: getVal('val-store-color'),
                theme_config: themeConfig 
            };
            const { error } = await sb.from('tenants').update(payload).eq('id', app.currentUser.id);
            if(error) throw error;
            Object.assign(app.currentUser, payload);
            localStorage.setItem('donna_user', JSON.stringify(app.currentUser));
            const pl = document.getElementById('preview-logo'); if(pl) pl.src = payload.logo_url;
            const pb = document.getElementById('preview-banner'); if(pb) pb.src = payload.banner_url;
            app.notify("Loja atualizada com sucesso!");
        } catch(e) { alert("Erro: " + e.message); }
        finally { btn.innerHTML = '<i class="fa-solid fa-save"></i> SALVAR TUDO'; btn.disabled = false; }
    },
    openMyCatalog: () => {
        if (!app.currentUser) return alert("Você precisa estar logado.");
        const baseUrl = window.location.href.substring(0, window.location.href.lastIndexOf('/'));
        window.open(`${baseUrl}/catalogo.html?id=${app.currentUser.tenant_id}`, '_blank');
    },
    // --- CARREGAR A LOJA (PDV) ---
    loadShop: async () => {
        // 1. Busca Produtos e Clientes para o Cache
        const { data: prods } = await sb.from('products').select('*').eq('tenant_id', app.currentUser.tenant_id);
        const { data: clis } = await sb.from('clients').select('*').eq('tenant_id', app.currentUser.tenant_id);

        app.cache.products = prods || [];
        app.cache.clients = clis || [];

        // 2. Preenche o Datalist de Clientes (Autocompletar)
        const dl = document.getElementById('cli-list-opts');
        if(dl) {
            dl.innerHTML = '';
            app.cache.clients.forEach(c => dl.innerHTML += `<option value="${c.name}">`);
        }

        // 3. Renderiza a Vitrine de Produtos
        const vitrine = document.getElementById('vitrine');
        if(!vitrine) return;
        vitrine.innerHTML = '';

        if(!app.cache.products.length) {
            vitrine.innerHTML = '<div style="padding:20px; color:#666; text-align:center;">Nenhum produto cadastrado.<br>Vá em "Produtos" para cadastrar.</div>';
            return;
        }

        app.cache.products.forEach(p => {
            // Verifica imagem ou usa ícone padrão
            let img = `<div style="height:80px; background:#222; display:flex; align-items:center; justify-content:center; color:#444"><i class="fa-solid fa-box fa-2x"></i></div>`;
            if(p.image_url) img = `<img src="${p.image_url}" style="height:80px; width:100%; object-fit:cover">`;

            vitrine.innerHTML += `
                <div class="prod-card" onclick="app.clickProd('${p.id}')" style="background:#1a1a1a; border:1px solid #333; border-radius:8px; overflow:hidden; cursor:pointer; transition:transform 0.1s;">
                    ${img}
                    <div style="padding:10px;">
                        <div style="font-weight:bold; font-size:13px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${p.name}</div>
                        <div style="color:var(--primary); font-weight:bold; margin-top:5px;">R$ ${parseFloat(p.price).toFixed(2)}</div>
                    </div>
                </div>
            `;
        });
    },
    // No seu objeto app ou função de logout:

logout: async () => {
    console.log("👋 Saindo do sistema...");

    try {
        // Tenta avisar o Supabase (pode dar erro 403 se já estiver deslogado)
        const { error } = await sb.auth.signOut();
        if (error) console.warn("Aviso do Supabase:", error.message);
    } catch (err) {
        // Se der erro de rede ou 403, a gente ignora
        console.log("Sessão já estava inválida no servidor, limpando localmente...");
    } finally {
        // 🧹 A FAXINA (Isso roda dando erro ou não)
        localStorage.clear(); // Limpa dados salvos
        sessionStorage.clear(); // Limpa sessão
        
        // Manda o usuário para a tela de login
        window.location.href = '/'; 
        // ou window.location.reload(); se preferir
    }
},
    // --- LOGIN CORRIGIDO (Gera Sessão para o Admin) ---
    login: async () => {
        const emailInput = document.getElementById('login-email'); // Verifique se o ID no HTML é 'login-email' ou 'email'
        const passInput = document.getElementById('login-pass');   // Verifique se o ID no HTML é 'login-pass' ou 'password'
        
        // Fallback para IDs comuns caso o seu HTML use nomes diferentes
        const email = emailInput ? emailInput.value.trim() : document.getElementById('email').value.trim();
        const password = passInput ? passInput.value : document.getElementById('password').value;

        if (!email || !password) return alert("Preencha email e senha.");

        // 1. TENTA LOGIN NA AUTENTICAÇÃO REAL (Necessário para o Admin funcionar)
        const { data: authData, error: authError } = await sb.auth.signInWithPassword({
            email: email,
            password: password
        });

        // 2. BUSCA DADOS DA LOJA (Para o App funcionar)
        // Mesmo que o Auth falhe (usuário antigo), tentamos buscar na tabela tenants
        const { data: tenantData } = await sb.from('tenants')
            .select('*')
            .eq('email', email)
            .eq('password', password) // Verifica senha legado
            .maybeSingle();

        if (authData.user || tenantData) {
            // Sucesso!
            const userData = tenantData || { ...authData.user, is_admin: false }; // Fallback
            
            localStorage.setItem('donna_user', JSON.stringify(userData));
            app.currentUser = userData;

            // --- REDIRECIONAMENTO INTELIGENTE ---
            const isAdminEmail = email.toLowerCase() === 'admin@donna.com';
            const isAdminUser = userData.is_admin === true;

            if (isAdminEmail || isAdminUser) {
                // Se o Auth falhou mas o tenant existe, precisamos criar o usuário no Auth
                if (authError && isAdminEmail) {
                    alert("Atenção Admin: Seu usuário existe na tabela, mas não na Autenticação.\nCrie uma conta no painel do Supabase > Authentication com este email.");
                }
                window.location.href = 'super-admin.html';
            } else {
                app.start();
            }
        } else {
            alert('Email ou senha incorretos.');
            if(authError) console.error("Erro Auth:", authError.message);
        }
    },

    // --- DASHBOARD CENTRAL ---
    toggleDash: (tabName) => {
        ['tab-visao', 'tab-extrato', 'tab-contas', 'tab-pedidos'].forEach(id => {
            const el = document.getElementById(id);
            if(el) el.style.display = 'none';
        });
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
            btn.style.background = 'transparent';
            btn.style.color = '#888';
            btn.style.boxShadow = 'none';
        });
        const target = document.getElementById('tab-' + tabName);
        const btn = document.getElementById('btn-tab-' + tabName);
        
        if(target) target.style.display = 'block';
        if(btn) {
            btn.classList.add('active');
            btn.style.background = 'var(--primary)';
            btn.style.color = '#fff';
            btn.style.boxShadow = '0 0 15px rgba(118, 75, 162, 0.5)';
        }
    },

    // --- DASHBOARD (CORREÇÃO DO SALDO DUPLICADO) ---
    // --- DASHBOARD INTELIGENTE (PREENCHE OS 5 CARDS COM FILTRO) ---
    // --- DASHBOARD (COM ALERTA DE VENCIMENTO HOJE) ---
    loadDash: async () => {
        const u = app.currentUser;
        if (!u) return;

        const safeHTML = (id, val) => { const el = document.getElementById(id); if(el) el.innerHTML = val; };
        const fmt = (v) => v.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'});

        try {
            // 1. FILTRO
            const periodEl = document.getElementById('dash-period');
            const periodo = periodEl ? periodEl.value : 'mes'; 

            // 2. DADOS
            const [rSales, rMovs, rBills, rUsers] = await Promise.all([
                sb.from('sales').select('*').eq('tenant_id', u.tenant_id).order('created_at', {ascending:false}),
                sb.from('fin_movs').select('*').eq('tenant_id', u.tenant_id),
                sb.from('fin_bills').select('*').eq('tenant_id', u.tenant_id).order('due_date', {ascending:true}), // Ordenar por vencimento
                sb.from('users').select('monthly_goal').eq('id', u.id).maybeSingle() 
            ]);

            const vendas = rSales.data || [];
            const movs = rMovs.data || [];
            const contas = rBills.data || [];
            const meta = (rUsers.data && rUsers.data.monthly_goal) ? rUsers.data.monthly_goal : 10000;

            // 3. DATAS
            const hoje = new Date();
            const isHoje = (dStr) => {
                if(!dStr) return false;
                const d = new Date(dStr);
                const dLoc = new Date(d.valueOf() + d.getTimezoneOffset() * 60000);
                return dLoc.getDate() === hoje.getDate() && dLoc.getMonth() === hoje.getMonth() && dLoc.getFullYear() === hoje.getFullYear();
            };

            const isInPeriod = (dataString) => {
                if(!dataString) return false;
                if(periodo === 'tudo') return true;
                const d = new Date(dataString);
                const dLoc = new Date(d.valueOf() + d.getTimezoneOffset() * 60000);
                
                if (periodo === 'hoje') return isHoje(dataString);
                if (periodo === 'mes') return dLoc.getMonth() === hoje.getMonth() && dLoc.getFullYear() === hoje.getFullYear();
                if (periodo === 'ano') return dLoc.getFullYear() === hoje.getFullYear();
                return true;
            };
            

            // 4. CÁLCULOS E ALERTA
            let saldoAtual = 0; let totalVendas = 0; let lucroEnt = 0; let lucroSai = 0;
            let aReceber = 0; let aPagar = 0;
            let temContaVencendoHoje = false; // Flag para o pisca-pisca

            // Movimentações
            movs.forEach(m => {
                if(m.type === 'entrada') saldoAtual += m.amount; else saldoAtual -= m.amount;
                if(isInPeriod(m.date)) { if(m.type === 'entrada') lucroEnt += m.amount; else lucroSai += m.amount; }
            });

            // Vendas
            vendas.forEach(v => {
                if(v.status !== 'Cancelado' && v.status !== 'Excluido') {
                    if(isInPeriod(v.created_at)) totalVendas += v.total_amount;
                    const rest = v.total_amount - (v.amount_paid || 0);
                    if(rest > 0.05 && isInPeriod(v.due_date || v.created_at)) aReceber += rest;
                }
                
            });

            // Contas (Aqui checamos o vencimento hoje)
            contas.forEach(c => {
                const dataConta = c.due_date || c.created_at;
                
                if(c.status === 'pendente') {
                    // Verifica alerta (Se é Pagar E vence Hoje)
                    if(c.type === 'pagar' && isHoje(c.due_date)) {
                        temContaVencendoHoje = true;
                    }

                    // Soma totais
                    if(isInPeriod(dataConta)) {
                        if(c.type === 'receber') aReceber += c.amount;
                        else aPagar += c.amount;
                    }
                }
            });

            // 5. ATUALIZA TELA
            safeHTML('dash-saldo-atual', fmt(saldoAtual));
            safeHTML('dash-vendas-val', fmt(totalVendas));
            safeHTML('dash-lucro', fmt(lucroEnt - lucroSai));
            safeHTML('dash-a-receber', fmt(aReceber));
            safeHTML('dash-a-pagar', fmt(aPagar));

            // --- LÓGICA DO PISCA-PISCA ---
            const cardPagar = document.getElementById('card-dash-pagar');
            const avisoVenc = document.getElementById('aviso-vencendo');
            if(cardPagar) {
                if(temContaVencendoHoje) {
                    cardPagar.classList.add('blink-warning'); // Ativa animação
                    if(avisoVenc) avisoVenc.style.display = 'block';
                } else {
                    cardPagar.classList.remove('blink-warning');
                    if(avisoVenc) avisoVenc.style.display = 'none';
                }
            }

            // 6. EXTRAS
            const perc = Math.min(100, Math.round((totalVendas / meta) * 100));
            safeHTML('dash-meta-percent', `${perc}%`);
            const bar = document.getElementById('dash-meta-bar');
            if(bar) bar.style.width = `${perc}%`;

            if(app.renderChart) app.renderChart(vendas.filter(v => isInPeriod(v.created_at)));
            app.renderMiniLists(movs, contas, vendas); // Chama a função corrigida abaixo

        } catch (e) {
            console.error(e);
        }
    },

    // --- LISTAS LATERAIS (AGORA MOSTRANDO A DATA CORRETAMENTE) ---
    renderMiniLists: (movs, contas, vendas) => {
        // Função para formatar data bonita (DD/MM)
        const dateFmt = (dStr) => {
            if(!dStr) return 'Sem data';
            const d = new Date(dStr);
            const dLoc = new Date(d.valueOf() + d.getTimezoneOffset() * 60000);
            return dLoc.toLocaleDateString('pt-BR', {day:'2-digit', month:'2-digit'});
        };

        // Extrato
        const elMov = document.getElementById('lista-mov');
        if(elMov) {
            elMov.innerHTML = movs.length ? '' : '<tr><td colspan="5" style="text-align:center;padding:20px;color:#666">Vazio</td></tr>';
            movs.forEach(m => {
                 elMov.innerHTML += `<tr style="border-bottom:1px solid #333"><td style="padding:15px;color:#ccc">${new Date(m.date).toLocaleDateString()}</td><td style="padding:15px;color:#ccc">${m.description}</td><td style="padding:15px;color:#ccc">${m.category||'-'}</td><td style="padding:15px;font-weight:bold;color:${m.type==='entrada'?'#00e676':'#ff5252'}">${m.type==='entrada'?'+':'-'} R$ ${m.amount.toFixed(2)}</td><td style="padding:15px;text-align:right"><button class="btn btn-xs btn-outline" onclick="app.delMov('${m.id}')"><i class="fa-solid fa-trash"></i></button></td></tr>`;
            });
        }
        
        // Financeiro (Aqui estava o problema da data)
        const elRec = document.getElementById('lista-contas-receber');
        const elPag = document.getElementById('lista-contas-pagar');
        if(elRec) elRec.innerHTML = '';
        if(elPag) elPag.innerHTML = '';

        contas.forEach(c => {
            if(c.status === 'pendente') {
                const dia = dateFmt(c.due_date);
                
                // Se vence hoje, destaca em amarelo
                const hojeStr = new Date().toLocaleDateString('pt-BR', {day:'2-digit', month:'2-digit'});
                const corData = (dia === hojeStr) ? '#ffeaa7' : '#666';
                const iconeHoje = (dia === hojeStr) ? '⚠️' : '';

                const html = `
                <tr style="border-bottom:1px solid #333">
                    <td style="padding:10px; color:#ccc">
                        ${c.description}
                        <div style="font-size:10px; color:${corData}; margin-top:2px;">
                            ${iconeHoje} Venc: ${dia}
                        </div>
                    </td>
                    <td style="padding:10px; font-weight:bold; color:white">R$ ${c.amount.toFixed(2)}</td>
                    <td style="padding:10px; text-align:right">
                        <button class="btn btn-xs ${c.type==='receber'?'btn-success':'btn-danger'}" onclick="app.payBill('${c.id}', ${c.amount}, '${c.description}')">OK</button>
                        <button class="btn btn-xs btn-outline" onclick="app.delMov('${c.id}', ${c.amount}, '${c.description}')"><i class="fa-solid fa-trash"></i></button></td></tr>
                    </td>
                </tr>`;

                if(c.type === 'receber' && elRec) elRec.innerHTML += html;
                else if(c.type === 'pagar' && elPag) elPag.innerHTML += html;
            }
        });
        
        // Adiciona Vendas Pendentes no A Receber
        vendas.forEach(v => {
            const rest = v.total_amount - (v.amount_paid||0);
            if(v.status!=='Cancelado' && rest > 0.05 && elRec) {
                const dia = dateFmt(v.due_date || v.created_at);
                elRec.innerHTML += `<tr style="border-bottom:1px solid #333"><td style="padding:10px;color:#ccc">${v.client_name}<br><small style="color:#e67e22">Venc: ${dia}</small></td><td style="padding:10px;font-weight:bold;color:white">R$ ${rest.toFixed(2)}</td><td style="padding:10px;text-align:right"><button class="btn btn-xs btn-outline" onclick="app.showOrderDetails('${v.id}')">Ver</button></td></tr>`;
            }
        });
    },

    renderChart: (vendas) => {
        const ctx = document.getElementById('salesChart');
        if(!ctx) return;
        const labels = [], dataValues = [], dias = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
        for (let i = 6; i >= 0; i--) {
            const d = new Date(); d.setDate(d.getDate() - i);
            labels.push(dias[d.getDay()]);
            const totalDia = vendas.filter(v => {
                const dv = new Date(v.created_at);
                return dv.getDate() === d.getDate() && dv.getMonth() === d.getMonth() && v.status !== 'Cancelado';
            }).reduce((acc, curr) => acc + curr.total_amount, 0);
            dataValues.push(totalDia);
        }
        if(window.myChartInstance) window.myChartInstance.destroy();
        window.myChartInstance = new Chart(ctx, {
            type: 'line',
            data: { labels: labels, datasets: [{ label: 'Vendas', data: dataValues, borderColor: '#00f3ff', backgroundColor: 'rgba(0, 243, 255, 0.1)', borderWidth: 2, tension: 0.4, fill: true }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#888' } }, x: { grid: { display: false }, ticks: { color: '#888' } } } }
        });
    },

    // --- FINANCEIRO AÇÕES ---
    delMov: async (id, amount, description) => { if(confirm("Excluir?")) { await sb.from('fin_movs').delete(id).eq('id', id); app.loadDash(); }
 const confirmar = confirm(`Deseja realmente excluir a conta: "${description}" no valor de R$ ${amount}?`);
    
    if (!confirmar) return;

    try {
        // 2. Deleta no Supabase (tabela de movimentações ou contas_pagar)
        // Ajuste o nome da tabela conforme o seu banco ('movimentacoes' ou 'contas_pagar')
        const { error } = await sb
            .from('fin_bills') 
            .delete()
            .eq('id', id);

        if (error) throw error;

        // 3. Feedback e Atualização
        alert("Apagado com sucesso!");
        
        // FORÇA A PÁGINA A RECARREGAR AGORA
        window.location.reload(); 

    } catch (e) {
        console.error(e);
        // Se ainda der erro, o alerta vai mostrar exatamente o que é
        alert("Erro no código: " + e.message);
    }
},
    saveMov: async () => {
        const d = { tenant_id: app.currentUser.tenant_id, type: document.getElementById('mov-type').value, description: document.getElementById('mov-desc').value, amount: app.parseMoney(document.getElementById('mov-val').value), category: document.getElementById('mov-cat').value, date: document.getElementById('mov-date').value || new Date() };
        await sb.from('fin_movs').insert([d]); app.closeModal('mov'); app.loadDash();
    },
    // --- SALVAR CONTA (CORRIGIDO ERRO DE DATA) ---
    saveBill: async () => {
        // 1. Pega os valores
        const desc = document.getElementById('bill-desc').value;
        const valStr = document.getElementById('bill-val').value;
        const cat = document.getElementById('bill-cat').value;
        const due = document.getElementById('bill-due').value;

        // 2. Validações
        if(!desc) return alert("Digite a descrição da conta.");
        
        const amount = app.parseMoney(valStr);
        if(amount <= 0) return alert("Valor inválido.");

        // 3. Prepara o objeto (Trata a data vazia)
        const d = { 
            tenant_id: app.currentUser.tenant_id, 
            description: desc, 
            amount: amount, 
            category: cat, 
            // SE a data estiver vazia, envia NULL. Se tiver valor, envia a data.
            due_date: due ? due : null, 
            type: 'pagar' 
        };

        try {
            // 4. Envia para o banco
            const { error } = await sb.from('fin_bills').insert([d]);
            
            if(error) throw error;

            app.closeModal('bill'); 
            app.loadDash();
            app.notify("Conta salva com sucesso!");

        } catch (e) {
            console.error(e);
            alert("Erro ao salvar conta: " + e.message);
        }
    },
    payBill: async (id, val, desc) => {
        if(confirm(`Confirmar baixa de R$ ${val.toFixed(2)}?`)) {
            await sb.from('fin_bills').update({status:'pago'}).eq('id',id);
            await sb.from('fin_movs').insert([{ tenant_id: app.currentUser.tenant_id, type: 'saida', description: 'Pagto: '+(desc||'Conta'), amount: val, category: 'Contas', date: new Date().toISOString() }]);
            app.loadDash(); app.notify("Baixa Realizada!");
        }
    },

    // --- PDV (VENDAS) ---
    checkCli: () => {
        const val = document.getElementById('pos-cli-name').value;
        const c = app.cache.clients.find(x => x.name === val);
        if (c) {
            document.getElementById('pos-cli-id').value = c.id;
            document.getElementById('pos-cli-tel').value = c.phone || '';
            document.getElementById('pos-cli-cep').value = c.cep || '';
            document.getElementById('pos-cli-rua').value = c.street || '';
            document.getElementById('pos-cli-num').value = c.number || '';
            document.getElementById('pos-cli-bairro').value = c.district || '';
            document.getElementById('pos-cli-cidade').value = c.city || '';
        } else {
            document.getElementById('pos-cli-id').value = '';
        }
    },
    // --- BUSCAR CEP NO PDV (VIACEP) ---
    buscarCepPDV: async () => {
        const cepInput = document.getElementById('pos-cli-cep');
        // Pega apenas os números
        const c = cepInput.value.replace(/\D/g, ''); 

        if (c.length === 8) {
            // Visual de carregamento
            cepInput.style.opacity = '0.5';
            cepInput.style.cursor = 'wait';

            try {
                const r = await fetch(`https://viacep.com.br/ws/${c}/json/`);
                const d = await r.json();
                
                if (!d.erro) {
                    // Preenche os campos do PDV (note o prefixo 'pos-')
                    document.getElementById('pos-cli-rua').value = d.logradouro.toUpperCase();
                    document.getElementById('pos-cli-bairro').value = d.bairro.toUpperCase();
                    document.getElementById('pos-cli-cidade').value = (d.localidade + '/' + d.uf).toUpperCase();
                    
                    // Foca no número para agilizar
                    document.getElementById('pos-cli-num').focus();
                } else {
                    alert("CEP não encontrado!");
                    // Limpa se der erro
                    document.getElementById('pos-cli-rua').value = "";
                    document.getElementById('pos-cli-bairro').value = "";
                    document.getElementById('pos-cli-cidade').value = "";
                }
            } catch(e) {
                console.error('Erro CEP:', e);
            } finally {
                // Restaura o campo
                cepInput.style.opacity = '1';
                cepInput.style.cursor = 'text';
            }
        }
    },
    finishSale: async (e) => {
        if (e && typeof e.preventDefault === 'function') e.preventDefault();
        
        // 1. Validações Iniciais
        const btn = (e && e.target) ? e.target : document.querySelector('button[onclick*="finishSale"]');
        if (!app.cart || app.cart.length === 0) return alert("Carrinho vazio!");
        
        const cliName = document.getElementById('pos-cli-name')?.value.trim();
        if (!cliName) return alert("Selecione ou digite o nome do Cliente!");

        // 2. Captura valores do formulário
        const totalVal = app.parseMoney(document.getElementById('cart-total').innerText);
        const entryVal = app.parseMoney(document.getElementById('pos-entry').value);
        const payMethod = document.getElementById('pos-pay')?.value || 'Dinheiro';
        const dueDate = document.getElementById('pos-due')?.value;

        // Bloqueia botão
        try {
            // 1. Busca dados do usuário (Limite Customizado)
            const { data: user } = await sb.from('tenants').select('plan_type, custom_limit').eq('tenant_id', app.currentUser.tenant_id).single();
            
            // 2. Busca dados do plano (Limite Padrão)
            const { data: plan } = await sb.from('plans').select('monthly_limit').eq('id', user.plan_type).maybeSingle();
            
            // 3. Define qual limite vale (O customizado vence o do plano)
            const limit = (user.custom_limit && user.custom_limit > 0) ? user.custom_limit : (plan ? plan.monthly_limit : 50);

            // 4. Se for limite alto (999999), deixa passar direto
            if (limit < 900000) {
                // Conta quantos pedidos foram feitos este mês
                const now = new Date();
                const primeiroDia = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
                
                const { count } = await sb.from('sales')
                    .select('*', { count: 'exact', head: true })
                    .eq('tenant_id', app.currentUser.tenant_id)
                    .gte('created_at', primeiroDia); // Apenas deste mês

                if (count >= limit) {
                    alert(`🚫 LIMITE ATINGIDO! (${count}/${limit})\n\nSeu plano atual permite apenas ${limit} pedidos por mês.\nFaça um upgrade ou fale com o suporte.`);
                    app.nav('assinatura'); // Manda ele pra tela de pagar
                    return; // PARA TUDO!
                }
            }
        } catch (errLimit) {
            console.error("Erro ao verificar limite:", errLimit);
            // Em caso de erro na verificação, optamos por deixar passar ou bloquear? 
            // Melhor deixar passar para não parar a loja por erro técnico.
        }
        // --------------------------------------

        // ... (Continua o código de salvar a venda) ...
        if (btn) { btn.innerText = "VERIFICANDO..."; btn.disabled = true; }

        try {
            // --- 🚨 VERIFICAÇÃO DE LIMITE EM TEMPO REAL 🚨 ---
            
            // A. Busca dados atualizados da loja (para ver se tem Limite Extra)
            const { data: user } = await sb
                .from('tenants')
                .select('plan_type, custom_limit')
                .eq('tenant_id', app.currentUser.tenant_id)
                .single();

            // B. Busca dados do plano base
            const { data: plan } = await sb
                .from('plans')
                .select('monthly_limit')
                .eq('id', user.plan_type)
                .maybeSingle(); // maybeSingle evita erro se o plano não existir mais

            // C. Define o limite final (Manual vence Plano)
            // Se custom_limit for maior que 0, usa ele. Se não, usa o do plano (ou 50 padrão)
            const limitePlano = plan ? plan.monthly_limit : 50;
            const limiteFinal = (user.custom_limit && user.custom_limit > 0) ? user.custom_limit : limitePlano;

            console.log(`Limite Atual: ${limiteFinal}`);

            // D. Verifica se estourou (Apenas se não for Ilimitado/999999)
            if (limiteFinal < 900000) {
                const now = new Date();
                // Primeiro dia do mês atual
                const primeiroDia = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
                
                const { count } = await sb.from('sales')
                    .select('*', { count: 'exact', head: true })
                    .eq('tenant_id', app.currentUser.tenant_id)
                    .gte('created_at', primeiroDia);

                if (count >= limiteFinal) {
                    alert(`🚫 LIMITE ATINGIDO! (${count}/${limiteFinal})\n\nSeu plano permite apenas ${limiteFinal} pedidos.\nSolicite um aumento de limite ao administrador.`);
                    app.nav('assinatura'); // Leva para a tela de upgrade
                    return; // 🛑 PARA TUDO AQUI
                }
            }

            // --- 3. SE PASSOU, SALVA A VENDA ---
            
            const payload = {
                tenant_id: app.currentUser.tenant_id,
                client_name: cliName,
                total_amount: totalVal,
                amount_paid: entryVal,
                items_json: app.cart,
                status: 'Pendente',
                payment_method: payMethod,
                due_date: dueDate || null
            };

            // Se for cliente cadastrado, vincula ID
            if(app.cache.clients) {
                const existingCli = app.cache.clients.find(c => c.name === cliName);
                if(existingCli) { 
                    payload.client_id = existingCli.id; 
                    payload.client_phone = existingCli.phone; 
                }
            }

            const { error } = await sb.from('sales').insert([payload]);
            if (error) throw error;

            // Lança no Financeiro se teve entrada
            if (entryVal > 0) {
                await sb.from('fin_movs').insert([{
                    tenant_id: app.currentUser.tenant_id,
                    type: 'entrada',
                    description: `Venda PDV: ${cliName}`,
                    category: 'Vendas',
                    amount: entryVal,
                    date: new Date().toISOString()
                }]);
            }

            app.notify("✅ Venda Finalizada com Sucesso!");
            app.clearPDV();
            app.loadDash();

        } catch (err) {
            console.error("Erro:", err);
            alert("Erro ao finalizar: " + err.message);
        } finally {
            if (btn) { btn.innerText = "FINALIZAR VENDA"; btn.disabled = false; }
        }
    },
    clearPDV: () => {
        app.cart = []; app.renderCart();
        ['pos-cli-id', 'pos-cli-name', 'pos-cli-tel', 'pos-cli-cep', 'pos-cli-rua', 'pos-cli-num', 'pos-cli-bairro', 'pos-cli-cidade', 'pos-entry', 'pos-due'].forEach(id => document.getElementById(id).value = '');
        if(document.getElementById('pos-restante')) document.getElementById('pos-restante').innerText = "R$ 0,00";
    },
    addToCart: (item) => {
        const existing = app.cart.find(x => String(x.id) === String(item.id));
        if (existing) existing.qty++; else app.cart.push(item);
        app.renderCart();
    },
    renderCart: () => {
        const container = document.getElementById('cart-list');
        const totalEl = document.getElementById('cart-total');
        container.innerHTML = '';
        let total = 0;
        if (app.cart.length === 0) container.innerHTML = '<div class="cart-empty">Carrinho Vazio</div>';
        app.cart.forEach((item, index) => {
            const subtotal = item.price * item.qty;
            total += subtotal;
            container.innerHTML += `<div class="cart-item"><div><div style="font-weight:bold; color:white;">${item.name}</div><div style="font-size:10px; color:#888;">${item.qty}x R$ ${item.price.toFixed(2)}</div></div><div style="text-align:right;"><div style="color:var(--primary);">R$ ${subtotal.toFixed(2)}</div><i class="fa-solid fa-trash" style="color:#555; cursor:pointer; margin-top:5px;" onclick="app.removeFromCart(${index})"></i></div></div>`;
        });
        totalEl.innerText = "R$ " + total.toLocaleString('pt-BR', {minimumFractionDigits: 2});
        if(app.calcRestante) app.calcRestante();
    },
    removeFromCart: (index) => { app.cart.splice(index, 1); app.renderCart(); },
    calcRestante: () => {
        const total = app.parseMoney(document.getElementById('cart-total').innerText);
        const entrada = app.parseMoney(document.getElementById('pos-entry').value);
        const restante = total - entrada;
        const el = document.getElementById('pos-restante');
        if(el) {
            if(restante > 0) { el.innerText = "Falta: R$ " + restante.toLocaleString('pt-BR', {minimumFractionDigits: 2}); el.style.color = "var(--danger)"; } 
            else { el.innerText = "Troco: R$ " + Math.abs(restante).toLocaleString('pt-BR', {minimumFractionDigits: 2}); el.style.color = "var(--success)"; }
        }
    },
    // --- FUNÇÃO QUE FALTAVA: CARREGAR CATEGORIAS NO SELECT ---
    loadCats: () => {
        const select = document.getElementById('prod-cat');
        
        // Se não tiver o select na tela (modal fechado), sai da função
        if (!select) return;

        console.log("📂 Carregando categorias...");

        // Lista de categorias padrão da sua loja
        const categorias = [
            "Personalizados",
            "Brindes",
            "Gráfica rápida",
            "Kits escolares",
            "Papelaria",
            "Outros"
        ];

        // Limpa e preenche
        select.innerHTML = '<option value="">Selecione...</option>';
        
        categorias.forEach(cat => {
            select.innerHTML += `<option value="${cat}">${cat}</option>`;
        });
    },

    // --- PRODUTOS & VARIAÇÕES ---
    loadProd: async () => {
        if(!app.currentUser) return;
        const {data} = await sb.from('products').select('*').eq('tenant_id', app.currentUser.tenant_id).order('name');
        app.cache.products = data || [];
        const t = document.getElementById('lista-prod');
        if(!t) return;
        t.innerHTML = '';
        if(data) {
            data.forEach(p => {
                const img = p.image_url ? `<img src="${p.image_url}" style="width:35px; height:35px; object-fit:cover; border-radius:4px;">` : `<div style="width:35px; height:35px; background:#222; border-radius:4px; display:flex; align-items:center; justify-content:center;"><i class="fa-solid fa-box"></i></div>`;
                t.innerHTML += `<tr><td>${img}</td><td><div style="font-weight:bold; color:white;">${p.name}</div></td><td>R$ ${parseFloat(p.price).toFixed(2)}</td><td>${p.stock}</td><td><button class="btn btn-sm btn-outline" onclick="app.editProd('${p.id}')"><i class="fa-solid fa-pen"></i></button> <button class="btn btn-sm btn-danger" onclick="app.delProd('${p.id}')"><i class="fa-solid fa-trash"></i></button></td></tr>`;
            });
        }
    },
    clickProd: (id) => {
        const p = app.cache.products.find(x => String(x.id) === String(id));
        if (!p) return alert("Erro ao carregar produto.");
        if (p.variations && p.variations.length > 0) {
            app.varSelectContext = 'pdv';
            app.showVarSelector(p);
        } else {
            app.addToCart({ id: p.id, name: p.name, price: parseFloat(p.price), qty: 1 });
        }
    },
    showVarSelector: (p) => {
        const list = document.getElementById('sel-var-list');
        list.innerHTML = '';
        p.variations.forEach((v, index) => {
            list.innerHTML += `<button class="btn btn-outline" style="width:100%; margin-bottom:5px; padding:10px; display:flex; justify-content:space-between;" onclick="app.selectVar('${p.id}', ${index})"><span style="font-weight:bold">${v.name}</span><span>R$ ${parseFloat(v.price).toFixed(2)}</span></button>`;
        });
        document.getElementById('modal-sel-var').style.display = 'flex';
    },
    selectVar: (prodId, varIndex) => {
        const p = app.cache.products.find(x => String(x.id) === String(prodId));
        const v = p.variations[varIndex];
        const finalName = p.name + ' - ' + v.name;
        const finalPrice = parseFloat(v.price);

        if (app.varSelectContext === 'budget') {
            document.getElementById('orc-prod').value = finalName;
            document.getElementById('orc-price').value = "R$ " + finalPrice.toFixed(2).replace('.', ',');
            document.getElementById('orc-qtd').focus();
        } else {
            app.addToCart({ id: p.id + '_var_' + varIndex, name: finalName, price: finalPrice, qty: 1 });
        }
        document.getElementById('modal-sel-var').style.display = 'none';
    },
    // --- ATUALIZAR LISTAS DE SUGESTÃO (ORÇAMENTO) ---
    updateOrcLists: () => {
        const cliList = document.getElementById('orc-cli-list'); 
        const prodList = document.getElementById('orc-prod-list');
        
        // 1. Atualiza lista de Clientes (Datalist)
        if (cliList) {
            cliList.innerHTML = ''; 
            if(app.cache.clients) {
                app.cache.clients.forEach(c => {
                    cliList.innerHTML += `<option value="${c.name}">`;
                });
            }
        }

        // 2. Atualiza lista de Produtos (Datalist)
        if (prodList) {
            prodList.innerHTML = '';
            if(app.cache.products) {
                app.cache.products.forEach(p => {
                    // Mostra o preço como "dica" no autocomplete
                    const preco = parseFloat(p.price).toFixed(2);
                    prodList.innerHTML += `<option value="${p.name}">R$ ${preco}</option>`;
                });
            }
        }
    },
    saveProd: async () => {
        const id = document.getElementById('p-id').value;
        const name = document.getElementById('p-nome').value.trim();
        
        if(!name) return alert("Nome obrigatório");
        
        // Lógica de Variações
        const variations = [];
        let totalStock = 0;
        document.querySelectorAll('.variation-row').forEach(row => {
            const vName = row.querySelector('.v-name').value;
            const vPrice = row.querySelector('.v-price').value;
            const vStock = row.querySelector('.v-stock').value;
            if(vName) { 
                variations.push({name:vName, price:vPrice, stock:vStock}); 
                totalStock += parseInt(vStock||0); 
            }
        });
        
        // Se não tiver variação, usa o estoque simples
        if(!variations.length) totalStock = parseInt(document.getElementById('p-stock').value) || 0;

        // 1. AQUI ESTÁ A CORREÇÃO DO PAYLOAD (OBJETO DE ENVIO)
        const payload = {
            tenant_id: app.currentUser.tenant_id,
            name: name,
            category: document.getElementById('p-cat').value,
            image_url: document.getElementById('p-url').value,
            price: parseFloat(document.getElementById('p-base-price').value.replace(',','.')) || 0,
            stock: totalStock,
            variations: variations,
            // Pega se está marcado (true) ou não (false)
            show_in_catalog: document.getElementById('p-catalogo').checked 
        };

        if(id) await sb.from('products').update(payload).eq('id',id);
        else await sb.from('products').insert([payload]);
        
        app.closeModal('prod'); 
        app.loadProd();
    },

    editProd: async (id) => {
        const {data:p} = await sb.from('products').select('*').eq('id',id).single();
        if(p) {
            document.getElementById('p-id').value = p.id;
            document.getElementById('p-nome').value = p.name;
            document.getElementById('p-cat').value = p.category || '';
            document.getElementById('p-base-price').value = p.price.toFixed(2).replace('.',',');
            document.getElementById('p-stock').value = p.stock;
            document.getElementById('p-url').value = p.image_url || '';
            
            // 2. AQUI ESTÁ A CORREÇÃO: CARREGAR O STATUS DO BANCO
            // Se p.show_in_catalog for true, ele marca a caixinha.
            document.getElementById('p-catalogo').checked = p.show_in_catalog === true;

            // Carrega variações
            document.getElementById('var-list').innerHTML = '';
            if(p.variations) p.variations.forEach(v => app.addVarRow(v));
            
            app.openModal('prod');
        }
    },

    clearProd: () => {
        ['p-id','p-nome','p-cat','p-base-price','p-stock','p-url'].forEach(i=>document.getElementById(i).value='');
        document.getElementById('var-list').innerHTML = '';
        
        // 3. IMPORTANTE: LIMPAR O CHECKBOX AO CRIAR NOVO
        document.getElementById('p-catalogo').checked = false; 
    },
    
    // ... (suas funções delProd e addVarRow continuam iguais) ...
    delProd: async (id) => { if(confirm("Excluir?")) { await sb.from('products').delete().eq('id',id); app.loadProd(); } },
    addVarRow: (v={}) => {
        const list = document.getElementById('var-list');
        const div = document.createElement('div'); div.className='variation-row'; div.style.cssText="display:grid; grid-template-columns: 2fr 1fr 1fr auto; gap:5px; margin-bottom:5px;";
        div.innerHTML = `<input class="v-name" placeholder="Variação" value="${v.name||''}" style="padding:5px"><input class="v-price" type="number" placeholder="Preço" value="${v.price||''}" style="padding:5px"><input class="v-stock" type="number" placeholder="Estoque" value="${v.stock||''}" style="padding:5px"><button class="btn btn-sm btn-danger" onclick="this.parentElement.remove()">X</button>`;
        list.appendChild(div);
    },
    clearProd: () => {
        ['p-id','p-nome','p-cat','p-base-price','p-stock','p-url'].forEach(i=>document.getElementById(i).value='');
        document.getElementById('var-list').innerHTML = '';
    },
    upl: async (input) => {
        const file = input.files[0]; if(!file) return;
        const fileName = `prod_${Date.now()}.${file.name.split('.').pop()}`;
        const { error } = await sb.storage.from('logos').upload(fileName, file);
        if(!error) {
            const { data } = sb.storage.from('logos').getPublicUrl(fileName);
            document.getElementById('p-url').value = data.publicUrl;
            input.parentElement.innerHTML = `<img src="${data.publicUrl}" style="width:100%; height:100%; object-fit:contain">`;
        }
    },
    // --- UPLOAD ESPECÍFICO DA LOJA ONLINE (BANNER E LOGO) ---
    uploadFile: async (input, type) => {
        const file = input.files[0];
        if (!file) return;

        // 1. Identifica onde mostrar o preview e onde salvar o link
        let previewId, hiddenInputId;

        if (type === 'cat-logo') {
            previewId = 'preview-logo';
            hiddenInputId = 'val-cat-logo';
        } else if (type === 'cat-banner') {
            previewId = 'preview-banner';
            hiddenInputId = 'val-cat-banner';
        } else {
            return;
        }

        // 2. Feedback Visual (Deixa meio transparente enquanto carrega)
        const img = document.getElementById(previewId);
        img.style.opacity = '0.5';

        try {
            // 3. Define nome único para não substituir outros
            const fileName = `store_${type}_${Date.now()}.${file.name.split('.').pop()}`;
            
            // 4. Sobe para o Supabase (Bucket 'logos')
            const { error } = await sb.storage.from('logos').upload(fileName, file);
            if (error) throw error;

            // 5. Pega o Link Público
            const { data } = sb.storage.from('logos').getPublicUrl(fileName);

            // 6. Atualiza na Tela
            img.src = data.publicUrl; // Mostra a imagem nova
            document.getElementById(hiddenInputId).value = data.publicUrl; // Salva o link no input escondido
            
            app.notify("Upload concluído! Clique em SALVAR TUDO.");

        } catch (e) {
            console.error(e);
            alert("Erro ao enviar imagem: " + e.message);
        } finally {
            img.style.opacity = '1'; // Volta ao normal
        }
    },

    // --- DETALHES PEDIDO (COM CORREÇÃO DE ESTORNO) ---
    showOrderDetails: async (id) => {
        document.getElementById('det-id').value = id; 
       const { data: venda } = await sb.from('sales').select('*').eq('id', id).maybeSingle();
        if(!venda) return;

        document.getElementById('det-cli').innerText = venda.client_name;
        const total = venda.total_amount;
        const pago = venda.amount_paid || 0;
        const restante = total - pago;

        document.getElementById('det-total').innerText = `R$ ${total.toFixed(2)}`;
        document.getElementById('det-paid').innerText = `R$ ${pago.toFixed(2)}`;
        
        const divRestante = document.getElementById('det-restante-div');
        if(restante <= 0.05) divRestante.innerHTML = '<span style="color:var(--success)">PAGAMENTO CONCLUÍDO</span>';
        else divRestante.innerHTML = `Falta: <span id="det-restante">R$ ${restante.toFixed(2)}</span>`;

        let itensHTML = '';
        let lista = venda.items_json;
        if(typeof lista === 'string') lista = JSON.parse(lista);
        if(lista) lista.forEach(i => {
            itensHTML += `<div style="display:flex; justify-content:space-between; padding:5px 0; border-bottom:1px solid #333;"><span>${i.qty}x ${i.name}</span><span>R$ ${(i.price*i.qty).toFixed(2)}</span></div>`;
        });
        document.getElementById('det-items').innerHTML = itensHTML;
        document.getElementById('modal-details').style.display = 'flex';
    },

    addPayment: async () => {
        const id = document.getElementById('det-id').value;
        let valInput = document.getElementById('det-new-pay').value;
        let valLimpo = valInput.replace('R$', '').replace(/\./g, '').replace(',', '.').trim();
        const val = parseFloat(valLimpo);

        if(!val || val <= 0) return alert("Valor inválido");

        try {
            const { data: venda } = await sb.from('sales').select('*').eq('id', id).single();
            const novoPago = (venda.amount_paid || 0) + val;
            
            await sb.from('sales').update({ amount_paid: novoPago }).eq('id', id);
            await sb.from('fin_movs').insert({
                tenant_id: app.currentUser.tenant_id,
                description: `Recebimento: ${venda.client_name}`,
                amount: val, type: 'entrada', category: 'Vendas', date: new Date().toISOString()
            });
            
            alert("Pagamento registrado!");
            document.getElementById('det-new-pay').value = '';
            document.getElementById('modal-details').style.display = 'none';
            app.loadDash();
        } catch(e) { alert("Erro: " + e.message); }
    },
    
    updateOrderStatus: async (st) => {
        const id = document.getElementById('det-id').value;
        await sb.from('sales').update({ status: st }).eq('id', id);
        document.getElementById('modal-details').style.display = 'none';
        app.loadDash();
    },

    delSale: async () => {
        const id = document.getElementById('det-id').value;
        if(!id) return;
        
        // Pergunta de segurança
        if (!confirm("Ocultar este pedido da lista? (Ele continuará contando no seu limite mensal)")) return;

        try {
            // TRUQUE: Em vez de .delete(), usamos .update()
            // Mudamos o status para 'Excluido' e zeramos o valor pendente visualmente
            await sb.from('sales').update({ 
                status: 'Excluido',
                kb_delete_at: new Date().toISOString() // Marca data para limpeza futura se quiser
            }).eq('id', id);
            
            app.notify("Pedido movido para lixeira.");
            app.closeModal('details');
            app.loadDash(); // Atualiza a tela
            
        } catch (e) { alert("Erro: " + e.message); }
    },

    // --- CLIENTES ---
    loadCli: async () => { 
        const {data} = await sb.from('clients').select('*').eq('tenant_id', app.currentUser.tenant_id).order('name'); 
        app.cache.clients = data || []; 
        const t = document.getElementById('lista-cli');
        if(t) {
            t.innerHTML = '';
            app.cache.clients.forEach(c => {
                t.innerHTML += `<tr><td>${c.name}</td><td>${c.phone||'-'}</td><td>${c.city||'-'}</td><td><button class="btn btn-sm" onclick="app.editCli('${c.id}')"><i class="fa-solid fa-pen"></i></button></td></tr>`;
            });
        }
    },
    saveCli: async () => {
        const id = document.getElementById('cli-id').value;
        const d = {
            tenant_id: app.currentUser.tenant_id,
            name: document.getElementById('cli-nome').value,
            phone: document.getElementById('cli-tel').value,
            email: document.getElementById('cli-email').value,
            doc: document.getElementById('cli-doc').value,
            cep: document.getElementById('cli-cep').value,
            street: document.getElementById('cli-rua').value,
            number: document.getElementById('cli-num').value,
            district: document.getElementById('cli-bairro').value,
            city: document.getElementById('cli-cidade').value
        };
        if(!d.name) return alert("Nome obrigatório");
        if(id) await sb.from('clients').update(d).eq('id', id);
        else await sb.from('clients').insert([d]);
        app.closeModal('cli'); app.loadCli();
    },
    editCli: (id) => {
        const c = app.cache.clients.find(x => x.id == id);
        if(c){
            document.getElementById('cli-id').value = c.id;
            document.getElementById('cli-nome').value = c.name;
            document.getElementById('cli-tel').value = c.phone || '';
            document.getElementById('cli-email').value = c.email || '';
            document.getElementById('cli-doc').value = c.doc || '';
            document.getElementById('cli-cep').value = c.cep || '';
            document.getElementById('cli-rua').value = c.street || '';
            document.getElementById('cli-num').value = c.number || '';
            document.getElementById('cli-bairro').value = c.district || '';
            document.getElementById('cli-cidade').value = c.city || '';
            app.openModal('cli');
        }
    },
    delCli: async (id) => { if(confirm("Excluir?")) { await sb.from('clients').delete().eq('id',id); app.loadCli(); } },
    clearCli: () => { ['cli-id','cli-nome','cli-tel','cli-email','cli-doc','cli-cep','cli-rua','cli-num','cli-bairro','cli-cidade'].forEach(i => document.getElementById(i).value=''); },
    buscarCep: async () => {
        const c = document.getElementById('cli-cep').value.replace(/\D/g,'');
        if(c.length===8) {
            try {
                const r = await fetch(`https://viacep.com.br/ws/${c}/json/`);
                const d = await r.json();
                if(!d.erro) {
                    document.getElementById('cli-rua').value = d.logradouro.toUpperCase();
                    document.getElementById('cli-bairro').value = d.bairro.toUpperCase();
                    document.getElementById('cli-cidade').value = (d.localidade+'/'+d.uf).toUpperCase();
                    document.getElementById('cli-num').focus();
                }
            } catch(e){}
        }
    },
    loadKanban: async () => {
        
        if(!app.currentUser) return;
        
        // Limpa colunas
        ['pendente','processo','acabamento','concluido','entregue'].forEach(k => {
            const el = document.getElementById('kb-'+k);
            if(el) el.innerHTML = '';
        });

        const { data } = await sb.from('sales')
            .select('*')
            .eq('tenant_id', app.currentUser.tenant_id)
            .order('created_at', {ascending:false});

        if(!data) return;

        const agora = new Date();

        data.forEach(s => {
            if (s.status === 'Aguardando Aprovação') return;
            if (s.status === 'Excluido') return; // <--- ADICIONE ISSO PARA SUMIR DA TELA
            
            let c = 'pendente';
            
          
            // Lógica Auto-Delete (24h)
            let avisoExtra = '';
            if (s.status === 'Entregue' && s.kb_delete_at) {
                const dataExclusao = new Date(s.kb_delete_at);
                if (agora > dataExclusao) return; // Não mostra mais
                const horasRestantes = Math.ceil((dataExclusao - agora) / (1000 * 60 * 60));
                avisoExtra = `<div style="font-size:10px; color:var(--danger); margin-top:5px; border-top:1px solid #333; padding-top:2px;">⏱️ Some em ${horasRestantes}h</div>`;
            }

            // Mapeia coluna

            if(s.status == 'Em Produção') c = 'processo';
            else if(s.status == 'Acabamento') c = 'acabamento';
            else if(s.status == 'Pronto') c = 'concluido';
            else if(s.status == 'Entregue') c = 'entregue';
            
            const el = document.getElementById('kb-'+c);
            
            // TRATAMENTO DE ERROS NA STRING (Aspas no nome ou telefone nulo)
            const safeName = s.client_name.replace(/'/g, "\\'"); 
            const safePhone = (s.client_phone || '').replace(/'/g, "\\'");

            if(el) {
                el.innerHTML += `
                <div class="kanban-card" onclick="app.showKanbanStatusMenu(event, '${s.id}', '${s.status}', '${safeName}', '${safePhone}')">
                    <div style="font-weight:bold; color:white;">${s.client_name}</div>
                    <div style="color:var(--primary);">R$ ${s.total_amount.toLocaleString('pt-BR',{minimumFractionDigits:2})}</div>
                    <div style="font-size:10px; color:#666;">#${s.id.slice(0,4)}</div>
                    ${avisoExtra}
                </div>`;
            }
        });
    },

    // 2. MENU FLUTUANTE (CORRIGIDO O CLIQUE)
    showKanbanStatusMenu: (e, id, currentStatus, cliName, cliPhone) => {
        e.stopPropagation(); // Impede que o clique feche o menu imediatamente
        
        // Remove menus antigos
        document.querySelectorAll('.kb-menu').forEach(el => el.remove());
        
        const menu = document.createElement('div');
        menu.className = 'kb-menu';
        // Z-Index alto para garantir que fique por cima de tudo
        menu.style.cssText = `position:absolute; top:${e.clientY}px; left:${e.clientX}px; background:#1a1a1a; border:1px solid var(--primary); padding:10px; z-index:99999; border-radius:6px; box-shadow: 0 5px 15px rgba(0,0,0,0.8); display:flex; flex-direction:column; gap:5px; min-width:160px;`;
        
        const options = [
            {val:'Pendente', lbl:'⏹️ Aguardando'},
            {val:'Em Produção', lbl:'⚙️ Produção'},
            {val:'Acabamento', lbl:'🎨 Acabamento'},
            {val:'Pronto', lbl:'✅ Pronto (Zap)'},
            {val:'Entregue', lbl:'🚀 Entregue (24h)'}
        ];
        
        options.forEach(opt => {
            if(opt.val !== currentStatus) {
                const btn = document.createElement('button');
                btn.className = 'btn btn-sm btn-outline';
                btn.style.textAlign = 'left';
                btn.style.width = '100%';
                btn.innerText = opt.lbl;
                
                // O SEGREDO ESTÁ AQUI: Usar uma função anônima para garantir os parâmetros
                btn.onclick = function() {
                    console.log("Botão clicado:", opt.val); // Debug no console
                    app.changeKanbanStatus(id, opt.val, cliName, cliPhone);
                };
                
                menu.appendChild(btn);
            }
        });
        
        // Separador
        const hr = document.createElement('hr');
        hr.style.cssText = "border-color:#333; width:100%; margin:5px 0;";
        menu.appendChild(hr);

        // Ver Detalhes
        const btnVer = document.createElement('button');
        btnVer.className = 'btn btn-sm btn-primary';
        btnVer.innerText = 'Ver Detalhes';
        btnVer.style.width = '100%';
        btnVer.onclick = () => { app.showOrderDetails(id); menu.remove(); };
        menu.appendChild(btnVer);

        // Botão Fechar
        const btnClose = document.createElement('button');
        btnClose.className = 'btn btn-sm btn-danger';
        btnClose.innerText = 'Fechar';
        btnClose.style.width = '100%';
        btnClose.style.marginTop = '5px';
        btnClose.onclick = (evt) => { evt.stopPropagation(); menu.remove(); };
        menu.appendChild(btnClose);
        
        document.body.appendChild(menu);
        
        // Fecha ao clicar fora
        setTimeout(() => {
            const closeFn = () => { menu.remove(); document.removeEventListener('click', closeFn); };
            document.addEventListener('click', closeFn);
        }, 100);
    },

    // 3. EXECUTAR A MUDANÇA (COM ZAP E TIMER)
    // --- 3. MUDAR STATUS (COM A MENSAGEM ATUALIZADA) ---
    // --- MUDAR STATUS (VERSÃO FINAL COM MENSAGEM CORRETA) ---
    changeKanbanStatus: async (id, newStatus, cliName, cliPhone) => {
        // Limpa menus visuais
        document.querySelectorAll('.kb-menu').forEach(el => el.remove());

        try {
            // --- [INÍCIO] NOVA LÓGICA: CADASTRO AUTOMÁTICO DE CLIENTE DO SITE ---
            // 1. Busca os detalhes da venda para ver se tem endereço e se veio do site
            const { data: venda } = await sb.from('sales').select('*').eq('id', id).maybeSingle();

            // 2. Se for pedido do Site indo para Produção e ainda não tiver cliente vinculado
            if (venda && venda.origin === 'site' && newStatus === 'Em Produção' && !venda.client_id) {
                
                if (confirm(`Este é um pedido do site de ${cliName}.\nDeseja cadastrar este cliente e o endereço automaticamente?`)) {
                    
                    // Cria o cliente na tabela clients usando o endereço do pedido
                    const { data: newClient, error: errCli } = await sb.from('clients').insert([{
                        tenant_id: app.currentUser.tenant_id,
                        name: venda.client_name,
                        phone: venda.client_phone,
                        street: venda.shipping_address || 'Endereço do Site', // Pega o endereço salvo
                        city: 'Via Site',
                        created_at: new Date().toISOString()
                    }]).select().single();

                    if (!errCli && newClient) {
                        // Atualiza a venda vinculando o ID do novo cliente
                        await sb.from('sales').update({ client_id: newClient.id }).eq('id', id);
                        
                        // Atualiza o cache local para aparecer na lista de clientes sem recarregar
                        if(app.cache.clients) app.cache.clients.push(newClient);
                        
                        app.notify("Cliente cadastrado com sucesso!");
                    }
                }
            }
            // --- [FIM] NOVA LÓGICA ---

            const updateData = { status: newStatus };

            // Regra Entregue (24h)
            if (newStatus === 'Entregue') {
                const amanha = new Date();
                amanha.setHours(amanha.getHours() + 24);
                updateData.kb_delete_at = amanha.toISOString();
                alert("Pedido entregue! Sumirá em 24h.");
            } else {
                updateData.kb_delete_at = null;
            }

            // Atualiza Banco
            await sb.from('sales').update(updateData).eq('id', id);

            // Regra Pronto (WhatsApp)
            if (newStatus === 'Pronto') {
                
                if (confirm(`Pedido PRONTO! Enviar mensagem para ${cliName}?`)) {
                    
                    if (cliPhone && cliPhone.length > 8) {
                        let phone = cliPhone.replace(/\D/g, '');
                        if (phone.length <= 11) phone = '55' + phone;
                        
                        const numeroPedido = id.slice(0,6).toUpperCase();

                        // --- AQUI ESTÁ A NOVA MENSAGEM ---
                        const msg = `Olá *${cliName}*!%0A%0A` +
                                    `O seu pedido *"${numeroPedido}"* já está pronto para retirada!%0A%0A` +
                                    `Lembre-se, a retirada dos produtos é de:%0A` +
                                    `Segunda a Sexta-feira: 09:00 às 11:30 e 13:30 às 17:00%0A%0A` +
                                    `*Donna Serviços Gráficos*. Estamos te esperando!%0A%0A` +
                                    `_MENSAGEM AUTOMÁTICA ENVIADA PELO SISTEMA!_`;

                        // --- TRAVA DE SEGURANÇA VISUAL (PROVA QUE ATUALIZOU) ---
                        // Se este alerta não aparecer, o navegador está usando o arquivo velho!
                        console.log("MENSAGEM GERADA:", msg); 
                        
                        window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');

                    } else {
                        alert("Cliente sem telefone válido.");
                    }
                }
            }

            app.loadKanban();

        } catch (e) {
            alert("Erro: " + e.message);
        }
    },
    startKanbanAutoDelete: () => {
        // Roda a cada minuto para atualizar painel
        setInterval(app.loadKanban, 60000);
    },

    // --- ASSINATURA ---
    renderSubscription: async () => {
        const el = document.getElementById('sub-status-display');
        if(el) el.innerHTML = `<div style="background:#222; padding:20px; border-radius:10px; text-align:center;"><h1>${app.currentUser.plan_status}</h1></div>`;
    },

    // --- TELA DE CONFIGURAÇÕES (VISUAL PREMIUM) ---
    loadConfig: () => {
        const view = document.getElementById('view-config');
        if(!view) return;

        const u = app.currentUser;
        const logo = u.logo_url || ''; 

        view.innerHTML = `
            <div style="max-width:900px; margin:0 auto;">
                <h2 style="font-family:'Rajdhani'; color:var(--primary); margin-bottom:20px;">DADOS DA EMPRESA</h2>
                
                <div style="display:grid; grid-template-columns: 300px 1fr; gap:30px;">
                    
                    <div class="card-box" style="background:#1a1a1a; padding:20px; border-radius:10px; border:1px solid #333; text-align:center;">
                        <label style="color:#aaa; font-size:12px; text-transform:uppercase; letter-spacing:1px;">Logotipo da Empresa</label>
                        
                        <div style="width:100%; height:200px; background:#111; border:2px dashed #444; border-radius:10px; margin:15px 0; display:flex; align-items:center; justify-content:center; overflow:hidden; cursor:pointer; position:relative;" onclick="document.getElementById('cfg-logo-file').click()">
                            ${logo ? `<img src="${logo}" style="width:100%; height:100%; object-fit:contain;" id="cfg-logo-preview">` : `<div id="cfg-logo-placeholder" style="color:#444;"><i class="fa-solid fa-cloud-arrow-up fa-3x"></i><br>Clique para enviar</div>`}
                        </div>
                        
                        <input type="file" id="cfg-logo-file" hidden accept="image/*" onchange="app.uploadConfigLogo(this)">
                        <input type="hidden" id="cfg-logo-url" value="${logo}">
                        
                        <p style="font-size:11px; color:#666; margin-bottom:20px;">Essa imagem sairá no cabeçalho dos seus orçamentos e pedidos.</p>

                        <hr style="border-color:#333; margin:20px 0;">

                        <label style="color:var(--success); font-size:12px; font-weight:bold;">META MENSAL (R$)</label>
                        <input id="cfg-goal" type="number" class="input-lg" style="width:100%; text-align:center; margin-top:5px; border-color:var(--success); color:var(--success);" value="${u.monthly_goal || 10000}">
                    </div>

                    <div class="card-box" style="background:#1a1a1a; padding:30px; border-radius:10px; border:1px solid #333;">
                        <div class="input-group" style="margin-bottom:15px;">
                            <label style="color:#888;">Nome Fantasia / Razão Social</label>
                            <input id="cfg-name" class="input-lg" style="width:100%; font-weight:bold; color:white;" value="${u.company_name || ''}" placeholder="Ex: Minha Gráfica">
                        </div>

                        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:15px; margin-bottom:15px;">
                            <div>
                                <label style="color:#888;">CNPJ / CPF</label>
                                <input id="cfg-doc" class="input-lg" style="width:100%;" value="${u.doc || ''}">
                            </div>
                            <div>
                                <label style="color:#888;">Telefone / WhatsApp</label>
                                <input id="cfg-phone" class="input-lg" style="width:100%;" value="${u.phone || ''}">
                            </div>
                        </div>

                        <div style="margin-bottom:15px;">
                            <label style="color:#888;">Endereço Completo</label>
                            <input id="cfg-addr" class="input-lg" style="width:100%;" value="${u.address || ''}" placeholder="Rua, Número, Bairro - Cidade/UF">
                        </div>

                        <div style="margin-bottom:20px;">
                            <label style="color:#888;">Termos & Condições (Rodapé do PDF)</label>
                            <textarea id="cfg-terms" class="input-lg" style="width:100%; height:80px; resize:none;" placeholder="Ex: Validade de 10 dias. Pagamento 50% na entrada.">${u.terms || ''}</textarea>
                        </div>

                        <button class="btn btn-primary" style="width:100%; padding:15px; font-weight:bold; font-size:16px;" onclick="app.saveConfig()">
                            <i class="fa-solid fa-save"></i> SALVAR ALTERAÇÕES
                        </button>
                    </div>
                </div>
            </div>
        `;
    },

    // --- UPLOAD DO LOGO (PARA O BUCKET) ---
    uploadConfigLogo: async (input) => {
        const file = input.files[0];
        if(!file) return;

        // Preview imediato
        const reader = new FileReader();
        reader.onload = (e) => {
            const container = input.parentElement.querySelector('div');
            container.innerHTML = `<img src="${e.target.result}" style="width:100%; height:100%; object-fit:contain">`;
        };
        reader.readAsDataURL(file);

        // Upload
        try {
            const fileName = `logo_${app.currentUser.tenant_id}_${Date.now()}`;
            const { error } = await sb.storage.from('logos').upload(fileName, file);
            if(error) throw error;

            const { data } = sb.storage.from('logos').getPublicUrl(fileName);
            document.getElementById('cfg-logo-url').value = data.publicUrl; // Salva URL no input oculto
            app.notify("Logo carregada! Clique em Salvar.");

        } catch(e) {
            alert("Erro no upload: " + e.message);
        }
    },
    
    // --- SALVAR TUDO E ATUALIZAR MEMÓRIA ---
    saveConfig: async () => {
        const u = app.currentUser;
        const goal = document.getElementById('cfg-goal').value;
        
        const payload = {
            company_name: document.getElementById('cfg-name').value,
            doc: document.getElementById('cfg-doc').value,
            address: document.getElementById('cfg-addr').value,
            phone: document.getElementById('cfg-phone').value,
            logo_url: document.getElementById('cfg-logo-url').value, // Pega do input oculto
            terms: document.getElementById('cfg-terms').value,
            monthly_goal: parseFloat(goal)
        };

        const { error } = await sb.from('users').update(payload).eq('id', u.id);
        
        if(error) return alert("Erro ao salvar: " + error.message);

        // ATUALIZA A MEMÓRIA LOCAL (Para o PDF pegar os dados novos sem recarregar a página)
        Object.assign(app.currentUser, payload);
        
        alert("Configurações salvas com sucesso!");
        app.loadDash(); // Atualiza a barra de meta no dashboard
    },
    
    // ============================================================
    // --- MÓDULO DE ORÇAMENTOS (COLE ISSO DENTRO DO APP) ---
    // ============================================================

    // 1. Verificar Cliente ao digitar
    checkOrcCli: () => {
        const el = document.getElementById('orc-cli');
        const val = el.value.toUpperCase();
        el.value = val; 
        
        const c = app.cache.clients ? app.cache.clients.find(x => x.name.toUpperCase() === val) : null;
        
        if (c) {
            document.getElementById('orc-tel').value = c.phone || '';
            document.getElementById('orc-cli-id').value = c.id;
        } else {
            document.getElementById('orc-cli-id').value = ''; 
        }
    },

    // 2. Verificar Produto ao digitar (Preenche preço e vê variação)
    checkOrcProd: () => {
        const nameInput = document.getElementById('orc-prod');
        const name = nameInput.value;
        
        // Procura o produto
        const p = app.cache.products ? app.cache.products.find(x => x.name.toLowerCase() === name.toLowerCase()) : null;
        
        if (p) {
            // SE TIVER VARIAÇÕES: Abre a janelinha
            if (p.variations && p.variations.length > 0) {
                app.varSelectContext = 'budget'; // Avisa que é Orçamento
                app.showVarSelector(p);
                nameInput.blur();
            } 
            // SE FOR SIMPLES: Preenche preço
            else {
                document.getElementById('orc-price').value = "R$ " + parseFloat(p.price).toFixed(2).replace('.', ',');
                document.getElementById('orc-qtd').focus();
            }
        }
    },

    // 3. Adicionar Item na Tabela Visual
    addOrcItem: () => {
        const elProd = document.getElementById('orc-prod');
        const elQtd = document.getElementById('orc-qtd');
        const elPrice = document.getElementById('orc-price');

        const name = elProd.value.trim();
        const qty = parseFloat(elQtd.value);
        const price = app.parseMoney(elPrice.value);

        if (!name || qty <= 0 || price <= 0) {
            return alert("Preencha Nome, Quantidade e Preço corretamente.");
        }

        // Adiciona na memória
        app.orcItems.push({ name, qty, price });
        app.renderOrcItems();

        // Limpa campos
        elProd.value = '';
        elQtd.value = '1';
        elPrice.value = '';
        elProd.focus();
    },

    // 4. Renderizar Tabela de Itens
    renderOrcItems: () => {
        const tbody = document.getElementById('orc-items-list');
        const totalEl = document.getElementById('orc-total');
        if (!tbody) return;

        tbody.innerHTML = '';
        let total = 0;

        app.orcItems.forEach((item, index) => {
            const subtotal = item.qty * item.price;
            total += subtotal;

            tbody.innerHTML += `
                <tr style="border-bottom:1px solid #333;">
                    <td style="padding:8px;">${item.name}</td>
                    <td style="padding:8px; text-align:center;">${item.qty}</td>
                    <td style="padding:8px; text-align:right;">R$ ${item.price.toFixed(2)}</td>
                    <td style="padding:8px; text-align:right;">R$ ${subtotal.toFixed(2)}</td>
                    <td style="text-align:right;">
                        <button class="btn btn-sm btn-danger" onclick="app.orcItems.splice(${index},1); app.renderOrcItems()">X</button>
                    </td>
                </tr>
            `;
        });

        if (totalEl) totalEl.innerText = "R$ " + total.toLocaleString('pt-BR', {minimumFractionDigits: 2});
    },

    // 5. SALVAR ORÇAMENTO (No Banco)
    saveOrcamento: async () => {
        if (app.orcItems.length === 0) return alert("Adicione itens antes de salvar.");
        
        const cliName = document.getElementById('orc-cli').value.toUpperCase();
        const cliTel = document.getElementById('orc-tel').value;
        let cliId = document.getElementById('orc-cli-id').value;

        if (!cliName) return alert("Nome do cliente é obrigatório.");

        const btn = event.target;
        btn.innerText = "Salvando..."; btn.disabled = true;

        try {
            // Cadastra cliente se for novo
            if (!cliId) {
                const { data: newC } = await sb.from('clients').insert([{
                    tenant_id: app.currentUser.tenant_id,
                    name: cliName,
                    phone: cliTel,
                    city: 'Local'
                }]).select().single();
                if (newC) {
                    cliId = newC.id;
                    if(app.cache.clients) app.cache.clients.push(newC);
                }
            }

            const total = app.parseMoney(document.getElementById('orc-total').innerText);

            // Salva Orçamento
            const { error } = await sb.from('budgets').insert([{
                tenant_id: app.currentUser.tenant_id,
                client_name: cliName,
                client_contact: cliTel,
                items_json: app.orcItems,
                total_amount: total,
                status: 'Pendente',
                created_at: new Date().toISOString()
            }]);

            if (error) throw error;

            // Gera PDF
            app.generatePDF(cliName, cliTel, app.orcItems, total);

            // Reseta tudo
            app.orcItems = [];
            app.renderOrcItems();
            document.getElementById('orc-cli').value = '';
            document.getElementById('orc-tel').value = '';
            app.loadOrcamentos();
            
            alert("Orçamento Salvo!");

        } catch (e) {
            alert("Erro ao salvar: " + e.message);
        } finally {
            btn.innerText = "SALVAR & GERAR PDF";
            btn.disabled = false;
        }
    },

    // 6. Carregar Lista de Orçamentos
    loadOrcamentos: async () => {
        const { data } = await sb.from('budgets').select('*').eq('tenant_id', app.currentUser.tenant_id).order('created_at', {ascending: false});
        const t = document.getElementById('lista-orc');
        if(!t) return;
        t.innerHTML = '';
        
        if(data) data.forEach(b => {
            const temZap = b.client_contact ? '' : 'opacity:0.5; pointer-events:none';
            t.innerHTML += `
                <tr>
                    <td>
                        <div style="font-weight:bold">${b.client_name}</div>
                        <div style="font-size:10px; color:#888">${b.client_contact || 'Sem contato'}</div>
                    </td>
                    <td>R$ ${b.total_amount.toFixed(2)}</td>
                    <td><span class="kb-tag">${b.status}</span></td>
                    <td>
                        <button class="btn btn-sm" style="background:#25D366; color:white; border:none; margin-right:5px; ${temZap}" onclick="app.shareWhatsapp('${b.id}')">
                            <i class="fa-brands fa-whatsapp"></i>
                        </button>
                        <button class="btn btn-sm btn-outline" onclick="app.printBudget('${b.id}')">
                            <i class="fa-solid fa-print"></i>
                        </button>
                        <button class="btn btn-sm btn-outline" onclick="app.openConvertModal('${b.id}')" title="Aprovar">
                            <i class="fa-solid fa-check"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="app.delOrcamento('${b.id}')">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </td>
                </tr>`;
        });
    },

    // 7. Deletar Orçamento
    delOrcamento: async (id) => { 
        if(confirm("Excluir orçamento?")) { 
            await sb.from('budgets').delete().eq('id', id); 
            app.loadOrcamentos(); 
            app.notify("Excluído!"); 
        } 
    },
    // --- 8. GERADOR DE PDF OTIMIZADO ---
    generatePDF: (cli, tel, items, total) => {
        // Cria o elemento na memória
        const el = document.createElement('div');
        
        // Monta as linhas da tabela
        let rows = items.map(i => `
            <tr>
                <td style="border-bottom:1px solid #ccc; padding:5px; font-size:12px;">${i.name}</td>
                <td style="border-bottom:1px solid #ccc; padding:5px; font-size:12px; text-align:center;">${i.qty}</td>
                <td style="border-bottom:1px solid #ccc; padding:5px; font-size:12px; text-align:right;">R$ ${i.price.toFixed(2)}</td>
                <td style="border-bottom:1px solid #ccc; padding:5px; font-size:12px; text-align:right;">R$ ${(i.qty*i.price).toFixed(2)}</td>
            </tr>
        `).join('');

        // Monta o HTML do PDF (Layout Simples e Leve)
        el.innerHTML = `
            <div style="padding:30px; font-family:Helvetica, Arial, sans-serif; color:#333;">
                <div style="border-bottom:2px solid #444; padding-bottom:10px; margin-bottom:20px;">
                    <h1 style="margin:0; font-size:24px; text-transform:uppercase;">Orçamento</h1>
                    <p style="margin:5px 0 0 0; font-size:12px; color:#666;">Data: ${new Date().toLocaleDateString()}</p>
                </div>
                
                <div style="margin-bottom:30px;">
                    <p style="margin:5px 0;"><strong>Cliente:</strong> ${cli}</p>
                    <p style="margin:5px 0;"><strong>Contato:</strong> ${tel}</p>
                </div>

                <table style="width:100%; border-collapse:collapse; text-align:left;">
                    <thead>
                        <tr style="background:#eee;">
                            <th style="padding:8px; font-size:12px;">Descrição</th>
                            <th style="padding:8px; font-size:12px; text-align:center;">Qtd</th>
                            <th style="padding:8px; font-size:12px; text-align:right;">Unit.</th>
                            <th style="padding:8px; font-size:12px; text-align:right;">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows}
                    </tbody>
                </table>

                <div style="text-align:right; margin-top:30px; border-top:2px solid #444; padding-top:10px;">
                    <h3 style="margin:0;">TOTAL: R$ ${total.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</h3>
                </div>
                
                <div style="text-align:center; margin-top:50px; font-size:10px; color:#999;">
                    Documento gerado eletronicamente.
                </div>
            </div>
        `;

        // CONFIGURAÇÕES PARA EVITAR ERROS E LENTIDÃO
        const opt = {
            margin: 0,
            filename: `orcamento_${cli.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { 
                scale: 2, 
                useCORS: true, // Importante para imagens
                scrollY: 0,
                logging: false, // Desativa logs chatos no console
                letterRendering: true // Melhora renderização de fontes
            },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        // Gera e Baixa
        html2pdf().set(opt).from(el).save().catch(err => {
            console.error("Erro ao gerar PDF:", err);
            alert("Erro ao criar PDF. Tente novamente.");
        });
    },

    // --- 9. IMPRIMIR ORÇAMENTO (BOTÃO DA LISTA) ---
    // --- 9. IMPRIMIR ORÇAMENTO (VERSÃO PREMIUM / LINDA) ---
    // --- GERADOR DE PDF PROFISSIONAL (COM LOGO E DADOS) ---
    printBudget: async (id) => {
        const btn = event.currentTarget;
        const oldIcon = btn.innerHTML;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>'; // Loading
        btn.disabled = true;

        try {
            // 1. DADOS DO ORÇAMENTO
            const { data: b } = await sb.from('budgets').select('*').eq('id', id).single();
            if(!b) throw new Error("Orçamento não encontrado.");

            // 2. DADOS DO CLIENTE (Busca cadastro completo)
            const { data: c } = await sb.from('clients')
                .select('*')
                .eq('tenant_id', app.currentUser.tenant_id)
                .eq('name', b.client_name)
                .maybeSingle();

            // 3. DADOS DA EMPRESA (Do Config)
            const u = app.currentUser;
            
            // Monta Endereço da Empresa
            const empAddr = u.address ? `${u.address}<br>${u.phone || ''}` : 'Endereço não configurado';
            
            // Monta Logo (Se tiver URL, usa img, senão usa texto)
            const logoHtml = u.logo_url 
                ? `<img src="${u.logo_url}" style="max-height:80px; max-width:200px; object-fit:contain;">` 
                : `<h1 style="margin:0; color:#333; text-transform:uppercase;">${u.company_name}</h1>`;

            // Monta Dados do Cliente
            const cliNome = c ? c.name : b.client_name;
            const cliDoc = c && c.doc ? `CPF/CNPJ: ${c.doc}` : '';
            const cliEnd = c && c.street 
                ? `${c.street}, ${c.number || 'S/N'} - ${c.district || ''}<br>${c.city || ''} - CEP: ${c.cep || ''}` 
                : '<span style="color:#999; font-style:italic">Endereço não cadastrado</span>';

            // 4. TABELA DE ITENS
            let itensHtml = '';
            if(b.items_json) {
                b.items_json.forEach(i => {
                    itensHtml += `
                    <tr style="border-bottom:1px solid #eee;">
                        <td style="padding:10px; color:#333;">${i.name}</td>
                        <td style="padding:10px; text-align:center;">${i.qty}</td>
                        <td style="padding:10px; text-align:right;">R$ ${parseFloat(i.price).toFixed(2)}</td>
                        <td style="padding:10px; text-align:right; font-weight:bold;">R$ ${(i.qty * i.price).toFixed(2)}</td>
                    </tr>`;
                });
            }

            // 5. HTML DO PDF (LAYOUT LINDO)
            const element = document.createElement('div');
            element.style.width = '800px';
            element.style.padding = '40px';
            element.style.fontFamily = "'Helvetica Neue', Helvetica, Arial, sans-serif";
            element.style.background = 'white';
            element.style.color = '#333';
            
            element.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:start; border-bottom:3px solid #000; padding-bottom:20px; margin-bottom:30px;">
                    <div>${logoHtml}</div>
                    <div style="text-align:right; font-size:12px; color:#555;">
                        <strong style="font-size:16px; color:#000;">${u.company_name}</strong><br>
                        ${empAddr}<br>
                        ${u.doc ? 'CNPJ: ' + u.doc : ''}
                    </div>
                </div>

                <div style="display:flex; gap:30px; margin-bottom:40px;">
                    <div style="flex:1; background:#f4f4f4; padding:20px; border-radius:8px;">
                        <small style="color:#888; text-transform:uppercase; letter-spacing:1px; font-weight:bold;">Cliente</small><br>
                        <strong style="font-size:18px;">${cliNome}</strong><br>
                        <span style="font-size:13px; color:#555;">${cliDoc}</span><br>
                        <div style="margin-top:10px; font-size:13px; color:#555;">${cliEnd}</div>
                    </div>
                    <div style="width:200px; text-align:right; padding-top:10px;">
                        <small style="color:#888; text-transform:uppercase;">Orçamento Nº</small><br>
                        <strong style="font-size:24px; color:#000;">#${b.id.slice(0,6).toUpperCase()}</strong><br><br>
                        <small style="color:#888; text-transform:uppercase;">Data</small><br>
                        <strong>${new Date(b.created_at).toLocaleDateString()}</strong>
                    </div>
                </div>

                <table style="width:100%; border-collapse:collapse; margin-bottom:30px;">
                    <thead>
                        <tr style="background:#222; color:white; font-size:12px; text-transform:uppercase;">
                            <th style="padding:12px; text-align:left;">Descrição</th>
                            <th style="padding:12px; text-align:center;">Qtd</th>
                            <th style="padding:12px; text-align:right;">Valor Unit.</th>
                            <th style="padding:12px; text-align:right;">Total</th>
                        </tr>
                    </thead>
                    <tbody>${itensHtml}</tbody>
                </table>

                <div style="display:flex; justify-content:flex-end;">
                    <div style="width:250px; background:#f4f4f4; padding:20px; border-radius:8px; text-align:right;">
                        <span style="font-size:14px; color:#666;">TOTAL A PAGAR</span><br>
                        <strong style="font-size:28px; color:#000;">R$ ${b.total_amount.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</strong>
                    </div>
                </div>

                <div style="margin-top:50px; border-top:1px solid #ddd; padding-top:20px; font-size:11px; color:#777;">
                    <strong>Termos e Condições:</strong><br>
                    ${u.terms || 'Validade da proposta: 15 dias. Pagamento conforme combinado.'}
                    <br><br>
                    <div style="text-align:center; opacity:0.6;">Gerado eletronicamente por Donna Sistema</div>
                </div>
            `;

            // 6. GERA E BAIXA O ARQUIVO
            const opt = {
                margin: 0,
                filename: `Orcamento_${cliNome.replace(/[^a-z0-9]/gi, '_')}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true, logging: false },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };

            await html2pdf().set(opt).from(element).save();

        } catch (error) {
            console.error(error);
            alert("Erro ao gerar PDF: " + error.message);
        } finally {
            btn.innerHTML = oldIcon;
            btn.disabled = false;
        }
    },

    // 10. Compartilhar WhatsApp
    // --- 10. COMPARTILHAR WHATSAPP (GERA PDF, SOBE PRA NUVEM E ENVIA LINK) ---
    // --- 10. COMPARTILHAR WHATSAPP (PDF PREMIUM + UPLOAD) ---
    shareWhatsapp: async (id) => {
        const btn = event.currentTarget;
        const oldIcon = btn.innerHTML;
        
        // Feedback Visual
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Gerando...';
        btn.disabled = true;

        try {
            // 1. BUSCA DADOS DO ORÇAMENTO
            const { data: b } = await sb.from('budgets').select('*').eq('id', id).single();
            if(!b) throw new Error("Orçamento não encontrado.");

            // 2. BUSCA DADOS COMPLETOS DO CLIENTE (Para o PDF ficar bonito)
            const { data: c } = await sb.from('clients')
                .select('*')
                .eq('tenant_id', app.currentUser.tenant_id)
                .eq('name', b.client_name)
                .maybeSingle();

            // 3. PREPARA DADOS (Layout Premium igual ao PrintBudget)
            const u = app.currentUser;
            
            const logoHtml = u.logo_url 
                ? `<img src="${u.logo_url}" style="max-height:80px; max-width:200px; object-fit:contain;">` 
                : `<h1 style="margin:0; color:#333; text-transform:uppercase;">${u.company_name}</h1>`;

            const empAddr = u.address ? `${u.address}<br>${u.phone||''}` : '';
            
            const cliNome = c ? c.name : b.client_name;
            const cliDoc = c && c.doc ? `CPF/CNPJ: ${c.doc}` : '';
            const cliTelRaw = c && c.phone ? c.phone : (b.client_contact || '');
            
            let cliEnderecoHtml = '<span style="color:#999; font-style:italic">Endereço não cadastrado</span>';
            if (c && c.street) {
                cliEnderecoHtml = `${c.street}, ${c.number || 'S/N'} - ${c.district || ''}<br>${c.city || ''} - CEP: ${c.cep || ''}`;
            }

            // Monta Itens
            let itensHtml = '';
            if(b.items_json) {
                b.items_json.forEach(i => {
                    itensHtml += `
                    <tr style="border-bottom:1px solid #eee;">
                        <td style="padding:10px; color:#333;">${i.name}</td>
                        <td style="padding:10px; text-align:center; color:#555;">${i.qty}</td>
                        <td style="padding:10px; text-align:right; color:#555;">R$ ${parseFloat(i.price).toFixed(2)}</td>
                        <td style="padding:10px; text-align:right; font-weight:bold; color:#333;">R$ ${(i.qty * i.price).toFixed(2)}</td>
                    </tr>`;
                });
            }

            // 4. CRIA O HTML DO PDF (LAYOUT PREMIUM)
            const element = document.createElement('div');
            element.style.width = '800px';
            element.style.padding = '40px';
            element.style.fontFamily = "'Helvetica Neue', Helvetica, Arial, sans-serif";
            element.style.background = 'white';
            element.style.color = '#333';
            
            element.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:start; border-bottom:3px solid #000; padding-bottom:20px; margin-bottom:30px;">
                    <div>${logoHtml}</div>
                    <div style="text-align:right; font-size:12px; color:#555;">
                        <strong style="font-size:16px; color:#000;">${u.company_name}</strong><br>
                        ${empAddr}<br>
                        ${u.doc ? 'CNPJ: ' + u.doc : ''}
                    </div>
                </div>

                <div style="display:flex; gap:30px; margin-bottom:40px;">
                    <div style="flex:1; background:#f4f4f4; padding:20px; border-radius:8px;">
                        <small style="color:#888; text-transform:uppercase; letter-spacing:1px; font-weight:bold;">Destinatário</small><br>
                        <strong style="font-size:18px;">${cliNome}</strong><br>
                        <span style="font-size:13px; color:#555;">${cliDoc}</span><br>
                        <div style="margin-top:10px; font-size:13px; color:#555;">${cliEnderecoHtml}</div>
                    </div>
                    <div style="width:200px; text-align:right; padding-top:10px;">
                        <small style="color:#888; text-transform:uppercase;">Orçamento Nº</small><br>
                        <strong style="font-size:24px; color:#000;">#${b.id.slice(0,6).toUpperCase()}</strong><br><br>
                        <small style="color:#888; text-transform:uppercase;">Data</small><br>
                        <strong>${new Date(b.created_at).toLocaleDateString()}</strong>
                    </div>
                </div>

                <table style="width:100%; border-collapse:collapse; margin-bottom:30px;">
                    <thead>
                        <tr style="background:#222; color:white; font-size:12px; text-transform:uppercase;">
                            <th style="padding:12px; text-align:left;">Descrição</th>
                            <th style="padding:12px; text-align:center;">Qtd</th>
                            <th style="padding:12px; text-align:right;">Valor Unit.</th>
                            <th style="padding:12px; text-align:right;">Total</th>
                        </tr>
                    </thead>
                    <tbody>${itensHtml}</tbody>
                </table>

                <div style="display:flex; justify-content:flex-end;">
                    <div style="width:250px; background:#f4f4f4; padding:20px; border-radius:8px; text-align:right;">
                        <span style="font-size:14px; color:#666;">TOTAL A PAGAR</span><br>
                        <strong style="font-size:28px; color:#000;">R$ ${b.total_amount.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</strong>
                    </div>
                </div>

                <div style="margin-top:50px; border-top:1px solid #ddd; padding-top:20px; font-size:11px; color:#777; text-align:center;">
                    Documento gerado eletronicamente por Donna Sistema.
                </div>
            `;

            // 5. GERA O BLOB DO PDF
            const opt = { margin:0, filename:'orcamento.pdf', image:{type:'jpeg',quality:0.98}, html2canvas:{scale:2, useCORS:true, logging:false}, jsPDF:{unit:'mm',format:'a4'} };
            const pdfBlob = await html2pdf().set(opt).from(element).output('blob');

            // 6. UPLOAD PARA O STORAGE
            const fileName = `orc_${u.tenant_id}_${id}_${Date.now()}.pdf`;
            const { error: upErr } = await sb.storage.from('orcamentos').upload(fileName, pdfBlob);
            
            if(upErr) {
                console.error("Erro upload:", upErr);
                // Fallback: Tenta subir no bucket 'logos' se 'orcamentos' falhar
                await sb.storage.from('logos').upload(fileName, pdfBlob);
            }

            // 7. PEGA O LINK PÚBLICO
            const { data: publicData } = sb.storage.from('orcamentos').getPublicUrl(fileName);
            // Se falhou no bucket principal, tenta pegar do fallback
            const pdfUrl = publicData.publicUrl;

            // 8. ENVIA NO WHATSAPP
            let telefone = cliTelRaw.replace(/\D/g, '');
            if(telefone.length < 10) throw new Error("Cliente sem telefone válido para envio.");
            if(telefone.length <= 11) telefone = '55' + telefone;

            const primeiroNome = cliNome.split(' ')[0];
            const msg = `Olá *${primeiroNome}*!%0A%0ASegue o link do seu orçamento:%0A📄 *${pdfUrl}*%0A%0AValor Total: *R$ ${b.total_amount.toFixed(2)}*%0A%0AFico no aguardo!`;

            window.open(`https://wa.me/${telefone}?text=${msg}`, '_blank');

            // Atualiza status se necessário
            if(b.status === 'Pendente') {
                await sb.from('budgets').update({status:'Aguardando'}).eq('id', id);
                app.loadOrcamentos();
            }

        } catch (error) {
            console.error(error);
            alert("Erro: " + error.message);
        } finally {
            btn.innerHTML = oldIcon;
            btn.disabled = false;
        }
    },
    

    // 11. Converter Orçamento em Venda (Aprovar)
    openConvertModal: (id) => { 
        document.getElementById('conv-orc-id').value = id; 
        app.openModal('convert'); 
    },
    
    finishConversion: async () => { 
        const orcId = document.getElementById('conv-orc-id').value; 
        const {data:orc} = await sb.from('budgets').select('*').eq('id', orcId).single(); 
        if(!orc) return; 
        
        // Pega ID do cliente
        const {data:cli} = await sb.from('clients').select('id').eq('name', orc.client_name).maybeSingle();
        const cliId = cli ? cli.id : null;

        const entVal = app.parseMoney(document.getElementById('conv-entry').value); 
        const paymentMethod = document.getElementById('conv-pay').value;
        const dueDate = document.getElementById('conv-due').value || null;
        
        await sb.from('sales').insert([{
            tenant_id: app.currentUser.tenant_id, 
            total_amount: orc.total_amount, 
            items_json: orc.items_json, 
            client_name: orc.client_name, 
            client_id: cliId,
            client_phone: orc.client_contact,
            status: 'Pendente', 
            payment_method: paymentMethod, 
            amount_paid: entVal, // Novo campo de pagamento
            entry_amount: entVal, // Legado
            due_date: dueDate,
            created_at: new Date().toISOString()
        }]); 
        
        if(entVal > 0) {
            await sb.from('fin_movs').insert([{
                tenant_id: app.currentUser.tenant_id, 
                type: 'entrada', 
                description: 'Sinal Orç. - ' + orc.client_name, 
                amount: entVal, 
                category: 'Vendas', 
                date: new Date().toISOString()
            }]); 
        }

        await sb.from('budgets').update({ status: 'Aprovado' }).eq('id', orcId); 
        app.closeModal('convert'); 
        app.loadOrcamentos(); 
        app.notify("Orçamento Aprovado e Venda Criada!"); 
    }
};


// --- LISTENERS ---
setInterval(() => { const el = document.getElementById('clock'); if(el) el.innerText = new Date().toLocaleTimeString(); }, 1000);

// ============================================================
// 5. INICIALIZAÇÃO DO SISTEMA (CORRIGIDA)
// ============================================================

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Relógio (Visual)
    const clock = document.getElementById('clock');
    if(clock) setInterval(() => clock.innerText = new Date().toLocaleTimeString(), 1000);

    // 2. VERIFICAÇÃO DE LOGIN
    const storedUser = localStorage.getItem('donna_user');
    
    if (storedUser) {
        // --- CENÁRIO A: TEM USUÁRIO LOGADO ---
        try {
            const parsedUser = JSON.parse(storedUser);
            
            // Verifica se tem ID válido
            if (parsedUser && parsedUser.tenant_id) {
                app.currentUser = parsedUser;
                
                // Manda direto para o Painel (ERP)
                setTimeout(() => { 
                    app.start(); 
                }, 100);
            } else {
                throw new Error("Dados de usuário inválidos");
            }
        } catch (e) {
            console.warn("Sessão inválida. Limpando...", e);
            localStorage.removeItem('donna_user');
            // Se o login estava podre, manda pra home
            lp.show('landing-page'); 
            lp.fetchPlans();
        }
    } else {
        // --- CENÁRIO B: NÃO TEM NINGUÉM LOGADO (VISITANTE) ---
        // AQUI ESTAVA FALTANDO: Força abrir a Landing Page
        if(typeof lp !== 'undefined') {
            console.log("Iniciando na Landing Page...");
            lp.show('landing-page'); // <--- OBRIGA A MOSTRAR A CAPA
            lp.fetchPlans();         // <--- CARREGA OS PREÇOS
        }
    }
});

// Auto Maiúsculas
// ============================================================
// 6. ROBÔ DE MAIÚSCULAS & MÁSCARAS (CORRIGIDO)
// ============================================================
document.addEventListener('input', (e) => {
    const el = e.target;
    // Lista de tipos que NÃO suportam seleção de cursor ou não devem ser alterados
    const ignoreTypes = ['password', 'email', 'url', 'number', 'file', 'date', 'datetime-local', 'time', 'range', 'color', 'checkbox', 'radio'];

    // 1. TRANSFORMA EM MAIÚSCULAS
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
        // Só executa se NÃO estiver na lista de ignorados e não for readonly
        if (!ignoreTypes.includes(el.type) && !el.readOnly) {
            const start = el.selectionStart; 
            const end = el.selectionEnd;
            
            el.value = el.value.toUpperCase();
            
            // Só tenta ajustar o cursor se o elemento suportar
            try {
                if(el.setSelectionRange) {
                    el.setSelectionRange(start, end);
                }
            } catch(err) {
                // Ignora erro se o browser reclamar
            }
        }
    }

    // 2. MÁSCARA DE TELEFONE AUTOMÁTICA
    if (el.id && (el.id.includes('tel') || el.id.includes('phone'))) {
        let v = el.value.replace(/\D/g,"");
        v = v.substring(0,11);
        if(v.length>10) v=v.replace(/^(\d\d)(\d{5})(\d{4}).*/,"($1) $2-$3");
        else if(v.length>5) v=v.replace(/^(\d\d)(\d{4})(\d{0,4}).*/,"($1) $2-$3");
        else if(v.length>2) v=v.replace(/^(\d\d)(\d{0,5}).*/,"($1) $2");
        el.value = v;
    }
});

// ============================================================
// 5. INICIALIZAÇÃO DO SISTEMA (BLINDADA)
// ============================================================

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Relógio
    const clock = document.getElementById('clock');
    if(clock) setInterval(() => clock.innerText = new Date().toLocaleTimeString(), 1000);

    // 2. Carrega Planos da Página Inicial (Landing Page)
    if(typeof lp !== 'undefined') {
        lp.fetchPlans();
    }

    // 3. VERIFICAÇÃO DE LOGIN (Com proteção contra erro 400)
    const storedUser = localStorage.getItem('donna_user');
    
    if (storedUser) {
        try {
            // Tenta ler o usuário salvo
            const parsedUser = JSON.parse(storedUser);
            
            // Verifica se tem ID válido
            if (parsedUser && parsedUser.tenant_id) {
                app.currentUser = parsedUser;
                
                // Se o usuário já estiver na página, inicia o app direto
                // Mas damos um pequeno delay para o HTML carregar
                setTimeout(() => {
                    app.start();
                }, 100);
            } else {
                throw new Error("Dados de usuário inválidos");
            }
        } catch (e) {
            // SE DER ERRO (O tal erro 400 ou JSON inválido):
            console.warn("Sessão inválida encontrada. Limpando...", e);
            localStorage.removeItem('donna_user'); // Limpa o lixo
            // Não faz reload para não entrar em loop, apenas fica na Landing Page
        }
    }
});
// Verifica se o pagamento foi concluído após o reload
// Apague os 3 loads do final e coloque apenas este:
window.addEventListener('load', () => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get('status');

    if (status === 'success') {
        window.history.replaceState({}, document.title, "/");
        alert("🎉 PAGAMENTO APROVADO! Criando seu acesso...");
        
        // Se o seu webhook ainda não criou, chame a função de sucesso
        if(window.chk.processSuccess) window.chk.processSuccess();
    }
});
// ============================================================
// 7. UTILITÁRIOS GLOBAIS (PARA O HTML ENXERGAR)
// ============================================================

// Função para mostrar/ocultar senha (Olhinho)
window.togglePass = function(inputId, iconId) {
    const input = document.getElementById(inputId);
    const icon = document.getElementById(iconId);
    
    if (!input || !icon) return; 

    if (input.type === "password") {
        input.type = "text";
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
        icon.style.color = "var(--primary)";
    } else {
        input.type = "password";
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
        icon.style.color = "#666";
    }
};

// Função para máscara de telefone
window.maskPhone = function(el) {
    let v = el.value.replace(/\D/g,"");
    v = v.substring(0,11); 
    
    if(v.length > 10) {
        v = v.replace(/^(\d\d)(\d{5})(\d{4}).*/,"($1) $2-$3");
    } else if(v.length > 5) {
        v = v.replace(/^(\d\d)(\d{4})(\d{0,4}).*/,"($1) $2-$3");
    } else if(v.length > 2) {
        v = v.replace(/^(\d\d)(\d{0,5}).*/,"($1) $2");
    }
    
    el.value = v;
};
// --- NO FINAL DO ARQUIVO main.js, JUNTO COM AS OUTRAS FUNÇÕES GLOBAIS ---

// Função de Busca de CEP para o Cadastro
window.buscaCepReg = async function(el) {
    // Remove tudo que não é número
    let cep = el.value.replace(/\D/g, '');
    
    // Máscara visual (00000-000)
    el.value = cep.replace(/^(\d{5})(\d)/, '$1-$2');

    // Só busca se tiver 8 dígitos
    if (cep.length === 8) {
        // Feedback visual (deixa o campo meio transparente pra mostrar que tá pensando)
        el.style.opacity = '0.5';
        
        try {
            const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
            const data = await response.json();

            if (!data.erro) {
                // Preenche os campos
                document.getElementById('reg-rua').value = data.logradouro.toUpperCase();
                document.getElementById('reg-bairro').value = data.bairro.toUpperCase();
                document.getElementById('reg-cidade').value = (data.localidade + '/' + data.uf).toUpperCase();
                
                // Foca no número para o usuário digitar
                document.getElementById('reg-num').focus();
            } else {
                alert("CEP não encontrado!");
                // Limpa campos
                document.getElementById('reg-rua').value = "";
                document.getElementById('reg-bairro').value = "";
                document.getElementById('reg-cidade').value = "";
            }
        } catch (error) {
            console.error(error);
        } finally {
            // Volta ao normal
            el.style.opacity = '1';
        }
    }
};
// Função para validar senha em Tempo Real
// ==========================================
// VALIDAÇÃO DE SENHA EM TEMPO REAL
// ==========================================
window.checkPassMatch = function() {
    const p1 = document.getElementById('reg-password');
    const p2 = document.getElementById('reg-password-confirm');

    // Segurança: Se os campos não existirem na tela, para.
    if (!p1 || !p2) return;

    // 1. Se a confirmação estiver vazia, deixa cinza (padrão)
    if (p2.value.length === 0) {
        p1.style.border = '1px solid #333';
        p2.style.border = '1px solid #333';
        p2.style.background = '#1a1a1a';
        return;
    }

    // 2. Se as senhas forem IGUAIS
    if (p1.value === p2.value) {
        p1.style.border = '1px solid #00e054'; // Verde
        p2.style.border = '1px solid #00e054'; // Verde
        p2.style.color = 'white';
    } 
    // 3. Se forem DIFERENTES
    else {
        p1.style.border = '1px solid #ff4757'; // Vermelho
        p2.style.border = '1px solid #ff4757'; // Vermelho
        p2.style.color = '#ff4757'; // Texto vermelho também pra chamar atenção
    }
};
// ============================================================
// SISTEMA DE BLOQUEIO AUTOMÁTICO (CORRIGIDO E COMPLETO)
// ============================================================

// 1. Função Principal: Verifica se deve bloquear
async function checkSystemStatus() {
    
    // --- SEGURANÇA: VERIFICA SE O SUPABASE EXISTE ---
    if (typeof sb === 'undefined') return;

    // --- PASSO 1: VERIFICA SE TEM USUÁRIO LOGADO ---
    // (Isso impede que o bloqueio rode na tela de login)
    const resposta = await sb.auth.getSession();
    
    if (!resposta || !resposta.data || !resposta.data.session) {
        // Se não tem sessão, sai da função e deixa o usuário fazer login.
        return; 
    }

    const user = resposta.data.session.user;

    // --- PASSO 2: BUSCA DADOS DA LOJA ---
    const { data: tenant, error } = await sb
        .from('tenants')
        .select('plan_status, current_period_end, company_name')
        .eq('email', user.email)
        .single();

    if (error || !tenant) return;

    // --- PASSO 3: REGRAS DE BLOQUEIO ---
    let bloqueado = false;
    let motivo = "";
    
    const hoje = new Date();
    // Se tiver data, converte. Se não, considera null.
    const vencimento = tenant.current_period_end ? new Date(tenant.current_period_end) : null;

    // REGRA A: Status marcado explicitamente como suspenso/atrasado
    if (['suspended', 'overdue', 'cancelled'].includes(tenant.plan_status)) {
        bloqueado = true;
        motivo = "Sua conta está suspensa ou com pagamento pendente.";
    }
    
    // REGRA B: Data de Vencimento Passou
    // (Só bloqueia se a data passou E o status não foi forçado para 'active' manualmente depois)
    else if (vencimento && vencimento < hoje) {
        bloqueado = true;
        motivo = "Seu período de assinatura expirou.";
        
        // Opcional: Atualiza o status no banco para 'overdue' para manter consistência
        // Mas só faz isso se o status atual ainda for 'active'
        if (tenant.plan_status === 'active') {
            await sb.from('users').update({ plan_status: 'overdue' }).eq('email', user.email);
        }
    }

    // --- PASSO 4: EXIBE A TELA SE NECESSÁRIO ---
    if (bloqueado) {
        const adminPhone = await getAdminPhone(); // Busca o zap na config
        showLockScreen(tenant.company_name, motivo, adminPhone);
    }
}

// 2. Função Auxiliar: Busca o telefone do suporte na tabela 'app_config'
async function getAdminPhone() {
    try {
        const { data } = await sb.from('app_config').select('support_phone').eq('id', 1).single();
        return data?.support_phone || '550000000000'; // Retorna o do banco ou um padrão
    } catch (e) {
        console.error("Erro ao buscar telefone config:", e);
        return '550000000000';
    }
}

// 3. Função Visual: Cria a tela de bloqueio (Impossível de fechar)
function showLockScreen(nomeEmpresa, motivo, adminPhone) {
    // Evita criar várias telas se já estiver bloqueado
    if (document.getElementById('system-lock-screen')) return;

    // Trava a rolagem da página
    document.body.style.overflow = 'hidden';

    // Limpa o telefone (deixa só números) para o link do Zap funcionar
    const cleanPhone = adminPhone ? adminPhone.replace(/\D/g, '') : '550000000000';

    const lockDiv = document.createElement('div');
    lockDiv.id = 'system-lock-screen';
    lockDiv.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(17, 24, 39, 0.98); 
        z-index: 999999; 
        display: flex; flex-direction: column; align-items: center; justify-content: center;
        color: white; text-align: center; font-family: sans-serif; padding: 20px;
    `;

    lockDiv.innerHTML = `
        <div style="background: #1f2937; padding: 40px; border-radius: 16px; max-width: 500px; border: 1px solid #374151; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);">
            <div style="font-size: 50px; margin-bottom: 20px;">🔒</div>
            <h1 style="font-size: 24px; font-weight: bold; margin-bottom: 10px; color: #ef4444;">Acesso Bloqueado</h1>
            <p style="font-size: 18px; font-weight: 500; margin-bottom: 5px;">${nomeEmpresa || 'Sua Empresa'}</p>
            <p style="color: #9ca3af; margin-bottom: 30px;">${motivo}</p>
            
            <div style="background: #374151; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                <p style="font-size: 12px; color: #d1d5db; margin-bottom: 5px;">Para desbloquear, entre em contato com o suporte ou realize o pagamento.</p>
            </div>

            <a href="https://wa.me/${cleanPhone}" target="_blank" 
               style="background: #22c55e; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block; transition: 0.2s;">
               <i class="fa-brands fa-whatsapp"></i> Falar com Suporte
            </a>
            
            <div style="margin-top: 20px;">
                <button onclick="window.location.reload()" style="background:none; border:none; color: #6b7280; cursor: pointer; text-decoration: underline; font-size: 12px;">
                    Já paguei, verificar novamente
                </button>
            </div>
            
            <div style="margin-top: 30px; border-top: 1px solid #374151; padding-top: 10px;">
                <button onclick="logout()" style="background:none; border:none; color: #ef4444; cursor: pointer; font-size: 12px;">
                    Sair da conta
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(lockDiv);
}

// 4. Inicialização Automática
document.addEventListener('DOMContentLoaded', () => {
    // Tenta rodar a verificação assim que a página carrega
    checkSystemStatus();
});

// Função simples de logout (caso o usuário queira sair da tela bloqueada)
async function logout() {
    await sb.auth.signOut();
    window.location.href = '/index.html';
}
// Atualize a função visual para receber o telefone
function showLockScreen(nomeEmpresa, motivo, adminPhone) {
    document.body.style.overflow = 'hidden';

    // Garante que o telefone tenha apenas números
    const cleanPhone = adminPhone.replace(/\D/g, '');

    const lockDiv = document.createElement('div');
    lockDiv.id = 'system-lock-screen';
    // ... (o estilo CSS continua igual) ...
    lockDiv.style.cssText = `position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(17, 24, 39, 0.98); z-index: 999999; display: flex; flex-direction: column; align-items: center; justify-content: center; color: white; text-align: center; font-family: sans-serif; padding: 20px;`;

    lockDiv.innerHTML = `
        <div style="background: #1f2937; padding: 40px; border-radius: 16px; max-width: 500px; border: 1px solid #374151;">
            <div style="font-size: 50px; margin-bottom: 20px;">🔒</div>
            <h1 style="font-size: 24px; font-weight: bold; margin-bottom: 10px; color: #ef4444;">Acesso Bloqueado</h1>
            <p style="font-size: 18px; font-weight: 500; margin-bottom: 5px;">${nomeEmpresa}</p>
            <p style="color: #9ca3af; margin-bottom: 30px;">${motivo}</p>
            
            <a href="https://wa.me/${cleanPhone}" target="_blank" 
               style="background: #22c55e; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block; transition: 0.2s;">
               <i class="fa-brands fa-whatsapp"></i> Falar com Suporte
            </a>
            
            <div style="margin-top: 20px;">
                <button onclick="window.location.reload()" style="background:none; border:none; color: #6b7280; cursor: pointer; text-decoration: underline; font-size: 12px;">
                    Já paguei, verificar novamente
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(lockDiv);
}
