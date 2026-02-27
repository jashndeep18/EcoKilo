import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
// We must use SERVICE_ROLE_KEY to bypass RLS for inserting arbitrary records
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function seedEscrow() {
    console.log("🌱 Sowing Demo Escrow Data...");

    try {
        // 1. Get any 2 users to act as Household and Recycler mock data
        const { data: users } = await supabase.from('users').select('id, email').limit(2);

        if (!users || users.length < 2) {
            console.error("❌ Need at least 2 Auth Users in the DB first. Please sign up users first.");
            return;
        }

        const recyclerId = users[0].id;
        const householdId = users[1].id;
        console.log(`✅ Using mock Recycler: ${users[0].email} | Mock Household: ${users[1].email}`);

        // 2. Create 3 fake pickup requests (since pickup_id must be unique)
        const fakePickups = [
            {
                household_id: householdId,
                address_id: null,
                waste_type: 'plastic',
                estimated_weight: 15.5,
                scheduled_date: new Date().toISOString().split('T')[0],
                time_slot: 'Morning (9 AM - 12 PM)',
                status: 'pending' // Just mock state
            },
            {
                household_id: householdId,
                address_id: null,
                waste_type: 'ewaste',
                estimated_weight: 2.0,
                scheduled_date: new Date().toISOString().split('T')[0],
                time_slot: 'Afternoon (12 PM - 3 PM)',
                status: 'pending'
            },
            {
                household_id: householdId,
                address_id: null,
                waste_type: 'paper',
                estimated_weight: 10.0,
                scheduled_date: new Date().toISOString().split('T')[0],
                time_slot: 'Evening (3 PM - 6 PM)',
                status: 'pending'
            }
        ];

        const { data: createdPickups, error: pickupErr } = await supabase
            .from('pickup_requests')
            .insert(fakePickups)
            .select();

        if (pickupErr) {
            console.error("❌ Error creating fake pickups:", pickupErr);
            return;
        }

        console.log(`✅ Created ${createdPickups.length} mock pickup requests.`);

        // 3. Create Escrow Accounts linked to these Pickups
        const fakeEscrows = [
            {
                pickup_id: createdPickups[0].id,
                recycler_id: recyclerId,
                user_id: householdId,
                estimated_amount: 465.00, // 15.5 kg * 30
                security_deposit: 150.00,
                status: 'HOLDING'
            },
            {
                pickup_id: createdPickups[1].id,
                recycler_id: recyclerId,
                user_id: householdId,
                estimated_amount: 300.00, // 2kg * 150
                security_deposit: 100.00,
                status: 'RELEASED'
            },
            {
                pickup_id: createdPickups[2].id,
                recycler_id: recyclerId,
                user_id: householdId,
                estimated_amount: 120.00, // 10kg * 12
                security_deposit: 50.00,
                status: 'DISPUTED'
            }
        ];

        const { data: createdEscrows, error: escrowErr } = await supabase
            .from('escrow_accounts')
            .insert(fakeEscrows)
            .select();

        if (escrowErr) {
            console.error("❌ Error creating escrow records:", escrowErr);
            return;
        }

        console.log(`✅ Successfully seeded ${createdEscrows.length} Escrow records into the vault!`);
        process.exit(0);

    } catch (err) {
        console.error("❌ Unexpected error:", err);
        process.exit(1);
    }
}

seedEscrow();
