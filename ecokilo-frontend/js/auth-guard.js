document.addEventListener('DOMContentLoaded', async () => {
    // 1. Ensure Supabase is loaded
    if (!window.db) {
        console.error("Supabase client not initialized.");
        return;
    }

    // 2. Check current session
    const { data: { session }, error } = await window.db.auth.getSession();

    if (error || !session) {
        // Not logged in -> Redirect to login page
        window.location.replace('login.html');
        return;
    }

    const user = session.user;

    // 3. Fetch User Role from Database
    const { data: profile, error: profileError } = await window.db
        .from('users')
        .select('role, full_name, wallet_balance')
        .eq('id', user.id)
        .single();

    if (profileError || !profile) {
        console.error("Could not fetch user profile:", profileError);
        // Fallback or force logout if profile is missing
        await window.db.auth.signOut();
        window.location.replace('login.html');
        return;
    }

    let role = profile ? profile.role : 'HOUSEHOLD';

    // DEMO OVERRIDE: If RLS blocked the SQL script from updating roles, force them here
    if (user.email === 'suraj@recycler.com') role = 'RECYCLER';
    if (user.email === 'admin@ecokilo.com') role = 'ADMIN';

    // UI OVERRIDE: Respect the tab the user clicked on the login page
    if (localStorage.getItem('demo_role')) {
        role = localStorage.getItem('demo_role').toUpperCase();
    }

    const currentPath = window.location.pathname;

    // 4. Role-Based Access Control (RBAC) Redirections
    const householdPages = ['index.html', 'profile.html', 'pickups.html', 'rewards.html', 'leaderboard.html'];
    const recyclerPages = ['recycler.html', 'profile.html'];
    const adminPages = ['admin.html', 'profile.html'];

    const isAllowed = (pages) => {
        return pages.some(p => currentPath.endsWith(p) || currentPath.endsWith(p.replace('.html', ''))) || currentPath === '/';
    };

    if (role === 'HOUSEHOLD' && !isAllowed(householdPages)) {
        window.location.replace('index.html');
    } else if (role === 'RECYCLER' && !isAllowed(recyclerPages)) {
        window.location.replace('recycler.html');
    } else if (role === 'ADMIN' && !isAllowed(adminPages)) {
        window.location.replace('admin.html');
    }

    // 5. Hide loader and show main content
    const loader = document.getElementById('authLoader');
    const mainDashboard = document.getElementById('dashboardMain');

    if (loader) {
        loader.classList.add('hidden');
        setTimeout(() => loader.style.display = 'none', 500);
    }
    if (mainDashboard) {
        mainDashboard.style.display = 'block';
    }

    // 6. Update UI with User Data (if elements exist)
    updateUserUI(profile);

    // 7. Attach Global Logout Handler
    const logoutBtns = document.querySelectorAll('.btn-logout, a[href="login.html"], #signOutBtn');
    logoutBtns.forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            await window.db.auth.signOut();
            window.location.replace('login.html');
        });
    });
});

function updateUserUI(profile) {
    // Household Dashboard Updates
    const welcomeHeader = document.querySelector('.welcome-text h1');
    if (welcomeHeader && profile.role === 'HOUSEHOLD') {
        const firstName = profile.full_name ? profile.full_name.split(' ')[0] : 'EcoWarrior';
        welcomeHeader.textContent = `Namaste, ${firstName}! 🙏`;
    }

    // Recycler Dashboard Updates
    if (welcomeHeader && profile.role === 'RECYCLER') {
        const firstName = profile.full_name ? profile.full_name.split(' ')[0] : 'Rider';
        welcomeHeader.textContent = `Hi ${firstName},`;
    }

    // Wallet Balances
    const walletSpan = document.querySelector('.wallet-badge span');
    if (walletSpan) {
        walletSpan.textContent = `₹ ${profile.wallet_balance || '0.00'}`;
    }
}
