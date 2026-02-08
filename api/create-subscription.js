import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({ error: { message: 'Method Not Allowed' } });
    }

    try {
        // Adicionamos 'stripePriceId' na lista para ler o ID oficial do banco
const { email, name, priceInCents, metadata, existingStripeId, stripePriceId } = req.body;
        console.log(`🚀 Processando assinatura para: ${email}`);
        
        // 1. Define o Cliente (Customer)
        let customerId = existingStripeId;
        let customer;
        if (customerId && !customerId.startsWith('cus_')) {
        console.warn(`⚠️ ID de cliente inválido encontrado (${customerId}). Criando um novo...`);
        customerId = null; 
    }

        if (!customerId) {
        const customer = await stripe.customers.create({
            email: email,
            name: name,
            metadata: metadata
        });
        customerId = customer.id;
            
            // Se o cliente foi deletado no Stripe, cria um novo
            if (customer.deleted) {
                customerId = null;
            }
        }

        if (!customerId) {
            // Cria novo cliente se não existir
            console.log("✨ Criando novo cliente no Stripe...");
            const newCustomer = await stripe.customers.create({
                email,
                name,
                metadata: metadata
            });
            customerId = newCustomer.id;
        }

        // 2. Cria o Preço do Novo Plano
        const newPrice = await stripe.prices.create({
            currency: 'brl',
            unit_amount: priceInCents,
            recurring: { interval: 'month' },
            product_data: { name: metadata.plan_name || 'Assinatura Donna ERP' },
        });

        // 3. Verifica se já existe Assinatura Ativa
        const subscriptions = await stripe.subscriptions.list({
            customer: customerId,
            status: 'active',
            limit: 1
        });

        let subscription;
        let clientSecret;

        if (subscriptions.data.length > 0) {
            // --- CENÁRIO: ATUALIZAÇÃO (MUDANÇA DE PLANO) ---
            console.log("🔄 Atualizando assinatura existente...");
            const currentSub = subscriptions.data[0];
            const currentItemId = currentSub.items.data[0].id;

            // Atualiza a assinatura trocando o item (preço antigo pelo novo)
            subscription = await stripe.subscriptions.update(currentSub.id, {
                items: [{
                    id: currentItemId,
                    price: newPrice.id,
                }],
                metadata: metadata,
                proration_behavior: 'create_prorations', // Cobra a diferença ou dá crédito
            });

            // Em atualizações, geralmente não precisa de novo pagamento imediato se o cartão já estiver salvo,
            // mas retornamos o status para o front saber.
            // Se precisar autenticar (3DSecure), o Stripe avisa.
             
             // Nota: Update não gera clientSecret novo da mesma forma, 
             // mas vamos mandar o da última fatura caso precise validar
             const latestInvoice = await stripe.invoices.retrieve(subscription.latest_invoice);
             clientSecret = latestInvoice.payment_intent ? latestInvoice.payment_intent.client_secret : null;

        } else {
            // --- CENÁRIO: NOVA ASSINATURA ---
            console.log("✨ Criando nova assinatura...");
            subscription = await stripe.subscriptions.create({
                customer: customerId,
                items: [{ price: newPrice.id }],
                payment_behavior: 'default_incomplete',
                payment_settings: { save_default_payment_method: 'on_subscription' },
                expand: ['latest_invoice.payment_intent'],
                metadata: metadata
            });
            clientSecret = subscription.latest_invoice.payment_intent.client_secret;
        }

        res.status(200).json({ 
            subscriptionId: subscription.id, 
            clientSecret: clientSecret,
            customerId: customerId,
            status: subscription.status // 'active' (se atualizou) ou 'incomplete' (se é nova)
        });

    } catch (error) {
        console.error("Erro no Backend:", error);
        res.status(400).json({ error: { message: error.message } });
    }
}