// Employee Portal JavaScript
// AydoCorp Employee Portal - Core Functionality

document.addEventListener('DOMContentLoaded', function() {
    // If Auth0 integration is available, use it instead of the legacy authentication
    if (window.auth0Integration) {
        window.auth0Integration.updateAuthUI();
    } else {
        // Fall back to legacy authentication if Auth0 is not available
        checkLoginStatus();
    }
    initializePortal();
});

// Unified API Utilities (from aydocorp.js)
function getApiBaseUrl() {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return 'http://localhost:3001';
    }
    return window.location.origin;
}

function getApiUrl(endpoint) {
    if (!endpoint) {
        console.error('Invalid endpoint provided to getApiUrl');
        return null;
    }
    const baseUrl = getApiBaseUrl();
    const baseWithSlash = baseUrl.endsWith('/') ? baseUrl : baseUrl + '/';
    let cleanEndpoint = endpoint.startsWith('/') ? endpoint.substring(1) : endpoint;
    if (!cleanEndpoint.startsWith('api/')) cleanEndpoint = 'api/' + cleanEndpoint;
    if (!/^[a-zA-Z0-9\-_\/\.]+$/.test(cleanEndpoint)) {
        console.error('Invalid characters in API endpoint');
        return null;
    }
    return baseWithSlash + cleanEndpoint;
}

// Utility to get cookie value by name
function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
}

// Unified token validation logic
async function validateToken(token) {
    try {
        if (!token) {
            console.warn('[Portal] validateToken: No token provided');
            return false;
        }
        try {
            const response = await fetch(getApiUrl('auth/validate'), {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'x-auth-token': token,
                    'Content-Type': 'application/json'
                },
                credentials: 'include'
            });
            console.log('[Portal] Token validation response:', response.status);
            if (response.ok) return true;
            if (response.status !== 404) console.warn('[Portal] Standard validate endpoint failed:', response.status);
        } catch (err) { console.warn('[Portal] Error in /auth/validate:', err); }
        for (const endpoint of ['auth/check', 'auth/status']) {
            try {
                const altResponse = await fetch(getApiUrl(endpoint), {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'x-auth-token': token,
                        'Content-Type': 'application/json'
                    },
                    credentials: 'include'
                });
                console.log(`[Portal] Token validation response (${endpoint}):`, altResponse.status);
                if (altResponse.ok) return true;
            } catch (err) { console.warn(`[Portal] Error in /${endpoint}:`, err); }
        }
        return false;
    } catch (err) {
        console.error('[Portal] validateToken error:', err);
        return false;
    }
}

// Unified checkLoginStatus - Legacy authentication method
// This function is only used when Auth0 integration is not available
function checkLoginStatus() {
    const token = getCookie('aydocorpToken') || localStorage.getItem('aydocorpToken') || sessionStorage.getItem('aydocorpToken');
    let userJson = localStorage.getItem('aydocorpUser') || sessionStorage.getItem('aydocorpUser');
    let user = null;
    try { user = JSON.parse(userJson); } catch {}
    console.log('[Portal] checkLoginStatus: token:', token, 'user:', user);
    const portalMain = document.getElementById('portal-main');
    if (!portalMain) console.warn('[Portal] #portal-main not found in DOM');
    // If token exists but user info is missing, fetch user info from backend
    if (token && !user) {
        fetch(getApiUrl('auth/validate'), {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'x-auth-token': token,
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        })
        .then(res => res.ok ? res.json() : null)
        .then(data => {
            if (data && (data.username || data.id)) {
                // Store the returned user object
                localStorage.setItem('aydocorpUser', JSON.stringify(data));
                sessionStorage.setItem('aydocorpUser', JSON.stringify(data));
                checkLoginStatus(); // re-run with user info now available
            } else {
                // Token invalid or user not found, clear all authentication data
                clearAllAuthData();
                hideLoginOverlay();
                showLoginRequiredMessage();
            }
        })
        .catch(() => {
            clearAllAuthData();
            hideLoginOverlay();
            showLoginRequiredMessage();
        });
        return;
    }
    if (!token || !user) {
        console.warn('[Portal] No token or user found. Hiding overlay, showing login-required message.');
        hideLoginOverlay();
        showLoginRequiredMessage();
        if (portalMain) portalMain.style.display = 'none';
        return;
    }
    validateToken(token).then(isValid => {
        console.log('[Portal] validateToken result:', isValid);
        if (isValid) {
            hideLoginOverlay();
            loadUserData(user);
            const loginMsg = document.getElementById('login-required-message');
            if (loginMsg) {
                loginMsg.style.display = 'none';
                console.log('[Portal] Hiding login-required message.');
            }
            if (portalMain) {
                portalMain.style.display = '';
                console.log('[Portal] Showing #portal-main. Computed display:', getComputedStyle(portalMain).display);
            }
        } else {
            console.error('[Portal] Token invalid, clearing session and showing login required message.');
            clearAllAuthData();
            hideLoginOverlay();
            showLoginRequiredMessage();
            if (portalMain) {
                portalMain.style.display = 'none';
                console.log('[Portal] Hiding #portal-main. Computed display:', getComputedStyle(portalMain).display);
            }
        }
    });
}

// Hide login overlay
function hideLoginOverlay() {
    const overlay = document.getElementById('login-check-overlay');
    if (overlay) {
        overlay.style.opacity = '0';
        setTimeout(() => {
            overlay.style.display = 'none';
        }, 300);
    }
}

// Show error message
function showError(message) {
    // Implementation for showing error messages
    console.error(message);
}

// Load user data
function loadUserData(user) {
    if (!user) return;

    document.getElementById('user-name').textContent = user.username || 'Employee';

    const lastLogin = sessionStorage.getItem('lastLoginTime') || new Date().toLocaleString();
    document.getElementById('last-login-time').textContent = lastLogin;
}

// Initialize portal functionality
function initializePortal() {
    initializeNavigation();
    initializeMobileMenu();
    loadDashboardData();
    initializeNotifications();
    initializeEventHandlers();
}

// Initialize navigation
function initializeNavigation() {
    const navLinks = document.querySelectorAll('#portal-nav a');

    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const section = this.getAttribute('data-section');

            // Update active states
            navLinks.forEach(l => l.closest('li').classList.remove('active'));
            this.closest('li').classList.add('active');

            // Load section content
            loadSectionContent(section);
        });
    });
}

// Initialize mobile menu
function initializeMobileMenu() {
    const menuButton = document.createElement('button');
    menuButton.className = 'mobile-menu-toggle';
    menuButton.innerHTML = '<i class="fas fa-bars"></i>';

    document.querySelector('.header-content').prepend(menuButton);

    menuButton.addEventListener('click', function() {
        document.getElementById('portal-nav').classList.toggle('active');
    });
}

// Load dashboard data
function loadDashboardData() {
    loadRecentActivity();
    loadUpcomingEvents();
    loadEmployeeOfMonth();
    loadAnnouncements();
    loadTeamStatus();
}

// Load recent activity
function loadRecentActivity() {
    const activityList = document.querySelector('.activity-list');
    if (!activityList) return;

    // Simulate API call
    const activities = [
        {
            type: 'mission',
            text: 'Completed cargo delivery to Hurston',
            time: '2 hours ago'
        },
        {
            type: 'training',
            text: 'Completed Advanced Navigation course',
            time: '5 hours ago'
        },
        {
            type: 'achievement',
            text: 'Earned "Master Pilot" certification',
            time: '1 day ago'
        }
    ];

    activityList.innerHTML = activities.map(activity => `
        <div class="activity-item">
            <div class="activity-icon">
                <i class="fas fa-${getActivityIcon(activity.type)}"></i>
            </div>
            <div class="activity-details">
                <p>${activity.text}</p>
                <small>${activity.time}</small>
            </div>
        </div>
    `).join('');
}

// Get activity icon
function getActivityIcon(type) {
    const icons = {
        mission: 'rocket',
        training: 'graduation-cap',
        achievement: 'trophy',
        default: 'circle'
    };
    return icons[type] || icons.default;
}

// Load upcoming events
function loadUpcomingEvents() {
    const calendar = document.getElementById('events-calendar');
    if (!calendar) return;

    // Initialize calendar with events
    const events = [
        {
            title: 'Fleet Week',
            start: new Date(new Date().setDate(new Date().getDate() + 3)),
            end: new Date(new Date().setDate(new Date().getDate() + 10)),
            className: 'event-special'
        },
        {
            title: 'Cargo Run: Crusader',
            start: new Date(new Date().setDate(new Date().getDate() + 1)),
            className: 'event-mission'
        },
        {
            title: 'Team Training',
            start: new Date(new Date().setHours(new Date().getHours() + 4)),
            className: 'event-training'
        }
    ];

    // Calendar initialization would go here
    // This is a placeholder for the actual calendar implementation
}

// Load employee of the month
function loadEmployeeOfMonth() {
    const eotmContent = document.querySelector('.eotm-content');
    if (!eotmContent) return;

    const eotm = {
        name: 'Sarah Chen',
        position: 'Senior Pilot',
        achievement: 'Completed 100 successful cargo missions with zero losses',
        image: 'assets/images/employees/sarah-chen.jpg'
    };

    eotmContent.innerHTML = `
        <div class="eotm-card">
            <div class="eotm-image">
                <img src="${eotm.image}" alt="${eotm.name}" />
            </div>
            <div class="eotm-info">
                <h4>${eotm.name}</h4>
                <p class="position">${eotm.position}</p>
                <p class="achievement">${eotm.achievement}</p>
            </div>
        </div>
    `;
}

// Load announcements
function loadAnnouncements() {
    const announcementsList = document.querySelector('.announcements-list');
    if (!announcementsList) return;

    const announcements = [
        {
            title: 'New Trade Routes Established',
            content: 'We have established new trade routes in the Stanton system.',
            date: '2024-03-15',
            priority: 'high'
        },
        {
            title: 'Fleet Maintenance Schedule',
            content: 'Upcoming maintenance schedule for all vessels.',
            date: '2024-03-14',
            priority: 'medium'
        },
        {
            title: 'Employee Benefits Update',
            content: 'New benefits package available for all employees.',
            date: '2024-03-13',
            priority: 'normal'
        }
    ];

    announcementsList.innerHTML = announcements.map(announcement => `
        <div class="announcement-card priority-${announcement.priority}">
            <h4>${announcement.title}</h4>
            <p>${announcement.content}</p>
            <small>Posted on ${announcement.date}</small>
        </div>
    `).join('');
}

// Load team status
function loadTeamStatus() {
    const teamStatus = document.querySelector('.team-status');
    if (!teamStatus) return;

    const teams = [
        {
            name: 'Alpha Team',
            status: 'active',
            mission: 'Cargo Run - Hurston'
        },
        {
            name: 'Beta Team',
            status: 'standby',
            mission: 'None'
        },
        {
            name: 'Delta Team',
            status: 'maintenance',
            mission: 'Vehicle Maintenance'
        }
    ];

    teamStatus.innerHTML = teams.map(team => `
        <div class="team-status-card status-${team.status}">
            <h4>${team.name}</h4>
            <p class="status">Status: ${team.status.toUpperCase()}</p>
            <p class="mission">Current Mission: ${team.mission}</p>
        </div>
    `).join('');
}

// Initialize notifications
function initializeNotifications() {
    const notificationBtn = document.getElementById('notifications-btn');
    if (!notificationBtn) return;

    // Simulate new notifications
    setTimeout(() => {
        const badge = notificationBtn.querySelector('.notification-badge');
        if (badge) {
            badge.textContent = '3';
        }
    }, 2000);

    notificationBtn.addEventListener('click', function() {
        // Show notifications panel
        showNotifications();
    });
}

// Show notifications panel
function showNotifications() {
    // Implementation for notifications panel
}

// Initialize event handlers
function initializeEventHandlers() {
    // Logout button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            handleLogout();
        });
    }

    // Settings button
    const settingsBtn = document.getElementById('settings-btn');
    if (settingsBtn) {
        settingsBtn.addEventListener('click', function() {
            showSettings();
        });
    }
}

// Function to clear all authentication data
function clearAllAuthData() {
    // Clear localStorage
    localStorage.removeItem('aydocorpToken');
    localStorage.removeItem('aydocorpUser');
    localStorage.removeItem('aydocorpLoggedIn');

    // Clear sessionStorage
    sessionStorage.removeItem('aydocorpToken');
    sessionStorage.removeItem('aydocorpUser');
    sessionStorage.removeItem('aydocorpLoggedIn');
    sessionStorage.removeItem('aydocorpValidationFallback');
    sessionStorage.removeItem('fallbackWarningShown');
    sessionStorage.removeItem('tokenValidationRetries');
    sessionStorage.removeItem('lastLoginTime');

    // Clear cookies
    document.cookie = 'aydocorpToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';

    // Clear any other potential storage
    try {
        // Clear all localStorage items related to aydocorp
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.toLowerCase().includes('aydocorp')) {
                localStorage.removeItem(key);
            }
        }

        // Clear all sessionStorage items related to aydocorp
        for (let i = 0; i < sessionStorage.length; i++) {
            const key = sessionStorage.key(i);
            if (key && key.toLowerCase().includes('aydocorp')) {
                sessionStorage.removeItem(key);
            }
        }

        // Clear all cookies
        const cookies = document.cookie.split(";");
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i];
            const eqPos = cookie.indexOf("=");
            const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
            document.cookie = name + "=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        }

        console.log('[Portal] All authentication data cleared successfully');
    } catch (e) {
        console.error('[Portal] Error clearing storage:', e);
    }
}

// Unified handleLogout
function handleLogout() {
    // If Auth0 integration is available, use it for logout
    if (window.auth0Integration) {
        window.auth0Integration.logout();
        return;
    }

    // Legacy logout if Auth0 is not available
    // Clear all authentication data
    clearAllAuthData();

    // Redirect to login page
    window.location.href = '/index.html#login';
}

// Show settings
function showSettings() {
    // Implementation for settings panel
}

// Load section content
function loadSectionContent(section) {
    const mainContent = document.getElementById('portal-main');
    if (!mainContent) return;

    // Hide all sections first
    document.querySelectorAll('.portal-section').forEach(s => s.classList.remove('active'));

    // Create section if it doesn't exist
    let sectionElement = document.getElementById(section);
    if (!sectionElement) {
        sectionElement = document.createElement('section');
        sectionElement.id = section;
        sectionElement.className = 'portal-section';
        mainContent.appendChild(sectionElement);
    }

    // Show the section
    sectionElement.classList.add('active');

    // Load section-specific content
    switch (section) {
        case 'database':
            loadDatabaseSection(sectionElement);
            break;
        case 'profile':
            loadProfileSection(sectionElement);
            break;
        case 'bank':
            loadBankSection(sectionElement);
            break;
        // Add other sections as needed
    }
}

// Load database section
function loadDatabaseSection(container) {
    container.innerHTML = `
        <div class="database-content">
            <div class="employee-controls">
                <div class="search-container">
                    <input type="text" id="employee-database-search" placeholder="Search employees..." />
                    <button class="search-button">
                        <i class="fas fa-search"></i>
                    </button>
                </div>
                <div class="filter-container">
                    <select id="department-filter">
                        <option value="">All Departments</option>
                        <option value="operations">Operations</option>
                        <option value="logistics">Logistics</option>
                        <option value="management">Management</option>
                    </select>
                </div>
            </div>
            <div class="employee-list">
                <!-- Employee list will be populated dynamically -->
            </div>
        </div>
    `;

    // Initialize search functionality
    const searchInput = document.getElementById('employee-database-search');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            // Implement search functionality
            console.log('Searching for:', this.value);
        });
    }
}

// Load profile section
function loadProfileSection(container) {
    container.innerHTML = `
        <div class="profile-content">
            <div class="profile-header">
                <h2>My Profile</h2>
            </div>
            <div class="profile-details">
                <!-- Profile details will be populated dynamically -->
            </div>
        </div>
    `;
}

// Load bank section
function loadBankSection(container) {
    container.innerHTML = `
        <div class="bank-content">
            <div class="bank-header">
                <h2>AydoCorp Banking</h2>
                <p>Manage your finances across the galaxy</p>
            </div>

            <div class="bank-dashboard">
                <!-- Account Summary -->
                <div class="account-summary">
                    <h3>Account Summary</h3>
                    <div class="balance-card">
                        <div class="balance-info">
                            <span class="balance-label">Available Balance</span>
                            <span class="balance-amount">₩ 125,000</span>
                        </div>
                        <div class="balance-actions">
                            <button class="button primary deposit-btn">Deposit</button>
                            <button class="button withdraw-btn">Withdraw</button>
                            <button class="button transfer-btn">Transfer</button>
                        </div>
                    </div>
                </div>

                <!-- Transaction History -->
                <div class="transaction-history">
                    <h3>Recent Transactions</h3>
                    <div class="transaction-list">
                        <div class="transaction-item deposit">
                            <div class="transaction-icon">
                                <i class="fas fa-arrow-down"></i>
                            </div>
                            <div class="transaction-details">
                                <div class="transaction-title">Deposit from Mission Payout</div>
                                <div class="transaction-date">2953-04-15</div>
                            </div>
                            <div class="transaction-amount">+₩ 25,000</div>
                        </div>
                        <div class="transaction-item withdrawal">
                            <div class="transaction-icon">
                                <i class="fas fa-arrow-up"></i>
                            </div>
                            <div class="transaction-details">
                                <div class="transaction-title">Ship Maintenance</div>
                                <div class="transaction-date">2953-04-12</div>
                            </div>
                            <div class="transaction-amount">-₩ 15,000</div>
                        </div>
                        <div class="transaction-item transfer">
                            <div class="transaction-icon">
                                <i class="fas fa-exchange-alt"></i>
                            </div>
                            <div class="transaction-details">
                                <div class="transaction-title">Transfer to Sarah Chen</div>
                                <div class="transaction-date">2953-04-10</div>
                            </div>
                            <div class="transaction-amount">-₩ 5,000</div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Banking Forms (hidden by default) -->
            <div class="banking-forms">
                <div class="deposit-form form-panel" style="display: none;">
                    <h3>Deposit Funds</h3>
                    <form id="deposit-form">
                        <div class="form-group">
                            <label for="deposit-amount">Amount (₩)</label>
                            <input type="number" id="deposit-amount" min="1" required>
                        </div>
                        <div class="form-group">
                            <label for="deposit-source">Source</label>
                            <select id="deposit-source" required>
                                <option value="">Select Source</option>
                                <option value="mission">Mission Payout</option>
                                <option value="trading">Trading Profit</option>
                                <option value="mining">Mining Proceeds</option>
                                <option value="other">Other</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="deposit-notes">Notes (Optional)</label>
                            <textarea id="deposit-notes"></textarea>
                        </div>
                        <div class="form-actions">
                            <button type="submit" class="button primary">Confirm Deposit</button>
                            <button type="button" class="button cancel-form">Cancel</button>
                        </div>
                    </form>
                </div>

                <div class="withdraw-form form-panel" style="display: none;">
                    <h3>Withdraw Funds</h3>
                    <form id="withdraw-form">
                        <div class="form-group">
                            <label for="withdraw-amount">Amount (₩)</label>
                            <input type="number" id="withdraw-amount" min="1" required>
                        </div>
                        <div class="form-group">
                            <label for="withdraw-purpose">Purpose</label>
                            <select id="withdraw-purpose" required>
                                <option value="">Select Purpose</option>
                                <option value="maintenance">Ship Maintenance</option>
                                <option value="equipment">Equipment Purchase</option>
                                <option value="fuel">Fuel</option>
                                <option value="other">Other</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="withdraw-notes">Notes (Optional)</label>
                            <textarea id="withdraw-notes"></textarea>
                        </div>
                        <div class="form-actions">
                            <button type="submit" class="button primary">Confirm Withdrawal</button>
                            <button type="button" class="button cancel-form">Cancel</button>
                        </div>
                    </form>
                </div>

                <div class="transfer-form form-panel" style="display: none;">
                    <h3>Transfer Funds</h3>
                    <form id="transfer-form">
                        <div class="form-group">
                            <label for="transfer-amount">Amount (₩)</label>
                            <input type="number" id="transfer-amount" min="1" required>
                        </div>
                        <div class="form-group">
                            <label for="transfer-recipient">Recipient</label>
                            <input type="text" id="transfer-recipient" required>
                        </div>
                        <div class="form-group">
                            <label for="transfer-purpose">Purpose</label>
                            <input type="text" id="transfer-purpose">
                        </div>
                        <div class="form-group">
                            <label for="transfer-notes">Notes (Optional)</label>
                            <textarea id="transfer-notes"></textarea>
                        </div>
                        <div class="form-actions">
                            <button type="submit" class="button primary">Confirm Transfer</button>
                            <button type="button" class="button cancel-form">Cancel</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;

    // Initialize bank functionality
    initializeBankFunctionality(container);
}

// Initialize bank functionality
function initializeBankFunctionality(container) {
    // Get elements
    const depositBtn = container.querySelector('.deposit-btn');
    const withdrawBtn = container.querySelector('.withdraw-btn');
    const transferBtn = container.querySelector('.transfer-btn');
    const cancelButtons = container.querySelectorAll('.cancel-form');
    const depositForm = container.querySelector('.deposit-form');
    const withdrawForm = container.querySelector('.withdraw-form');
    const transferForm = container.querySelector('.transfer-form');
    const depositFormEl = container.querySelector('#deposit-form');
    const withdrawFormEl = container.querySelector('#withdraw-form');
    const transferFormEl = container.querySelector('#transfer-form');

    // Hide all forms initially
    const hideAllForms = () => {
        depositForm.style.display = 'none';
        withdrawForm.style.display = 'none';
        transferForm.style.display = 'none';
    };

    // Show deposit form
    depositBtn.addEventListener('click', () => {
        hideAllForms();
        depositForm.style.display = 'block';
    });

    // Show withdraw form
    withdrawBtn.addEventListener('click', () => {
        hideAllForms();
        withdrawForm.style.display = 'block';
    });

    // Show transfer form
    transferBtn.addEventListener('click', () => {
        hideAllForms();
        transferForm.style.display = 'block';
    });

    // Cancel buttons
    cancelButtons.forEach(button => {
        button.addEventListener('click', hideAllForms);
    });

    // Handle deposit form submission
    depositFormEl.addEventListener('submit', function(e) {
        e.preventDefault();
        const amount = document.getElementById('deposit-amount').value;
        const source = document.getElementById('deposit-source').value;
        const notes = document.getElementById('deposit-notes').value;

        console.log('Deposit:', { amount, source, notes });

        // Simulate successful deposit
        const currentBalance = parseFloat(container.querySelector('.balance-amount').textContent.replace('₩ ', '').replace(',', ''));
        const newBalance = currentBalance + parseFloat(amount);
        container.querySelector('.balance-amount').textContent = `₩ ${newBalance.toLocaleString()}`;

        // Add transaction to history
        const transactionList = container.querySelector('.transaction-list');
        const newTransaction = document.createElement('div');
        newTransaction.className = 'transaction-item deposit';
        newTransaction.innerHTML = `
            <div class="transaction-icon">
                <i class="fas fa-arrow-down"></i>
            </div>
            <div class="transaction-details">
                <div class="transaction-title">Deposit from ${document.getElementById('deposit-source').options[document.getElementById('deposit-source').selectedIndex].text}</div>
                <div class="transaction-date">${new Date().toISOString().split('T')[0]}</div>
            </div>
            <div class="transaction-amount">+₩ ${parseFloat(amount).toLocaleString()}</div>
        `;
        transactionList.insertBefore(newTransaction, transactionList.firstChild);

        // Reset form and hide
        this.reset();
        hideAllForms();

        // Show success message
        alert('Deposit successful!');
    });

    // Handle withdraw form submission
    withdrawFormEl.addEventListener('submit', function(e) {
        e.preventDefault();
        const amount = document.getElementById('withdraw-amount').value;
        const purpose = document.getElementById('withdraw-purpose').value;
        const notes = document.getElementById('withdraw-notes').value;

        console.log('Withdrawal:', { amount, purpose, notes });

        // Check if sufficient funds
        const currentBalance = parseFloat(container.querySelector('.balance-amount').textContent.replace('₩ ', '').replace(',', ''));
        if (parseFloat(amount) > currentBalance) {
            alert('Insufficient funds!');
            return;
        }

        // Simulate successful withdrawal
        const newBalance = currentBalance - parseFloat(amount);
        container.querySelector('.balance-amount').textContent = `₩ ${newBalance.toLocaleString()}`;

        // Add transaction to history
        const transactionList = container.querySelector('.transaction-list');
        const newTransaction = document.createElement('div');
        newTransaction.className = 'transaction-item withdrawal';
        newTransaction.innerHTML = `
            <div class="transaction-icon">
                <i class="fas fa-arrow-up"></i>
            </div>
            <div class="transaction-details">
                <div class="transaction-title">${document.getElementById('withdraw-purpose').options[document.getElementById('withdraw-purpose').selectedIndex].text}</div>
                <div class="transaction-date">${new Date().toISOString().split('T')[0]}</div>
            </div>
            <div class="transaction-amount">-₩ ${parseFloat(amount).toLocaleString()}</div>
        `;
        transactionList.insertBefore(newTransaction, transactionList.firstChild);

        // Reset form and hide
        this.reset();
        hideAllForms();

        // Show success message
        alert('Withdrawal successful!');
    });

    // Handle transfer form submission
    transferFormEl.addEventListener('submit', function(e) {
        e.preventDefault();
        const amount = document.getElementById('transfer-amount').value;
        const recipient = document.getElementById('transfer-recipient').value;
        const purpose = document.getElementById('transfer-purpose').value;
        const notes = document.getElementById('transfer-notes').value;

        console.log('Transfer:', { amount, recipient, purpose, notes });

        // Check if sufficient funds
        const currentBalance = parseFloat(container.querySelector('.balance-amount').textContent.replace('₩ ', '').replace(',', ''));
        if (parseFloat(amount) > currentBalance) {
            alert('Insufficient funds!');
            return;
        }

        // Simulate successful transfer
        const newBalance = currentBalance - parseFloat(amount);
        container.querySelector('.balance-amount').textContent = `₩ ${newBalance.toLocaleString()}`;

        // Add transaction to history
        const transactionList = container.querySelector('.transaction-list');
        const newTransaction = document.createElement('div');
        newTransaction.className = 'transaction-item transfer';
        newTransaction.innerHTML = `
            <div class="transaction-icon">
                <i class="fas fa-exchange-alt"></i>
            </div>
            <div class="transaction-details">
                <div class="transaction-title">Transfer to ${recipient}</div>
                <div class="transaction-date">${new Date().toISOString().split('T')[0]}</div>
            </div>
            <div class="transaction-amount">-₩ ${parseFloat(amount).toLocaleString()}</div>
        `;
        transactionList.insertBefore(newTransaction, transactionList.firstChild);

        // Reset form and hide
        this.reset();
        hideAllForms();

        // Show success message
        alert('Transfer successful!');
    });
}

// Show a clear login required message with a button
function showLoginRequiredMessage() {
    let msg = document.getElementById('login-required-message');
    if (!msg) {
        msg = document.createElement('div');
        msg.id = 'login-required-message';
        msg.className = 'login-message';
        msg.innerHTML = `
            <h3>Login Required</h3>
            <p>You must be logged in to access the Employee Portal.</p>
            <div class="login-options">
                <a href="/index.html#login" class="button">Go to Login Page</a>
            </div>
        `;
        document.body.appendChild(msg);
    } else {
        msg.style.display = '';
    }
} 
