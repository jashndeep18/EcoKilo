import { supabase } from '../config/supabase.js';

/**
 * Gets all active waste types and their prices
 */
export const getWasteTypes = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('waste_types')
            .select('*')
            .eq('active', true)
            .order('name');

        if (error) throw error;

        res.status(200).json({
            success: true,
            data
        });
    } catch (error) {
        console.error('Error fetching waste types:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch waste types.' });
    }
};
