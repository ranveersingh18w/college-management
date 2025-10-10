// Supabase Configuration
const SUPABASE_CONFIG = {
    url: 'https://dtbplgaoomihltluhzwo.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR0YnBsZ2Fvb21paGx0bHVoendvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4OTAyNTQsImV4cCI6MjA2OTQ2NjI1NH0.X6FuL1krYX5y5ve1LbEZwwy_MQ7rRxOoWVFTOmZWfmg'
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
