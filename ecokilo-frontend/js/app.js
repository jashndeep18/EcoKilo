document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const scheduleBtn = document.getElementById('schedulePickupBtn');
    const modal = document.getElementById('pickupModal');
    const closeBtn = document.getElementById('closeModalBtn');
    const form = document.getElementById('pickupForm');

    // Open Modal
    if (scheduleBtn) {
        scheduleBtn.addEventListener('click', () => {
            modal.classList.add('active');
            // Prevent body scroll
            document.body.style.overflow = 'hidden';
        });
    }

    // Close Modal via Button
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            closeModal();
        });
    }

    // Close Modal via Overlay Click
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal();
            }
        });
    }

    // Also close on Escape key
    document.addEventListener('keydown', (e) => {
        if (modal && e.key === 'Escape' && modal.classList.contains('active')) {
            closeModal();
        }
    });

    function closeModal() {
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    }

    // ════════════════════════════════════
    // AI Waste Estimator (TensorFlow.js)
    // ════════════════════════════════════
    const uploadPhotoBtn = document.getElementById('uploadPhotoBtn');
    const wasteImageInput = document.getElementById('wasteImageInput');
    const aiLoadingState = document.getElementById('aiLoadingState');
    const aiResultContainer = document.getElementById('aiResultContainer');
    const wasteImagePreview = document.getElementById('wasteImagePreview');
    const aiCanvasOverlay = document.getElementById('aiCanvasOverlay');
    const aiEstimatedWeight = document.getElementById('aiEstimatedWeight');
    const aiEstimatedPrice = document.getElementById('aiEstimatedPrice');
    const hiddenEstimatedWeight = document.getElementById('hiddenEstimatedWeight');

    // Default prices per kg from DB (for heuristic demo)
    const scrapRates = {
        'plastic': 30,
        'paper': 12,
        'ewaste': 150,
        'metal': 45
    };

    if (uploadPhotoBtn && wasteImageInput) {
        uploadPhotoBtn.addEventListener('click', () => {
            wasteImageInput.click();
        });

        wasteImageInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            // 1. Show Loading State
            uploadPhotoBtn.style.display = 'none';
            aiResultContainer.style.display = 'none';
            aiLoadingState.style.display = 'block';

            // 2. Load Image into Preview
            const reader = new FileReader();
            reader.onload = async (event) => {
                wasteImagePreview.src = event.target.result;

                // Wait for image to load fully before running TF
                wasteImagePreview.onload = async () => {
                    await processWasteImage();
                };
            };
            reader.readAsDataURL(file);
        });
    }

    async function processWasteImage() {
        try {
            // Ensure TFJS and Model exist via CDN
            if (!window.cocoSsd) throw new Error("TensorFlow Model failed to load from CDN");

            // Load the model
            const model = await cocoSsd.load();

            // Detect objects in the image
            const predictions = await model.detect(wasteImagePreview);

            // Generate Heuristic Weight based on detections
            let totalEstimatedKg = 0.0;
            const context = aiCanvasOverlay.getContext('2d');

            // Match canvas size to image display size
            aiCanvasOverlay.width = wasteImagePreview.clientWidth;
            aiCanvasOverlay.height = wasteImagePreview.clientHeight;

            // Calculate scale factors because natural image size != UI display size
            const scaleX = aiCanvasOverlay.width / wasteImagePreview.naturalWidth;
            const scaleY = aiCanvasOverlay.height / wasteImagePreview.naturalHeight;

            context.clearRect(0, 0, context.canvas.width, context.canvas.height);
            context.font = '14px Outfit';
            context.textBaseline = 'top';

            // Draw bounding boxes and calculate weight
            predictions.forEach(prediction => {
                // Parse bounding box applying UI scale
                const [x, y, width, height] = prediction.bbox;
                const scaledX = x * scaleX;
                const scaledY = y * scaleY;
                const scaledWidth = width * scaleX;
                const scaledHeight = height * scaleY;

                // Draw Box
                context.strokeStyle = '#138808'; // EcoKilo Green
                context.lineWidth = 3;
                context.strokeRect(scaledX, scaledY, scaledWidth, scaledHeight);

                // Draw Label Background
                context.fillStyle = '#138808';
                const textWidth = context.measureText(prediction.class).width;
                const textHeight = 20;
                context.fillRect(scaledX, scaledY, textWidth + 10, textHeight);

                // Draw Text
                context.fillStyle = '#FFFFFF';
                context.fillText(`${prediction.class} (${Math.round(prediction.score * 100)}%)`, scaledX + 5, scaledY + 3);

                // Heuristic: Assign weight based on object class and bounding box size
                // (This creates a fun, semi-realistic response for demos)
                const area = scaledWidth * scaledHeight;
                if (['bottle', 'cup'].includes(prediction.class)) {
                    totalEstimatedKg += 0.05; // 50g
                } else if (['laptop', 'tv', 'cell phone', 'keyboard'].includes(prediction.class)) {
                    totalEstimatedKg += 2.5; // 2.5kg for heavy e-waste
                } else if (['book', 'vase'].includes(prediction.class)) {
                    totalEstimatedKg += 0.5; // 500g
                } else {
                    // Default generic mapping based on size
                    totalEstimatedKg += (area > 30000) ? 1.0 : 0.2;
                }
            });

            // If it detected nothing, give a minimum fallback based on image upload act
            if (totalEstimatedKg === 0) {
                totalEstimatedKg = 1.0;
                // Draw a generic box outlining the whole image
                context.strokeStyle = '#f59e0b';
                context.lineWidth = 4;
                context.strokeRect(10, 10, aiCanvasOverlay.width - 20, aiCanvasOverlay.height - 20);
                context.fillStyle = '#f59e0b';
                context.fillRect(10, 10, 150, 24);
                context.fillStyle = '#FFF';
                context.fillText('Mixed Waste (Est)', 15, 14);
            }

            // Update UI State
            totalEstimatedKg = parseFloat(totalEstimatedKg.toFixed(2));

            // Grab selected radio button category to calculate price
            const selectedType = document.querySelector('input[name="waste_type"]:checked').value;
            const rate = scrapRates[selectedType] || 20;
            const estimatedPrice = Math.floor(totalEstimatedKg * rate);

            aiEstimatedWeight.textContent = `${totalEstimatedKg} kg`;
            aiEstimatedPrice.textContent = `₹ ${estimatedPrice}`;
            hiddenEstimatedWeight.value = totalEstimatedKg;

            aiLoadingState.style.display = 'none';
            aiResultContainer.style.display = 'block';

        } catch (error) {
            console.error("AI Estimation Error:", error);
            alert("AI scanning failed. Please try again.");
            uploadPhotoBtn.style.display = 'block';
            aiLoadingState.style.display = 'none';
        }
    }

    // Schedule Pickup API call
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const submitBtn = form.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;

            // Change button state
            submitBtn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Booking...';
            submitBtn.disabled = true;

            try {
                // Gather form data
                const dateVal = document.getElementById('date').value;
                const timeVal = document.getElementById('time').value;
                // Provide dummy address_id and estimated_weight for now until full UI built
                const address_id = '00000000-0000-0000-0000-000000000000'; // Ignored if RLS allows null, or we set a default in DB. 

                await window.apiSchedulePickup({
                    scheduled_date: dateVal,
                    time_slot: timeVal,
                    estimated_weight: 5.0, // Hardcoded estimate
                    address_id: null // Assuming DB permits null or we resolve on backend
                });

                submitBtn.innerHTML = '<i class="ph ph-check-circle"></i> Success!';
                submitBtn.style.background = '#138808'; // success green

                setTimeout(() => {
                    closeModal();
                    // Reset form
                    form.reset();
                    submitBtn.innerHTML = originalText;
                    submitBtn.style.background = '';
                    submitBtn.disabled = false;

                    loadMyPickups(); // Keep visual UI update for demo
                }, 1500);

            } catch (error) {
                console.error('Failed to schedule pickup:', error);
                alert('Failed to schedule pickup: ' + error.message);
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            }
        });
    }

    async function loadMyPickups() {
        const activityList = document.getElementById('householdActivityList');
        if (!activityList) return;

        try {
            const res = await window.apiGetMyPickups();
            const pickups = res.data || [];

            let html = '';
            let activePickupToTrack = null;

            pickups.forEach(pickup => {
                let statusBadge, statusAmount, iconDiv;

                if (pickup.status === 'COMPLETED') {
                    statusBadge = `<span class="badge completed">Completed</span>`;
                    statusAmount = `<span class="amount text-green">+ ₹ ${pickup.total_amount || 0}</span>`;
                    iconDiv = `<div class="activity-icon status-completed"><i class="ph ph-check-circle"></i></div>`;
                } else if (pickup.status === 'ACCEPTED' || pickup.status === 'ON_THE_WAY') {
                    statusBadge = `<span class="badge accepted">Rider Assigned</span>`;
                    statusAmount = `<span class="amount text-gray">Pending Verify</span>`;
                    iconDiv = `<div class="activity-icon status-accepted"><i class="ph ph-clock-user"></i></div>`;

                    if (!activePickupToTrack) activePickupToTrack = pickup.id; // Pick first active to track
                } else {
                    // PENDING etc
                    statusBadge = `<span class="badge" style="background:#e2e8f0; color:#475569">Pending</span>`;
                    statusAmount = `<span class="amount text-gray">Waiting</span>`;
                    iconDiv = `<div class="activity-icon" style="background:#f1f5f9; color:#64748b"><i class="ph ph-clock"></i></div>`;
                }

                html += `
                <div class="activity-item" style="animation: fadeIn 0.5s ease-in-out">
                    ${iconDiv}
                    <div class="activity-details">
                        <h4>Scheduled Date: ${pickup.scheduled_date}</h4>
                        <p>Est. ${pickup.estimated_weight || 0} kg • ${pickup.time_slot}</p>
                    </div>
                    <div class="activity-status">
                        ${statusBadge}
                        ${statusAmount}
                    </div>
                </div>`;
            });

            if (html === '') {
                html = '<p style="color: var(--text-muted); padding: 10px;">No pickups scheduled yet.</p>';
            }
            activityList.innerHTML = html;

            // Start Live Tracker if there's an active pickup
            if (activePickupToTrack && window.startTracking) {
                window.startTracking(activePickupToTrack);
            }

        } catch (error) {
            console.error("Failed to fetch pickups", error);
            activityList.innerHTML = `<p style="color: red; padding: 10px;">Failed to load pickups.</p>`;
        }
    }

    // Initial load
    loadMyPickups();
    loadNavProfile();

    async function loadNavProfile() {
        try {
            const res = await window.apiGetUserProfile();
            const user = res.data;

            // Welcome Header
            const welcomeHeading = document.getElementById('welcomeHeading');
            if (welcomeHeading && user.full_name) {
                welcomeHeading.innerHTML = `Namaste, ${user.full_name.split(' ')[0]}! 🙏`;
            }

            // Wallet Balance
            const walletSpan = document.getElementById('navWalletBalance');
            if (walletSpan) {
                walletSpan.textContent = `₹ ${user.wallet_balance || '0.00'}`;
            }

            // Profile Avatar
            const profileImg = document.getElementById('navProfileImage');
            if (profileImg) {
                if (user.avatar_url) {
                    profileImg.src = user.avatar_url;
                } else {
                    profileImg.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.full_name || 'U')}&background=138808&color=fff`;
                }
            }
        } catch (e) {
            console.error("Failed to load nav profile", e);
        }
    }
});

// A CSS snippet dynamically injected for the mock animation (optional)
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(-10px); }
        to { opacity: 1; transform: translateY(0); }
    }
`;
document.head.appendChild(style);
