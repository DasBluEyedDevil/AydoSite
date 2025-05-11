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
        case 'useful-links':
            loadUsefulLinksSection(sectionElement);
            break;
        case 'promo-pathway':
            loadPromoPathwaySection(sectionElement);
            break;
        case 'training':
            loadTrainingSection(sectionElement);
            break;
        case 'certifications':
            loadCertificationsSection(sectionElement);
            break;
        case 'aydo-express':
            loadAydoExpressSection(sectionElement);
            break;
        case 'empyrion':
            loadEmpyrionSection(sectionElement);
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

// Portal JavaScript

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize the portal UI components
    initializePortal();
});

// Initialize all portal components
function initializePortal() {
    setupNavigation();
    setupWelcomeMessage();
    setupImageCarousel();
    setupTabs();
    setupCalendarExpand();
    setupVerificationModal();
    
    // Load initial section (portal home)
    loadSectionContent('portal-home');
}

// Set up navigation between sections
function setupNavigation() {
    const navLinks = document.querySelectorAll('#portal-nav a');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Remove active class from all nav items
            document.querySelectorAll('#portal-nav li').forEach(item => {
                item.classList.remove('active');
            });
            
            // Add active class to clicked item's parent
            this.parentElement.classList.add('active');
            
            // Get the section to load
            const section = this.getAttribute('data-section');
            
            // Load the section content
            loadSectionContent(section);
        });
    });
}

// Set personalized welcome message
function setupWelcomeMessage() {
    // Try to get user info from localStorage (set by auth0-integration.js)
    const userStr = localStorage.getItem('aydocorpUser');
    let username = 'Employee';
    
    if (userStr) {
        try {
            const user = JSON.parse(userStr);
            username = user.nickname || user.name || 'Employee';
        } catch (error) {
            console.error('Error parsing user data:', error);
        }
    }
    
    // Set username in header and welcome message
    const userNameElements = document.querySelectorAll('#user-name, #welcome-user-name');
    userNameElements.forEach(el => {
        if (el) el.textContent = username;
    });
    
    // Set last login time
    const lastLoginTime = document.getElementById('last-login-time');
    if (lastLoginTime) {
        const lastLogin = localStorage.getItem('lastLogin') || new Date().toISOString();
        const formattedDate = new Date(lastLogin).toLocaleString();
        lastLoginTime.textContent = formattedDate;
        
        // Update last login time for next visit
        localStorage.setItem('lastLogin', new Date().toISOString());
    }
}

// Set up image carousel
function setupImageCarousel() {
    const carousel = document.querySelector('.org-gallery-carousel');
    if (!carousel) return;
    
    const track = carousel.querySelector('.carousel-track');
    const slides = Array.from(track.children);
    const nextButton = carousel.querySelector('.carousel-next');
    const prevButton = carousel.querySelector('.carousel-prev');
    
    if (!track || !slides.length || !nextButton || !prevButton) return;
    
    // Set slide width and position
    const slideWidth = slides[0].getBoundingClientRect().width;
    slides.forEach((slide, index) => {
        slide.style.left = slideWidth * index + 'px';
    });
    
    let currentIndex = 0;
    
    // Move to slide function
    function moveToSlide(targetIndex) {
        if (targetIndex < 0) {
            targetIndex = slides.length - 1;
        } else if (targetIndex >= slides.length) {
            targetIndex = 0;
        }
        
        track.style.transform = `translateX(-${slideWidth * targetIndex}px)`;
        currentIndex = targetIndex;
    }
    
    // Handle next/prev clicks
    nextButton.addEventListener('click', () => {
        moveToSlide(currentIndex + 1);
    });
    
    prevButton.addEventListener('click', () => {
        moveToSlide(currentIndex - 1);
    });
    
    // Auto advance slides
    let carouselInterval = setInterval(() => {
        moveToSlide(currentIndex + 1);
    }, 5000);
    
    // Pause auto advance on hover
    carousel.addEventListener('mouseenter', () => {
        clearInterval(carouselInterval);
    });
    
    carousel.addEventListener('mouseleave', () => {
        carouselInterval = setInterval(() => {
            moveToSlide(currentIndex + 1);
        }, 5000);
    });
}

// Set up tabbed content
function setupTabs() {
    const tabsContainers = document.querySelectorAll('.archives-tabs, .hierarchy-tabs');
    
    tabsContainers.forEach(container => {
        const tabs = container.querySelectorAll('.tab');
        
        tabs.forEach(tab => {
            tab.addEventListener('click', function() {
                // Remove active class from all tabs in this container
                container.querySelectorAll('.tab').forEach(t => {
                    t.classList.remove('active');
                });
                
                // Add active class to clicked tab
                this.classList.add('active');
                
                // Get tab content id
                const tabContentId = this.getAttribute('data-tab') + '-content';
                
                // Get parent section of tabs container
                const parentSection = container.closest('.portal-section');
                
                // Hide all tab contents in this section
                parentSection.querySelectorAll('.tab-content').forEach(content => {
                    content.classList.add('hidden');
                });
                
                // Show selected tab content
                const tabContent = document.getElementById(tabContentId);
                if (tabContent) {
                    tabContent.classList.remove('hidden');
                }
            });
        });
    });
}

// Set up calendar expand functionality
function setupCalendarExpand() {
    const expandButton = document.querySelector('.expand-calendar-button');
    if (!expandButton) return;
    
    // Create modal elements if they don't exist
    let calendarModal = document.querySelector('.calendar-modal');
    if (!calendarModal) {
        calendarModal = document.createElement('div');
        calendarModal.className = 'calendar-modal';
        calendarModal.innerHTML = `
            <div class="calendar-modal-content">
                <button class="close-calendar-modal"><i class="fas fa-times"></i></button>
                <h2>Upcoming Events Calendar</h2>
                <div id="modal-calendar" class="expanded-calendar"></div>
            </div>
        `;
        document.body.appendChild(calendarModal);
        
        // Set up close button
        const closeButton = calendarModal.querySelector('.close-calendar-modal');
        closeButton.addEventListener('click', () => {
            calendarModal.classList.remove('active');
        });
    }
    
    // Handle expand button click
    expandButton.addEventListener('click', () => {
        calendarModal.classList.add('active');
        
        // Clone calendar content to modal
        const originalCalendar = document.getElementById('events-calendar');
        const modalCalendar = document.getElementById('modal-calendar');
        
        if (originalCalendar && modalCalendar) {
            modalCalendar.innerHTML = originalCalendar.innerHTML;
        }
    });
}

// Set up account verification modal
function setupVerificationModal() {
    const modal = document.getElementById('verify-account-modal');
    if (!modal) return;
    
    // Generate unique verification code
    const generateVerificationCode = () => {
        const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        let code = '';
        for (let i = 0; i < 8; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
            if (i === 3) code += '-';
        }
        return code;
    };
    
    // Set unique code
    const codeElement = document.getElementById('unique-verify-code');
    if (codeElement) {
        codeElement.textContent = generateVerificationCode();
    }
    
    // Copy code button
    const copyButton = document.getElementById('copy-code-btn');
    if (copyButton) {
        copyButton.addEventListener('click', () => {
            const codeText = document.getElementById('verification-code');
            if (codeText) {
                navigator.clipboard.writeText(codeText.textContent)
                    .then(() => {
                        copyButton.textContent = 'Copied!';
                        setTimeout(() => {
                            copyButton.textContent = 'Copy Code';
                        }, 2000);
                    })
                    .catch(err => {
                        console.error('Failed to copy: ', err);
                    });
            }
        });
    }
    
    // Verify button
    const verifyButton = document.getElementById('verify-profile-btn');
    if (verifyButton) {
        verifyButton.addEventListener('click', () => {
            // Simulate verification process
            verifyButton.disabled = true;
            verifyButton.textContent = 'Verifying...';
            
            // Simulate API call with timeout
            setTimeout(() => {
                verifyButton.textContent = 'Verification Successful!';
                verifyButton.classList.add('success');
                
                // Close modal after success
                setTimeout(() => {
                    modal.classList.remove('active');
                    
                    // Reset button state for next time
                    setTimeout(() => {
                        verifyButton.disabled = false;
                        verifyButton.textContent = 'Verify My Profile';
                        verifyButton.classList.remove('success');
                    }, 1000);
                }, 2000);
            }, 3000);
        });
    }
    
    // Close modal button
    const closeButton = modal.querySelector('.close-modal');
    if (closeButton) {
        closeButton.addEventListener('click', () => {
            modal.classList.remove('active');
        });
    }
    
    // Show modal on first visit (simulating auth check)
    const hasVerified = localStorage.getItem('rsiVerified');
    if (!hasVerified) {
        // Wait for login check to complete
        setTimeout(() => {
            modal.classList.add('active');
            localStorage.setItem('rsiVerified', 'pending');
        }, 2000);
    }
}

// Load section content
function loadSectionContent(section) {
    const mainContent = document.getElementById('portal-main');
    if (!mainContent) return;

    // Hide all sections first
    document.querySelectorAll('.portal-section').forEach(s => s.classList.remove('active'));

    // Get or create section element
    let sectionElement = document.getElementById(section);
    if (!sectionElement) {
        sectionElement = document.createElement('section');
        sectionElement.id = section;
        sectionElement.className = 'portal-section';
        mainContent.appendChild(sectionElement);
    }

    // Show the section
    sectionElement.classList.add('active');

    // Load section-specific content if not already loaded
    if (sectionElement.children.length === 0) {
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
            case 'useful-links':
                loadUsefulLinksSection(sectionElement);
                break;
            case 'promo-pathway':
                loadPromoPathwaySection(sectionElement);
                break;
            case 'training':
                loadTrainingSection(sectionElement);
                break;
            case 'certifications':
                loadCertificationsSection(sectionElement);
                break;
            case 'aydo-express':
                loadAydoExpressSection(sectionElement);
                break;
            case 'empyrion':
                loadEmpyrionSection(sectionElement);
                break;
            // Other sections can be added here
        }
    }
}

// Load subsidiary section: AydoExpress
function loadAydoExpressSection(container) {
    container.innerHTML = `
        <div class="subsidiary-container">
            <h2>AydoExpress</h2>
            <div class="subsidiary-description">
                <p>AydoExpress specializes in rapid delivery and courier services across multiple star systems. Our fleet of specialized light and medium transport ships ensures timely delivery of priority cargo.</p>
            </div>
            
            <div class="subsidiary-tabs">
                <div class="tab active" data-subsid-tab="ae-overview">Overview</div>
                <div class="tab" data-subsid-tab="ae-services">Services</div>
                <div class="tab" data-subsid-tab="ae-fleet">Fleet</div>
                <div class="tab" data-subsid-tab="ae-team">Team</div>
            </div>
            
            <div class="subsid-tab-content active" id="ae-overview-content">
                <h3>AydoExpress Overview</h3>
                <p>Founded in 2951 to address the growing need for secure express delivery services, AydoExpress has grown to become a trusted name in rapid logistics.</p>
                
                <div class="stats-grid">
                    <div class="stat-card">
                        <i class="fas fa-shipping-fast"></i>
                        <h4>Express Deliveries</h4>
                        <p class="stat-number">784</p>
                        <p class="stat-detail">Last Quarter</p>
                    </div>
                    <div class="stat-card">
                        <i class="fas fa-route"></i>
                        <h4>Active Routes</h4>
                        <p class="stat-number">24</p>
                        <p class="stat-detail">Across 6 Systems</p>
                    </div>
                    <div class="stat-card">
                        <i class="fas fa-shuttle-van"></i>
                        <h4>Dedicated Vessels</h4>
                        <p class="stat-number">18</p>
                        <p class="stat-detail">Express Fleet</p>
                    </div>
                </div>
            </div>
            
            <div class="subsid-tab-content" id="ae-services-content">
                <h3>Services Offered</h3>
                <ul class="services-list">
                    <li>
                        <h4>Priority Cargo Transport</h4>
                        <p>Express shipping of time-sensitive materials between major hubs.</p>
                    </li>
                    <li>
                        <h4>Secure Document Delivery</h4>
                        <p>End-to-end encrypted physical document transportation.</p>
                    </li>
                    <li>
                        <h4>Medical Supply Logistics</h4>
                        <p>Rapid deployment of critical medical supplies to remote locations.</p>
                    </li>
                    <li>
                        <h4>VIP Transport</h4>
                        <p>Secure and discreet personnel transportation for high-value clients.</p>
                    </li>
                </ul>
            </div>
            
            <div class="subsid-tab-content" id="ae-fleet-content">
                <h3>Express Fleet</h3>
                <div class="fleet-gallery">
                    <div class="ship-card">
                        <img src="images/ships/mercury.jpg" alt="Mercury Star Runner" />
                        <h4>Mercury Star Runner</h4>
                        <p>Our flagship data couriers, specialized in secure information transport.</p>
                    </div>
                    <div class="ship-card">
                        <img src="images/ships/cutlass-red.jpg" alt="Cutlass Red" />
                        <h4>Cutlass Red</h4>
                        <p>Modified for rapid medical supply delivery with stasis containers.</p>
                    </div>
                    <div class="ship-card">
                        <img src="images/ships/freelancer-max.jpg" alt="Freelancer MAX" />
                        <h4>Freelancer MAX</h4>
                        <p>Our medium capacity express haulers for larger priority shipments.</p>
                    </div>
                </div>
            </div>
            
            <div class="subsid-tab-content" id="ae-team-content">
                <h3>Leadership Team</h3>
                <div class="team-members">
                    <div class="team-member">
                        <div class="member-avatar">
                            <img src="images/avatars/placeholder.jpg" alt="TBD" />
                        </div>
                        <div class="member-info">
                            <h4>Director Position</h4>
                            <p class="member-username">TBD</p>
                            <p class="member-bio">This leadership position oversees all AydoExpress operations.</p>
                        </div>
                    </div>
                    <div class="team-member">
                        <div class="member-avatar">
                            <img src="images/avatars/delta-dart.jpg" alt="Delta_Dart_42" />
                        </div>
                        <div class="member-info">
                            <h4>Manager</h4>
                            <p class="member-username">Delta_Dart_42</p>
                            <p class="member-bio">Coordinates express delivery operations in the Stanton system.</p>
                        </div>
                    </div>
                    <div class="team-member">
                        <div class="member-avatar">
                            <img src="images/avatars/mr-green.jpg" alt="MR-GR33N" />
                        </div>
                        <div class="member-info">
                            <h4>Manager</h4>
                            <p class="member-username">MR-GR33N</p>
                            <p class="member-bio">Oversees specialized courier operations and VIP transportation.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Initialize subsidiary tabs
    setupSubsidiaryTabs(container);
}

// Load subsidiary section: Empyrion Industries
function loadEmpyrionSection(container) {
    container.innerHTML = `
        <div class="subsidiary-container">
            <h2>Empyrion Industries</h2>
            <div class="subsidiary-description">
                <p>Empyrion Industries represents our manufacturing and resource processing division, specializing in raw material extraction, refinement, and production of industrial components.</p>
            </div>
            
            <div class="subsidiary-tabs">
                <div class="tab active" data-subsid-tab="ei-overview">Overview</div>
                <div class="tab" data-subsid-tab="ei-operations">Operations</div>
                <div class="tab" data-subsid-tab="ei-facilities">Facilities</div>
                <div class="tab" data-subsid-tab="ei-team">Team</div>
            </div>
            
            <div class="subsid-tab-content active" id="ei-overview-content">
                <h3>Empyrion Industries Overview</h3>
                <p>Established in 2952, Empyrion Industries was formed to diversify AydoCorp's operations into manufacturing and resource processing, creating vertical integration with our logistics operations.</p>
                
                <div class="stats-grid">
                    <div class="stat-card">
                        <i class="fas fa-gem"></i>
                        <h4>Resources Processed</h4>
                        <p class="stat-number">138,420</p>
                        <p class="stat-detail">SCU Last Quarter</p>
                    </div>
                    <div class="stat-card">
                        <i class="fas fa-industry"></i>
                        <h4>Production Facilities</h4>
                        <p class="stat-number">3</p>
                        <p class="stat-detail">Major Installations</p>
                    </div>
                    <div class="stat-card">
                        <i class="fas fa-cogs"></i>
                        <h4>Components Produced</h4>
                        <p class="stat-number">24,865</p>
                        <p class="stat-detail">Last Quarter</p>
                    </div>
                </div>
            </div>
            
            <div class="subsid-tab-content" id="ei-operations-content">
                <h3>Primary Operations</h3>
                <ul class="operations-list">
                    <li>
                        <h4>Mineral Extraction</h4>
                        <p>Mining operations focusing on titanium, aluminum, and copper deposits.</p>
                    </li>
                    <li>
                        <h4>Gas Refinement</h4>
                        <p>Collection and processing of hydrogen, nitrogen, and chlorine gases.</p>
                    </li>
                    <li>
                        <h4>Component Manufacturing</h4>
                        <p>Production of industrial components for ship and station maintenance.</p>
                    </li>
                    <li>
                        <h4>Research & Development</h4>
                        <p>Specialized division focused on improving extraction and manufacturing efficiency.</p>
                    </li>
                </ul>
            </div>
            
            <div class="subsid-tab-content" id="ei-facilities-content">
                <h3>Major Facilities</h3>
                <div class="facilities-gallery">
                    <div class="facility-card">
                        <img src="images/facilities/processing-plant.jpg" alt="Horizon Processing Plant" />
                        <h4>Horizon Processing Plant</h4>
                        <p>Our primary mineral processing facility located on ArcCorp.</p>
                    </div>
                    <div class="facility-card">
                        <img src="images/facilities/research-station.jpg" alt="Nexus Research Station" />
                        <h4>Nexus Research Station</h4>
                        <p>R&D facility in high orbit around Crusader.</p>
                    </div>
                    <div class="facility-card">
                        <img src="images/facilities/manufacturing-complex.jpg" alt="Vanguard Manufacturing Complex" />
                        <h4>Vanguard Manufacturing Complex</h4>
                        <p>Component production facility located on Hurston.</p>
                    </div>
                </div>
            </div>
            
            <div class="subsid-tab-content" id="ei-team-content">
                <h3>Leadership Team</h3>
                <div class="team-members">
                    <div class="team-member">
                        <div class="member-avatar">
                            <img src="images/avatars/placeholder.jpg" alt="TBD" />
                        </div>
                        <div class="member-info">
                            <h4>Director Position</h4>
                            <p class="member-username">TBD</p>
                            <p class="member-bio">This leadership position oversees all Empyrion Industries operations.</p>
                        </div>
                    </div>
                    <div class="team-member">
                        <div class="member-avatar">
                            <img src="images/avatars/arcero.jpg" alt="ArcZeroNine" />
                        </div>
                        <div class="member-info">
                            <h4>Manager</h4>
                            <p class="member-username">ArcZeroNine</p>
                            <p class="member-bio">Manages mineral extraction and processing operations.</p>
                        </div>
                    </div>
                    <div class="team-member">
                        <div class="member-avatar">
                            <img src="images/avatars/rambo.jpg" alt="RamboSteph" />
                        </div>
                        <div class="member-info">
                            <h4>Manager</h4>
                            <p class="member-username">RamboSteph</p>
                            <p class="member-bio">Oversees component manufacturing and R&D divisions.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Initialize subsidiary tabs
    setupSubsidiaryTabs(container);
}

// Load resources section: Useful Links
function loadUsefulLinksSection(container) {
    container.innerHTML = `
        <div class="resources-container">
            <h2>Useful Links & Resources</h2>
            
            <div class="resources-grid">
                <div class="resource-category">
                    <h3>Official Resources</h3>
                    <ul class="resource-list">
                        <li>
                            <a href="https://robertsspaceindustries.com/" target="_blank">
                                <i class="fas fa-external-link-alt"></i>
                                RSI Official Website
                            </a>
                        </li>
                        <li>
                            <a href="https://robertsspaceindustries.com/spectrum/community/SC" target="_blank">
                                <i class="fas fa-external-link-alt"></i>
                                Spectrum Forums
                            </a>
                        </li>
                        <li>
                            <a href="https://status.robertsspaceindustries.com/" target="_blank">
                                <i class="fas fa-external-link-alt"></i>
                                RSI Status Page
                            </a>
                        </li>
                        <li>
                            <a href="https://support.robertsspaceindustries.com/" target="_blank">
                                <i class="fas fa-external-link-alt"></i>
                                RSI Support
                            </a>
                        </li>
                    </ul>
                </div>
                
                <div class="resource-category">
                    <h3>Community Tools</h3>
                    <ul class="resource-list">
                        <li>
                            <a href="https://www.erkul.games/" target="_blank">
                                <i class="fas fa-external-link-alt"></i>
                                Erkul DPS Calculator
                            </a>
                        </li>
                        <li>
                            <a href="https://finder.cstone.space/" target="_blank">
                                <i class="fas fa-external-link-alt"></i>
                                Cornerstone Trade & Price Finder
                            </a>
                        </li>
                        <li>
                            <a href="https://sc-trade.tools/" target="_blank">
                                <i class="fas fa-external-link-alt"></i>
                                SC Trade Tools
                            </a>
                        </li>
                        <li>
                            <a href="https://uexcorp.space/" target="_blank">
                                <i class="fas fa-external-link-alt"></i>
                                UEX Corp Trading Platform
                            </a>
                        </li>
                    </ul>
                </div>
                
                <div class="resource-category">
                    <h3>Organization Resources</h3>
                    <ul class="resource-list">
                        <li>
                            <a href="https://discord.gg/aydocorp" target="_blank">
                                <i class="fab fa-discord"></i>
                                AydoCorp Discord Server
                            </a>
                        </li>
                        <li>
                            <a href="#">
                                <i class="fas fa-file-alt"></i>
                                Employee Handbook (PDF)
                            </a>
                        </li>
                        <li>
                            <a href="#">
                                <i class="fas fa-calendar-alt"></i>
                                Event Calendar
                            </a>
                        </li>
                        <li>
                            <a href="#">
                                <i class="fas fa-ship"></i>
                                Fleet Management System
                            </a>
                        </li>
                    </ul>
                </div>
                
                <div class="resource-category">
                    <h3>Reference Materials</h3>
                    <ul class="resource-list">
                        <li>
                            <a href="https://starcitizen.tools/" target="_blank">
                                <i class="fas fa-external-link-alt"></i>
                                Star Citizen Wiki
                            </a>
                        </li>
                        <li>
                            <a href="https://cstone.space/resources/knowledge-base" target="_blank">
                                <i class="fas fa-external-link-alt"></i>
                                Cornerstone Knowledge Base
                            </a>
                        </li>
                        <li>
                            <a href="https://fleetyards.net/" target="_blank">
                                <i class="fas fa-external-link-alt"></i>
                                FleetYards Ship Database
                            </a>
                        </li>
                        <li>
                            <a href="https://www.starship42.com/" target="_blank">
                                <i class="fas fa-external-link-alt"></i>
                                Starship42 Ship Comparison
                            </a>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    `;
}

// Load subsidiary tab content
function setupSubsidiaryTabs(container) {
    const tabs = container.querySelectorAll('[data-subsid-tab]');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            // Remove active class from all tabs
            container.querySelectorAll('[data-subsid-tab]').forEach(t => {
                t.classList.remove('active');
            });
            
            // Add active class to clicked tab
            this.classList.add('active');
            
            // Get content ID from tab attribute
            const contentId = this.getAttribute('data-subsid-tab') + '-content';
            
            // Hide all content sections
            container.querySelectorAll('.subsid-tab-content').forEach(content => {
                content.classList.remove('active');
            });
            
            // Show selected content
            const selectedContent = container.querySelector('#' + contentId);
            if (selectedContent) {
                selectedContent.classList.add('active');
            }
        });
    });
}

// Load promotional pathway section
function loadPromoPathwaySection(container) {
    container.innerHTML = `
        <div class="pathway-container">
            <h2>Promotional Pathway</h2>
            <p>The following outlines the steps and requirements for advancement within AydoCorp. Each step represents a significant milestone in your career with us.</p>
            
            <div class="pathway-steps">
                <div class="pathway-step">
                    <div class="step-number">1</div>
                    <div class="step-content">
                        <h3>Intern/Freelancer → Employee</h3>
                        <p>The first step in your career with AydoCorp is completing the transition from Intern/Freelancer to full Employee status. This involves demonstrating reliability, basic competence in your role, and integration with our team culture.</p>
                        
                        <div class="step-requirements">
                            <h4>Requirements:</h4>
                            <ul>
                                <li>At least 2 months of active participation</li>
                                <li>Participation in at least 5 company operations</li>
                                <li>Basic knowledge of company procedures and policies</li>
                                <li>Recommendation from a Supervisor or higher</li>
                            </ul>
                        </div>
                    </div>
                </div>
                
                <div class="pathway-step">
                    <div class="step-number">2</div>
                    <div class="step-content">
                        <h3>Employee → Senior Employee</h3>
                        <p>Senior Employees have demonstrated consistent performance, initiative, and deep knowledge of their operational area. This rank represents a mastery of the basic skills required for your role.</p>
                        
                        <div class="step-requirements">
                            <h4>Requirements:</h4>
                            <ul>
                                <li>At least 6 months as an Employee</li>
                                <li>Participation in at least 20 company operations</li>
                                <li>Acquisition of at least 1 role-specific certification</li>
                                <li>Demonstrated initiative in improving operations</li>
                                <li>Recommendation from a Manager or higher</li>
                            </ul>
                        </div>
                    </div>
                </div>
                
                <div class="pathway-step">
                    <div class="step-number">3</div>
                    <div class="step-content">
                        <h3>Senior Employee → Supervisor</h3>
                        <p>Supervisors begin to take on leadership responsibilities, overseeing operations and mentoring junior employees. This rank requires both technical expertise and developing leadership skills.</p>
                        
                        <div class="step-requirements">
                            <h4>Requirements:</h4>
                            <ul>
                                <li>At least 4 months as a Senior Employee</li>
                                <li>Led at least 10 company operations</li>
                                <li>Acquisition of at least 2 role-specific certifications</li>
                                <li>Demonstrated ability to train and mentor others</li>
                                <li>Consistent positive feedback from team members</li>
                                <li>Recommendation from a Manager or higher</li>
                            </ul>
                        </div>
                    </div>
                </div>
                
                <div class="pathway-step">
                    <div class="step-number">4</div>
                    <div class="step-content">
                        <h3>Supervisor → Manager</h3>
                        <p>Managers oversee entire operational areas, developing strategies and leading teams to achieve company objectives. This rank requires strong leadership, strategic thinking, and operational excellence.</p>
                        
                        <div class="step-requirements">
                            <h4>Requirements:</h4>
                            <ul>
                                <li>At least 6 months as a Supervisor</li>
                                <li>Developed and implemented at least 2 department improvements</li>
                                <li>Successfully trained at least 3 junior employees to advancement</li>
                                <li>Acquisition of Leadership Certification</li>
                                <li>Demonstrated strategic thinking and problem-solving</li>
                                <li>Recommendation from a Director or Board Member</li>
                            </ul>
                        </div>
                    </div>
                </div>
                
                <div class="pathway-step">
                    <div class="step-number">5</div>
                    <div class="step-content">
                        <h3>Manager → Director</h3>
                        <p>Directors lead entire subsidiaries or major organizational divisions, setting direction and ensuring alignment with corporate strategy. This represents executive leadership within the organization.</p>
                        
                        <div class="step-requirements">
                            <h4>Requirements:</h4>
                            <ul>
                                <li>At least 8 months as a Manager</li>
                                <li>Development of long-term strategic initiatives</li>
                                <li>Demonstrated significant improvement in operational metrics</li>
                                <li>Acquisition of Executive Leadership Certification</li>
                                <li>Exceptional communication and interpersonal skills</li>
                                <li>Board approval required</li>
                            </ul>
                        </div>
                    </div>
                </div>
                
                <div class="pathway-step">
                    <div class="step-number">6</div>
                    <div class="step-content">
                        <h3>Director → Board Member</h3>
                        <p>Board Members guide the overall direction of AydoCorp, making high-level decisions that impact the entire organization. This represents the pinnacle of leadership within our company.</p>
                        
                        <div class="step-requirements">
                            <h4>Requirements:</h4>
                            <ul>
                                <li>Exceptional long-term service to the company</li>
                                <li>Demonstrated visionary leadership</li>
                                <li>Significant contributions to company growth and success</li>
                                <li>Unanimous approval of existing Board</li>
                                <li>Only considered when Board position is available</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="subsidiary-note">
                <h3>Subsidiary Rank Progression</h3>
                <p>Advancement within subsidiaries (AydoExpress and Empyrion Industries) follows a parallel track to the main organization ranks. Employees can progress through subsidiary ranks based on specialization and performance within that specific division.</p>
                <p>Subsidiary ranks provide additional compensation and specialized recognition while maintaining your primary organizational rank. For specific subsidiary advancement paths, please consult with your subsidiary leadership.</p>
            </div>
        </div>
    `;
}

// Load certifications section
function loadCertificationsSection(container) {
    container.innerHTML = `
        <div class="certifications-container">
            <h2>Certifications Program</h2>
            <p>AydoCorp offers a comprehensive certification program to recognize specialized skills and competencies. Earning certifications demonstrates your expertise and qualifies you for advancement and additional responsibilities.</p>
            
            <div class="certifications-grid">
                <div class="certification-card">
                    <div class="certification-icon">
                        <i class="fas fa-truck-loading"></i>
                    </div>
                    <h3 class="certification-title">Logistics Specialist</h3>
                    <p class="certification-description">Demonstrates proficiency in cargo handling, route planning, and logistics management for various cargo types.</p>
                    
                    <div class="certification-requirements">
                        <h4>Requirements:</h4>
                        <ul>
                            <li>Participation in at least 15 cargo operations</li>
                            <li>Successful planning and execution of 5 multi-jump trade routes</li>
                            <li>Knowledge assessment of cargo types and handling procedures</li>
                            <li>Practical demonstration of loading/unloading procedures</li>
                        </ul>
                    </div>
                    
                    <div class="certification-apply">
                        <button class="apply-button">Apply for Certification</button>
                    </div>
                </div>
                
                <div class="certification-card">
                    <div class="certification-icon">
                        <i class="fas fa-fighter-jet"></i>
                    </div>
                    <h3 class="certification-title">Combat Escort</h3>
                    <p class="certification-description">Validates combat proficiency in protecting cargo vessels and responding to hostile threats during operations.</p>
                    
                    <div class="certification-requirements">
                        <h4>Requirements:</h4>
                        <ul>
                            <li>Participation in at least 10 escort missions</li>
                            <li>Successful defense in at least 3 hostile encounters</li>
                            <li>Demonstration of formation flying and escort protocols</li>
                            <li>Knowledge assessment of threat identification and response</li>
                        </ul>
                    </div>
                    
                    <div class="certification-apply">
                        <button class="apply-button">Apply for Certification</button>
                    </div>
                </div>
                
                <div class="certification-card">
                    <div class="certification-icon">
                        <i class="fas fa-satellite-dish"></i>
                    </div>
                    <h3 class="certification-title">Communications Specialist</h3>
                    <p class="certification-description">Recognizes expertise in maintaining clear communications, coordinating operations, and managing information flow.</p>
                    
                    <div class="certification-requirements">
                        <h4>Requirements:</h4>
                        <ul>
                            <li>Served as communications lead for at least 8 operations</li>
                            <li>Demonstrated proficiency with company communication systems</li>
                            <li>Development of at least 1 communication improvement</li>
                            <li>Knowledge assessment of protocols and procedures</li>
                        </ul>
                    </div>
                    
                    <div class="certification-apply">
                        <button class="apply-button">Apply for Certification</button>
                    </div>
                </div>
                
                <div class="certification-card">
                    <div class="certification-icon">
                        <i class="fas fa-mining"></i>
                    </div>
                    <h3 class="certification-title">Mining Operations</h3>
                    <p class="certification-description">Certifies expertise in mineral extraction, processing, and refined materials handling for Empyrion Industries.</p>
                    
                    <div class="certification-requirements">
                        <h4>Requirements:</h4>
                        <ul>
                            <li>Participation in at least 12 mining operations</li>
                            <li>Successful extraction of at least 5 different mineral types</li>
                            <li>Knowledge assessment of mineral identification and value</li>
                            <li>Practical demonstration of extraction equipment operation</li>
                        </ul>
                    </div>
                    
                    <div class="certification-apply">
                        <button class="apply-button">Apply for Certification</button>
                    </div>
                </div>
                
                <div class="certification-card">
                    <div class="certification-icon">
                        <i class="fas fa-first-aid"></i>
                    </div>
                    <h3 class="certification-title">Medical Response</h3>
                    <p class="certification-description">Validates ability to provide emergency medical care during operations and manage medical situations.</p>
                    
                    <div class="certification-requirements">
                        <h4>Requirements:</h4>
                        <ul>
                            <li>Completion of medical response training course</li>
                            <li>Practical demonstration of emergency procedures</li>
                            <li>Knowledge assessment of treatment protocols</li>
                            <li>Participation as medical officer in at least 5 operations</li>
                        </ul>
                    </div>
                    
                    <div class="certification-apply">
                        <button class="apply-button">Apply for Certification</button>
                    </div>
                </div>
                
                <div class="certification-card">
                    <div class="certification-icon">
                        <i class="fas fa-users-cog"></i>
                    </div>
                    <h3 class="certification-title">Leadership</h3>
                    <p class="certification-description">Recognizes ability to lead teams effectively, manage operations, and develop team members. Required for Manager rank.</p>
                    
                    <div class="certification-requirements">
                        <h4>Requirements:</h4>
                        <ul>
                            <li>Successfully led at least 15 company operations</li>
                            <li>Demonstrated ability to resolve conflicts and problems</li>
                            <li>Developed at least 2 team members to advancement</li>
                            <li>Completion of leadership training program</li>
                            <li>Consistently positive team feedback</li>
                        </ul>
                    </div>
                    
                    <div class="certification-apply">
                        <button class="apply-button">Apply for Certification</button>
                    </div>
                </div>
            </div>
            
            <div class="certification-note">
                <h3>Certification Process</h3>
                <p>To apply for certification, review the requirements and ensure you meet the criteria. Submit your application through the button on each certification card, and a certifying officer will contact you to schedule assessment.</p>
                <p>Certifications require both knowledge assessment and practical demonstration of skills. Preparation materials are available in the Training section of the Employee Portal.</p>
            </div>
        </div>
    `;
    
    // Add event listeners for certification application buttons
    const applyButtons = container.querySelectorAll('.apply-button');
    applyButtons.forEach(button => {
        button.addEventListener('click', function() {
            const certTitle = this.closest('.certification-card').querySelector('.certification-title').textContent;
            alert(`Application submitted for ${certTitle} certification. A certifying officer will contact you shortly to schedule your assessment.`);
            this.textContent = 'Application Submitted';
            this.disabled = true;
        });
    });
}

// Load training guides section
function loadTrainingSection(container) {
    container.innerHTML = `
        <div class="training-container">
            <h2>Training Guides</h2>
            <p>This section contains training materials and guides for various roles and activities within AydoCorp.</p>
            
            <div class="training-under-development">
                <div class="development-icon">
                    <i class="fas fa-tools"></i>
                </div>
                <h3>Under Development</h3>
                <p>Our comprehensive training guides are currently being developed by our subject matter experts. Check back soon for detailed training materials on:</p>
                <ul>
                    <li>Cargo Handling and Logistics</li>
                    <li>Combat Operations and Escort Procedures</li>
                    <li>Mining and Resource Extraction</li>
                    <li>Communications and Coordination</li>
                    <li>Leadership and Team Management</li>
                    <li>Medical Procedures and Emergency Response</li>
                </ul>
                <p>In the meantime, please contact your supervisor or department lead for on-the-job training opportunities.</p>
            </div>
        </div>
    `;
}

// Other existing functions in your portal.js file would remain below
// ... 