import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
    // 1. Configuração padrão (CORS)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    // 2. Verifica as chaves do servidor
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
        return res.status(500).json({ error: "Erro de configuração (.env incompleto)." });
    }

    const { targetId, adminPassword } = req.body;

    // DEFINA SEU EMAIL DE ADMIN AQUI FIXO (Para garantir que é a SUA senha que estamos testando)
    const MY_ADMIN_EMAIL = 'admin@donna.com'; 

    try {
        // 3. Inicializa Supabase
        const supabaseAdmin = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY,
            { auth: { autoRefreshToken: false, persistSession: false } }
        );

        console.log(`🔐 Verificando senha do Admin: ${MY_ADMIN_EMAIL}...`);

        // 4. TENTA LOGAR NA **SUA** CONTA DE ADMIN COM A SENHA DIGITADA
        const { data, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
            email: MY_ADMIN_EMAIL,
            password: adminPassword
        });

        if (signInError) {
            console.error("❌ Senha do Admin incorreta.");
            return res.status(403).json({ error: 'A senha do Administrador está incorreta.' });
        }

        console.log("✅ Senha correta! Apagando usuário alvo:", targetId);

        // 5. SE A SENHA DO ADMIN ESTIVER CERTA, APAGA O OUTRO USUÁRIO
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(targetId);
        
        if (deleteError) throw deleteError;

        return res.status(200).json({ message: 'Usuário deletado com sucesso!' });

    } catch (error) {
        console.error("🔥 Erro:", error.message);
        return res.status(500).json({ error: error.message });
    }
}