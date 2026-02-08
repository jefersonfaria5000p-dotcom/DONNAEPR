import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({ error: { message: 'Method Not Allowed' } });
    }

    try {
        // 1. Recebe os dados, INCLUINDO O PREÇO e METADATA
        const { email, name, priceInCents, metadata } = req.body;

        // Validação de segurança básica
        if (!priceInCents || priceInCents < 100) {
            throw new Error("Preço inválido ou não informado.");
        }

        console.log(`🚀 Checkout para: ${email} | Valor: ${priceInCents} centavos`);

        // 2. Cria o Cliente
        const customer = await stripe.customers.create({
            email,
            name,
            metadata: metadata 
        });

        // 3. Cria o Preço Dinâmico com o valor recebido
        const price = await stripe.prices.create({
            currency: 'brl',
            unit_amount: priceInCents, // <--- USA O VALOR QUE VEIO DO FRONTEND
            recurring: { interval: 'month' },
            product_data: { 
                name: metadata.plan_name || 'Assinatura Donna ERP' // Usa o nome do plano se tiver
            },
        });

        // 4. Cria a Assinatura
        const subscription = await stripe.subscriptions.create({
            customer: customer.id,
            items: [{ price: price.id }],
            payment_behavior: 'default_incomplete',
            payment_settings: { save_default_payment_method: 'on_subscription' },
            expand: ['latest_invoice.payment_intent'],
            metadata: metadata
        });

        // 5. Retorna
        res.status(200).json({ 
            subscriptionId: subscription.id, 
            clientSecret: subscription.latest_invoice.payment_intent.client_secret,
            customerId: customer.id
        });

    } catch (error) {
        console.error("Erro no Backend:", error);
        res.status(400).json({ error: { message: error.message } });
    }
}