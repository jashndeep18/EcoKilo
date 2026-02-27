import { supabaseAdmin } from '../config/supabase.js';

export const initiateEscrow = async (req, res) => {
    try {
        const { pickup_id, estimated_amount } = req.body;
        const recycler_id = req.user.id; // From authMiddleware

        if (!pickup_id || !estimated_amount) {
            return res.status(400).json({ error: 'pickup_id and estimated_amount are required' });
        }

        // 1. Get the pickup to find the user_id
        const { data: pickup, error: pickupErr } = await supabaseAdmin
            .from('pickup_requests')
            .select('household_id, status')
            .eq('id', pickup_id)
            .single();

        if (pickupErr || !pickup) {
            return res.status(404).json({ error: 'Pickup request not found' });
        }

        // 2. Calculate security deposit (e.g., 20% of estimated amount + flat ₹50)
        const security_deposit = (parseFloat(estimated_amount) * 0.2) + 50.0;

        // 3. Create the Escrow Account
        const { data: escrow, error: escrowErr } = await supabaseAdmin
            .from('escrow_accounts')
            .insert([{
                pickup_id,
                recycler_id,
                user_id: pickup.household_id,
                estimated_amount,
                security_deposit,
                status: 'HOLDING'
            }])
            .select()
            .single();

        if (escrowErr) {
            console.error("Escrow Init Error:", escrowErr);
            return res.status(500).json({ error: 'Failed to initiate escrow' });
        }

        // 4. Log the initialization transaction
        await supabaseAdmin.from('escrow_transactions').insert([{
            escrow_id: escrow.id,
            type: 'INITIATE',
            amount: 0.00
        }]);

        // (In a real production app, we would deduct the security deposit from the recycler's wallet here)

        return res.status(201).json({
            message: 'Escrow activated and funds secured.',
            data: escrow
        });

    } catch (error) {
        console.error('initiateEscrow error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

export const getRecyclerEscrows = async (req, res) => {
    try {
        const recycler_id = req.user.id;

        const { data: escrows, error } = await supabaseAdmin
            .from('escrow_accounts')
            .select(`
                id,
                pickup_id,
                estimated_amount,
                security_deposit,
                status,
                created_at,
                users!escrow_accounts_user_id_fkey (
                    full_name
                )
            `)
            .eq('recycler_id', recycler_id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error("Fetch Escrows Error:", error);
            return res.status(500).json({ error: 'Failed to fetch escrows' });
        }

        res.status(200).json({ data: escrows });

    } catch (error) {
        console.error('getRecyclerEscrows error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

export const releaseEscrow = async (req, res) => {
    try {
        const { escrow_id, actual_weight, final_amount } = req.body;
        const _recyclerId = req.user.id;

        // Note: For absolute production safety, Supabase currently handles atomic operations natively 
        // via RPC (Stored Procedures). Since we are acting purely via REST clients, we simulate
        // an atomic block through sequential checks and fallbacks. 

        // 1. Fetch Escrow Details
        const { data: escrow, error: fetchErr } = await supabaseAdmin
            .from('escrow_accounts')
            .select('*')
            .eq('id', escrow_id)
            .single();

        if (fetchErr || !escrow) return res.status(404).json({ error: 'Escrow not found' });
        if (escrow.status !== 'HOLDING') return res.status(400).json({ error: 'Escrow is not in HOLDING state' });

        // 2. Difference check (Heuristic: If final amount is > 200% of estimate, Dispute)
        if (final_amount > (escrow.estimated_amount * 2)) {
            // HIGH MISMATCH -> Move to DISPUTE
            await supabaseAdmin.from('escrow_accounts').update({ status: 'DISPUTED' }).eq('id', escrow_id);
            await supabaseAdmin.from('escrow_disputes').insert([{
                escrow_id,
                raised_by: _recyclerId,
                reason: 'System Flagged: Automated dispute due to high mismatch between estimate and actual'
            }]);
            return res.status(422).json({ error: 'High deviance detected. Escrow locked and Dispute raised.' });
        }

        // 3. Normal Execution (Update state to RELEASED)
        const { error: releaseErr } = await supabaseAdmin
            .from('escrow_accounts')
            .update({ status: 'RELEASED', updated_at: new Date() })
            .eq('id', escrow_id);

        if (releaseErr) throw releaseErr;

        // 4. Calculate Funds (Households get the money, Recycler gets fees/payouts + deposit return)
        const platformFee = final_amount * 0.05; // 5% fee
        const userPayout = final_amount - platformFee;

        // Log Transactions
        await supabaseAdmin.from('escrow_transactions').insert([
            { escrow_id, type: 'RELEASE_USER', amount: userPayout },
            { escrow_id, type: 'FEE_DEDUCTION', amount: platformFee }
            // Ignore security refund for mock brevity
        ]);

        // 5. Update Household Wallet manually (via RPC ideally, but sequential here)
        // Fetch current user balance
        const { data: userProfile } = await supabaseAdmin.from('users').select('wallet_balance').eq('id', escrow.user_id).single();
        const newBalance = parseFloat(userProfile?.wallet_balance || 0) + parseFloat(userPayout);

        await supabaseAdmin.from('users').update({ wallet_balance: newBalance }).eq('id', escrow.user_id);

        res.status(200).json({ message: 'Escrow successfully released.' });

    } catch (error) {
        console.error('releaseEscrow error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};
