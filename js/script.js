// ============================================================
// 1. CONFIGURAÇÕES E SUPABASE
// ============================================================
// Configure suas chaves aqui se não estiverem no config.js
const sb = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null;
if(tab === 'assinatura') app.loadSubscription();