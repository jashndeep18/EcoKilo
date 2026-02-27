import { supabaseAdmin } from '../config/supabase.js';

export const getUserProfile = async (req, res) => {
    try {
        const { id } = req.user; // Appended by authMiddleware

        const { data: user, error } = await supabaseAdmin
            .from('users')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;

        res.status(200).json({ success: true, data: user });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const updateUserProfile = async (req, res) => {
    try {
        const { id } = req.user;
        const { full_name, phone_number, avatar_url } = req.body;

        // Construct update payload dynamically
        const updates = {};
        if (full_name) updates.full_name = full_name;
        if (phone_number) updates.phone_number = phone_number;
        if (avatar_url !== undefined) updates.avatar_url = avatar_url;

        const { data: updatedUser, error } = await supabaseAdmin
            .from('users')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        res.status(200).json({ success: true, message: 'Profile updated successfully', data: updatedUser });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

export const getUserHistory = async (req, res) => {
    try {
        const { id } = req.user;

        // Fetch transactions alongside the related pickup request info
        const { data: history, error } = await supabaseAdmin
            .from('transactions')
            .select(`
                id,
                amount,
                type,
                status,
                created_at,
                reference_id,
                pickup_requests (
                    id,
                    scheduled_date,
                    actual_weight,
                    total_points
                )
            `)
            .eq('user_id', id)
            .order('created_at', { ascending: false });

        if (error) throw error;

        res.status(200).json({ success: true, data: history });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
