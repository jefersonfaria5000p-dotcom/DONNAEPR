import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Inicializa o Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// CORREÇÃO AQUI: Colocamos o URL direto para garantir que não falhe
// (Substitua pelo SEU link do Supabase que começa com https://...)
const supabaseUrl = 'https://adluzpbcaaupjexfsrll.supabase.co'; 

const supabase = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
    // 1. Segurança Básica (Verifica se é você pelo email nos headers ou corpo, 
    // mas por simplicidade vamos confiar na chave de serviço por enquanto)
    
    if (req.method === 'POST') {
        // Ação de ESTORNO (Refund)
        try {
            const { payment_intent_id } = req.body;
            const refund = await stripe.refunds.create({
                payment_intent: payment_intent_id,
            });
            return res.status(200).json({ success: true, refund });
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }

    if (req.method === 'GET') {
        try {
            // 2. Busca Usuários no Banco
            const { data: users, error } = await supabase
                .from('tenants')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            // 3. Busca Pagamentos no Stripe (Últimos 100)
            const charges = await stripe.charges.list({ limit: 100 });

            // 4. Junta as informações
            // Vamos adicionar o histórico de pagamentos dentro de cada usuário
            const usersWithPayments = users.map(user => {
                const userPayments = charges.data.filter(
                    charge => charge.billing_details.email === user.email
                );
                return { ...user, payments: userPayments };
            });

            // Retorna tudo pronto para a tela
            res.status(200).json({ users: usersWithPayments });

        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
}