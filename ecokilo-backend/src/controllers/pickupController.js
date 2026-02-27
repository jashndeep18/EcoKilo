import { getAuthenticatedClient, supabase } from '../config/supabase.js';

/**
 * Creates a new pickup request (Household only)
 */
export const createPickup = async (req, res) => {
    try {
        const { address_id, scheduled_date, time_slot, estimated_weight } = req.body;
        const household_id = req.user.id; // From auth.middleware

        const client = getAuthenticatedClient(req.token);

        const { data, error } = await client
            .from('pickup_requests')
            .insert([{
                household_id,
                address_id, // can be optional or required depending on frontend implementation
                scheduled_date,
                time_slot,
                estimated_weight,
                status: 'PENDING'
            }])
            .select();

        if (error) throw error;

        res.status(201).json({
            success: true,
            message: 'Pickup scheduled successfully',
            data: data[0]
        });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};

/**
 * Gets all pickups (Contextual to user role)
 */
export const getPickups = async (req, res) => {
    try {
        const user_id = req.user.id;
        const role = req.profile.role;
        const client = getAuthenticatedClient(req.token);

        let query = client.from('pickup_requests').select('*').order('created_at', { ascending: false });

        if (role === 'HOUSEHOLD') {
            query = query.eq('household_id', user_id);
        } else if (role === 'RECYCLER') {
            // Recyclers either see pending things in their zone, or things assigned to them.
            // For now, let returning PENDING ones for nearby search:
            const filter = req.query.filter || 'my_assignments';
            if (filter === 'pending') {
                query = query.eq('status', 'PENDING');
            } else {
                // To get actual assignments, would need a join, but for simplicity:
                // If it's "my_assignments", we'll check recycler_assignments table
                const { data: assignments } = await client.from('recycler_assignments').select('request_id').eq('recycler_id', user_id);
                const requestIds = assignments ? assignments.map(a => a.request_id) : [];
                query = query.in('id', requestIds.length ? requestIds : ['00000000-0000-0000-0000-000000000000']);
            }
        }

        const { data, error } = await query;
        if (error) throw error;

        res.status(200).json({ success: true, data });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};

/**
 * Recycler claims/accepts a pending pickup
 */
export const acceptPickup = async (req, res) => {
    try {
        const { id } = req.params; // pickup request ID
        const recycler_id = req.user.id;
        const client = getAuthenticatedClient(req.token);

        // 1. Verify pickup is PENDING
        const { data: request, error: fetchErr } = await client
            .from('pickup_requests')
            .select('status')
            .eq('id', id)
            .single();

        if (fetchErr || !request) throw new Error('Pickup request not found 404');
        if (request.status !== 'PENDING') throw new Error('Pickup is already accepted or completed');

        // 2. Insert Assignment
        const { error: assignErr } = await client
            .from('recycler_assignments')
            .insert([{
                request_id: id,
                recycler_id: recycler_id,
                status: 'ASSIGNED'
            }]);

        if (assignErr) throw assignErr;

        // 3. Update Request Status
        const { data, error: updateErr } = await client
            .from('pickup_requests')
            .update({ status: 'ACCEPTED' })
            .eq('id', id)
            .select();

        if (updateErr) throw updateErr;

        res.status(200).json({ success: true, message: 'Pickup safely assigned to you', data: data[0] });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};

/**
 * Recycler verifies the pickup, inputs actual weight, and triggers wallet payout
 */
export const verifyPickup = async (req, res) => {
    try {
        const { id } = req.params; // pickup request ID
        const { actual_weight, photo_url } = req.body;
        const recycler_id = req.user.id;
        const client = getAuthenticatedClient(req.token);

        // 1. Validate Assignment & Status
        const { data: request, error: fetchErr } = await client
            .from('pickup_requests')
            .select('*, household_id')
            .eq('id', id)
            .single();

        if (fetchErr || !request) throw new Error('Pickup request not found 404');
        if (request.status !== 'ACCEPTED' && request.status !== 'ON_THE_WAY') {
            throw new Error(`Cannot verify a pickup in ${request.status} state. Must be ACCEPTED.`);
        }

        // Check if assigned to this recycler
        const { data: assignment, error: assignErr } = await client
            .from('recycler_assignments')
            .select('*')
            .eq('request_id', id)
            .eq('recycler_id', recycler_id)
            .single();

        if (assignErr || !assignment) throw new Error('Not authorized: Pickup is not assigned to you.');

        // 2. Financial Calculations
        // Hardcoding an average plastic price of 15 INR per kg for now, or fetch from waste_types
        const PRICE_PER_KG = 15.00;
        const totalValue = parseFloat(actual_weight) * PRICE_PER_KG;

        // 10% Platform Commission
        const platformCommission = totalValue * 0.10;
        const payoutToHousehold = totalValue - platformCommission;

        // 3. PostgreSQL Updates

        // A) Update Pickup Request Status & Totals
        const { error: reqUpdateErr } = await client
            .from('pickup_requests')
            .update({
                status: 'COMPLETED',
                actual_weight: actual_weight,
                total_amount: payoutToHousehold,
                total_points: Math.floor(totalValue) * 2 // 2 points per rupees
            })
            .eq('id', id);

        if (reqUpdateErr) throw reqUpdateErr;

        // B) Update Assignment
        await client
            .from('recycler_assignments')
            .update({ status: 'COMPLETED', completed_at: new Date() })
            .eq('id', assignment.id);

        // C) In a production app with raw SQL, these would be in one transaction block.
        // With Supabase REST over clients, we execute sequentially, or use a Postgres Function (RPC).
        // Let's insert the transaction log
        const { error: txnErr } = await client
            .from('transactions')
            .insert([{
                user_id: request.household_id,
                amount: payoutToHousehold,
                type: 'CREDIT_WASTE',
                reference_id: id,
                status: 'COMPLETED'
            }]);

        if (txnErr) console.error("Could not insert transaction log", txnErr);

        // D) Wallet Increment (Normally done via DB Trigger or RPC to prevent race conditions)
        // Since we are backend-side (but using user's token), if RLS prevents editing other users' balances, 
        // we might hit a block. Let's use the default client (Service Role equivalent if set up that way in .env, else try)
        // For demonstration, we attempt with authenticated client.
        const { data: profile } = await supabase.from('users').select('wallet_balance, points_balance').eq('id', request.household_id).single();
        if (profile) {
            await supabase.from('users').update({
                wallet_balance: parseFloat(profile.wallet_balance || 0) + payoutToHousehold,
                points_balance: parseInt(profile.points_balance || 0) + Math.floor(totalValue) * 2
            }).eq('id', request.household_id);
        }

        // E) Impact Metrics Update
        const { data: metrics } = await supabase.from('impact_metrics').select('total_plastic_kg').eq('user_id', request.household_id).single();
        if (metrics) {
            await supabase.from('impact_metrics').update({
                total_plastic_kg: parseFloat(metrics.total_plastic_kg || 0) + parseFloat(actual_weight)
            }).eq('user_id', request.household_id);
        } else {
            // Create if doesn't exist
            await supabase.from('impact_metrics').insert([{
                user_id: request.household_id,
                total_plastic_kg: parseFloat(actual_weight),
                co2_saved_kg: parseFloat(actual_weight) * 1.5,
                trees_equivalent: parseFloat(actual_weight) * 0.05
            }]);
        }

        res.status(200).json({
            success: true,
            message: 'Pickup verified. Escrow funds released to household successfully.',
            data: {
                totalValue,
                payoutToHousehold,
                platformCommission
            }
        });
    } catch (error) {
        console.error("Verification Error:", error);
        res.status(400).json({ success: false, error: error.message });
    }
};
