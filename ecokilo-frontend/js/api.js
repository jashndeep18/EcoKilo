const API_BASE_URL = 'http://localhost:5000/api/v1';

/**
 * Gets the current Supabase JWT token for authentication headers
 */
async function getAuthToken() {
    if (!window.db) return null;
    const { data: { session } } = await window.db.auth.getSession();
    return session ? session.access_token : null;
}

/**
 * Generic Fetch Wrapper with Auth
 */
async function fetchAPI(endpoint, options = {}) {
    const token = await getAuthToken();
    if (!token) throw new Error('You must be logged in to perform this action.');

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers
    };

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers
    });

    const result = await response.json();
    if (!response.ok) {
        throw new Error(result.error || 'API Request Failed');
    }
    return result;
}

// -----------------------------------------
// HOUSEHOLD APIS
// -----------------------------------------

window.apiSchedulePickup = async (pickupData) => {
    // pickupData: { address_id, scheduled_date, time_slot, estimated_weight }
    return fetchAPI('/pickups/schedule', {
        method: 'POST',
        body: JSON.stringify(pickupData)
    });
};

window.apiGetMyPickups = async () => {
    return fetchAPI('/pickups');
};

window.apiGetAllPickups = async () => {
    return fetchAPI('/pickups/all');
};

// -----------------------------------------
// RECYCLER APIS
// -----------------------------------------

window.apiGetNearbyPickups = async () => {
    // Filter pending for recycler to accept
    return fetchAPI('/pickups?filter=pending');
};

window.apiGetMyAssignments = async () => {
    // Filter assignments for recycler
    return fetchAPI('/pickups?filter=my_assignments');
};

window.apiAcceptPickup = async (pickupId) => {
    return fetchAPI(`/pickups/${pickupId}/accept`, {
        method: 'POST'
    });
};

window.apiVerifyPickup = async (pickupId, verificationData) => {
    // verificationData: { actual_weight, photo_url }
    return fetchAPI(`/pickups/${pickupId}/verify`, {
        method: 'POST',
        body: JSON.stringify(verificationData)
    });
};

// -----------------------------------------
// ESCROW APIS
// -----------------------------------------

window.apiGetEscrows = async () => {
    return fetchAPI('/escrow/recycler', {
        method: 'GET'
    });
};

window.apiInitiateEscrow = async (escrowData) => {
    // { pickup_id, estimated_amount }
    return fetchAPI('/escrow/initiate', {
        method: 'POST',
        body: JSON.stringify(escrowData)
    });
};

window.apiReleaseEscrow = async (releaseData) => {
    // { escrow_id, actual_weight, final_amount }
    return fetchAPI('/escrow/release', {
        method: 'POST',
        body: JSON.stringify(releaseData)
    });
};

// -----------------------------------------
// PUBLIC APIS
// -----------------------------------------
window.apiGetWasteTypes = async () => {
    // Doesn't strictly need auth, but we send it if we have it
    const response = await fetch(`${API_BASE_URL}/waste/types`);
    const result = await response.json();
    if (!result.success) throw new Error(result.error);
    return result;
};

// -----------------------------------------
// USER PROFILE APIS
// -----------------------------------------

window.apiGetUserProfile = async () => {
    return fetchAPI('/user/profile', {
        method: 'GET'
    });
};

window.apiUpdateUserProfile = async (payload) => {
    return fetchAPI('/user/profile', {
        method: 'PUT',
        body: JSON.stringify(payload)
    });
};

window.apiGetUserHistory = async () => {
    return fetchAPI('/user/history', {
        method: 'GET'
    });
};

// -----------------------------------------
// REWARDS APIS
// -----------------------------------------
window.apiGetRewards = async () => {
    return fetchAPI('/rewards', {
        method: 'GET'
    });
};

window.apiRedeemReward = async (rewardId) => {
    return fetchAPI(`/rewards/redeem/${rewardId}`, {
        method: 'POST'
    });
};

// -----------------------------------------
// PUBLIC APIS
// -----------------------------------------
window.apiGetWasteTypes = async () => {
    // Doesn't strictly need auth, but we send it if we have it
    const response = await fetch(`${API_BASE_URL}/waste/types`);
    const result = await response.json();
    if (!result.success) throw new Error(result.error);
    return result;
};

window.apiGetLeaderboard = async (limit = 10) => {
    const response = await fetch(`${API_BASE_URL}/leaderboard?limit=${limit}`);
    const result = await response.json();
    if (!result.success) throw new Error(result.error);
    return result;
};

// -----------------------------------------
// ADMIN APIS
// -----------------------------------------
window.apiGetAdminDashboard = async () => {
    return fetchAPI('/admin/dashboard');
};
