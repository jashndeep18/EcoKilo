import { supabaseAdmin } from '../config/supabase.js';

export const getRewards = async (req, res) => {
    try {
        const { data: rewards, error } = await supabaseAdmin
            .from('rewards')
            .select('*')
            .eq('active', true)
            .order('points_required', { ascending: true });

        if (error) throw error;
        res.status(200).json({ success: true, data: rewards });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const redeemReward = async (req, res) => {
    try {
        const { id: userId } = req.user;
        const rewardId = req.params.id;

        // 1. Fetch user to check points balance
        const { data: user, error: userErr } = await supabaseAdmin
            .from('users')
            .select('points_balance')
            .eq('id', userId)
            .single();

        if (userErr || !user) throw new Error('User not found.');

        // 2. Fetch Reward
        const { data: reward, error: rewardErr } = await supabaseAdmin
            .from('rewards')
            .select('*')
            .eq('id', rewardId)
            .single();

        if (rewardErr || !reward) throw new Error('Reward not found.');
        if (!reward.active) throw new Error('Reward is currently inactive.');
        if (reward.stock_quantity === 0) throw new Error('Reward is out of stock.');

        // 3. Check Balance
        if (user.points_balance < reward.points_required) {
            throw new Error(`Insufficient points. You need ${reward.points_required} but have ${user.points_balance}.`);
        }

        // 4. Process Redemption (Deduct points & insert record)
        const newBalance = user.points_balance - reward.points_required;

        const { error: updateErr } = await supabaseAdmin
            .from('users')
            .update({ points_balance: newBalance })
            .eq('id', userId);

        if (updateErr) throw updateErr;

        const { error: redeemErr } = await supabaseAdmin
            .from('user_redemptions')
            .insert({
                user_id: userId,
                reward_id: rewardId,
                status: 'PENDING'
            });

        if (redeemErr) throw redeemErr;

        // Optionally decrement stock quantity if it's > 0
        if (reward.stock_quantity > 0) {
            await supabaseAdmin.from('rewards')
                .update({ stock_quantity: reward.stock_quantity - 1 })
                .eq('id', rewardId);
        }

        res.status(200).json({ success: true, message: `Successfully redeemed ${reward.name}!` });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};
