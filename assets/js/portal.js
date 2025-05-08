// Employee Portal JavaScript
(function ($) {
    'use strict';

    // Portal Navigation
    function initPortalNavigation() {
        const $navLinks = $('.portal-nav a');
        const $sections = $('.portal-section');

        $navLinks.on('click', function (e) {
            e.preventDefault();
            const targetSection = $(this).data('section');
            
            // Update active states
            $navLinks.removeClass('active');
            $(this).addClass('active');
            
            // Show target section
            $sections.removeClass('active');
            $(`#${targetSection}`).addClass('active');

            // Update URL hash
            window.location.hash = targetSection;
        });
    }

    // Picture Carousel
    function initCarousel() {
        const $track = $('.carousel-track');
        const $slides = $track.find('img');
        const $prev = $('.carousel-prev');
        const $next = $('.carousel-next');
        let currentIndex = 0;

        // Load carousel images
        const images = [
            'images/AydoOffice1.png',
            'images/logisticsoffice.jpg',
            'images/Hull_E.jpg',
            'images/Aydo_Corp_logo_Silver.png'
        ];

        images.forEach(src => {
            $track.append(`<img src="${src}" alt="Organization Gallery">`);
        });

        function updateCarousel() {
            const offset = -currentIndex * 100;
            $track.css('transform', `translateX(${offset}%)`);
        }

        $prev.on('click', () => {
            currentIndex = Math.max(currentIndex - 1, 0);
            updateCarousel();
        });

        $next.on('click', () => {
            currentIndex = Math.min(currentIndex + 1, $slides.length - 1);
            updateCarousel();
        });

        // Auto-advance carousel
        setInterval(() => {
            currentIndex = (currentIndex + 1) % $slides.length;
            updateCarousel();
        }, 5000);
    }

    // Calendar Integration
    function initCalendar() {
        const calendarEl = document.getElementById('events-calendar');
        if (!calendarEl) return;

        const calendar = new FullCalendar.Calendar(calendarEl, {
            initialView: 'dayGridMonth',
            headerToolbar: {
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,timeGridDay'
            },
            events: '/api/employee-portal/events',
            eventColor: '#53e3fb',
            eventClick: function(info) {
                showEventDetails(info.event);
            }
        });

        calendar.render();
    }

    // Event Details Modal
    function showEventDetails(event) {
        const modal = `
            <div class="event-modal">
                <div class="event-modal-content">
                    <h3>${event.title}</h3>
                    <p>${event.description}</p>
                    <div class="event-details">
                        <p><strong>Date:</strong> ${event.start.toLocaleDateString()}</p>
                        <p><strong>Time:</strong> ${event.start.toLocaleTimeString()}</p>
                        <p><strong>Location:</strong> ${event.extendedProps.location || 'TBD'}</p>
                    </div>
                    <button class="close-modal">Close</button>
                </div>
            </div>
        `;

        $('body').append(modal);
        $('.event-modal').fadeIn();

        $('.close-modal').on('click', function() {
            $('.event-modal').fadeOut(function() {
                $(this).remove();
            });
        });
    }

    // Announcements
    function loadAnnouncements() {
        const $container = $('.announcements-container');
        
        // Fetch announcements from API
        $.get('/api/employee-portal/announcements')
            .done(function(announcements) {
                const html = announcements.map(announcement => `
                    <div class="announcement">
                        <h4>${announcement.title}</h4>
                        <p>${announcement.content}</p>
                        <small>Posted: ${new Date(announcement.date).toLocaleDateString()}</small>
                    </div>
                `).join('');
                
                $container.html(html);
            })
            .fail(function() {
                $container.html('<p>Failed to load announcements.</p>');
            });
    }

    // Employee of the Month
    function loadEmployeeOfTheMonth() {
        const $container = $('.eotm-container');
        
        // Fetch employee of the month from API
        $.get('/api/employee-portal/employee-of-month')
            .done(function(data) {
                const html = `
                    <div class="eotm-avatar">
                        <img src="${data.photo || 'images/default-avatar.png'}" alt="${data.name}">
                    </div>
                    <div class="eotm-details">
                        <h4>${data.name}</h4>
                        <p>${data.achievement}</p>
                    </div>
                `;
                
                $container.html(html);
            })
            .fail(function() {
                $container.html('<p>Failed to load employee of the month.</p>');
            });
    }

    // Corporate History
    function loadCorporateHistory() {
        const $container = $('.history-content');
        
        // Fetch corporate history from API
        $.get('/api/employee-portal/corporate-history')
            .done(function(history) {
                const html = `
                    <div class="history-timeline">
                        ${history.events.map(event => `
                            <div class="timeline-item">
                                <div class="timeline-date">${event.year}</div>
                                <div class="timeline-content">
                                    <h4>${event.title}</h4>
                                    <p>${event.description}</p>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `;
                
                $container.html(html);
            })
            .fail(function() {
                $container.html('<p>Failed to load corporate history.</p>');
            });
    }

    // Leadership Tree
    function loadLeadershipTree() {
        const $container = $('.org-tree');
        
        // Fetch leadership data from API
        $.get('/api/employee-portal/leadership')
            .done(function(data) {
                const html = `
                    <div class="org-chart">
                        ${renderOrgLevel(data)}
                    </div>
                `;
                
                $container.html(html);
            })
            .fail(function() {
                $container.html('<p>Failed to load leadership tree.</p>');
            });
    }

    function renderOrgLevel(level) {
        return `
            <div class="org-level">
                ${level.members.map(member => `
                    <div class="org-box ${member.role.toLowerCase()}">
                        <div class="org-title">${member.title}</div>
                        <div class="org-name">${member.name}</div>
                        <div class="org-username">${member.username}</div>
                    </div>
                `).join('')}
                ${level.children ? `<div class="org-children">${renderOrgLevel(level.children)}</div>` : ''}
            </div>
        `;
    }

    // Subsidiary Tabs
    function initSubsidiaryTabs() {
        const $tabs = $('.subsidiary-tab');
        const $info = $('.subsidiary-info');

        $tabs.on('click', function() {
            const subsidiary = $(this).data('subsidiary');
            
            $tabs.removeClass('active');
            $(this).addClass('active');
            
            // Load subsidiary info
            $.get(`/api/employee-portal/subsidiaries/${subsidiary}`)
                .done(function(data) {
                    const html = `
                        <div class="subsidiary-logo">
                            <img src="${data.logo}" alt="${data.name} Logo">
                        </div>
                        <div class="subsidiary-description">
                            <h3>${data.name}</h3>
                            <p>${data.description}</p>
                        </div>
                    `;
                    
                    $info.html(html);
                })
                .fail(function() {
                    $info.html('<p>Failed to load subsidiary information.</p>');
                });
        });
    }

    // Resources
    function loadResources() {
        const $linksContainer = $('.links-container');
        const $docsContainer = $('.docs-container');
        
        // Load useful links
        $.get('/api/employee-portal/resources/links')
            .done(function(links) {
                const html = links.map(link => `
                    <div class="resource-link">
                        <a href="${link.url}" target="_blank">${link.title}</a>
                        <p>${link.description}</p>
                    </div>
                `).join('');
                
                $linksContainer.html(html);
            })
            .fail(function() {
                $linksContainer.html('<p>Failed to load useful links.</p>');
            });

        // Load documentation
        $.get('/api/employee-portal/resources/docs')
            .done(function(docs) {
                const html = docs.map(doc => `
                    <div class="resource-doc">
                        <h4>${doc.title}</h4>
                        <p>${doc.description}</p>
                        <a href="${doc.url}" class="button small">View Document</a>
                    </div>
                `).join('');
                
                $docsContainer.html(html);
            })
            .fail(function() {
                $docsContainer.html('<p>Failed to load documentation.</p>');
            });
    }

    // Training Guides
    function loadTrainingGuides() {
        const $container = $('.guides-container');
        
        $.get('/api/employee-portal/training-guides')
            .done(function(guides) {
                const html = guides.map(guide => `
                    <div class="training-guide">
                        <h4>${guide.title}</h4>
                        <p>${guide.description}</p>
                        <div class="guide-meta">
                            <span>Level: ${guide.level}</span>
                            <span>Duration: ${guide.duration}</span>
                        </div>
                        <a href="${guide.url}" class="button small">Start Training</a>
                    </div>
                `).join('');
                
                $container.html(html);
            })
            .fail(function() {
                $container.html('<p>Failed to load training guides.</p>');
            });
    }

    // Certifications
    function loadCertifications() {
        const $container = $('.certs-container');
        
        $.get('/api/employee-portal/certifications')
            .done(function(certs) {
                const html = certs.map(cert => `
                    <div class="certification-card">
                        <div class="certification-icon">
                            <img src="${cert.icon}" alt="${cert.title}">
                        </div>
                        <h5>${cert.title}</h5>
                        <p>${cert.description}</p>
                        <div class="cert-meta">
                            <span>Level: ${cert.level}</span>
                            <span>Requirements: ${cert.requirements}</span>
                        </div>
                    </div>
                `).join('');
                
                $container.html(html);
            })
            .fail(function() {
                $container.html('<p>Failed to load certifications.</p>');
            });
    }

    // Employee Database
    function initEmployeeDatabase() {
        const $search = $('#employee-search');
        const $list = $('.employee-list-container');
        let searchTimeout;

        // Search functionality
        $search.on('input', function() {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                const query = $(this).val();
                searchEmployees(query);
            }, 300);
        });

        // Load initial employee list
        loadEmployees();
    }

    function loadEmployees() {
        const $list = $('.employee-list-container');
        
        $.get('/api/employee-portal/employees')
            .done(function(employees) {
                const html = employees.map(employee => `
                    <div class="employee-card">
                        <div class="employee-photo">
                            <img src="${employee.photo || 'images/default-avatar.png'}" alt="${employee.fullName}">
                        </div>
                        <div class="employee-info">
                            <h4>${employee.fullName}</h4>
                            <p class="employee-rank">${employee.rank}</p>
                            <p class="employee-department">${employee.department}</p>
                            <button class="view-profile" data-id="${employee._id}">View Profile</button>
                        </div>
                    </div>
                `).join('');
                
                $list.html(html);

                // Add click handlers for view profile buttons
                $('.view-profile').on('click', function() {
                    const employeeId = $(this).data('id');
                    loadEmployeeProfile(employeeId);
                });
            })
            .fail(function() {
                $list.html('<p>Failed to load employees.</p>');
            });
    }

    function searchEmployees(query) {
        const $list = $('.employee-list-container');
        
        $.get(`/api/employee-portal/employees/search?q=${encodeURIComponent(query)}`)
            .done(function(employees) {
                const html = employees.map(employee => `
                    <div class="employee-card">
                        <div class="employee-photo">
                            <img src="${employee.photo || 'images/default-avatar.png'}" alt="${employee.fullName}">
                        </div>
                        <div class="employee-info">
                            <h4>${employee.fullName}</h4>
                            <p class="employee-rank">${employee.rank}</p>
                            <p class="employee-department">${employee.department}</p>
                            <button class="view-profile" data-id="${employee._id}">View Profile</button>
                        </div>
                    </div>
                `).join('');
                
                $list.html(html);

                // Add click handlers for view profile buttons
                $('.view-profile').on('click', function() {
                    const employeeId = $(this).data('id');
                    loadEmployeeProfile(employeeId);
                });
            })
            .fail(function() {
                $list.html('<p>Failed to search employees.</p>');
            });
    }

    function loadEmployeeProfile(employeeId) {
        const $profile = $('.employee-profile-container');
        const $list = $('.employee-list-container');
        
        $.get(`/api/employee-portal/employees/${employeeId}`)
            .done(function(employee) {
                const html = `
                    <div class="profile-header">
                        <div class="profile-photo">
                            <img src="${employee.photo || 'images/default-avatar.png'}" alt="${employee.fullName}">
                        </div>
                        <div class="profile-info">
                            <h3>${employee.fullName}</h3>
                            <p class="profile-rank">${employee.rank}</p>
                            <p class="profile-department">${employee.department}</p>
                        </div>
                    </div>
                    <div class="profile-details">
                        <div class="profile-section">
                            <h4>Background</h4>
                            <p>${employee.backgroundStory || 'No background information available.'}</p>
                        </div>
                        <div class="profile-section">
                            <h4>Specializations</h4>
                            <ul>
                                ${employee.specializations.map(spec => `<li>${spec}</li>`).join('')}
                            </ul>
                        </div>
                        <div class="profile-section">
                            <h4>Certifications</h4>
                            <ul>
                                ${employee.certifications.map(cert => `<li>${cert}</li>`).join('')}
                            </ul>
                        </div>
                        <div class="profile-section">
                            <h4>Contact Information</h4>
                            <p>Discord: ${employee.contactInfo.discord || 'Not provided'}</p>
                            <p>RSI Handle: ${employee.contactInfo.rsiHandle || 'Not provided'}</p>
                        </div>
                    </div>
                    <button class="back-to-list">Back to Employee List</button>
                `;
                
                $profile.html(html).show();
                $list.hide();

                // Add click handler for back button
                $('.back-to-list').on('click', function() {
                    $profile.hide();
                    $list.show();
                });
            })
            .fail(function() {
                $profile.html('<p>Failed to load employee profile.</p>');
            });
    }

    // Initialize all components
    function init() {
        initPortalNavigation();
        initCarousel();
        initCalendar();
        loadAnnouncements();
        loadEmployeeOfTheMonth();
        loadCorporateHistory();
        loadLeadershipTree();
        initSubsidiaryTabs();
        loadResources();
        loadTrainingGuides();
        loadCertifications();
        initEmployeeDatabase();
    }

    // Initialize when document is ready
    $(document).ready(init);

})(jQuery); 