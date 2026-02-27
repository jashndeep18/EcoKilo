document.addEventListener('DOMContentLoaded', async () => {
    const pickupsList = document.getElementById('pickupsList');
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

    async function loadPickups() {
        try {
            // Let's use the new /all endpoint!
            const res = await window.apiGetAllPickups();
            const pickups = res.data || [];

            if (pickups.length === 0) {
                pickupsList.innerHTML = `
                    <div style="text-align: center; padding: 60px; background: rgba(255,255,255,0.7); border-radius: 12px; border: 1px dashed #ccc;">
                        <i class="ph-fill ph-package" style="font-size: 3rem; color: #ccc; margin-bottom: 15px;"></i>
                        <h3 style="color: var(--text-main); margin-bottom: 5px;">No Pickups Yet</h3>
                        <p style="color: var(--text-muted); margin-bottom: 20px;">You haven't scheduled any waste collections.</p>
                        <a href="index.html" class="btn-primary" style="text-decoration:none;">Schedule Your First Pickup</a>
                    </div>
                `;
                return;
            }

            let html = '';
            pickups.forEach(pickup => {
                const dateObj = new Date(pickup.scheduled_date);
                const formattedDate = dateObj.toLocaleDateString('en-IN', {
                    day: 'numeric', month: 'short', year: 'numeric'
                });

                // Status Badge styling
                let badgeClass = '';
                switch (pickup.status) {
                    case 'PENDING': badgeClass = 'pending'; break;
                    case 'ACCEPTED': badgeClass = 'accepted'; break;
                    case 'ON_THE_WAY': badgeClass = 'accepted'; break; // Share green color
                    case 'COMPLETED': badgeClass = 'completed'; break;
                    default: badgeClass = '';
                }

                // Financials logic (only show if completed)
                let financialsHTML = '';
                if (pickup.status === 'COMPLETED') {
                    financialsHTML = `
                    <div class="pickup-financials">
                        <span class="fin-item money"><i class="ph-fill ph-coins"></i> +₹${pickup.total_amount || 0}</span>
                        <span class="fin-item points"><i class="ph-fill ph-star"></i> +${pickup.total_points || 0} pts</span>
                    </div>`;
                }

                html += `
                <div class="pickup-card">
                    <div class="pickup-details">
                        <div class="pickup-header">
                            <span class="pickup-id">#${pickup.id.substring(0, 8)}</span>
                        </div>
                        <div class="pickup-meta">
                            <div class="meta-item">
                                <i class="ph ph-calendar-blank"></i> ${formattedDate}
                            </div>
                            <div class="meta-item">
                                <i class="ph ph-clock"></i> ${pickup.time_slot}
                            </div>
                            <div class="meta-item">
                                <i class="ph ph-scales"></i> ${pickup.actual_weight ? pickup.actual_weight + ' kg (Actual)' : pickup.estimated_weight + ' kg (Est)'}
                            </div>
                        </div>
                        ${financialsHTML}
                    </div>
                    <div class="pickup-status-container">
                        <span class="badge ${badgeClass}" style="font-size: 0.9rem; padding: 6px 12px;">${pickup.status.replace(/_/g, ' ')}</span>
                    </div>
                </div>
                `;
            });

            pickupsList.innerHTML = html;

        } catch (error) {
            console.error("Error loading pickups:", error);
            pickupsList.innerHTML = `<p style="color: red; text-align: center;">Failed to load your history. Please try again later.</p>`;
        }
    }

    await loadProfileData();
    await loadPickups();
});
