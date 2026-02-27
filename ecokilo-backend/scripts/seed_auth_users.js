import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const DEMO_USERS = [
    {
        email: 'rakesh@household.com',
        password: 'password123',
        fullName: 'Rakesh Sharma',
        role: 'HOUSEHOLD'
    },
    {
        email: 'suraj@recycler.com',
        password: 'password123',
        fullName: 'Suraj Kumar',
        role: 'RECYCLER'
    },
    {
        email: 'admin@ecokilo.com',
        password: 'adminpassword123',
        fullName: 'System Admin',
        role: 'ADMIN'
    }
];

async function setupDemoUsers() {
    console.log('Starting Demo User Setup using standard signUp...\n');

    for (const user of DEMO_USERS) {
        console.log(`Processing ${user.email}...`);

        // 1. Sign up the user (this will hit the trigger and insert a row in public.users)
        const { data, error } = await supabase.auth.signUp({
            email: user.email,
            password: user.password,
            options: {
                data: {
                    full_name: user.fullName
                }
            }
        });

        if (error) {
            console.error(`  ❌ SignUp failed for ${user.email}:`, error.message);
            // If already exists, we could try to login to get the ID, but let's just log and continue
            if (error.status === 400 && error.message.includes('already registered')) {
                console.log(`  ℹ️ User likely already exists.`);
            }
            continue;
        }

        if (data && data.user) {
            console.log(`  ✅ Signed up successfully. User ID: ${data.user.id}`);

            // Wait 2 seconds for the database trigger `on_auth_user_created` to finish inserting the row in public.users
            await new Promise(res => setTimeout(res, 2000));

            // Note: Since we only have the anon key, updating the `role` directly in public.users might fail 
            // if RLS is enabled and prevents users from changing their own role.
            // Let's attempt it anyway. If it fails, they will just default to 'HOUSEHOLD'.
            const { error: updateErr } = await supabase
                .from('users')
                .update({ role: user.role })
                .eq('id', data.user.id);

            if (updateErr) {
                console.log(`  ⚠️ Could not update role to ${user.role} (Likely RLS blocked it): ${updateErr.message}`);
                console.log(`  ℹ️ You may need to manually run an SQL update in Supabase to set ${user.email} as ${user.role}.`);
            } else {
                console.log(`  ✅ Successfully updated DB role to ${user.role}`);
            }
        }
    }

    console.log('\n🎉 Setup complete!');
}

setupDemoUsers();
