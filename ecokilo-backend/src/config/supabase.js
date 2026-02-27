import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase configuration missing in .env');
}

// Default anon client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Admin client (fallback to anon key if service role key is not set)
export const supabaseAdmin = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey);

// Function to create a client authenticated as the user (respects RLS)
export const getAuthenticatedClient = (jwtToken) => {
    return createClient(supabaseUrl, supabaseAnonKey, {
        global: {
            headers: {
                Authorization: `Bearer ${jwtToken}`,
            },
        },
    });
};
