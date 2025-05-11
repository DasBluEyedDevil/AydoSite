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
                <div class="header-left">
                    <h2>Aydo Intergalactic Corp.</h2>
                </div>
                <div class="header-right">
                    <a href="#" class="header-link"><i class="fas fa-cog"></i> Account Settings</a>
                    <a href="#" class="header-link"><i class="fas fa-power-off"></i> Logout</a>
                </div>
            </div>

            <div class="profile-panels">
                <!-- Left Pane - User Details -->
                <div class="profile-panel user-details-panel">
                    <div class="user-identification">
                        <h3 class="username">DasBlueEyedDevil</h3>
                        <div class="user-identifier">
                            <span class="user-icon"></span>
                            <span class="user-org">RSI</span>
                        </div>
                    </div>

                    <div class="user-role-status">
                        <span class="user-role">Chief Safety Officer</span>
                        <span class="user-status">Board Member</span>
                    </div>

                    <div class="user-accordion">
                        <div class="accordion-section">
                            <div class="accordion-header">
                                <span>PERMISSIONS</span>
                                <i class="fas fa-chevron-down"></i>
                            </div>
                            <div class="accordion-content">
                                <!-- Permissions content -->
                            </div>
                        </div>

                        <div class="accordion-section">
                            <div class="accordion-header">
                                <span>PROGRESSION</span>
                                <i class="fas fa-chevron-down"></i>
                            </div>
                            <div class="accordion-content">
                                <!-- Progression content -->
                            </div>
                        </div>

                        <div class="accordion-section">
                            <div class="accordion-header">
                                <span>AFFILIATIONS</span>
                                <i class="fas fa-chevron-down"></i>
                            </div>
                            <div class="accordion-content">
                                <button class="add-button"><i class="fas fa-plus"></i> Add Affiliation</button>
                            </div>
                        </div>

                        <div class="accordion-section">
                            <div class="accordion-header">
                                <span>SPECIALIZED SKILLS</span>
                                <i class="fas fa-chevron-down"></i>
                            </div>
                            <div class="accordion-content">
                                <button class="add-button"><i class="fas fa-plus"></i> Add Skill</button>
                            </div>
                        </div>

                        <div class="accordion-section">
                            <div class="accordion-header">
                                <span>AWARDS & CERTIFICATIONS</span>
                                <i class="fas fa-chevron-down"></i>
                            </div>
                            <div class="accordion-content">
                                <button class="add-button"><i class="fas fa-plus"></i> Add Award or Certification</button>
                            </div>
                        </div>

                        <div class="accordion-section">
                            <div class="accordion-header">
                                <span>ORGANIZATION REPUTATION</span>
                                <i class="fas fa-chevron-down"></i>
                            </div>
                            <div class="accordion-content">
                                <button class="add-button"><i class="fas fa-plus"></i> Add Organization</button>
                            </div>
                        </div>

                        <div class="accordion-section">
                            <div class="accordion-header">
                                <span>CONTACTS REPUTATION</span>
                                <i class="fas fa-chevron-down"></i>
                            </div>
                            <div class="accordion-content">
                                <button class="add-button"><i class="fas fa-plus"></i> Add Contact</button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Center Pane - Primary List/Content -->
                <div class="profile-panel primary-list-panel">
                    <div class="panel-tabs">
                        <div class="tab">USER DETAILS</div>
                        <div class="tab active">USER HANGAR [JS]</div>
                    </div>

                    <div class="panel-filters">
                        <span class="filter-toggle">Show Filters <i class="fas fa-chevron-down"></i></span>
                    </div>

                    <div class="panel-list">
                        <div class="list-item">
                            <div class="item-name">Aegis - Stealth Bomber Eclipse</div>
                            <div class="item-description">Eclipse</div>
                        </div>
                        <div class="list-item">
                            <div class="item-name">Aegis - Gunship Redeemer</div>
                            <div class="item-description">Redeemer</div>
                        </div>
                        <div class="list-item">
                            <div class="item-name">Anvil - Medical CBR Pisces Rescue</div>
                            <div class="item-description">Pisces Rescue</div>
                        </div>
                        <div class="list-item">
                            <div class="item-name">Anvil - Medium Fighter F7A Hornet MK II</div>
                            <div class="item-description">Hornet MK II</div>
                        </div>
                        <div class="list-item">
                            <div class="item-name">Aopoa - Light Fighter Khartu-al</div>
                            <div class="item-description">Khartu-al</div>
                        </div>
                    </div>
                </div>

                <!-- Right Pane - Secondary List/Details -->
                <div class="profile-panel secondary-list-panel">
                    <div class="panel-search">
                        <input type="text" placeholder="Search by Ship Model">
                        <i class="fas fa-search"></i>
                    </div>

                    <div class="panel-list">
                        <div class="list-item">
                            <div class="item-name">Aegis - Interdiction Avenger Stalker</div>
                            <div class="item-description">Avenger Stalker</div>
                        </div>
                        <div class="list-item">
                            <div class="item-name">Aegis - Light Freight Avenger Titan</div>
                            <div class="item-description">Avenger Titan</div>
                        </div>
                        <div class="list-item">
                            <div class="item-name">Aegis - Light Freight Avenger Titan Renegade</div>
                            <div class="item-description">Avenger Titan Renegade</div>
                        </div>
                        <div class="list-item">
                            <div class="item-name">Aegis - Interdiction Avenger Warlock</div>
                            <div class="item-description">Avenger Warlock</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Initialize accordion functionality
    const accordionHeaders = container.querySelectorAll('.accordion-header');
    accordionHeaders.forEach(header => {
        header.addEventListener('click', function() {
            this.classList.toggle('active');
            const content = this.nextElementSibling;
            if (content.style.maxHeight) {
                content.style.maxHeight = null;
                this.querySelector('i').classList.remove('fa-chevron-up');
                this.querySelector('i').classList.add('fa-chevron-down');
            } else {
                content.style.maxHeight = content.scrollHeight + "px";
                this.querySelector('i').classList.remove('fa-chevron-down');
                this.querySelector('i').classList.add('fa-chevron-up');
            }
        });
    });
}

// Load bank section
function loadBankSection(container) {
    container.innerHTML = `
        <div class="bank-content">
            <div class="bank-header">
                <h2>BANK BALANCE</h2>
            </div>

            <div class="bank-layout">
                <!-- Left Column - Actions -->
                <div class="bank-column bank-actions-column">
                    <button class="bank-action-button deposit-btn">
                        <span>Deposit Funds</span>
                        <i class="fas fa-plus"></i>
                    </button>
                    <button class="bank-action-button withdraw-btn">
                        <span>Withdraw Funds</span>
                        <i class="fas fa-minus"></i>
                    </button>
                    <button class="bank-action-button request-btn">
                        <span>Request Funds</span>
                        <i class="fas fa-question"></i>
                    </button>
                    <button class="bank-action-button balance-btn">
                        <span>Balance Funds</span>
                        <i class="fas fa-equals"></i>
                    </button>
                    <button class="bank-action-button clear-btn">
                        <span>Clear Transaction History</span>
                        <i class="fas fa-sync-alt"></i>
                    </button>
                </div>

                <!-- Center Column - Balance Display -->
                <div class="bank-column bank-balance-column">
                    <div class="balance-display">
                        <div class="balance-label">The Estimated Balance is:</div>
                        <div class="balance-amount">3,658,767</div>
                    </div>
                </div>

                <!-- Right Column - Transaction History -->
                <div class="bank-column bank-transactions-column">
                    <div class="transactions-header">
                        <h3>TRANSACTIONS</h3>
                    </div>
                    <div class="transactions-list">
                        <div class="transaction-record">
                            <div class="transaction-status rejected">Rejected</div>
                            <div class="transaction-description">[test text] - mor testing</div>
                            <div class="transaction-amount negative">-714,965</div>
                            <div class="transaction-timestamp">Sat, 03 May 2025 00:53:45 GMT</div>
                            <div class="transaction-user">Wormfood</div>
                        </div>
                        <div class="transaction-record">
                            <div class="transaction-status deposit">Deposit</div>
                            <div class="transaction-description">Udon's resurgent money</div>
                            <div class="transaction-amount positive">+3,280,133</div>
                            <div class="transaction-timestamp">Fri, 02 May 2025 14:22:10 GMT</div>
                            <div class="transaction-user">UdonMan</div>
                        </div>
                        <div class="transaction-record">
                            <div class="transaction-status withdraw">Withdraw</div>
                            <div class="transaction-description">04/30/25 Hauling Op (accurate number)</div>
                            <div class="transaction-amount negative">-1,250,000</div>
                            <div class="transaction-timestamp">Thu, 01 May 2025 09:15:33 GMT</div>
                            <div class="transaction-user">DasBlueEyedDevil</div>
                        </div>
                        <div class="transaction-record">
                            <div class="transaction-status deposit">Deposit</div>
                            <div class="transaction-description">clerical error</div>
                            <div class="transaction-amount positive">+2,343,599</div>
                            <div class="transaction-timestamp">Wed, 30 Apr 2025 16:42:21 GMT</div>
                            <div class="transaction-user">Admin</div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Admin Transaction Forms (hidden by default) -->
            <div class="admin-transaction-forms">
                <div class="transaction-form deposit-form" style="display: none;">
                    <h3>Add Deposit Transaction</h3>
                    <form id="admin-deposit-form">
                        <div class="form-group">
                            <label for="admin-deposit-amount">Amount</label>
                            <input type="number" id="admin-deposit-amount" min="1" required>
                        </div>
                        <div class="form-group">
                            <label for="admin-deposit-description">Description/Memo</label>
                            <textarea id="admin-deposit-description" required></textarea>
                        </div>
                        <div class="form-group">
                            <label for="admin-deposit-user">Associated User (Optional)</label>
                            <input type="text" id="admin-deposit-user">
                        </div>
                        <div class="form-actions">
                            <button type="submit" class="button primary">Add Deposit</button>
                            <button type="button" class="button cancel-form">Cancel</button>
                        </div>
                    </form>
                </div>

                <div class="transaction-form withdraw-form" style="display: none;">
                    <h3>Add Withdrawal Transaction</h3>
                    <form id="admin-withdraw-form">
                        <div class="form-group">
                            <label for="admin-withdraw-amount">Amount</label>
                            <input type="number" id="admin-withdraw-amount" min="1" required>
                        </div>
                        <div class="form-group">
                            <label for="admin-withdraw-description">Description/Memo</label>
                            <textarea id="admin-withdraw-description" required></textarea>
                        </div>
                        <div class="form-group">
                            <label for="admin-withdraw-user">Associated User (Optional)</label>
                            <input type="text" id="admin-withdraw-user">
                        </div>
                        <div class="form-actions">
                            <button type="submit" class="button primary">Add Withdrawal</button>
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
    const requestBtn = container.querySelector('.request-btn');
    const balanceBtn = container.querySelector('.balance-btn');
    const clearBtn = container.querySelector('.clear-btn');
    const cancelButtons = container.querySelectorAll('.cancel-form');
    const depositForm = container.querySelector('.deposit-form');
    const withdrawForm = container.querySelector('.withdraw-form');
    const adminDepositForm = container.querySelector('#admin-deposit-form');
    const adminWithdrawForm = container.querySelector('#admin-withdraw-form');

    // Hide all forms initially
    const hideAllForms = () => {
        depositForm.style.display = 'none';
        withdrawForm.style.display = 'none';
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

    // Request funds button
    requestBtn.addEventListener('click', () => {
        alert('Fund request has been submitted for approval.');
    });

    // Balance funds button
    balanceBtn.addEventListener('click', () => {
        alert('Funds have been balanced successfully.');
    });

    // Clear transaction history button
    clearBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to clear the transaction history? This action cannot be undone.')) {
            const transactionsList = container.querySelector('.transactions-list');
            transactionsList.innerHTML = '';
            alert('Transaction history has been cleared.');
        }
    });

    // Cancel buttons
    cancelButtons.forEach(button => {
        button.addEventListener('click', hideAllForms);
    });

    // Handle admin deposit form submission
    adminDepositForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const amount = document.getElementById('admin-deposit-amount').value;
        const description = document.getElementById('admin-deposit-description').value;
        const user = document.getElementById('admin-deposit-user').value || 'System';

        console.log('Admin Deposit:', { amount, description, user });

        // Update balance
        const currentBalance = parseInt(container.querySelector('.balance-amount').textContent.replace(/,/g, ''));
        const newBalance = currentBalance + parseInt(amount);
        container.querySelector('.balance-amount').textContent = newBalance.toLocaleString();

        // Add transaction to history
        const transactionsList = container.querySelector('.transactions-list');
        const newTransaction = document.createElement('div');
        newTransaction.className = 'transaction-record';

        const now = new Date();
        const timestamp = now.toUTCString();

        newTransaction.innerHTML = `
            <div class="transaction-status deposit">Deposit</div>
            <div class="transaction-description">${description}</div>
            <div class="transaction-amount positive">+${parseInt(amount).toLocaleString()}</div>
            <div class="transaction-timestamp">${timestamp}</div>
            <div class="transaction-user">${user}</div>
        `;

        transactionsList.insertBefore(newTransaction, transactionsList.firstChild);

        // Reset form and hide
        this.reset();
        hideAllForms();

        // Show success message
        alert('Deposit transaction added successfully!');
    });

    // Handle admin withdraw form submission
    adminWithdrawForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const amount = document.getElementById('admin-withdraw-amount').value;
        const description = document.getElementById('admin-withdraw-description').value;
        const user = document.getElementById('admin-withdraw-user').value || 'System';

        console.log('Admin Withdrawal:', { amount, description, user });

        // Update balance
        const currentBalance = parseInt(container.querySelector('.balance-amount').textContent.replace(/,/g, ''));
        const newBalance = currentBalance - parseInt(amount);
        container.querySelector('.balance-amount').textContent = newBalance.toLocaleString();

        // Add transaction to history
        const transactionsList = container.querySelector('.transactions-list');
        const newTransaction = document.createElement('div');
        newTransaction.className = 'transaction-record';

        const now = new Date();
        const timestamp = now.toUTCString();

        newTransaction.innerHTML = `
            <div class="transaction-status withdraw">Withdraw</div>
            <div class="transaction-description">${description}</div>
            <div class="transaction-amount negative">-${parseInt(amount).toLocaleString()}</div>
            <div class="transaction-timestamp">${timestamp}</div>
            <div class="transaction-user">${user}</div>
        `;

        transactionsList.insertBefore(newTransaction, transactionsList.firstChild);

        // Reset form and hide
        this.reset();
        hideAllForms();

        // Show success message
        alert('Withdrawal transaction added successfully!');
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
