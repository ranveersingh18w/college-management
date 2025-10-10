// Supabase Configuration
const SUPABASE_URL = 'https://dtbplgaoomihltluhzwo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR0YnBsZ2Fvb21paGx0bHVoendvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4OTAyNTQsImV4cCI6MjA2OTQ2NjI1NH0.X6FuL1krYX5y5ve1LbEZwwy_MQ7rRxOoWVFTOmZWfmg';

// Initialize the Supabase client
const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Export the client for use in other scripts
export { supabaseClient };
