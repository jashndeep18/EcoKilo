document.addEventListener('DOMContentLoaded', async () => {
    const rewardsGrid = document.getElementById('rewardsGrid');
    const heroPointsBalance = document.getElementById('heroPointsBalance');

    // Header components
    const welcomeHeading = document.getElementById('welcomeHeading');
    const navWalletBalance = document.getElementById('navWalletBalance');
    const navProfileImage = document.getElementById('navProfileImage');

    let currentPointsBalance = 0;

    async function loadProfileData() {
        try {
            const res = await window.apiGetUserProfile();
            const user = res.data;

            currentPointsBalance = user.points_balance || 0;
            heroPointsBalance.innerHTML = `${currentPointsBalance.toLocaleString()} <span style="font-size: 1.2rem; font-weight: 500;">pts</span>`;

            if (welcomeHeading && user.full_name) {
                welcomeHeading.innerHTML = `${user.full_name.split(' ')[0]}'s Rewards 🎁`;
            }
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

    async function loadRewardsCatalog() {
        try {
            const res = await window.apiGetRewards();
            const rewards = res.data || [];

            let html = '';

            if (rewards.length === 0) {
                html = '<p style="color: var(--text-muted);">No rewards currently available in the catalog.</p>';
            } else {
                rewards.forEach(reward => {
                    const enoughPoints = currentPointsBalance >= reward.points_required;
                    const stockText = reward.stock_quantity === -1 ? 'In Stock' : (reward.stock_quantity > 0 ? `${reward.stock_quantity} left` : 'Out of Stock');
                    const isOutOfStock = reward.stock_quantity === 0;

                    let btnHTML = '';
                    if (isOutOfStock) {
                        btnHTML = `<button class="btn-outline w-100" style="opacity:0.5; cursor:not-allowed;" disabled>Out of Stock</button>`;
                    } else if (enoughPoints) {
                        btnHTML = `<button class="btn-primary w-100" onclick="redeemPoints('${reward.id}', '${reward.name}', ${reward.points_required})">Redeem Now</button>`;
                    } else {
                        const needed = reward.points_required - currentPointsBalance;
                        btnHTML = `<button class="btn-outline w-100" style="opacity:0.6; cursor:not-allowed;" disabled>Earn ${needed} more pts</button>`;
                    }

                    html += `
                    <div class="reward-card">
                        <div class="reward-img">
                            <img src="${reward.image_url || 'https://cdn-icons-png.flaticon.com/512/8215/8215539.png'}" alt="${reward.name}">
                        </div>
                        <div class="reward-content">
                            <h3 class="reward-title">${reward.name}</h3>
                            <p class="reward-desc">${reward.description}</p>
                            <div class="reward-points">
                                <i class="ph-fill ph-star"></i> ${reward.points_required.toLocaleString()} pts
                            </div>
                            <div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 12px; font-weight: 500;">
                                Status: ${stockText}
                            </div>
                            <div class="mt-auto">
                                ${btnHTML}
                            </div>
                        </div>
                    </div>`;
                });
            }

            rewardsGrid.innerHTML = html;
        } catch (error) {
            console.error("Error loading rewards:", error);
            rewardsGrid.innerHTML = `<p style="color: red;">Failed to load catalog.</p>`;
        }
    }

    window.redeemPoints = async (id, name, cost) => {
        const confirmRedeem = confirm(`Are you sure you want to redeem "${name}" for ${cost} points?`);
        if (!confirmRedeem) return;

        try {
            const res = await window.apiRedeemReward(id);
            alert(`🎉 Success: ${res.message}`);
            // Refresh
            await loadProfileData();
            await loadRewardsCatalog();
        } catch (error) {
            alert(`Error: ${error.message}`);
        }
    };

    // Sequential Initial Load ensures points balance is loaded before rendering catalog buttons
    await loadProfileData();
    await loadRewardsCatalog();
});
