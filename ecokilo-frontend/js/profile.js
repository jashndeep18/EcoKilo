document.addEventListener('DOMContentLoaded', async () => {

    const profileForm = document.getElementById('profileForm');
    const saveProfileBtn = document.getElementById('saveProfileBtn');
    const avatarUpload = document.getElementById('avatarUpload');
    const profileImagePreview = document.getElementById('profileImagePreview');

    // UI Elements
    const fullNameInput = document.getElementById('fullNameInput');
    const phoneInput = document.getElementById('phoneInput');
    const displayName = document.getElementById('displayName');
    const displayRole = document.getElementById('displayRole');
    const historyWalletBalance = document.getElementById('historyWalletBalance');
    const historyTableBody = document.getElementById('historyTableBody');

    let currentAvatarUrl = null;

    // 1. Fetch and Load Profile Data
    async function initProfile() {
        try {
            const profileRes = await window.apiGetUserProfile();
            const user = profileRes.data;

            // Populate Form
            fullNameInput.value = user.full_name || '';
            phoneInput.value = user.phone_number || '';
            currentAvatarUrl = user.avatar_url;

            // Populate Display
            displayName.textContent = user.full_name || 'Anonymous User';
            displayRole.textContent = user.role || 'Household';
            historyWalletBalance.textContent = `₹ ${user.wallet_balance || '0.00'}`;

            if (user.avatar_url) {
                profileImagePreview.src = user.avatar_url;
            } else {
                profileImagePreview.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.full_name || 'U')}&background=138808&color=fff`;
            }

            // Load History Setup parallel
            loadHistory();

        } catch (error) {
            console.error("Failed to load profile details", error);
            alert("Error loading profile: " + error.message);
        }
    }

    // 2. Fetch and Load History
    async function loadHistory() {
        try {
            const res = await window.apiGetUserHistory();
            const transactions = res.data || [];

            let html = '';
            transactions.forEach(tx => {
                let badgeClass = tx.status === 'COMPLETED' ? 'text-green' : 'text-gray';
                let typeText = tx.type === 'CREDIT_WASTE' ? 'Scrap Sale' : tx.type;
                let sign = tx.type.includes('CREDIT') ? '+' : '-';

                // Format Date
                let d = new Date(tx.created_at);
                let dateStr = `${d.getDate()} ${d.toLocaleString('default', { month: 'short' })}, ${d.getFullYear()}`;

                html += `
                    <tr>
                        <td style="color: var(--text-muted);">${dateStr}</td>
                        <td style="font-weight: 500;">
                            <i class="ph ph-recycle" style="color: var(--clr-green); margin-right: 5px;"></i>
                            ${typeText}
                            <div style="font-size: 0.8rem; color: var(--text-muted); font-weight: normal;">
                                Ref: ${tx.reference_id ? tx.reference_id.substring(0, 8) + '...' : 'N/A'}
                            </div>
                        </td>
                        <td><span class="badge ${tx.status === 'COMPLETED' ? 'completed' : ''}">${tx.status}</span></td>
                        <td style="text-align: right; font-weight: 700;" class="${badgeClass}">
                            ${sign} ₹ ${tx.amount}
                        </td>
                    </tr>
                `;
            });

            if (transactions.length === 0) {
                html = `<tr><td colspan="4" style="text-align: center; padding: 30px; color: var(--text-muted);">No transactions found. Go schedule a pickup!</td></tr>`;
            }

            historyTableBody.innerHTML = html;

        } catch (error) {
            console.error("Failed to load history", error);
            historyTableBody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: red;">Failed to load history.</td></tr>`;
        }
    }

    // 3. Handle File Upload explicitly utilizing Supabase Storage
    avatarUpload.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Visual preview feedback
        const objectUrl = URL.createObjectURL(file);
        profileImagePreview.src = objectUrl;

        try {
            // Retrieve session directly to avoid competing for the LockManager
            const { data: { session }, error: sessionError } = await window.db.auth.getSession();
            if (sessionError || !session) throw new Error("Could not verify active session.");

            const userUuid = session.user.id;

            // Upload to Supabase 'avatars' bucket
            const fileExt = file.name.split('.').pop();
            const fileName = `${userUuid}-${Date.now()}.${fileExt}`;
            const filePath = `public/${fileName}`;

            // Indicate uploading state implicitly via generic loading or just wait
            saveProfileBtn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Uploading...';
            saveProfileBtn.disabled = true;

            let { error: uploadError, data } = await window.db.storage
                .from('avatars')
                .upload(filePath, file, { upsert: true });

            if (uploadError) throw uploadError;

            // Get the Public URL
            const { data: publicUrlData } = window.db.storage
                .from('avatars')
                .getPublicUrl(filePath);

            currentAvatarUrl = publicUrlData.publicUrl;

            // Auto-save the new picture URL right away
            await window.apiUpdateUserProfile({ avatar_url: currentAvatarUrl });

            saveProfileBtn.innerHTML = 'Save Changes';
            saveProfileBtn.disabled = false;
            alert("Profile Picture Updated!");

        } catch (error) {
            console.error("Upload error", error);
            alert("Error uploading image: " + error.message);
            saveProfileBtn.innerHTML = 'Save Changes';
            saveProfileBtn.disabled = false;
            // Revert preview on fail
            profileImagePreview.src = currentAvatarUrl || `https://ui-avatars.com/api/?name=U`;
        }
    });

    // 4. Handle Form Submit (Text info)
    profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        saveProfileBtn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Saving...';
        saveProfileBtn.disabled = true;

        try {
            await window.apiUpdateUserProfile({
                full_name: fullNameInput.value,
                phone_number: phoneInput.value
            });

            displayName.textContent = fullNameInput.value; // Optimistic UI Update

            saveProfileBtn.innerHTML = '<i class="ph ph-check-circle"></i> Saved!';
            saveProfileBtn.style.background = '#138808';

            setTimeout(() => {
                saveProfileBtn.innerHTML = 'Save Changes';
                saveProfileBtn.style.background = '';
                saveProfileBtn.disabled = false;
            }, 2000);

        } catch (error) {
            alert("Failed to save profile: " + error.message);
            saveProfileBtn.innerHTML = 'Save Changes';
            saveProfileBtn.disabled = false;
        }
    });

    // Kickoff
    initProfile();
});
