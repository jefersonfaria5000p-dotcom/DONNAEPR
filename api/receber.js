import { buffer } from 'micro';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient('https://adluzpbcaaupjexfsrll.supabase.co', process.env.SUPABASE_SERVICE_ROLE_KEY);

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
    console.log("🚀 V3.0 - TENTATIVA DE CRIAÇÃO INTELIGENTE");

    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

    let event;
    try {
        const buf = await buffer(req);
        const sig = req.headers['stripe-signature'];
        event = stripe.webhooks.constructEvent(buf, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'invoice.paid') {
        const invoice = event.data.object;
        const email = invoice.customer_email || invoice.customer_name;
        // Tenta achar a senha no metadata OU usa uma padrão se for evento velho (para não travar)
        const password = invoice.subscription_details?.metadata?.password || invoice.metadata?.password || "MudarSenha123"; 
        const tenant_id = invoice.subscription_details?.metadata?.tenant_id || invoice.metadata?.tenant_id || 't_' + Date.now();

        console.log(`👤 Email: ${email}`);
        console.log(`🔑 Senha detectada: ${password === "MudarSenha123" ? "PADRÃO (Evento Velho)" : "RECEBIDA DO STRIPE"}`);

        if (email) {
            let userId;

            // 1. TENTA CRIAR O USUÁRIO NO AUTH
            const { data: createdData, error: createError } = await supabase.auth.admin.createUser({
                email: email,
                password: password,
                email_confirm: true
            });

            if (!createError) {
                console.log('✅ Login NOVO criado!');
                userId = createdData.user.id;
            } else {
                console.log(`⚠️ Login não criado (Provavelmente já existe): ${createError.message}`);
                
                // 2. SE JÁ EXISTE, BUSCA O ID DELE
                const { data: listData } = await supabase.auth.admin.listUsers();
                const existingUser = listData.users.find(u => u.email === email);
                
                if (existingUser) {
                    console.log('✅ Usuário existente encontrado! ID recuperado.');
                    userId = existingUser.id;
                } else {
                    console.error('❌ Erro grave: Não consegui criar nem achar o usuário.');
                }
            }

            // 3. GRAVA NA TABELA TENANTS (Só se tivermos o ID)
            if (userId) {
                // Remove registro antigo desse ID se houver (Upsert manual)
                await supabase.from('tenants').delete().eq('id', userId);

                const { error: dbError } = await supabase.from('tenants').insert([{ 
                    id: userId,
                    email: email, 
                    password: password, 
                    tenant_id: tenant_id,
                    plan: 'pro',
                    status: 'active'
                }]);

                if (dbError) {
                    console.error('❌ Erro no Banco de Dados:', dbError.message);
                    return res.status(500).json({ error: dbError.message });
                }
                console.log('🏆 SUCESSO TOTAL: Login e Dados vinculados!');
            }
        }
    }

    res.json({ received: true });
}