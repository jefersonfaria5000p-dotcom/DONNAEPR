import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
    // Conecta no Supabase
    // --- ÁREA DE PERIGO: COLANDO AS CHAVES DIRETO ---
// Cole a URL do seu Supabase aqui (dentro das aspas)
const SUPABASE_URL = 'https://adluzpbcaaupjexfsrll.supabase.co';

// Cole a chave SERVICE_ROLE aqui (aquela longa que começa com eyJ...)
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFkbHV6cGJjYWF1cGpleGZzcmxsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTU0ODg0NywiZXhwIjoyMDg1MTI0ODQ3fQ.yuAA2FhmTwhBJQPLzvAlrTCvBfENYqtKr0nwcGTQU5Q';
// ------------------------------------------------

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    try {
        // --- GET: BUSCAR PLANOS ---
        if (req.method === 'GET') {
            const { data, error } = await supabase.from('plans').select('*').order('price', { ascending: true });
            if (error) throw error;
            return res.status(200).json(data);
        }

        // --- POST: CRIAR NOVO ---
        if (req.method === 'POST') {
            const { id, name, price, period, stripe_price_id, features, is_recommended, monthly_limit } = req.body;
            
            // Se o limite vier vazio, salva 50. Se vier 0, salva 0.
            const limit = (monthly_limit === undefined || monthly_limit === '') ? 50 : parseInt(monthly_limit);

            const { error } = await supabase.from('plans').insert([{ 
                id,
                name, 
                price, 
                period, 
                stripe_price_id, 
                features, 
                is_recommended,
                monthly_limit: limit // <--- IMPORTANTE: Salvando o limite
            }]);

            if (error) throw error;
            return res.status(200).json({ success: true });
        }

        // --- PUT: EDITAR (AQUI QUE ESTAVA O ERRO) ---
        if (req.method === 'PUT') {
            const { id, name, price, period, stripe_price_id, features, is_recommended, monthly_limit } = req.body;
            
            // Garante que o limite seja um número
            const limit = (monthly_limit === undefined || monthly_limit === '') ? 50 : parseInt(monthly_limit);

            const { error } = await supabase
                .from('plans')
                .update({ 
                    id,
    name, 
    price, 
    period, 
    stripe_price_id, 
    features, 
    is_recommended,
    monthly_limit: parseInt(monthly_limit) // <--- TEM QUE TER ISSO
})
                .eq('id', id);

            if (error) throw error;
            return res.status(200).json({ success: true });
        }

        // --- DELETE: APAGAR ---
        if (req.method === 'DELETE') {
            const { id } = req.body;
            const { error } = await supabase.from('plans').delete().eq('id', id);
            if (error) throw error;
            return res.status(200).json({ success: true });
        }

    } catch (error) {
        console.error("Erro API Plans:", error);
        return res.status(500).json({ error: error.message });
    }
}