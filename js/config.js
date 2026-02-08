// ============================================================
// CONFIGURAÇÕES E BANCO DE DADOS (SUPABASE)
// ============================================================
const SUPABASE_URL = 'https://adluzpbcaaupjexfsrll.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFkbHV6cGJjYWF1cGpleGZzcmxsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1NDg4NDcsImV4cCI6MjA4NTEyNDg0N30.HKicaWu9hngcNWf6EODcUNCs039KOHiakjt0HTTyIDU'; // <--- PEGUE A SUA CHAVE NO ARQUIVO VELHO
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
const sb = supabaseClient;

