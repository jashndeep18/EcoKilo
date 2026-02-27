import { getAuthenticatedClient } from '../config/supabase.js';

export const getDashboardKPIs = async (req, res) => {
    try {
        const client = getAuthenticatedClient(req.token);

        // 1. Total Users Count
        const { count: usersCount, error: usersErr } = await client
            .from('users')
            .select('*', { count: 'exact', head: true });

        if (usersErr) throw usersErr;

        // 2. Pickups Today Count
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Start of today

        const { count: pickupsToday, error: pickupsErr } = await client
            .from('pickup_requests')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', today.toISOString());

        if (pickupsErr) throw pickupsErr;

        // 3. Volume Processed (Sum of actual_weight for completed pickups)
        // With PostgREST, aggregations require RPC or fetching and summing. Let's fetch and sum.
        const { data: completedPickups, error: volumeErr } = await client
            .from('pickup_requests')
            .select('actual_weight')
            .eq('status', 'COMPLETED')
            .not('actual_weight', 'is', null);

        if (volumeErr) throw volumeErr;

        const volumeProcessed = completedPickups.reduce((sum, p) => sum + parseFloat(p.actual_weight || 0), 0);

        res.status(200).json({
            success: true,
            data: {
                totalUsers: usersCount || 0,
                pickupsToday: pickupsToday || 0,
                volumeProcessed: Math.round(volumeProcessed * 10) / 10 // 1 decimal point
            }
        });

    } catch (error) {
        console.error("Error fetching Admin KPIs:", error);
        res.status(500).json({ success: false, error: 'Failed to fetch Admin dashboard metrics' });
    }
};
