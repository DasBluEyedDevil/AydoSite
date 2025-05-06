(function ($) {
    // API and Authentication Utilities
    // ==================================
    function getApiBaseUrl() {
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            return 'http://localhost:8080';
        } else {
            // Use proxy.php on the current domain, without trailing slash
            return window.location.origin + '/proxy.php?url=';
        }
    }

    // Then create a helper function to construct API URLs correctly
    function getApiUrl(endpoint) {
        const baseUrl = getApiBaseUrl();
        // If the endpoint starts with a slash, remove it to prevent double slashes
        const cleanEndpoint = endpoint.startsWith('/') ? endpoint.substring(1) : endpoint;
        return `${baseUrl}${cleanEndpoint}`;
    }

    async function testApiConnection() {
        try {
            const apiBase = getApiBaseUrl();
            const url = `${apiBase}/api/test`;
            console.log('Testing API connection to:', url);

            const response = await fetch(url);
            const status = response.status;
            console.log('API test response status:', status);

            if (response.ok) {
                const data = await response.json();
                console.log('API test response data:', data);
                return true;
            } else {
                console.error('API test failed with status:', status);
                return false;
            }
        } catch (error) {
            console.error('API connection test failed with error:', error);
            return false;
        }
    }

    async function checkServerStatus() {
        try {
            const apiBase = getApiBaseUrl();
            console.log('Checking server status at:', apiBase);

            // First try /api/test endpoint
            let response = await fetch(`${apiBase}/api/test`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            });

            if (response.ok) {
                console.log('Server is online at /api/test');
                return true;
            }

            // If that fails, try /api/auth endpoint
            response = await fetch(`${apiBase}/api/auth`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            });

            if (response.ok) {
                console.log('Server is online at /api/auth');
                return true;
            }

            console.error('Server check failed - all endpoints unreachable');
            return false;
        } catch (error) {
            console.error('Server status check failed with error:', error);
            return false;
        }
    }

    async function validateToken() {
        try {
            const token = localStorage.getItem('aydocorpToken');
            if (!token) return false;

            const apiBase = getApiBaseUrl();
            const response = await fetch(`${apiBase}/api/auth/validate`, {
                headers: {'x-auth-token': token}
            });

            return response.ok;
        } catch (error) {
            console.error('Token validation error:', error);
            return false;
        }
    }

    // Authentication Functions
    // ==================================
    async function handleLogin(username, password) {
        if (!username || !password) {
            throw new Error('Please enter both username and password.');
        }

        // First test connection
        const connectionTest = await testApiConnection();
        if (!connectionTest) {
            throw new Error('Cannot connect to the server. Please try again later.');
        }

        const apiBase = getApiBaseUrl();
        console.log('Attempting login at:', `${apiBase}/api/auth/login`);

        // Instead of:
        // const response = await fetch(`${apiBase}/api/auth/login`, {
        // Use:
        const response = await fetch(getApiUrl('api/auth/login'), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({username, password})
        });

        // Check response type and handle accordingly
        const contentType = response.headers.get('content-type');

        if (contentType && contentType.includes('application/json')) {
            // Handle JSON response
            const data = await response.json();

            if (response.ok) {
                // Login success
                console.log('Login successful:', data);
                console.log('User data from server:', data.user);
                console.log('User role from server:', data.user.role);

                // Store token and user info
                localStorage.setItem('aydocorpToken', data.token);
                localStorage.setItem('aydocorpUser', JSON.stringify(data.user));
                localStorage.setItem('aydocorpLoggedIn', 'true');

                // Log stored user data for debugging
                console.log('Stored user data in localStorage:', JSON.parse(localStorage.getItem('aydocorpUser')));

                // Show success message
                alert(`Welcome back, ${data.user.username}!`);

                // Update UI to show admin badge if applicable
                checkLoginStatus();

                // Redirect to employee portal
                window.location.href = '#employee-portal';
            } else {
                // Login failed with error message from server
                throw new Error(data.message || 'Login failed. Please check your credentials.');
            }
        } else {
            // Non-JSON response (likely HTML error page)
            const text = await response.text();
            console.error('Received non-JSON response:', text.substring(0, 500));
            throw new Error('Unexpected response from server. Please try again later.');
        }
    }

    function handleLogout() {
        // Clear authentication data
        localStorage.removeItem('aydocorpToken');
        localStorage.removeItem('aydocorpUser');
        localStorage.removeItem('aydocorpLoggedIn');

        // Update UI
        $('.user-status').remove();
        $('#logout-nav').attr('id', '').find('a').text('Member Login').attr('href', '#login').removeClass('logout');

        // Redirect to home
        alert('You have been logged out.');
        window.location.href = '#';

        // Update UI state
        checkLoginStatus();
    }

    function checkLoginStatus() {
        console.log('checkLoginStatus called');
        const isLoggedIn = localStorage.getItem('aydocorpLoggedIn') === 'true';
        const token = localStorage.getItem('aydocorpToken');
        const userJson = localStorage.getItem('aydocorpUser');

        if (isLoggedIn && token && userJson) {
            try {
                const user = JSON.parse(userJson);
                console.log('User data from localStorage:', user);
                console.log('Is admin?', user.role === 'admin');

                // Show employee portal content
                $('#employee-portal-login-required').hide();
                $('#employee-portal-content').show();

                // Add user status indicator to the top right
                $('.user-status').remove();

                const userStatusHtml = `
                    <div class="user-status">
                        <span class="username">${user.username}</span>
                        ${user.role === 'admin' ? '<a href="#admin-dashboard" class="admin-badge">ADMIN</a>' : ''}
                        <span class="logout-option">
                            <a href="#" class="logout">Logout</a>
                        </span>
                    </div>
                `;

                console.log('User status HTML:', userStatusHtml);
                $('body').append(userStatusHtml);

                // Replace the "Member Login" link with just "Logout"
                $('header nav ul li a[href="#login"]').text('Logout').attr('href', '#').addClass('logout').closest('li').attr('id', 'logout-nav');
            } catch (error) {
                console.error('Error checking login status:', error);
                handleLogout();
            }
        } else {
            // User is not logged in
            $('#employee-portal-content').hide();
            $('#employee-portal-login-required').show();

            // Ensure login link is correct
            $('header nav ul li a.logout').text('Member Login').attr('href', '#login').removeClass('logout').closest('li').removeAttr('id');
            $('.user-status').remove();
        }
    }

    // Employee Portal Functions
    // ==================================

    // Career Paths Functions
    async function loadCareerPaths() {
        try {
            const apiBase = getApiBaseUrl();
            const token = localStorage.getItem('aydocorpToken');

            const response = await fetch(`${apiBase}/api/employee-portal/career-paths`, {
                headers: {
                    'x-auth-token': token
                }
            });

            if (!response.ok) {
                console.error('Failed to load career paths');
                $('.career-path-list').html(`
                    <div class="error-message">
                        <h3>Error Loading Career Paths</h3>
                        <p>Failed to load career paths</p>
                    </div>
                `);
                return;
            }

            const careerPaths = await response.json();

            if (careerPaths.length === 0) {
                $('.career-path-list').html('<p>No career paths found.</p>');
                return;
            }

            // Render career paths
            let html = '<div class="career-paths">';

            careerPaths.forEach(careerPath => {
                html += `
                    <div class="career-path-item" data-id="${careerPath._id}">
                        <h4>${careerPath.department}</h4>
                        <p>${careerPath.description.substring(0, 100)}${careerPath.description.length > 100 ? '...' : ''}</p>
                        <button class="view-career-path button small" data-id="${careerPath._id}">View Details</button>
                    </div>
                `;
            });

            html += '</div>';
            $('.career-path-list').html(html);

            // Add event listeners to the view buttons
            $('.view-career-path').on('click', function() {
                const careerPathId = $(this).data('id');
                loadCareerPathDetails(careerPathId);
            });
        } catch (error) {
            console.error('Error loading career paths:', error);
            $('.career-path-list').html(`
                <div class="error-message">
                    <h3>Error Loading Career Paths</h3>
                    <p>${error.message}</p>
                </div>
            `);
        }
    }

    async function loadCareerPathDetails(careerPathId) {
        try {
            const apiBase = getApiBaseUrl();
            const token = localStorage.getItem('aydocorpToken');

            const response = await fetch(`${apiBase}/api/employee-portal/career-paths/${careerPathId}`, {
                headers: {
                    'x-auth-token': token
                }
            });

            if (!response.ok) {
                console.error('Failed to load career path details');
                $('.career-path-details').html(`
                    <div class="error-message">
                        <h3>Error Loading Career Path Details</h3>
                        <p>Failed to load career path details</p>
                        <button class="back-to-career-paths button">Back to Career Paths</button>
                    </div>
                `).show();
                $('.career-path-list').hide();

                // Add event listener to the back button
                $('.back-to-career-paths').on('click', function() {
                    $('.career-path-details').hide();
                    $('.career-path-list').show();
                });
                return;
            }

            const careerPath = await response.json();

            // Render career path details
            let html = `
                <div class="career-path-detail">
                    <h3>${careerPath.department}</h3>
                    <p>${careerPath.description}</p>

                    <h4>Ranks</h4>
                    <div class="ranks-list">
            `;

            if (careerPath.ranks && careerPath.ranks.length > 0) {
                careerPath.ranks.forEach(rank => {
                    html += `
                        <div class="rank-item">
                            <h5>${rank.title} (Level ${rank.level})</h5>
                            <p><strong>Paygrade:</strong> ${rank.paygrade}</p>
                            <p>${rank.description}</p>

                            <div class="rank-details">
                                <div class="rank-responsibilities">
                                    <h6>Responsibilities:</h6>
                                    <ul>
                                        ${rank.responsibilities.map(resp => `<li>${resp}</li>`).join('')}
                                    </ul>
                                </div>

                                <div class="rank-requirements">
                                    <h6>Requirements:</h6>
                                    <ul>
                                        ${rank.requirements.map(req => `<li>${req}</li>`).join('')}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    `;
                });
            } else {
                html += '<p>No ranks defined for this career path.</p>';
            }

            html += `
                    </div>

                    <h4>Certifications</h4>
                    <div class="certifications-list">
            `;

            if (careerPath.certifications && careerPath.certifications.length > 0) {
                careerPath.certifications.forEach(cert => {
                    html += `
                        <div class="certification-item">
                            <h5>${cert.name}</h5>
                            <p>${cert.description}</p>

                            <div class="certification-details">
                                <div class="certification-requirements">
                                    <h6>Requirements:</h6>
                                    <ul>
                                        ${cert.requirements.map(req => `<li>${req}</li>`).join('')}
                                    </ul>
                                </div>

                                <div class="certification-benefits">
                                    <h6>Benefits:</h6>
                                    <ul>
                                        ${cert.benefits.map(benefit => `<li>${benefit}</li>`).join('')}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    `;
                });
            } else {
                html += '<p>No certifications defined for this career path.</p>';
            }

            html += `
                    </div>

                    <h4>Training Guides</h4>
                    <div class="training-guides-list">
            `;

            if (careerPath.trainingGuides && careerPath.trainingGuides.length > 0) {
                careerPath.trainingGuides.forEach(guide => {
                    html += `
                        <div class="training-guide-item">
                            <h5>${guide.title}</h5>
                            <p><strong>For Rank:</strong> ${guide.forRank}</p>
                            <div class="training-guide-content">
                                ${guide.content}
                            </div>
                        </div>
                    `;
                });
            } else {
                html += '<p>No training guides defined for this career path.</p>';
            }

            html += `
                    </div>

                    <button class="back-to-career-paths button">Back to Career Paths</button>
                </div>
            `;

            $('.career-path-details').html(html).show();
            $('.career-path-list').hide();

            // Add event listener to the back button
            $('.back-to-career-paths').on('click', function() {
                $('.career-path-details').hide();
                $('.career-path-list').show();
            });
        } catch (error) {
            console.error('Error loading career path details:', error);
            $('.career-path-details').html(`
                <div class="error-message">
                    <h3>Error Loading Career Path Details</h3>
                    <p>${error.message}</p>
                    <button class="back-to-career-paths button">Back to Career Paths</button>
                </div>
            `).show();
            $('.career-path-list').hide();

            // Add event listener to the back button
            $('.back-to-career-paths').on('click', function() {
                $('.career-path-details').hide();
                $('.career-path-list').show();
            });
        }
    }

    // Employee Database Functions
    async function loadEmployees() {
        try {
            const apiBase = getApiBaseUrl();
            const token = localStorage.getItem('aydocorpToken');

            const response = await fetch(`${apiBase}/api/employee-portal/employees`, {
                headers: {
                    'x-auth-token': token
                }
            });

            if (!response.ok) {
                console.error('Failed to load employees');
                $('.employee-list-container').html(`
                    <div class="error-message">
                        <h3>Error Loading Employees</h3>
                        <p>Failed to load employees</p>
                    </div>
                `);
                return;
            }

            const employees = await response.json();

            if (employees.length === 0) {
                $('.employee-list-container').html('<p>No employees found.</p>');
                return;
            }

            // Render employees
            let html = '<div class="employee-grid">';

            employees.forEach(employee => {
                html += `
                    <div class="employee-card" data-id="${employee._id}">
                        <div class="employee-photo">
                            <img src="${employee.photo}" alt="${employee.fullName}" />
                        </div>
                        <div class="employee-info">
                            <h4>${employee.fullName}</h4>
                            <p class="employee-rank">${employee.rank}</p>
                            <p class="employee-department">${employee.department}</p>
                            <button class="view-employee button small" data-id="${employee._id}">View Profile</button>
                        </div>
                    </div>
                `;
            });

            html += '</div>';
            $('.employee-list-container').html(html);

            // Add event listeners to the view buttons
            $('.view-employee').on('click', function() {
                const employeeId = $(this).data('id');
                loadEmployeeProfile(employeeId);
            });
        } catch (error) {
            console.error('Error loading employees:', error);
            $('.employee-list-container').html(`
                <div class="error-message">
                    <h3>Error Loading Employees</h3>
                    <p>${error.message}</p>
                </div>
            `);
        }
    }

    async function loadEmployeeProfile(employeeId) {
        try {
            const apiBase = getApiBaseUrl();
            const token = localStorage.getItem('aydocorpToken');

            const response = await fetch(`${apiBase}/api/employee-portal/employees/${employeeId}`, {
                headers: {
                    'x-auth-token': token
                }
            });

            if (!response.ok) {
                console.error('Failed to load employee profile');
                $('.employee-profile-container').html(`
                    <div class="error-message">
                        <h3>Error Loading Employee Profile</h3>
                        <p>Failed to load employee profile</p>
                        <button class="back-to-employees button">Back to Employee List</button>
                    </div>
                `).show();
                $('.employee-list-container').hide();

                // Add event listener to the back button
                $('.back-to-employees').on('click', function() {
                    $('.employee-profile-container').hide();
                    $('.employee-list-container').show();
                });
                return;
            }

            const employee = await response.json();

            // Render employee profile
            let html = `
                <div class="employee-profile">
                    <div class="profile-header">
                        <div class="profile-photo">
                            <img src="${employee.photo}" alt="${employee.fullName}" />
                        </div>
                        <div class="profile-basic-info">
                            <h3>${employee.fullName}</h3>
                            <p class="profile-rank">${employee.rank}</p>
                            <p class="profile-department">${employee.department}</p>
                            <p class="profile-join-date">Joined: ${new Date(employee.joinDate).toLocaleDateString()}</p>
                        </div>
                    </div>

                    <div class="profile-details">
                        <div class="profile-background">
                            <h4>Background</h4>
                            <p>${employee.backgroundStory || 'No background story provided.'}</p>
                        </div>

                        <div class="profile-specializations">
                            <h4>Specializations</h4>
                            ${employee.specializations && employee.specializations.length > 0 
                                ? `<ul>${employee.specializations.map(spec => `<li>${spec}</li>`).join('')}</ul>`
                                : '<p>No specializations listed.</p>'
                            }
                        </div>

                        <div class="profile-certifications">
                            <h4>Certifications</h4>
                            ${employee.certifications && employee.certifications.length > 0 
                                ? `<ul>${employee.certifications.map(cert => `<li>${cert}</li>`).join('')}</ul>`
                                : '<p>No certifications listed.</p>'
                            }
                        </div>

                        <div class="profile-contact">
                            <h4>Contact Information</h4>
                            <ul>
                                ${employee.contactInfo && employee.contactInfo.discord ? `<li><strong>Discord:</strong> ${employee.contactInfo.discord}</li>` : ''}
                                ${employee.contactInfo && employee.contactInfo.rsiHandle ? `<li><strong>RSI Handle:</strong> ${employee.contactInfo.rsiHandle}</li>` : ''}
                                ${employee.contactInfo && employee.contactInfo.email ? `<li><strong>Email:</strong> ${employee.contactInfo.email}</li>` : ''}
                            </ul>
                        </div>
                    </div>

                    <button class="back-to-employees button">Back to Employee List</button>
                </div>
            `;

            $('.employee-profile-container').html(html).show();
            $('.employee-list-container').hide();
            $('.employee-edit-form-container').hide();

            // Add event listener to the back button
            $('.back-to-employees').on('click', function() {
                $('.employee-profile-container').hide();
                $('.employee-list-container').show();
            });
        } catch (error) {
            console.error('Error loading employee profile:', error);
            $('.employee-profile-container').html(`
                <div class="error-message">
                    <h3>Error Loading Employee Profile</h3>
                    <p>${error.message}</p>
                    <button class="back-to-employees button">Back to Employee List</button>
                </div>
            `).show();
            $('.employee-list-container').hide();

            // Add event listener to the back button
            $('.back-to-employees').on('click', function() {
                $('.employee-profile-container').hide();
                $('.employee-list-container').show();
            });
        }
    }

    // Events Functions
    async function loadEvents() {
        try {
            const apiBase = getApiBaseUrl();
            const token = localStorage.getItem('aydocorpToken');

            const response = await fetch(`${apiBase}/api/employee-portal/events`, {
                headers: {
                    'x-auth-token': token
                }
            });

            if (!response.ok) {
                console.error('Failed to load events');
                $('.events-list-container').html(`
                    <div class="error-message">
                        <h3>Error Loading Events</h3>
                        <p>Failed to load events</p>
                    </div>
                `);
                return;
            }

            const events = await response.json();

            if (events.length === 0) {
                $('.events-list-container').html('<p>No events found.</p>');
                return;
            }

            // Render events
            let html = '<div class="events-list">';

            events.forEach(event => {
                const startDate = new Date(event.startDate);
                const endDate = event.endDate ? new Date(event.endDate) : null;

                html += `
                    <div class="event-item ${event.eventType}" data-id="${event._id}">
                        <div class="event-date">
                            <span class="event-day">${startDate.getDate()}</span>
                            <span class="event-month">${startDate.toLocaleString('default', { month: 'short' })}</span>
                        </div>
                        <div class="event-details">
                            <h4>${event.title}</h4>
                            <p class="event-time">
                                ${startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                ${endDate ? ` - ${endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
                            </p>
                            <p class="event-location">${event.location}</p>
                            <p class="event-organizer">Organized by: ${event.organizer.username}</p>
                            <button class="view-event button small" data-id="${event._id}">View Details</button>
                        </div>
                    </div>
                `;
            });

            html += '</div>';
            $('.events-list-container').html(html);

            // Add event listeners to the view buttons
            $('.view-event').on('click', function() {
                const eventId = $(this).data('id');
                loadEventDetails(eventId);
            });
        } catch (error) {
            console.error('Error loading events:', error);
            $('.events-list-container').html(`
                <div class="error-message">
                    <h3>Error Loading Events</h3>
                    <p>${error.message}</p>
                </div>
            `);
        }
    }

    async function loadEventDetails(eventId) {
        try {
            const apiBase = getApiBaseUrl();
            const token = localStorage.getItem('aydocorpToken');

            const response = await fetch(`${apiBase}/api/employee-portal/events/${eventId}`, {
                headers: {
                    'x-auth-token': token
                }
            });

            if (!response.ok) {
                console.error('Failed to load event details');
                $('.event-details-container').html(`
                    <div class="error-message">
                        <h3>Error Loading Event Details</h3>
                        <p>Failed to load event details</p>
                        <button class="back-to-events button">Back to Events</button>
                    </div>
                `).show();
                $('.events-list-container').hide();

                // Add event listener to the back button
                $('.back-to-events').on('click', function() {
                    $('.event-details-container').hide();
                    $('.events-list-container').show();
                });
                return;
            }

            const event = await response.json();
            const startDate = new Date(event.startDate);
            const endDate = event.endDate ? new Date(event.endDate) : null;

            // Render event details
            let html = `
                <div class="event-detail">
                    <h3>${event.title}</h3>
                    <div class="event-meta">
                        <p class="event-type">${event.eventType.charAt(0).toUpperCase() + event.eventType.slice(1)}</p>
                        <p class="event-datetime">
                            <strong>Date:</strong> ${startDate.toLocaleDateString()}
                            <br>
                            <strong>Time:</strong> ${startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            ${endDate ? ` - ${endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
                        </p>
                        <p class="event-location"><strong>Location:</strong> ${event.location}</p>
                        <p class="event-organizer"><strong>Organized by:</strong> ${event.organizer.username}</p>
                    </div>

                    <div class="event-description">
                        <h4>Description</h4>
                        <p>${event.description}</p>
                    </div>

                    ${event.requirements ? `
                    <div class="event-requirements">
                        <h4>Requirements</h4>
                        <p>${event.requirements}</p>
                    </div>
                    ` : ''}

                    <div class="event-attendees">
                        <h4>Attendees (${event.attendees.length}${event.maxAttendees > 0 ? '/' + event.maxAttendees : ''})</h4>
                        ${event.attendees.length > 0 ? `
                        <ul class="attendees-list">
                            ${event.attendees.map(attendee => `
                                <li class="attendee ${attendee.status}">
                                    <span class="attendee-name">${attendee.user.username}</span>
                                    <span class="attendee-status">${attendee.status}</span>
                                </li>
                            `).join('')}
                        </ul>
                        ` : '<p>No attendees yet.</p>'}
                    </div>

                    <div class="event-actions">
                        <button class="join-event button small">Attend Event</button>
                        <button class="maybe-event button small">Maybe</button>
                        <button class="decline-event button small">Decline</button>
                    </div>

                    <button class="back-to-events button">Back to Events</button>
                </div>
            `;

            $('.event-details-container').html(html).show();
            $('.events-list-container').hide();

            // Add event listener to the back button
            $('.back-to-events').on('click', function() {
                $('.event-details-container').hide();
                $('.events-list-container').show();
            });
        } catch (error) {
            console.error('Error loading event details:', error);
            $('.event-details-container').html(`
                <div class="error-message">
                    <h3>Error Loading Event Details</h3>
                    <p>${error.message}</p>
                    <button class="back-to-events button">Back to Events</button>
                </div>
            `).show();
            $('.events-list-container').hide();

            // Add event listener to the back button
            $('.back-to-events').on('click', function() {
                $('.event-details-container').hide();
                $('.events-list-container').show();
            });
        }
    }

    // Operations Functions
    async function loadOperations() {
        try {
            const apiBase = getApiBaseUrl();
            const token = localStorage.getItem('aydocorpToken');

            const response = await fetch(`${apiBase}/api/employee-portal/operations`, {
                headers: {
                    'x-auth-token': token
                }
            });

            if (!response.ok) {
                console.error('Failed to load operations');
                $('.operations-list-container').html(`
                    <div class="error-message">
                        <h3>Error Loading Operations</h3>
                        <p>Failed to load operations</p>
                    </div>
                `);
                return;
            }

            const operations = await response.json();

            if (operations.length === 0) {
                $('.operations-list-container').html('<p>No operations found.</p>');
                return;
            }

            // Render operations
            let html = '<div class="operations-list">';

            operations.forEach(operation => {
                html += `
                    <div class="operation-item ${operation.category}" data-id="${operation._id}">
                        <div class="operation-header">
                            <h4>${operation.title}</h4>
                            <span class="operation-classification ${operation.classification}">${operation.classification}</span>
                        </div>
                        <div class="operation-meta">
                            <span class="operation-category">${operation.category}</span>
                            <span class="operation-version">v${operation.version}</span>
                            <span class="operation-status">${operation.status}</span>
                        </div>
                        <p class="operation-description">${operation.description.substring(0, 100)}${operation.description.length > 100 ? '...' : ''}</p>
                        <div class="operation-footer">
                            <span class="operation-author">By: ${operation.author.username}</span>
                            <span class="operation-date">Updated: ${new Date(operation.updatedAt).toLocaleDateString()}</span>
                            <button class="view-operation button small" data-id="${operation._id}">View Details</button>
                        </div>
                    </div>
                `;
            });

            html += '</div>';
            $('.operations-list-container').html(html);

            // Add event listeners to the view buttons
            $('.view-operation').on('click', function() {
                const operationId = $(this).data('id');
                loadOperationDetails(operationId);
            });
        } catch (error) {
            console.error('Error loading operations:', error);
            $('.operations-list-container').html(`
                <div class="error-message">
                    <h3>Error Loading Operations</h3>
                    <p>${error.message}</p>
                </div>
            `);
        }
    }

    async function loadOperationDetails(operationId) {
        try {
            const apiBase = getApiBaseUrl();
            const token = localStorage.getItem('aydocorpToken');

            const response = await fetch(`${apiBase}/api/employee-portal/operations/${operationId}`, {
                headers: {
                    'x-auth-token': token
                }
            });

            if (!response.ok) {
                console.error('Failed to load operation details');
                $('.operation-details-container').html(`
                    <div class="error-message">
                        <h3>Error Loading Operation Details</h3>
                        <p>Failed to load operation details</p>
                        <button class="back-to-operations button">Back to Operations</button>
                    </div>
                `).show();
                $('.operations-list-container').hide();

                // Add event listener to the back button
                $('.back-to-operations').on('click', function() {
                    $('.operation-details-container').hide();
                    $('.operations-list-container').show();
                });
                return;
            }

            const operation = await response.json();

            // Render operation details
            let html = `
                <div class="operation-detail">
                    <div class="operation-detail-header">
                        <h3>${operation.title}</h3>
                        <span class="operation-detail-classification ${operation.classification}">${operation.classification}</span>
                    </div>

                    <div class="operation-detail-meta">
                        <span class="operation-detail-category">${operation.category}</span>
                        <span class="operation-detail-version">Version ${operation.version}</span>
                        <span class="operation-detail-status">${operation.status}</span>
                        <span class="operation-detail-author">Author: ${operation.author.username}</span>
                        <span class="operation-detail-date">Last Updated: ${new Date(operation.updatedAt).toLocaleDateString()}</span>
                    </div>

                    <div class="operation-detail-description">
                        <h4>Description</h4>
                        <p>${operation.description}</p>
                    </div>

                    <div class="operation-detail-content">
                        <h4>Content</h4>
                        <div class="content-body">
                            ${operation.content}
                        </div>
                    </div>

                    ${operation.attachments && operation.attachments.length > 0 ? `
                    <div class="operation-detail-attachments">
                        <h4>Attachments</h4>
                        <ul class="attachments-list">
                            ${operation.attachments.map(attachment => `
                                <li class="attachment">
                                    <a href="${attachment.filePath}" target="_blank" class="attachment-link">
                                        <span class="attachment-name">${attachment.name}</span>
                                        <span class="attachment-type">${attachment.fileType}</span>
                                    </a>
                                    <span class="attachment-uploader">Uploaded by: ${attachment.uploadedBy.username}</span>
                                </li>
                            `).join('')}
                        </ul>
                    </div>
                    ` : ''}

                    ${operation.relatedOperations && operation.relatedOperations.length > 0 ? `
                    <div class="operation-detail-related">
                        <h4>Related Operations</h4>
                        <ul class="related-operations-list">
                            ${operation.relatedOperations.map(related => `
                                <li class="related-operation">
                                    <a href="#" class="related-operation-link" data-id="${related._id}">${related.title}</a>
                                </li>
                            `).join('')}
                        </ul>
                    </div>
                    ` : ''}

                    <button class="back-to-operations button">Back to Operations</button>
                </div>
            `;

            $('.operation-details-container').html(html).show();
            $('.operations-list-container').hide();

            // Add event listener to the back button
            $('.back-to-operations').on('click', function() {
                $('.operation-details-container').hide();
                $('.operations-list-container').show();
            });

            // Add event listeners to related operations links
            $('.related-operation-link').on('click', function(e) {
                e.preventDefault();
                const relatedId = $(this).data('id');
                loadOperationDetails(relatedId);
            });
        } catch (error) {
            console.error('Error loading operation details:', error);
            $('.operation-details-container').html(`
                <div class="error-message">
                    <h3>Error Loading Operation Details</h3>
                    <p>${error.message}</p>
                    <button class="back-to-operations button">Back to Operations</button>
                </div>
            `).show();
            $('.operations-list-container').hide();

            // Add event listener to the back button
            $('.back-to-operations').on('click', function() {
                $('.operation-details-container').hide();
                $('.operations-list-container').show();
            });
        }
    }

    // Admin Dashboard Functions
    // ==================================

    // Function to initialize the rich text editor
    function initRichTextEditor() {
        // Add event listeners to editor buttons
        $('.editor-button').on('click', function(e) {
            e.preventDefault();
            const command = $(this).data('command');

            if (command === 'createLink') {
                const url = prompt('Enter the link URL:');
                if (url) {
                    document.execCommand(command, false, url);
                }
            } else if (command === 'insertImage') {
                // Show image upload container
                $('.image-upload-container').show();
            } else {
                // Execute the command
                document.execCommand(command, false, null);

                // Toggle active class for style buttons
                if (['bold', 'italic', 'underline'].includes(command)) {
                    $(this).toggleClass('active');
                }
            }
        });

        // Handle image insertion
        $('#insert-image-button').on('click', function() {
            const imageUrl = $('#image-url').val();
            const altText = $('#image-alt').val() || 'Image';

            if (imageUrl) {
                const imageHtml = `<img src="${imageUrl}" alt="${altText}" />`;
                document.execCommand('insertHTML', false, imageHtml);

                // Clear fields and hide container
                $('#image-url').val('');
                $('#image-alt').val('');
                $('.image-upload-container').hide();
            } else {
                alert('Please enter an image URL.');
            }
        });

        // Handle image upload
        $('#image-upload').on('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(event) {
                    $('#image-url').val(event.target.result);
                };
                reader.readAsDataURL(file);
            }
        });

        // Cancel image insertion
        $('#cancel-image-button').on('click', function() {
            $('#image-url').val('');
            $('#image-alt').val('');
            $('#image-upload').val('');
            $('.image-upload-container').hide();
        });
    }

    // Function to load page content for editing
    function loadPageContent(pageElement) {
        // Show the content editor
        $('#content-editor-container').show();

        // In a real implementation, this would fetch the content from the server
        // For now, we'll use placeholder data
        let title;
        let content;

        switch(pageElement) {
            case 'about':
                title = 'About AydoCorp';
                content = $('#about h2').text() + '\n\n' + $('#about p').text();
                break;
            case 'services':
                title = 'Our Services';
                content = $('#services h2').text() + '\n\n' + $('#services p').text();
                break;
            case 'subsidiaries':
                title = 'Our Subsidiaries';
                content = $('#subsidiaries h2').text() + '\n\n' + $('#subsidiaries p').text();
                break;
            case 'contact':
                title = 'Contact Us';
                content = $('#contact h2').text() + '\n\n' + $('#contact p').text();
                break;
            default:
                title = 'Select a page element';
                content = 'Please select a page element to edit.';
        }

        // Set the values in the form
        $('#element-title').val(title);
        $('#element-content').val(content);
    }

    // Function to save page content
    function savePageContent(pageElement, title, content) {
        // In a real implementation, this would send the data to the server
        // For now, we'll just show a success message
        alert(`Content for "${pageElement}" has been saved successfully!`);

        // Reset the form
        $('#page-element-selector').val('');
        $('#element-title').val('');
        $('#element-content').val('');
        $('#content-editor-container').hide();
    }

    // Function to load user list
    function loadUserList() {
        // Show the user list container
        $('#user-list-container').show();

        // In a real implementation, this would fetch users from the server
        // For now, we'll use placeholder data
        const users = [
            { id: 1, username: 'Devil', email: 'shatteredobsidian@yahoo.com', role: 'admin', createdAt: 'Mon May 05 2025 22:36:43 GMT-0400' },
            { id: 2, username: 'JohnDoe', email: 'john@example.com', role: 'employee', createdAt: 'Tue May 06 2025 10:15:22 GMT-0400' },
            { id: 3, username: 'JaneSmith', email: 'jane@example.com', role: 'employee', createdAt: 'Wed May 07 2025 14:22:10 GMT-0400' }
        ];

        // Create the table
        let html = `
            <table class="user-list-table">
                <thead>
                    <tr>
                        <th>Username</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Created</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
        `;

        users.forEach(user => {
            const createdDate = new Date(user.createdAt).toLocaleDateString();
            html += `
                <tr>
                    <td>${user.username}</td>
                    <td>${user.email}</td>
                    <td><span class="user-role ${user.role}">${user.role}</span></td>
                    <td>${createdDate}</td>
                    <td>
                        <button class="button small edit-user-button" data-id="${user.id}">Edit</button>
                        ${user.role !== 'admin' ? `<button class="button small promote-user-button" data-id="${user.id}">Promote</button>` : ''}
                    </td>
                </tr>
            `;
        });

        html += `
                </tbody>
            </table>
        `;

        $('#user-list-container').html(html);

        // Add event listeners to buttons
        $('.edit-user-button').on('click', function() {
            const userId = $(this).data('id');
            alert(`Edit user with ID: ${userId}`);
        });

        $('.promote-user-button').on('click', function() {
            const userId = $(this).data('id');
            alert(`Promote user with ID: ${userId} to admin`);
        });
    }

    // Initialize on document ready
    // ==================================
    $(document).ready(function () {
        // Admin Dashboard Initialization
        // Initialize the rich text editor when the page loads
        initRichTextEditor();

        // Handle page element selection
        $('#page-element-selector').on('change', function() {
            const selectedElement = $(this).val();
            if (selectedElement) {
                loadPageContent(selectedElement);
            } else {
                $('#content-editor-container').hide();
            }
        });

        // Handle save content button
        $('#save-content-button').on('click', function() {
            const selectedElement = $('#page-element-selector').val();
            const title = $('#element-title').val();
            const content = $('#element-content').val();

            if (selectedElement && title && content) {
                savePageContent(selectedElement, title, content);
            } else {
                alert('Please fill in all fields.');
            }
        });

        // Handle cancel edit button
        $('#cancel-edit-button').on('click', function() {
            $('#page-element-selector').val('');
            $('#element-title').val('');
            $('#element-content').val('');
            $('#content-editor-container').hide();
        });

        // Handle view users button
        $('#view-users-button').on('click', function() {
            loadUserList();
        });

        // Handle hash changes for admin dashboard
        $(window).on('hashchange', function() {
            if (window.location.hash === '#admin-dashboard') {
                // Check if user is admin before showing dashboard
                const userJson = localStorage.getItem('aydocorpUser');
                if (userJson) {
                    try {
                        const user = JSON.parse(userJson);
                        if (user.role !== 'admin') {
                            // Redirect non-admin users
                            alert('You do not have permission to access the Admin Dashboard.');
                            window.location.href = '#';
                        }
                    } catch (error) {
                        console.error('Error parsing user data:', error);
                        window.location.href = '#';
                    }
                } else {
                    // Redirect users who are not logged in
                    alert('Please log in with an admin account to access the Admin Dashboard.');
                    window.location.href = '#login';
                }
            }
        });

        // Check admin access on initial load if hash is #admin-dashboard
        if (window.location.hash === '#admin-dashboard') {
            const userJson = localStorage.getItem('aydocorpUser');
            if (userJson) {
                try {
                    const user = JSON.parse(userJson);
                    if (user.role !== 'admin') {
                        alert('You do not have permission to access the Admin Dashboard.');
                        window.location.href = '#';
                    }
                } catch (error) {
                    console.error('Error parsing user data:', error);
                    window.location.href = '#';
                }
            } else {
                alert('Please log in with an admin account to access the Admin Dashboard.');
                window.location.href = '#login';
            }
        }

        // Subsidiary popup functionality
        $('.subsidiary-more').on('click', function () {
            const subsidiary = $(this).data('subsidiary');
            $('#subsidiary-popup').fadeIn(300);
            $('.subsidiary-popup-content').hide();
            $(`#${subsidiary}-content`).show();
        });

        $('.close').on('click', function () {
            $('#subsidiary-popup').fadeOut(300);
        });

        $(window).on('click', function (event) {
            if ($(event.target).is('#subsidiary-popup')) {
                $('#subsidiary-popup').fadeOut(300);
            }
        });

        // Employee Portal tab navigation
        $('.portal-tab').on('click', function(e) {
            e.preventDefault();

            // Get the section to show
            const section = $(this).data('section');

            // Update active tab
            $('.portal-tab').removeClass('active');
            $(this).addClass('active');

            // Hide all sections and show the selected one
            $('.portal-section').hide();
            $(`#${section}-section`).show();

            // Load data for the selected section
            switch(section) {
                case 'career-paths':
                    loadCareerPaths();
                    break;
                case 'employee-database':
                    loadEmployees();
                    break;
                case 'events':
                    loadEvents();
                    break;
                case 'operations':
                    loadOperations();
                    break;
            }
        });

        // Edit profile button handler
        $('#edit-profile-button').on('click', function() {
            // Hide other containers
            $('.employee-list-container').hide();
            $('.employee-profile-container').hide();

            // Get current user data
            const apiBase = getApiBaseUrl();
            const token = localStorage.getItem('aydocorpToken');
            const userId = JSON.parse(localStorage.getItem('aydocorpUser')).id;

            // Try to load existing profile data
            fetch(`${apiBase}/api/employee-portal/employees`, {
                headers: {
                    'x-auth-token': token
                }
            })
            .then(response => response.json())
            .then(employees => {
                const currentEmployee = employees.find(emp => emp.user._id === userId);

                if (currentEmployee) {
                    // Pre-fill form with existing data
                    $('#employee-fullname').val(currentEmployee.fullName);
                    $('#employee-photo').val(currentEmployee.photo);
                    $('#employee-background').val(currentEmployee.backgroundStory);
                    $('#employee-rank').val(currentEmployee.rank);
                    $('#employee-department').val(currentEmployee.department);
                    $('#employee-specializations').val(currentEmployee.specializations.join(', '));
                    $('#employee-certifications').val(currentEmployee.certifications.join(', '));

                    if (currentEmployee.contactInfo) {
                        $('#employee-discord').val(currentEmployee.contactInfo.discord || '');
                        $('#employee-rsi').val(currentEmployee.contactInfo.rsiHandle || '');
                    }
                }

                // Show the edit form
                $('.employee-edit-form-container').show();
            })
            .catch(error => {
                console.error('Error loading employee data:', error);
                // Show the edit form anyway
                $('.employee-edit-form-container').show();
            });
        });

        // Cancel profile edit button handler
        $('#cancel-profile-edit').on('click', function() {
            $('.employee-edit-form-container').hide();
            $('.employee-list-container').show();
        });

        // Employee edit form submission handler
        $('#employee-edit-form').on('submit', async function(event) {
            event.preventDefault();

            const fullName = $('#employee-fullname').val();
            const photo = $('#employee-photo').val();
            const backgroundStory = $('#employee-background').val();
            const rank = $('#employee-rank').val();
            const department = $('#employee-department').val();
            const specializations = $('#employee-specializations').val().split(',').map(s => s.trim()).filter(s => s);
            const certifications = $('#employee-certifications').val().split(',').map(s => s.trim()).filter(s => s);
            const discord = $('#employee-discord').val();
            const rsiHandle = $('#employee-rsi').val();

            // Validation
            if (!fullName) {
                alert('Please enter your full name.');
                return;
            }

            try {
                const apiBase = getApiBaseUrl();
                const token = localStorage.getItem('aydocorpToken');

                const response = await fetch(`${apiBase}/api/employee-portal/employees`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-auth-token': token
                    },
                    body: JSON.stringify({
                        fullName,
                        photo,
                        backgroundStory,
                        rank,
                        department,
                        specializations,
                        certifications,
                        contactInfo: {
                            discord,
                            rsiHandle
                        }
                    })
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    alert('Failed to save profile: ' + (errorData.message || 'Unknown error'));
                    return;
                }

                // Profile saved successfully
                alert('Profile saved successfully!');

                // Hide the edit form and reload employees
                $('.employee-edit-form-container').hide();
                $('.employee-list-container').show();
                loadEmployees();

            } catch (error) {
                alert('Error saving profile: ' + (error.message || 'Network error'));
                console.error('Profile save error:', error);
            }
        });

        // Event filter handler
        $('#event-filter').on('change', function() {
            const filter = $(this).val();

            if (filter === 'all') {
                $('.event-item').show();
            } else {
                $('.event-item').hide();
                $(`.event-item.${filter}`).show();
            }
        });

        // Operations filter handler
        $('#operations-filter').on('change', function() {
            const filter = $(this).val();

            if (filter === 'all') {
                $('.operation-item').show();
            } else {
                $('.operation-item').hide();
                $(`.operation-item.${filter}`).show();
            }
        });

        // Authentication event handlers
        $('#login-form').on('submit', async function (event) {
            event.preventDefault();

            const username = $('#username').val();
            const password = $('#password').val();

            // Show loading state
            const $loginButton = $(this).find('input[type="submit"]');
            const originalButtonText = $loginButton.val();

            $loginButton.val('Checking connection...').prop('disabled', true);

            // Check server status first
            const serverOnline = await checkServerStatus();
            if (!serverOnline) {
                alert('Cannot connect to the server. Please try again later.');
                $loginButton.val(originalButtonText).prop('disabled', false);
                return;
            }

            $loginButton.val('Logging in...').prop('disabled', true);

            try {
                await handleLogin(username, password);
            } catch (error) {
                console.error('Login error:', error);
                alert(error.message || 'Login failed. Please try again.');
            } finally {
                // Reset button state
                $loginButton.val(originalButtonText).prop('disabled', false);
            }
        });

        // Toggle between login and register forms
        $('.show-register').on('click', function (e) {
            e.preventDefault();
            $('#login-container').hide();
            $('#register-container').show();
        });

        $('.show-login').on('click', function (e) {
            e.preventDefault();
            $('#register-container').hide();
            $('#login-container').show();
        });

        // Registration form handling
        $('#register-form').on('submit', async function (event) {
            event.preventDefault();

            const username = $('#reg-username').val();
            const email = $('#reg-email').val();
            const password = $('#reg-password').val();
            const confirmPassword = $('#reg-confirm-password').val();

            // Validation
            if (!username || !email || !password) {
                alert('Please fill in all required fields.');
                return;
            }

            if (password !== confirmPassword) {
                alert('Passwords do not match.');
                return;
            }

            // Show loading indicator
            $('#register-button').val('Creating account...').prop('disabled', true);

            try {
                const apiBase = getApiBaseUrl();

                // Send registration request with correct URL format
                const response = await fetch(`${apiBase}/api/auth/register`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({username, email, password})
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    alert('Registration failed: ' + (errorData.message || 'Unknown error'));
                    return;
                }

                // Process successful response but we don't need the data
                alert('Account created successfully! You can now log in.');

                // Switch to login form
                $('#register-container').hide();
                $('#login-container').show();

            } catch (error) {
                alert('Registration failed: ' + (error.message || 'Network error'));
                console.error('Registration error:', error);
            } finally {
                // Reset button
                $('#register-button').val('Create Account').prop('disabled', false);
            }
        });

        // Handle logout
        $(document).on('click', '.logout', function (event) {
            event.preventDefault();
            handleLogout();
        });

        // Handle hash changes for navigation
        $(window).on('hashchange', function () {
            checkLoginStatus();

            const hash = window.location.hash;

            // Check for employee portal URLs
            if (hash === '#employee-portal') {
                // Show the employee portal if logged in
                if (localStorage.getItem('aydocorpLoggedIn') === 'true') {
                    // Default to showing the Career Paths section
                    $('.portal-section').hide();
                    $('#career-paths-section').show();
                    $('.portal-tab').removeClass('active');
                    $('.portal-tab[data-section="career-paths"]').addClass('active');

                    // Load career paths data
                    loadCareerPaths();
                }
            }
        });

        // Initialize - validate token and check login status on page load
        validateToken().then(isValid => {
            if (isValid) {
                console.log('Token is valid');
            }
            checkLoginStatus();
        });

        // Back to employee portal button
        $('#back-to-employee-portal').on('click', function () {
            window.location.href = '#employee-portal';
        });

        // Initial API test
        testApiConnection();

        // New Operation button click handler
        $('#new-post-button').on('click', function(event) {
            event.preventDefault();

            // Hide other containers
            $('#operations-list-container').hide();
            $('#operation-details-container').hide();

            // Show the new operation form
            $('#new-post-form-container').show();
        });

        // Operation submission handler
        $('#new-post-form').on('submit', async function(event) {
            event.preventDefault();

            const title = $('#post-title').val();
            const content = $('#post-content').val();

            // Validation
            if (!title || !content) {
                alert('Please fill in both title and content.');
                return;
            }

            try {
                // Show loading state
                const $submitButton = $(this).find('button[type="submit"]');
                const originalButtonText = $submitButton.text();
                $submitButton.text('Creating Operation...').prop('disabled', true);

                const apiBase = getApiBaseUrl();
                const token = localStorage.getItem('aydocorpToken');

                const response = await fetch(`${apiBase}/api/employee-portal/operations`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-auth-token': token
                    },
                    body: JSON.stringify({ 
                        title, 
                        description: 'Created from portal',
                        content,
                        category: 'document',
                        classification: 'internal'
                    })
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    alert('Failed to create operation: ' + (errorData.message || 'Unknown error'));
                    return;
                }

                // Operation created successfully
                alert('Operation created successfully!');

                // Clear form fields
                $('#post-title').val('');
                $('#post-content').val('');

                // Redirect to employee portal operations section
                window.location.href = '#employee-portal';

                // Show the operations section
                $('.portal-section').hide();
                $('#operations-section').show();
                $('.portal-tab').removeClass('active');
                $('.portal-tab[data-section="operations"]').addClass('active');

                // Reload operations data
                loadOperations();

            } catch (error) {
                alert('Error creating operation: ' + (error.message || 'Network error'));
                console.error('Operation creation error:', error);
            } finally {
                // Reset button state
                $submitButton.text(originalButtonText).prop('disabled', false);
            }
        });
    });
})(jQuery);
