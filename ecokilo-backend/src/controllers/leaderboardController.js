import { supabaseAdmin } from '../config/supabase.js';

export const getLeaderboard = async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;

        const { data: users, error } = await supabaseAdmin
            .from('users')
            .select('id, full_name, avatar_url, points_balance, role')
            .eq('role', 'HOUSEHOLD')
            .order('points_balance', { ascending: false })
            .limit(limit);

        if (error) throw error;

        res.status(200).json({ success: true, data: users });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
