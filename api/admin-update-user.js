import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
    // 1. Configuração Padrão
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    const { id, company_name, phone, plan_status, custom_limit } = req.body;

    if (!id) return res.status(400).json({ error: 'ID obrigatório.' });

    try {
        console.log(`📝 Salvando User UUID: ${id}`);

        // O SEGREDO: Atualizamos APENAS a tabela users.
        // O Trigger que criamos no SQL vai automaticamente:
        // 1. Achar a loja que tem o mesmo email desse usuário.
        // 2. Copiar o nome, telefone, status e limite para lá.
        
        const { error } = await supabaseAdmin
            .from('users')
            .update({
                company_name,
                phone,
                plan_status,
                custom_limit: custom_limit ? parseInt(custom_limit) : 0,
                updated_at: new Date()
            })
            .eq('id', id);

        if (error) throw error;

        return res.status(200).json({ message: 'Salvo! Sincronização automática ativa.' });

    } catch (error) {
        console.error("🔥 Erro:", error.message);
        return res.status(500).json({ error: error.message });
    }
}