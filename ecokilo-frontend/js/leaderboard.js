document.addEventListener('DOMContentLoaded', async () => {
    const leaderboardContent = document.getElementById('leaderboardContent');
    const navWalletBalance = document.getElementById('navWalletBalance');
    const navProfileImage = document.getElementById('navProfileImage');

    async function loadProfileData() {
        try {
            const res = await window.apiGetUserProfile();
            const user = res.data;

            if (navWalletBalance) {
                navWalletBalance.textContent = `₹ ${user.wallet_balance || '0.00'}`;
            }
            if (navProfileImage) {
                if (user.avatar_url) navProfileImage.src = user.avatar_url;
                else navProfileImage.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.full_name || 'U')}&background=138808&color=fff`;
            }
        } catch (error) {
            console.error("Error loading profile details:", error);
        }
    }

    async function loadLeaderboard() {
        try {
            // Fetch top 10 households by Points Balance
            const res = await window.apiGetLeaderboard(10);
            const users = res.data || [];

            if (users.length === 0) {
                leaderboardContent.innerHTML = `<p style="text-align: center; color: var(--text-muted);">No rankings available yet.</p>`;
                return;
            }

            // Extract Top 3
            const top3 = users.slice(0, 3);
            const rest = users.slice(3);

            let html = '';

            // 1. Build Podium
            if (top3.length > 0) {
                // Reorder for visual rendering: 2nd, 1st, 3rd
                const orderedTop3 = [];
                if (top3[1]) orderedTop3.push({ ...top3[1], rank: 2 });
                if (top3[0]) orderedTop3.push({ ...top3[0], rank: 1 });
                if (top3[2]) orderedTop3.push({ ...top3[2], rank: 3 });

                let podiumHTML = '<div class="podium">';
                orderedTop3.forEach(user => {
                    const avatar = user.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.full_name || 'U')}&background=138808&color=fff`;
                    podiumHTML += `
                        <div class="podium-step rank-${user.rank}">
                            <img src="${avatar}" class="podium-avatar">
                            <div class="podium-base">
                                <span class="podium-name">${user.full_name.split(' ')[0]}</span>
                                <span class="podium-pts">${(user.points_balance || 0).toLocaleString()} <i class="ph-fill ph-star"></i></span>
                                <span class="rank-number">${user.rank}</span>
                            </div>
                        </div>
                    `;
                });
                podiumHTML += '</div>';
                html += podiumHTML;
            }

            // 2. Build List for 4th onwards
            if (rest.length > 0) {
                let listHTML = '<div class="list-card">';
                rest.forEach((user, idx) => {
                    const rank = idx + 4;
                    const avatar = user.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.full_name || 'U')}&background=138808&color=fff`;

                    listHTML += `
                        <div class="list-row">
                            <div class="list-rank">#${rank}</div>
                            <div class="list-user">
                                <img src="${avatar}" class="list-avatar">
                                <span class="list-name">${user.full_name}</span>
                            </div>
                            <div class="list-pts">${(user.points_balance || 0).toLocaleString()} pts</div>
                        </div>
                    `;
                });
                listHTML += '</div>';
                html += listHTML;
            }

            leaderboardContent.innerHTML = html;

        } catch (error) {
            console.error("Error loading leaderboard:", error);
            leaderboardContent.innerHTML = `<p style="color: red; text-align: center;">Failed to load leaderboard.</p>`;
        }
    }

    await loadProfileData();
    await loadLeaderboard();
});
