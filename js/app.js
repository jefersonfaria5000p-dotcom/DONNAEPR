// ============================================================
// 1. LÓGICA DA LANDING PAGE (lp)
// ============================================================
const lp = {
    plans: [], 
    plansData: [], // Armazena dados brutos
    cycle: 'monthly',

    init: async () => {
        await lp.loadPlans();
        const session = localStorage.getItem('donna_user');
        if (session) {
            const u = JSON.parse(session);
            app.currentUser = u;
            // Verifica status e redireciona
            if (u.is_admin) { 
                lp.show('super-admin'); 
                if(typeof sa !== 'undefined') sa.init(); 
            }
            else if (u.plan_status === 'suspended') { 
                app.start(); 
                app.nav('assinatura'); 
            } 
            else { 
                app.start(); 
            }
        } else { 
            lp.show('landing-page'); 
        }
    },

    show: (id) => {
        document.querySelectorAll('.full-screen-section').forEach(s => s.classList.remove('active'));
        const wrapper = document.getElementById('app-wrapper');
        if(wrapper) wrapper.classList.add('hidden');
        
        if(id === 'app-wrapper') {
            if(wrapper) wrapper.classList.remove('hidden');
        } else {
            const el = document.getElementById(id);
            if(el) el.classList.add('active');
        }
    },

    loadPlans: async () => {
        // Busca planos no Supabase
        const { data: plans, error } = await sb.from('plans').select('*').eq('active', true).order('price_monthly', {ascending: true});
        
        if(error) return console.error(error);
        
        lp.plansData = plans; // Guarda na memória
        lp.plans = plans;
        lp.renderPlans();
    },

    toggleCycle: (c) => { 
        lp.cycle = c; 
        
        // Atualiza visual dos botões
        document.getElementById('btn-monthly').style.opacity = c === 'monthly' ? '1' : '0.6';
        document.getElementById('btn-yearly').style.opacity = c === 'yearly' ? '1' : '0.6';
        
        lp.renderPlans(); 
    },

    renderPlans: () => {
        const c = document.getElementById('lp-plans-list'); 
        if(!c) return;
        c.innerHTML = '';
        
        lp.plansData.forEach(p => {
            const price = lp.cycle === 'monthly' ? p.price_monthly : p.price_yearly;
            const label = lp.cycle === 'monthly' ? '/mês' : '/ano';
            
            c.innerHTML += `
                <div class="lp-plan-card">
                    <h3>${p.name}</h3>
                    <div class="lp-price">R$ ${parseFloat(price).toFixed(2)} <small>${label}</small></div>
                    <button class="btn-lg" onclick="lp.selectPlan('${p.id}')">ASSINAR AGORA</button>
                </div>`;
        });
    },

    // Função que prepara o Checkout
    selectPlan: (planId) => {
        const plan = lp.plansData.find(p => p.id === planId);
        if(!plan) return alert("Erro ao selecionar plano.");

        const isYearly = lp.cycle === 'yearly';
        const price = isYearly ? plan.price_yearly : plan.price_monthly;
        const cycleName = isYearly ? 'Anual' : 'Mensal';

        // Atualiza o objeto de Checkout
        chk.currentPlan = plan;
        chk.currentAmount = price;
        chk.currentCycle = isYearly ? 'yearly' : 'monthly';

        // Atualiza Visual Lateral
        document.getElementById('chk-display-name').innerText = plan.name.toUpperCase();
        document.getElementById('chk-display-cycle').innerText = cycleName;
        document.getElementById('chk-display-price').innerText = 'R$ ' + parseFloat(price).toFixed(2).replace('.', ',');

        // Troca de tela
        lp.show('checkout-flow');
        chk.goToStep(1);
    },

    goToLogin: () => { lp.show('app-wrapper'); document.getElementById('login-screen').classList.remove('hidden'); },
    backToHome: () => { lp.show('landing-page'); document.getElementById('login-screen').classList.add('hidden'); }
};

// ============================================================
// 2. LÓGICA DE CHECKOUT E PAGAMENTO (chk)
// ============================================================
const chk = {
    step: 1,
    mp: null,
    cardBrick: null,
    
    // Estado
    currentPlan: null,
    currentAmount: 0,
    currentCycle: 'monthly',
    tempUser: {},

    // Valida passo 1 (Cadastro)
    validateStep1: async () => {
        const comp = document.getElementById('reg-comp').value;
        const email = document.getElementById('reg-email').value;
        const pass = document.getElementById('reg-pass').value;

        if(!comp || !email || !pass) return alert("Preencha todos os campos.");

        // Verifica email duplicado
        const { data: exists } = await sb.from('tenants').select('*').eq('email', email);
        if(exists && exists.length > 0) return alert("Este email já possui cadastro. Faça login.");

        chk.tempUser = { company_name: comp, email: email, password: pass };
        
        // Limpa Brick antigo para garantir preço novo
        chk.cardBrick = null;
        document.getElementById('paymentBrick_container').innerHTML = '';

        chk.goToStep(2);

        // Delay para carregar SDK
        setTimeout(() => { chk.loadBrick(); }, 500);
    },

    goToStep: (step) => {
        chk.step = step;
        document.getElementById('chk-step-1').classList.add('hidden');
        document.getElementById('chk-step-2').classList.add('hidden');
        
        if(step > 0) document.getElementById(`chk-step-${step}`).classList.remove('hidden');
    },

    // Carrega MercadoPago
    loadBrick: async () => {
        // CHAVE DE TESTE PÚBLICA
        let publicKey = 'TEST-678c85b1-0ada-4751-9422-7ed6e28d7225'; 
        
        if(chk.cardBrick) {
            try { chk.cardBrick.unmount(); } catch(e){}
        }

        chk.mp = new MercadoPago(publicKey, { locale: 'pt-BR' });
        
        const settings = {
            initialization: {
                amount: chk.currentAmount,
                payer: { email: chk.tempUser.email }
            },
            customization: {
                visual: { style: { theme: 'dark' } },
                paymentMethods: {
                    creditCard: "all", debitCard: "all", ticket: "all", bankTransfer: "all"
                }
            },
            callbacks: {
                onReady: () => { console.log("Brick pronto!"); },
                onError: (error) => { alert("Erro no MercadoPago: " + error); },
                onSubmit: (brickData) => {
                    return new Promise(async (resolve, reject) => {
                        try {
                            // Envia para o Backend Node.js
                            const response = await fetch('/process_payment', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    transaction_amount: chk.currentAmount,
                                    description: `Assinatura ${chk.currentPlan.name}`,
                                    token: brickData.formData.token,
                                    payment_method_id: brickData.formData.payment_method_id,
                                    payer: { email: chk.tempUser.email }
                                })
                            });

                            const data = await response.json();

                            if (response.ok && data.status === 'approved') {
                                // Cria usuário no Banco
                                const { error } = await sb.from('tenants').insert([{
                                    company_name: chk.tempUser.company_name,
                                    email: chk.tempUser.email,
                                    password: chk.tempUser.password,
                                    plan_id: chk.currentPlan.id,
                                    plan_cycle: chk.currentCycle,
                                    plan_status: 'active',
                                    tenant_id: 'tenant_' + Date.now()
                                }]);

                                if(error) throw error;

                                alert("Pagamento Aprovado! Faça Login.");
                                location.reload();
                                resolve();
                            } else {
                                alert("Pagamento Recusado.");
                                reject();
                            }
                        } catch (err) {
                            console.error(err);
                            alert("Erro ao processar.");
                            reject();
                        }
                    });
                }
            }
        };

        chk.cardBrick = await chk.mp.bricks().create('payment', 'paymentBrick_container', settings);
    }
};

// ============================================================
// 3. LÓGICA DO ERP (app)
// ============================================================
const app = {
    currentUser: null, 
    cart: [], 
    orcItems: [], 
    cache: { clients: [], products: [] }, 
    varSelectContext: null,
    
    // --- UTILS ---
    parseMoney: (str) => {
        if (!str) return 0;
        if (typeof str === 'number') return str;
        let clean = str.replace("R$", "").trim().replace(/\./g, "").replace(",", ".");
        return parseFloat(clean) || 0;
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
        if(!o) return;
        o.innerText=m; 
        o.style.borderLeftColor=t=='error'?'var(--danger)':'var(--success)'; 
        o.classList.add('show'); 
        setTimeout(()=>o.classList.remove('show'),3000); 
    },
    
    // --- MODAIS ---
    openModal: (t, p1) => { 
        const m = document.getElementById('modal-'+t); if(m) m.style.display = 'flex';
        if(t==='prod') { app.addVarRow(); app.loadCats(); } 
        if(t==='mov') { 
            document.getElementById('mov-type').value = p1; 
            const title = document.getElementById('mov-title');
            if(title) {
                title.innerText = p1=='entrada'?'Nova Receita':'Nova Despesa'; 
                title.style.color = p1=='entrada'?'var(--success)':'var(--danger)'; 
            }
        } 
    },
    closeModal: (t) => { 
        const m = document.getElementById('modal-'+t); if(m) m.style.display = 'none';
        if(t=='cli') app.clearCli(); 
        if(t=='prod') app.clearProd();
        if(t=='details') document.getElementById('det-new-pay').value = ''; 
        if(t=='mov') {['mov-desc','mov-val','mov-cat','mov-date'].forEach(i=>{if(document.getElementById(i))document.getElementById(i).value=''});} 
        if(t=='bill') {['bill-desc','bill-val','bill-cat','bill-due'].forEach(i=>{if(document.getElementById(i))document.getElementById(i).value=''});} 
        if(t=='convert') {['conv-entry','conv-due'].forEach(i=>{if(document.getElementById(i))document.getElementById(i).value=''});} 
    },

    // --- NAV & AUTH ---
    start: () => { 
        lp.show('app-wrapper'); 
        document.getElementById('login-screen').classList.add('hidden'); 
        document.getElementById('sidebar').classList.remove('hidden'); 
        document.getElementById('main-content').classList.remove('hidden'); 
        
        if(app.currentUser.plan_status === 'active') app.nav('dash'); 
        else app.nav('assinatura'); 
        
        app.startKanbanAutoDelete(); 

        // Botão Modo Deus
        if (localStorage.getItem('donna_admin_backup')) {
            const btn = document.getElementById('btn-back-admin');
            if(btn) btn.style.display = 'block';
        }
    },

    nav: async (v) => { 
        if(!app.currentUser) return app.logout();
        document.querySelectorAll('.view').forEach(x=>x.classList.remove('active')); 
        document.querySelectorAll('.nav-btn').forEach(x=>x.classList.remove('active')); 
        
        const view = document.getElementById('view-'+v);
        if(view) view.classList.add('active');
        
        const btn = document.getElementById('btn-nav-'+v); 
        if(btn) btn.classList.add('active');

        if(v=='dash') { await app.loadDash(); app.toggleDash('visao'); } 
        if(v=='assinatura') await app.renderSubscription();
        if(v=='loja') app.loadShop(); 
        if(v=='clientes') app.loadCli(); 
        if(v=='produtos') app.loadProd(); 
        if(v=='producao') app.loadKanban(); 
        if(v=='orcamentos') { await app.loadShop(); app.updateOrcLists(); app.loadOrcamentos(); }
        if(v=='config') app.loadConfig();
    },

    logout: () => { localStorage.removeItem('donna_user'); location.reload(); },
    
    login: async () => { 
        const email = document.getElementById('login-email').value;
        const pass = document.getElementById('login-pass').value;
        const { data } = await supabaseClient.from('tenants').select('*').eq('email', email).eq('password', pass).single(); 
        if(data) { 
            localStorage.setItem('donna_user', JSON.stringify(data)); 
            app.currentUser = data; 
            if(data.is_admin) { lp.show('super-admin'); if(typeof sa !== 'undefined') sa.init(); } 
            else app.start(); 
        } else alert('Email ou senha incorretos'); 
    },

    // --- DASHBOARD ---
    toggleDash: (tab) => {
        ['visao', 'extrato', 'contas', 'pedidos'].forEach(t => {
            const el = document.getElementById('tab-' + t);
            if(el) el.style.display = (t === tab) ? 'block' : 'none';
            const btn = document.getElementById('btn-tab-' + t);
            if(btn) {
                if(t === tab) btn.classList.add('active'); else btn.classList.remove('active');
            }
        });
    },

    loadDash: async () => {
        if(!app.currentUser) return;
        const {data: movs} = await sb.from('financial_movements').select('*').eq('tenant_id', app.currentUser.tenant_id).order('date', {ascending: false});
        const {data: sales} = await sb.from('sales').select('*').eq('tenant_id', app.currentUser.tenant_id).order('created_at', {ascending: false});
        
        let saldo = 0;
        let vendasHoje = 0;
        const todayStr = new Date().toLocaleDateString('pt-BR');

        if(movs) {
            movs.forEach(m => {
                if(m.type === 'entrada') saldo += parseFloat(m.amount); else saldo -= parseFloat(m.amount);
            });
        }
        if(sales) {
            sales.forEach(s => {
                if(new Date(s.created_at).toLocaleDateString('pt-BR') === todayStr) vendasHoje += parseFloat(s.total_amount);
            });
        }

        const elSaldo = document.getElementById('dash-saldo-atual');
        if(elSaldo) elSaldo.innerText = "R$ " + saldo.toLocaleString('pt-BR', {minimumFractionDigits: 2});
        
        const elVendas = document.getElementById('dash-vendas-hoje');
        if(elVendas) elVendas.innerText = "R$ " + vendasHoje.toLocaleString('pt-BR', {minimumFractionDigits: 2});
        
        // Renderiza lista simplificada
        const tbodyMov = document.getElementById('lista-mov');
        if(tbodyMov && movs) {
            tbodyMov.innerHTML = '';
            movs.slice(0, 20).forEach(m => {
                const color = m.type === 'entrada' ? 'var(--success)' : 'var(--danger)';
                tbodyMov.innerHTML += `<tr><td>${new Date(m.date).toLocaleDateString('pt-BR')}</td><td>${m.description}</td><td style="color:${color}">R$ ${parseFloat(m.amount).toFixed(2)}</td></tr>`;
            });
        }
    },

    saveMov: async () => {
        const d = { 
            tenant_id: app.currentUser.tenant_id, 
            type: document.getElementById('mov-type').value, 
            description: document.getElementById('mov-desc').value, 
            amount: app.parseMoney(document.getElementById('mov-val').value), 
            category: document.getElementById('mov-cat').value, 
            date: document.getElementById('mov-date').value 
        };
        await sb.from('financial_movements').insert([d]); 
        app.closeModal('mov'); 
        app.loadDash();
    },

    // --- PDV (VENDAS) ---
    finishSale: async () => {
        if(!app.cart.length) return alert("Carrinho vazio!");
        const cn = document.getElementById('pos-cli-name').value;
        if(!cn) return alert("Selecione um Cliente!");
        
        const btn = event.target; btn.innerText = "..."; btn.disabled = true;

        try {
            // Busca cliente
            const {data:cli} = await sb.from('clients').select('*').eq('name', cn).single();
            if(!cli) { 
                btn.disabled=false; btn.innerText="FINALIZAR"; 
                document.getElementById('cli-nome').value=cn; 
                app.openModal('cli'); 
                return alert("Cliente novo! Cadastre-o primeiro."); 
            }

            const total = app.parseMoney(document.getElementById('cart-total').innerText);
            const ent = app.parseMoney(document.getElementById('pos-entry').value);

            // Salva Venda
            const {data:sale, error} = await sb.from('sales').insert([{
                tenant_id: app.currentUser.tenant_id,
                total_amount: total,
                items_json: app.cart,
                client_name: cn,
                client_id: cli.id,
                client_phone: cli.phone,
                status: 'Pendente',
                payment_method: document.getElementById('pos-pay').value,
                entry_amount: ent,
                due_date: document.getElementById('pos-due').value || null,
                created_at: new Date().toISOString()
            }]).select().single();

            if(error) throw error;

            // Salva Financeiro se teve entrada
            if(ent > 0) {
                await sb.from('financial_movements').insert([{ 
                    tenant_id: app.currentUser.tenant_id, type: 'entrada', description: 'Venda #'+sale.id.slice(0,5), amount: ent, category: 'Vendas', date: new Date().toISOString() 
                }]);
            }

            app.notify("Venda Realizada!");
            app.clearPDV();
            app.loadDash();

        } catch(e) { 
            alert("Erro: " + e.message); 
        } finally {
            btn.disabled=false; btn.innerText="FINALIZAR VENDA";
        }
    },

    clearPDV: () => {
        app.cart = [];
        app.renderCart();
        ['pos-cli-name','pos-cli-tel','pos-cli-cep','pos-cli-rua','pos-cli-num','pos-cli-bairro','pos-cli-cidade','pos-entry','pos-due'].forEach(i => {
           if(document.getElementById(i)) document.getElementById(i).value = '';
        });
        if(document.getElementById('pos-restante')) document.getElementById('pos-restante').innerText = 'R$ 0,00';
    },

    loadShop: async () => {
        const g = document.getElementById('vitrine');
        if (!g) return;
        g.innerHTML = 'Carregando...';
        
        const { data: ps } = await sb.from('products').select('*').eq('tenant_id', app.currentUser.tenant_id);
        const { data: cs } = await sb.from('clients').select('*').eq('tenant_id', app.currentUser.tenant_id);
        
        app.cache.clients = cs || [];
        app.cache.products = ps || [];

        // Preenche datalist cliente
        const dl = document.getElementById('cli-list-opts');
        if(dl) {
            dl.innerHTML = '';
            app.cache.clients.forEach(c => { dl.innerHTML += `<option value="${c.name}">`; });
        }

        g.innerHTML = '';
        if (ps) {
            ps.forEach(p => {
                let imgHTML = p.image_url ? `<img src="${p.image_url}">` : `<div class="prod-icon"><i class="fa-solid fa-box"></i></div>`;
                g.innerHTML += `
                    <div class="prod-card" onclick="app.clickProd('${p.id}')">
                        ${imgHTML}
                        <div class="prod-name">${p.name}</div>
                    </div>`;
            });
        }
    },

    clickProd: (id) => {
        const p = app.cache.products.find(x => String(x.id) === String(id));
        if (!p) return;

        if (p.variations && p.variations.length > 0) {
            app.varSelectContext = 'pdv';
            app.showVarSelector(p);
        } else {
            app.addToCart({ id: p.id, name: p.name, price: parseFloat(p.price), qty: 1 });
        }
    },

    showVarSelector: (p) => {
        const list = document.getElementById('sel-var-list');
        const modal = document.getElementById('modal-sel-var');
        if(!list || !modal) return;

        list.innerHTML = '';
        p.variations.forEach((v, index) => {
            list.innerHTML += `
                <button class="btn btn-outline" style="width:100%; margin-bottom:5px; display:flex; justify-content:space-between" onclick="app.selectVar('${p.id}', ${index})">
                    <span>${v.name}</span><span>R$ ${parseFloat(v.price).toFixed(2)}</span>
                </button>`;
        });
        modal.style.display = 'flex';
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
            app.addToCart({ id: p.id + '_v' + varIndex, name: finalName, price: finalPrice, qty: 1 });
        }
        document.getElementById('modal-sel-var').style.display = 'none';
    },

    addToCart: (item) => {
        const existing = app.cart.find(x => String(x.id) === String(item.id));
        if (existing) existing.qty++; else app.cart.push(item);
        app.renderCart();
    },

    renderCart: () => {
        const container = document.getElementById('cart-list');
        const totalEl = document.getElementById('cart-total');
        if(!container) return;

        container.innerHTML = '';
        let total = 0;
        app.cart.forEach((item, index) => {
            const sub = item.price * item.qty;
            total += sub;
            container.innerHTML += `
                <div class="cart-item">
                    <div>${item.name} <small>x${item.qty}</small></div>
                    <div>R$ ${sub.toFixed(2)} <i class="fa-solid fa-trash" onclick="app.removeFromCart(${index})"></i></div>
                </div>`;
        });
        if(totalEl) totalEl.innerText = "R$ " + total.toLocaleString('pt-BR', {minimumFractionDigits: 2});
        if(app.calcRestante) app.calcRestante();
    },

    removeFromCart: (i) => { app.cart.splice(i, 1); app.renderCart(); },
    
    calcRestante: () => {
        const total = app.parseMoney(document.getElementById('cart-total').innerText);
        const ent = app.parseMoney(document.getElementById('pos-entry').value);
        const rest = total - ent;
        const el = document.getElementById('pos-restante');
        if(el) {
            if(rest > 0) { el.innerText = "Falta: R$ " + rest.toFixed(2); el.style.color="var(--danger)"; }
            else { el.innerText = "Troco: R$ " + Math.abs(rest).toFixed(2); el.style.color="var(--success)"; }
        }
    },
    
    checkCli: () => {
        const val = document.getElementById('pos-cli-name').value;
        const c = app.cache.clients.find(x => x.name === val);
        if(c) {
            document.getElementById('pos-cli-tel').value = c.phone || '';
            document.getElementById('pos-cli-rua').value = c.street || '';
        }
    },

    // --- CLIENTES ---
    loadCli: async () => { 
        const {data} = await sb.from('clients').select('*').eq('tenant_id', app.currentUser.tenant_id).order('name'); 
        app.cache.clients = data || [];
        app.renderCli(app.cache.clients); 
    },
    renderCli: (list) => { 
        const t = document.getElementById('lista-cli'); 
        if(!t) return; 
        t.innerHTML = ''; 
        list.forEach(c => { 
            t.innerHTML += `<tr><td>${c.name}</td><td>${c.phone}</td><td><button onclick="app.editCli('${c.id}')">Editar</button></td></tr>`; 
        }); 
    },
    saveCli: async () => { 
        const id = document.getElementById('cli-id').value;
        const d = {
            name: document.getElementById('cli-nome').value,
            phone: document.getElementById('cli-tel').value,
            email: document.getElementById('cli-email').value,
            tenant_id: app.currentUser.tenant_id
        };
        if(id) await sb.from('clients').update(d).eq('id', id);
        else await sb.from('clients').insert([d]);
        app.closeModal('cli'); app.loadCli();
    },
    editCli: (id) => {
        const c = app.cache.clients.find(x=>x.id==id);
        if(c) {
            document.getElementById('cli-id').value=c.id;
            document.getElementById('cli-nome').value=c.name;
            document.getElementById('cli-tel').value=c.phone;
            document.getElementById('cli-email').value=c.email;
            app.openModal('cli');
        }
    },
    clearCli: () => {
        document.getElementById('cli-id').value='';
        document.getElementById('cli-nome').value='';
        document.getElementById('cli-tel').value='';
        document.getElementById('cli-email').value='';
    },
    buscarCep: async () => { /* Implementar se desejar */ },
    buscarCepPDV: async () => { /* Implementar se desejar */ },

    // --- PRODUTOS ---
    loadProd: async () => {
        const {data} = await sb.from('products').select('*').eq('tenant_id', app.currentUser.tenant_id).order('name');
        const t = document.getElementById('lista-prod');
        if(!t) return;
        t.innerHTML = '';
        data.forEach(p => {
             t.innerHTML += `<tr><td>${p.name}</td><td>R$ ${parseFloat(p.price).toFixed(2)}</td><td><button onclick="app.editProd('${p.id}')">Ed</button></td></tr>`;
        });
    },
    saveProd: async () => {
        const id = document.getElementById('p-id').value;
        // Lógica simplificada de salvar produto
        const d = {
            name: document.getElementById('p-nome').value,
            price: app.parseMoney(document.getElementById('p-base-price').value),
            tenant_id: app.currentUser.tenant_id
        };
        if(id) await sb.from('products').update(d).eq('id',id);
        else await sb.from('products').insert([d]);
        app.closeModal('prod'); app.loadProd();
    },
    editProd: async (id) => {
        const {data} = await sb.from('products').select('*').eq('id',id).single();
        if(data) {
            document.getElementById('p-id').value=data.id;
            document.getElementById('p-nome').value=data.name;
            document.getElementById('p-base-price').value=data.price;
            app.openModal('prod');
        }
    },
    clearProd: () => {
        document.getElementById('p-id').value='';
        document.getElementById('p-nome').value='';
        document.getElementById('p-base-price').value='';
    },
    addVarRow: () => { /* Logica de variação se precisar */ },
    loadCats: () => {},

    // --- KANBAN ---
    loadKanban: async () => {
        if(!app.currentUser) return;
        ['pendente','processo','acabamento','concluido','entregue'].forEach(k=>{
            const el = document.getElementById('kb-'+k);
            if(el) el.innerHTML='';
        });
        const {data}=await sb.from('sales').select('*').eq('tenant_id', app.currentUser.tenant_id).order('created_at',{ascending:false});
        data.forEach(s=>{
            let c='pendente';
            if(s.status=='Em Produção') c='processo';
            else if(s.status=='Acabamento') c='acabamento';
            else if(s.status=='Pronto') c='concluido';
            else if(s.status=='Entregue') c='entregue';
            
            const el = document.getElementById('kb-'+c);
            if(el) el.innerHTML+=`<div class="kanban-card"><b>${s.client_name}</b><br>R$ ${parseFloat(s.total_amount).toFixed(2)}</div>`;
        });
    },
    startKanbanAutoDelete: () => { setInterval(()=>app.loadKanban(), 60000); },

    // --- ORÇAMENTOS ---
    checkOrcCli: () => {
        const val = document.getElementById('orc-cli').value;
        const c = app.cache.clients.find(x => x.name.toUpperCase() === val.toUpperCase());
        if(c) {
             document.getElementById('orc-tel').value = c.phone;
             document.getElementById('orc-cli-id').value = c.id;
        }
    },
    checkOrcProd: () => {
        const val = document.getElementById('orc-prod').value;
        const p = app.cache.products.find(x => x.name.toLowerCase() === val.toLowerCase());
        if(p) {
            if(p.variations && p.variations.length > 0) {
                app.varSelectContext = 'budget';
                app.showVarSelector(p);
            } else {
                document.getElementById('orc-price').value = "R$ " + parseFloat(p.price).toFixed(2).replace('.', ',');
            }
        }
    },
    addOrcItem: () => {
        const n = document.getElementById('orc-prod').value;
        const q = parseFloat(document.getElementById('orc-qtd').value);
        const p = app.parseMoney(document.getElementById('orc-price').value);
        if(n && q && p) {
            app.orcItems.push({name:n, qty:q, price:p});
            app.renderOrcItems();
        }
    },
    renderOrcItems: () => {
        const tb = document.getElementById('orc-items-list');
        const tot = document.getElementById('orc-total');
        if(!tb) return;
        tb.innerHTML = '';
        let t = 0;
        app.orcItems.forEach(i => {
            t += i.qty * i.price;
            tb.innerHTML += `<tr><td>${i.name}</td><td>${i.qty}</td><td>R$ ${i.price}</td></tr>`;
        });
        if(tot) tot.innerText = "R$ " + t.toFixed(2);
    },
    saveOrcamento: async () => {
        const cn = document.getElementById('orc-cli').value;
        const t = app.parseMoney(document.getElementById('orc-total').innerText);
        await sb.from('budgets').insert([{
            tenant_id: app.currentUser.tenant_id,
            client_name: cn,
            total_amount: t,
            items_json: app.orcItems,
            status: 'pendente'
        }]);
        alert("Orçamento Salvo!");
        app.orcItems = [];
        app.renderOrcItems();
        app.loadOrcamentos();
    },
    loadOrcamentos: async () => {
        const {data} = await sb.from('budgets').select('*').eq('tenant_id', app.currentUser.tenant_id);
        const l = document.getElementById('lista-orc');
        if(l && data) {
            l.innerHTML = '';
            data.forEach(b => l.innerHTML += `<tr><td>${b.client_name}</td><td>R$ ${b.total_amount}</td><td>${b.status}</td></tr>`);
        }
    },
    updateOrcLists: () => { /* Atualiza datalist */ },
    
    // --- ASSINATURA ---
    renderSubscription: async () => {
        const u = app.currentUser;
        const el = document.getElementById('sub-status-display');
        if(el) el.innerHTML = `<h3>Plano Atual: ${u.plan_status}</h3>`;
    }
};

// ============================================================
// 4. INICIALIZAÇÃO
// ============================================================
setInterval(() => {
    const el = document.getElementById('clock');
    if(el) el.innerText = new Date().toLocaleTimeString();
}, 1000);

document.addEventListener('DOMContentLoaded', () => {
    console.log("Sistema Iniciado...");
    if(typeof lp !== 'undefined') lp.init();
});