document.addEventListener('DOMContentLoaded', async () => {
    const assignmentsContainer = document.getElementById('dynamicAssignmentsContainer');

    async function loadAssignments() {
        try {
            // First fetch nearby pending
            const pendingReq = await window.apiGetNearbyPickups();
            const pendingList = pendingReq.data || [];

            // Then fetch my accepted ones
            const myReq = await window.apiGetMyAssignments();
            const myList = myReq.data || [];

            let html = '';

            // Render My Assignments (ACCEPTED status)
            let activePickupToEmit = null;

            if (myList.length > 0) {
                html += '<h3 style="margin-bottom: 15px;">Assigned Pickups (Escrow Pending)</h3>';
                myList.forEach(pickup => {
                    html += `
                    <div class="activity-item" style="background: rgba(255,153,51,0.1); border-left: 4px solid var(--clr-saffron);">
                        <div class="activity-icon" style="background:white;">
                            <i class="ph ph-navigation-arrow" style="color: var(--clr-saffron);"></i>
                        </div>
                        <div class="activity-details">
                            <h4>Date: ${pickup.scheduled_date}</h4>
                            <p>Est: ${pickup.estimated_weight || 0} kg • ${pickup.time_slot}</p>
                        </div>
                        <div class="activity-status">
                            <button onclick="verifyPickup('${pickup.id}', ${pickup.estimated_weight || 5})" class="btn-primary pulse-eff" style="padding: 6px 12px; font-size: 0.85rem;">Verify & Complete</button>
                        </div>
                    </div>`;

                    if (!activePickupToEmit) activePickupToEmit = pickup.id;
                });
            }

            // Start Live Tracker Emitting if we have an active assigned map
            if (activePickupToEmit && window.startEmitting) {
                window.startEmitting(activePickupToEmit);
            }

            // Render Pending Nearby
            if (pendingList.length > 0) {
                html += '<h3 style="margin-top: 25px; margin-bottom: 15px;">Nearby Requests</h3>';
                pendingList.forEach(pickup => {
                    html += `
                    <div class="activity-item" style="border: 1px solid var(--border-clr);">
                        <div class="activity-icon" style="background:#f1f5f9; color: var(--text-muted);">
                            <i class="ph ph-map-pin"></i>
                        </div>
                        <div class="activity-details">
                            <h4>New Request</h4>
                            <p>Est: ${pickup.estimated_weight || 0} kg • ${pickup.time_slot}</p>
                        </div>
                        <div class="activity-status">
                            <button onclick="acceptPickup('${pickup.id}')" class="btn-outline" style="padding: 6px 12px; font-size: 0.85rem;">Accept Request</button>
                        </div>
                    </div>`;
                });
            }

            if (html === '') {
                html = '<p style="color: var(--text-muted);">No pickups available at the moment.</p>';
            }

            assignmentsContainer.innerHTML = html;

        } catch (error) {
            console.error("Failed to load assignments", error);
            assignmentsContainer.innerHTML = `<p style="color: red;">Error loading data: ${error.message}</p>`;
        }
    }

    window.acceptPickup = async (id, estimatedWeight) => {
        try {
            await window.apiAcceptPickup(id);
            // TRIGGER ESCROW: On accepted, we must lock the funds and pay security deposit
            const estAmount = estimatedWeight ? (estimatedWeight * 30) : 150.00; // Mock calculation based on default plastic
            await window.apiInitiateEscrow({
                pickup_id: id,
                estimated_amount: estAmount
            });

            alert("Pickup Accepted & Escrow Locked! Please proceed to location.");
            loadAssignments(); // Refresh pickups
            loadEscrows();     // Refresh escrow vault
        } catch (err) {
            alert(`Error accepting: ${err.message}`);
        }
    };

    window.verifyPickup = async (id, estimatedWeight) => {
        // Quick prompt to simulate entering the scale weight
        const actualWeightStr = prompt(`Enter actual weight verified on scale (Estimated: ${estimatedWeight} kg):`, estimatedWeight);
        if (!actualWeightStr) return; // User cancelled

        const actualWeight = parseFloat(actualWeightStr);
        if (isNaN(actualWeight) || actualWeight <= 0) {
            alert("Invalid weight entered.");
            return;
        }

        try {
            // First mark pickup as verified in normal flow
            const res = await window.apiVerifyPickup(id, {
                actual_weight: actualWeight,
                photo_url: 'https://example.com/receipt.jpg' // Demo photo
            });

            // Now we must find the Escobar ID connected to this pickup to release it
            const escrowsRes = await window.apiGetEscrows();
            const matchedEscrow = escrowsRes.data.find(e => e.pickup_id === id);

            if (matchedEscrow) {
                // Determine final amount loosely (assuming 30/kg)
                const finalAmount = actualWeight * 30;
                // Trigger Atomic Escrow Release
                await window.apiReleaseEscrow({
                    escrow_id: matchedEscrow.id,
                    actual_weight: actualWeight,
                    final_amount: finalAmount
                });
                alert(`\u2705 Success: ${res.message}\nEscrow Successfully Released and Wallets Settled.`);
            } else {
                alert(`\u2705 Success: ${res.message}\n(No Escrow contract was found for this specific pickup)`);
            }

            loadAssignments();
            loadEscrows();
            loadNavProfile(); // update wallet balance top right
        } catch (err) {
            alert(`Error Verifying or Releasing Escrow: ${err.message}`);
            // If it was a high mismatch, escrow will throw 422 Dispute error
        }
    };

    // ════════════════════════════════════
    // ESCROW VAULT LOGIC
    // ════════════════════════════════════
    async function loadEscrows() {
        const tableBody = document.getElementById('escrowTableBody');
        if (!tableBody) return;

        try {
            const res = await window.apiGetEscrows();
            const escrows = res.data || [];

            let totalLocked = 0;
            let totalDeposits = 0;
            let totalReleased = 0;
            let totalDisputes = 0;

            let html = '';

            escrows.forEach(e => {
                // Tracking Metrics
                if (e.status === 'HOLDING') {
                    totalLocked += parseFloat(e.estimated_amount);
                    totalDeposits += parseFloat(e.security_deposit);
                } else if (e.status === 'RELEASED') {
                    totalReleased += parseFloat(e.estimated_amount);
                } else if (e.status === 'DISPUTED') {
                    totalDisputes++;
                }

                // Table Row Badges
                let statusBadge = '';
                if (e.status === 'HOLDING') statusBadge = `<span class="badge" style="background:#fef3c7; color:#d97706;">Holding</span>`;
                else if (e.status === 'RELEASED') statusBadge = `<span class="badge completed">Released</span>`;
                else if (e.status === 'DISPUTED') statusBadge = `<span class="badge" style="background:#fee2e2; color:#ef4444;">Disputed</span>`;
                else statusBadge = `<span class="badge" style="background:#f1f5f9; color:#64748b;">${e.status}</span>`;

                const householdName = e.users ? e.users.full_name : 'Unknown User';
                const shortId = e.id.split('-')[0].toUpperCase();

                html += `
                <tr style="border-bottom: 1px solid var(--border);">
                    <td style="padding: 15px 12px; font-weight: 500;">#${shortId}</td>
                    <td style="padding: 15px 12px; color: var(--clr-navy);">${householdName}</td>
                    <td style="padding: 15px 12px; font-weight: 600;">₹ ${e.estimated_amount.toFixed(2)}</td>
                    <td style="padding: 15px 12px; color: var(--text-muted);">₹ ${e.security_deposit.toFixed(2)}</td>
                    <td style="padding: 15px 12px;">${statusBadge}</td>
                    <td style="padding: 15px 12px;">
                        <button class="btn-outline" style="padding: 4px 8px; font-size: 0.75rem;">View</button>
                    </td>
                </tr>`;
            });

            if (html === '') {
                html = `<tr><td colspan="6" style="padding: 15px; text-align: center; color: var(--text-muted);">No escrow contracts found. Accept a pickup to initiate escrow.</td></tr>`;
            }

            tableBody.innerHTML = html;

            // Update Summary Cards
            document.getElementById('escrowTotalLocked').textContent = `₹ ${totalLocked.toFixed(0)}`;
            document.getElementById('escrowTotalDeposits').textContent = `₹ ${totalDeposits.toFixed(0)}`;
            document.getElementById('escrowTotalReleased').textContent = `₹ ${totalReleased.toFixed(0)}`;
            document.getElementById('escrowTotalDisputes').textContent = totalDisputes;

        } catch (error) {
            console.error("Failed to load escrows:", error);
            tableBody.innerHTML = `<tr><td colspan="6" style="padding: 15px; color: red; text-align: center;">Failed to load Escrow Vault data.</td></tr>`;
        }
    }

    async function loadNavProfile() {
        try {
            const res = await window.apiGetUserProfile();
            const user = res.data;

            // Welcome Header
            const welcomeHeading = document.getElementById('welcomeHeading');
            if (welcomeHeading && user.full_name) {
                welcomeHeading.innerHTML = `Hi ${user.full_name.split(' ')[0]},`;
            }

            // Wallet Balance
            const earningsDisplay = document.getElementById('totalEarningsDisplay');
            if (earningsDisplay) {
                earningsDisplay.textContent = `₹ ${user.wallet_balance || '0.00'}`;
            }

            // Profile Avatar
            const profileImg = document.getElementById('navProfileImage');
            if (profileImg) {
                if (user.avatar_url) {
                    profileImg.src = user.avatar_url;
                } else {
                    profileImg.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.full_name || 'Rider')}&background=138808&color=fff`;
                }
            }
        } catch (e) {
            console.error("Failed to load nav profile", e);
        }
    }

    // Initial load
    loadAssignments();
    loadEscrows();
    loadNavProfile();
});
