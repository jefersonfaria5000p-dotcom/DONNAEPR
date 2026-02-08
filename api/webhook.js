// api/webhook.js
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { buffer } from 'micro';

// 1. CONFIGURAÇÕES DE SEGURANÇA
// Precisamos da chave de serviço do Supabase para poder editar qualquer usuário (Admin Mode)
const supabase = createClient(
    process.env.SUPABASE_URL, 
    process.env.SUPABASE_SERVICE_ROLE_KEY // <--- ATENÇÃO: NÃO É A KEY PÚBLICA!
);

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Essa configuração é necessária para o Vercel/Node entenderem o Webhook
export const config = {
    api: {
        bodyParser: false,
    },
};

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).end('Method Not Allowed');
    }

    let event;

    try {
        // 1. Lê a mensagem bruta do Stripe
        const buf = await buffer(req);
        const sig = req.headers['stripe-signature'];
        const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET; // Vamos pegar isso no Passo 3

        // 2. Verifica se a mensagem veio mesmo do Stripe (Assinatura Digital)
        event = stripe.webhooks.constructEvent(buf.toString(), sig, webhookSecret);
        
    } catch (err) {
        console.error(`❌ Erro de Assinatura Webhook: ${err.message}`);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // 3. GERENCIA OS EVENTOS
    console.log(`🔔 Evento Recebido: ${event.type}`);

    try {
        // --- CENÁRIO A: PAGAMENTO DE FATURA APROVADO (Renovação ou 1ª Compra) ---
        if (event.type === 'invoice.payment_succeeded') {
            const invoice = event.data.object;
            const customerId = invoice.customer; // ID do Cliente no Stripe (cus_...)
            const subscriptionId = invoice.subscription;

            console.log(`💰 Pagamento aprovado para Cliente Stripe: ${customerId}`);

            // Busca os dados da assinatura para saber qual é o plano atual
            const subscription = await stripe.subscriptions.retrieve(subscriptionId);
            const productId = subscription.items.data[0].price.product;
            
            // ATUALIZA NO SUPABASE
            // Procura o usuário que tem esse 'stripe_customer_id'
            const { error } = await supabase
                .from('tenants')
                .update({ 
                    plan_status: 'active',
                    last_payment: new Date().toISOString()
                })
                .eq('stripe_customer_id', customerId);

            if (error) throw error;
            console.log("✅ Banco de dados atualizado com sucesso!");
        }

        // --- CENÁRIO B: PAGAMENTO FALHOU (Cartão recusado na renovação) ---
        else if (event.type === 'invoice.payment_failed') {
            const invoice = event.data.object;
            const customerId = invoice.customer;

            console.log(`❌ Falha no pagamento para: ${customerId}`);

            // Marca como pendente/bloqueado
            await supabase
                .from('tenants')
                .update({ plan_status: 'past_due' }) // 'past_due' = atrasado
                .eq('stripe_customer_id', customerId);
        }

        // --- CENÁRIO C: ASSINATURA CANCELADA ---
        else if (event.type === 'customer.subscription.deleted') {
            const subscription = event.data.object;
            const customerId = subscription.customer;

            console.log(`🚫 Assinatura cancelada: ${customerId}`);

            await supabase
                .from('tenants')
                .update({ plan_status: 'canceled', plan_type: 'free' })
                .eq('stripe_customer_id', customerId);
        }

        res.json({ received: true });

    } catch (err) {
        console.error("❌ Erro ao processar evento:", err);
        res.status(500).json({ error: 'Server Error' });
    }
}