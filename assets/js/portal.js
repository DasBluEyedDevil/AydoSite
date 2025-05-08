// Employee Portal JavaScript
// AydoCorp Employee Portal - Core Functionality

document.addEventListener('DOMContentLoaded', function() {
    checkLoginStatus();
    initializePortal();
});

// Check if user is logged in
function checkLoginStatus() {
    const token = sessionStorage.getItem('aydocorpToken');
    const user = JSON.parse(sessionStorage.getItem('aydocorpUser'));
    
    if (!token || !user) {
        window.location.href = 'index.html#login';
        return;
    }

    // Verify token with server
    verifyLoginToken(token, user);
}

// Verify login token
async function verifyLoginToken(token, user) {
    try {
        const response = await fetch(getApiUrl('auth/verify'), {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'x-auth-token': token
            }
        });

        if (response.ok) {
            hideLoginOverlay();
            loadUserData(user);
        } else {
            sessionStorage.removeItem('aydocorpToken');
            sessionStorage.removeItem('aydocorpUser');
            window.location.href = 'index.html#login';
        }
    } catch (error) {
        console.error('Error verifying token:', error);
        hideLoginOverlay();
        showError('Error verifying login status. Some features may be limited.');
    }
}

// Get API URL helper
function getApiUrl(endpoint) {
    const baseUrl = sessionStorage.getItem('aydocorpApiUrl') || 'http://localhost:8080/api';
    return `${baseUrl}/${endpoint}`;
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

// Handle logout
function handleLogout() {
    sessionStorage.removeItem('aydocorpToken');
    sessionStorage.removeItem('aydocorpUser');
    window.location.href = 'index.html#login';
}

// Show settings
function showSettings() {
    // Implementation for settings panel
}

// Load section content
function loadSectionContent(section) {
    // Implementation for loading different sections
    console.log(`Loading section: ${section}`);
    // This would typically involve an API call to get the content
    // and then updating the main content area
} 