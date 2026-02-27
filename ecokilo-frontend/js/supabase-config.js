// Replace these with your real Supabase Project details when ready!
const SUPABASE_URL = 'https://byicotcmgbrblatgsxjx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ5aWNvdGNtZ2JyYmxhdGdzeGp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxMzUyOTgsImV4cCI6MjA4NzcxMTI5OH0.R0h0C-Mq9lHp39r8fuRKPWd3qzF6CvLSzaJQ_i9K_r0';

// Initialize Supabase Client (assuming global supabase loaded via CDN in HTML)
let supabaseClient = null;

if (typeof supabase !== 'undefined') {
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} else {
    console.warn("Supabase CDN not loaded.");
}

// Export for usage across frontend scripts if needed (or access globally)
window.db = supabaseClient;
