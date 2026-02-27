document.addEventListener('DOMContentLoaded', async () => {
    async function loadDashboard() {
        try {
            const { data, success } = await window.apiGetAdminDashboard();
            if (success && data) {
                document.getElementById('adminTotalUsers').textContent = data.totalUsers.toLocaleString();
                document.getElementById('adminPickupsToday').textContent = data.pickupsToday.toLocaleString();
                document.getElementById('adminVolume').textContent = data.volumeProcessed.toLocaleString();
            }
        } catch (error) {
            console.error("Failed to load admin dashboard data", error);
            // Optionally show error states on the UI
        }
    }

    async function loadNavProfile() {
        try {
            const res = await window.apiGetUserProfile();
            const user = res.data;

            // Welcome Header
            const welcomeHeading = document.getElementById('welcomeHeading');
            if (welcomeHeading && user.full_name) {
                // E.g., Welcome back, Admin Name
                welcomeHeading.innerHTML = `Welcome, ${user.full_name.split(' ')[0]}`;
            }

            // Profile Avatar
            const profileImg = document.getElementById('navProfileImage');
            if (profileImg) {
                if (user.avatar_url) {
                    profileImg.src = user.avatar_url;
                } else {
                    profileImg.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.full_name || 'Admin')}&background=000080&color=fff`;
                }
            }
        } catch (e) {
            console.error("Failed to load nav profile", e);
        }
    }

    loadDashboard();
    loadNavProfile();
});
