import { supabase } from '../config/supabase.js';

export const requireAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Missing or malformed Authorization header' });
        }

        const token = authHeader.split(' ')[1];

        // Verify token with Supabase
        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error || !user) {
            return res.status(401).json({ error: 'Invalid or expired token' });
        }

        // Fetch user profile to get the role
        const { data: profile, error: profileError } = await supabase
            .from('users')
            .select('role, full_name, wallet_balance')
            .eq('id', user.id)
            .single();

        if (profileError || !profile) {
            return res.status(401).json({ error: 'User profile not found in database' });
        }

        // Attach user and profile to request object
        req.user = user;
        req.profile = profile;
        req.token = token; // Store token to instantiate authenticated DB clients later

        next();
    } catch (err) {
        console.error('Auth Middleware Error:', err);
        res.status(500).json({ error: 'Internal Server Error during authentication' });
    }
};
