// Employee Portal JavaScript
// AydoCorp Employee Portal - Core Functionality

document.addEventListener('DOMContentLoaded', function() {
    // Initialize portal components
    initializePortal();
    initializeNavigation();
    initializeCarousel();
    initializeCalendar();
    initializeEmployeeSearch();
    loadAnnouncements();
    loadEmployeeOfMonth();
    initializeSubsidiaryTabs();
    initializeResources();
});

// Initialize portal
function initializePortal() {
    // Handle portal navigation
    const portalLink = document.querySelector('a[href="#employee-portal"]');
    if (portalLink) {
        portalLink.addEventListener('click', function(e) {
            e.preventDefault();
            showPortal();
        });
    }

    // Add close button to portal
    const portal = document.getElementById('employee-portal');
    if (portal) {
        const closeButton = document.createElement('button');
        closeButton.className = 'portal-close';
        closeButton.innerHTML = '×';
        closeButton.addEventListener('click', hidePortal);
        portal.insertBefore(closeButton, portal.firstChild);
    }

    // Handle escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && portal.classList.contains('active')) {
            hidePortal();
        }
    });
}

// Show portal
function showPortal() {
    const portal = document.getElementById('employee-portal');
    if (portal) {
        portal.classList.add('active');
        document.body.style.overflow = 'hidden'; // Prevent scrolling of main content
        checkLoginState(); // Check login state when showing portal
    }
}

// Hide portal
function hidePortal() {
    const portal = document.getElementById('employee-portal');
    if (portal) {
        portal.classList.remove('active');
        document.body.style.overflow = ''; // Restore scrolling
    }
}

// Navigation functionality
function initializeNavigation() {
    const navLinks = document.querySelectorAll('.portal-nav a');
    const sections = document.querySelectorAll('.portal-section');
    const subNavItems = document.querySelectorAll('.portal-subnav-item');

    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href').substring(1);
            
            // Update active states
            navLinks.forEach(l => l.classList.remove('active'));
            this.classList.add('active');
            
            // Show/hide sections
            sections.forEach(section => {
                section.classList.remove('active');
                if (section.id === targetId) {
                    section.classList.add('active');
                }
            });

            // Handle sub-navigation
            const parentItem = this.closest('.portal-nav-item');
            if (parentItem) {
                const subNav = parentItem.querySelector('.portal-subnav');
                if (subNav) {
                    parentItem.classList.toggle('active');
                }
            }
        });
    });

    subNavItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href').substring(1);
            
            // Update active states
            subNavItems.forEach(i => i.classList.remove('active'));
            this.classList.add('active');
            
            // Show target section
            sections.forEach(section => {
                section.classList.remove('active');
                if (section.id === targetId) {
                    section.classList.add('active');
                }
            });
        });
    });
}

// Carousel functionality
function initializeCarousel() {
    const carousel = document.querySelector('.carousel-container');
    if (!carousel) return;

    const track = carousel.querySelector('.carousel-track');
    const slides = Array.from(track.children);
    const nextButton = carousel.querySelector('.carousel-next');
    const prevButton = carousel.querySelector('.carousel-prev');
    
    let currentIndex = 0;
    const slideWidth = carousel.offsetWidth;

    // Set initial positions
    slides.forEach((slide, index) => {
        slide.style.left = slideWidth * index + 'px';
    });

    // Move to slide
    function moveToSlide(index) {
        track.style.transform = `translateX(-${slideWidth * index}px)`;
        currentIndex = index;
    }

    // Next slide
    nextButton.addEventListener('click', () => {
        if (currentIndex < slides.length - 1) {
            moveToSlide(currentIndex + 1);
        } else {
            moveToSlide(0);
        }
    });

    // Previous slide
    prevButton.addEventListener('click', () => {
        if (currentIndex > 0) {
            moveToSlide(currentIndex - 1);
        } else {
            moveToSlide(slides.length - 1);
        }
    });

    // Auto-advance slides
    setInterval(() => {
        if (currentIndex < slides.length - 1) {
            moveToSlide(currentIndex + 1);
        } else {
            moveToSlide(0);
        }
    }, 5000);
}

// Calendar functionality
function initializeCalendar() {
    const calendar = document.getElementById('events-calendar');
    if (!calendar) return;

    // Initialize calendar with events
    const events = [
        {
            title: 'Quarterly Review',
            start: new Date(new Date().setDate(new Date().getDate() + 7)),
            allDay: true
        },
        {
            title: 'Team Building',
            start: new Date(new Date().setDate(new Date().getDate() + 14)),
            allDay: true
        },
        {
            title: 'Project Deadline',
            start: new Date(new Date().setDate(new Date().getDate() + 21)),
            allDay: true
        }
    ];

    // Add event click handler
    calendar.addEventListener('click', function(e) {
        const target = e.target;
        if (target.classList.contains('fc-event')) {
            showEventDetails(target.dataset.eventId);
        }
    });

    // Expand calendar button
    const expandButton = document.querySelector('.expand-calendar-button');
    if (expandButton) {
        expandButton.addEventListener('click', function() {
            calendar.classList.toggle('expanded');
            this.textContent = calendar.classList.contains('expanded') ? 
                'Collapse Calendar' : 'Expand Calendar';
        });
    }
}

// Event details modal
function showEventDetails(eventId) {
    const event = events.find(e => e.id === eventId);
    if (!event) return;

    const modal = document.createElement('div');
    modal.className = 'event-modal';
    modal.innerHTML = `
        <div class="event-modal-content">
            <h3>${event.title}</h3>
            <p>Date: ${event.start.toLocaleDateString()}</p>
            <p>${event.description || ''}</p>
            <button class="close-modal">Close</button>
        </div>
    `;

    document.body.appendChild(modal);
    modal.querySelector('.close-modal').addEventListener('click', () => {
        modal.remove();
    });
}

// Load announcements
function loadAnnouncements() {
    const announcementsSection = document.querySelector('.announcements-section');
    if (!announcementsSection) return;

    const announcements = [
        {
            title: 'New Office Location',
            content: 'We are excited to announce our new office location in downtown.',
            date: '2024-03-15'
        },
        {
            title: 'System Maintenance',
            content: 'Scheduled maintenance this weekend. Please save your work.',
            date: '2024-03-14'
        },
        {
            title: 'Employee Recognition',
            content: 'Congratulations to our Q1 outstanding performers!',
            date: '2024-03-13'
        }
    ];

    const announcementsList = announcementsSection.querySelector('.announcements-list');
    if (announcementsList) {
        announcements.forEach(announcement => {
            const announcementElement = document.createElement('div');
            announcementElement.className = 'announcement';
            announcementElement.innerHTML = `
                <h4>${announcement.title}</h4>
                <p>${announcement.content}</p>
                <small>Posted on ${announcement.date}</small>
            `;
            announcementsList.appendChild(announcementElement);
        });
    }
}

// Load Employee of the Month
function loadEmployeeOfMonth() {
    const eotmSection = document.querySelector('.employee-of-month');
    if (!eotmSection) return;

    const eotm = {
        name: 'John Smith',
        position: 'Senior Developer',
        department: 'Engineering',
        achievement: 'Led the successful launch of Project Phoenix',
        avatar: 'assets/images/employees/john-smith.jpg'
    };

    const eotmContainer = eotmSection.querySelector('.eotm-container');
    if (eotmContainer) {
        eotmContainer.innerHTML = `
            <div class="eotm-avatar">
                <img src="${eotm.avatar}" alt="${eotm.name}">
            </div>
            <div class="eotm-details">
                <h4>${eotm.name}</h4>
                <p>${eotm.position} - ${eotm.department}</p>
                <p>${eotm.achievement}</p>
            </div>
        `;
    }
}

// Initialize subsidiary tabs
function initializeSubsidiaryTabs() {
    const tabs = document.querySelectorAll('.subsidiary-tab');
    const infoSections = document.querySelectorAll('.subsidiary-info');

    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const targetId = this.dataset.target;
            
            // Update active states
            tabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            
            // Show target section
            infoSections.forEach(section => {
                section.style.display = section.id === targetId ? 'block' : 'none';
            });
        });
    });
}

// Initialize resources
function initializeResources() {
    const resourceLinks = document.querySelectorAll('.resource-link');
    
    resourceLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const resourceId = this.dataset.resourceId;
            // Handle resource click (e.g., open in new tab, show preview, etc.)
            window.open(this.href, '_blank');
        });
    });
}

// Employee search functionality
function initializeEmployeeSearch() {
    const searchInput = document.getElementById('employee-search');
    const departmentFilter = document.getElementById('department-filter');
    const employeeGrid = document.querySelector('.employee-grid');

    if (!searchInput || !departmentFilter || !employeeGrid) return;

    // Sample employee data
    const employees = [
        {
            id: 1,
            name: 'Alice Johnson',
            position: 'Software Engineer',
            department: 'Engineering',
            email: 'alice.johnson@aydocorp.com',
            avatar: 'assets/images/employees/alice-j.jpg'
        },
        {
            id: 2,
            name: 'Bob Wilson',
            position: 'Product Manager',
            department: 'Product',
            email: 'bob.wilson@aydocorp.com',
            avatar: 'assets/images/employees/bob-w.jpg'
        },
        // Add more employees as needed
    ];

    function filterEmployees() {
        const searchTerm = searchInput.value.toLowerCase();
        const department = departmentFilter.value;

        const filteredEmployees = employees.filter(employee => {
            const matchesSearch = employee.name.toLowerCase().includes(searchTerm) ||
                                employee.position.toLowerCase().includes(searchTerm) ||
                                employee.email.toLowerCase().includes(searchTerm);
            const matchesDepartment = department === 'all' || employee.department === department;
            return matchesSearch && matchesDepartment;
        });

        displayEmployees(filteredEmployees);
    }

    function displayEmployees(employees) {
        employeeGrid.innerHTML = '';
        employees.forEach(employee => {
            const employeeCard = document.createElement('div');
            employeeCard.className = 'employee-card';
            employeeCard.innerHTML = `
                <div class="employee-avatar">
                    <img src="${employee.avatar}" alt="${employee.name}">
                </div>
                <div class="employee-info">
                    <h4>${employee.name}</h4>
                    <p>${employee.position}</p>
                    <p>${employee.department}</p>
                    <a href="mailto:${employee.email}">${employee.email}</a>
                </div>
            `;
            employeeGrid.appendChild(employeeCard);
        });
    }

    // Event listeners
    searchInput.addEventListener('input', filterEmployees);
    departmentFilter.addEventListener('change', filterEmployees);

    // Initial display
    displayEmployees(employees);
}

// Login verification
function verifyLogin() {
    const loginForm = document.getElementById('login-form');
    if (!loginForm) return;

    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const username = this.querySelector('#username').value;
        const password = this.querySelector('#password').value;

        // Here you would typically make an API call to verify credentials
        // For demo purposes, we'll use a simple check
        if (username && password) {
            document.querySelector('.login-message').style.display = 'none';
            document.querySelector('.portal-content').style.display = 'block';
            // Store login state
            localStorage.setItem('isLoggedIn', 'true');
            localStorage.setItem('username', username);
        }
    });
}

// Check login state on page load
function checkLoginState() {
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    const loginMessage = document.querySelector('.login-message');
    const portalContent = document.querySelector('.portal-content');

    if (isLoggedIn) {
        loginMessage.style.display = 'none';
        portalContent.style.display = 'block';
    } else {
        loginMessage.style.display = 'block';
        portalContent.style.display = 'none';
    }
}

// Initialize login verification
verifyLogin();
checkLoginState(); 