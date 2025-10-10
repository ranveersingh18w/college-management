// Supabase Configuration
const SUPABASE_CONFIG = {
    url: 'https://etopeiumpipfsilyooar.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV0b3BlaXVtcGlwZnNpbHlvb2FyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5MjA0NTMsImV4cCI6MjA3NTQ5NjQ1M30.QAXky78Hr8OkhYb5zZvKURfvkOr8enD7FXlTHWVPeOo'
};

// Initialize Supabase Client
let supabaseClient = null;

function initSupabase() {
    if (typeof supabase !== 'undefined') {
        supabaseClient = supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
        console.log('✅ Supabase initialized successfully');
        return supabaseClient;
    } else {
        console.error('❌ Supabase library not loaded. Please include the Supabase CDN script.');
        return null;
    }
}

// Export for use in other files
window.SUPABASE_CONFIG = SUPABASE_CONFIG;
window.initSupabase = initSupabase;
