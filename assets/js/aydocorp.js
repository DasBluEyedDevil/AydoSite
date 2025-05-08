(function ($) {
    // API Utilities
    /**
     * Get the base URL for API requests.
     */
    function getApiBaseUrl() {
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            return 'http://localhost:8080';
        }
        return window.location.origin;
    }

    /**
     * Build a validated API URL.
     */
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

    /**
     * Output API connection info for debugging.
     */
    function debugApiConnection() {
        console.group('API Connection Debug');
        const baseUrl = getApiBaseUrl();
        console.log('Base URL:', baseUrl);
        ['api/test', 'api/auth', 'test', 'auth'].forEach(endpoint => {
            const url = getApiUrl(endpoint);
            console.log(`${endpoint} -> ${url}`);
        });
        console.log('Hostname:', window.location.hostname);
        console.log('Origin:', window.location.origin);
        console.log('Protocol:', window.location.protocol);
        console.groupEnd();
    }

    /**
     * Check if the server is reachable.
     */
    async function checkServerStatus() {
        try {
            const authResponse = await fetch(getApiUrl('auth'));
            if (authResponse.ok) return true;
            const testResponse = await fetch(getApiUrl('test'));
            return testResponse.ok;
        } catch (error) {
            return false;
        }
    }

    /**
     * Validate the authentication token with the server.
     */
    async function validateToken() {
        try {
            const token = sessionStorage.getItem('aydocorpToken');
            if (!token) return false;
            try {
                const response = await AuthUtils.secureRequest(getApiUrl('auth/validate'));
                if (response.ok) return true;
                if (response.status !== 404) console.warn(`Standard validate endpoint failed: ${response.status}`);
            } catch {}
            for (const endpoint of ['auth/check', 'auth/status']) {
                try {
                    const altResponse = await AuthUtils.secureRequest(getApiUrl(endpoint));
                    if (altResponse.ok) return true;
                } catch {}
            }
            if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || await testApiConnection()) {
                sessionStorage.setItem('aydocorpValidationFallback', 'true');
                return true;
            }
            sessionStorage.removeItem('aydocorpValidationFallback');
            return false;
        } catch {
            sessionStorage.removeItem('aydocorpValidationFallback');
            return false;
        }
    }

    /**
     * Test if the API server is reachable.
     */
    async function testApiConnection() {
        try {
            const url = getApiUrl('test');
            const response = await fetch(url);
            return response.ok;
        } catch {
            return false;
        }
    }

    // Authentication
    /**
     * Log in a user and store credentials.
     */
    async function handleLogin(username, password) {
        if (!username || !password) return Promise.reject(new Error('Please enter both username and password.'));
        if (!await testApiConnection()) return Promise.reject(new Error('Cannot connect to the server. Please try again later.'));
        try {
            const response = await fetch(getApiUrl('auth/login'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            if (!response.ok) {
                const contentType = response.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                    const errorData = await response.json();
                    return Promise.reject(new Error(errorData.message || 'Login failed. Please check your credentials.'));
                }
                return Promise.reject(new Error(`Login failed with status: ${response.status}`));
            }
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                const data = await response.json();
                if (!data.token) return Promise.reject(new Error('Server did not return an authentication token.'));
                localStorage.setItem('aydocorpToken', data.token);
                localStorage.setItem('aydocorpUser', JSON.stringify(data.user || {}));
                localStorage.setItem('aydocorpLoggedIn', 'true');
                sessionStorage.setItem('aydocorpToken', data.token);
                sessionStorage.setItem('aydocorpUser', JSON.stringify(data.user || {}));
                sessionStorage.setItem('aydocorpLoggedIn', 'true');
                document.cookie = `aydocorpToken=${data.token}; path=/; max-age=86400; SameSite=Strict`;
                AuthUtils.showNotification(`Welcome back, ${data.user?.username || 'User'}!`, 'success');
                checkLoginStatus();
                window.location.href = '#';
            } else {
                return Promise.reject(new Error('Unexpected response format from server.'));
            }
        } catch (error) {
            AuthUtils.showNotification(error.message || 'Login failed', 'error');
            throw error;
        }
    }

    /**
     * Log out the user and clear credentials.
     */
    async function handleLogout() {
        try {
            localStorage.removeItem('aydocorpUser');
            localStorage.removeItem('aydocorpLoggedIn');
            localStorage.removeItem('aydocorpToken');
            sessionStorage.removeItem('aydocorpUser');
            sessionStorage.removeItem('aydocorpLoggedIn');
            sessionStorage.removeItem('aydocorpToken');
            document.cookie = 'aydocorpToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
            $('.user-status').remove();
            $('#logout-nav').attr('id', '').find('a').text('Member Login').attr('href', '#login').removeClass('logout');
            AuthUtils.showNotification('You have been logged out successfully.', 'info');
            window.location.href = '#';
            checkLoginStatus();
        } catch (error) {
            localStorage.removeItem('aydocorpUser');
            localStorage.removeItem('aydocorpLoggedIn');
            localStorage.removeItem('aydocorpToken');
            sessionStorage.removeItem('aydocorpUser');
            sessionStorage.removeItem('aydocorpLoggedIn');
            sessionStorage.removeItem('aydocorpToken');
            document.cookie = 'aydocorpToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
            $('.user-status').remove();
            $('#logout-nav').attr('id', '').find('a').text('Member Login').attr('href', '#login').removeClass('logout');
            AuthUtils.showNotification('An error occurred during logout, but you have been logged out locally.', 'warning');
            window.location.href = '#';
            checkLoginStatus();
        }
    }

    /**
     * Update UI based on login status.
     */
    async function checkLoginStatus() {
        try {
            let token = getCookie('aydocorpToken') || localStorage.getItem('aydocorpToken') || sessionStorage.getItem('aydocorpToken');
            let userJson = localStorage.getItem('aydocorpUser') || sessionStorage.getItem('aydocorpUser');
            let isLoggedIn = (localStorage.getItem('aydocorpLoggedIn') === 'true') || (sessionStorage.getItem('aydocorpLoggedIn') === 'true') || !!token;
            const user = AuthUtils.safeJsonParse(userJson, null);
            if (isLoggedIn && user) {
                const isAdmin = user.role === 'admin' || user.username === 'Devil';
                let tokenValidationRetries = parseInt(sessionStorage.getItem('tokenValidationRetries') || '0');
                const maxRetries = 5;
                validateToken().then(isValid => {
                    const inFallbackMode = sessionStorage.getItem('aydocorpValidationFallback') === 'true';
                    if (inFallbackMode && !sessionStorage.getItem('fallbackWarningShown')) {
                        AuthUtils.showNotification(
                            'Some authentication services are currently unavailable. You can continue using the portal, but some features might have limited functionality.',
                            'info', 8000
                        );
                        sessionStorage.setItem('fallbackWarningShown', 'true');
                    }
                    if (!isValid) {
                        if (tokenValidationRetries >= maxRetries - 1) {
                            AuthUtils.showNotification(
                                'Your session may have validation issues. You can continue using the portal, but some features might not work correctly. Try refreshing the page if you encounter problems.',
                                'warning', 10000
                            );
                            sessionStorage.removeItem('tokenValidationRetries');
                            setTimeout(() => { validateToken().catch(() => {}); }, 60000);
                        } else {
                            sessionStorage.setItem('tokenValidationRetries', (tokenValidationRetries + 1).toString());
                            const delay = 30000 + (tokenValidationRetries * 10000);
                            setTimeout(() => {
                                validateToken().then(retryValid => {
                                    if (retryValid) {
                                        sessionStorage.removeItem('tokenValidationRetries');
                                        sessionStorage.removeItem('aydocorpValidationFallback');
                                        sessionStorage.removeItem('fallbackWarningShown');
                                    }
                                });
                            }, delay);
                        }
                    } else {
                        sessionStorage.removeItem('tokenValidationRetries');
                        if (inFallbackMode) {
                            sessionStorage.removeItem('aydocorpValidationFallback');
                            sessionStorage.removeItem('fallbackWarningShown');
                        }
                    }
                });
                $('#employee-portal-login-required').hide();
                $('#employee-portal-content').show();
                $('.user-status').remove();
                const safeUsername = AuthUtils.sanitizeHtml(user.username);
                const userStatusHtml = `
                    <div class="user-status">
                        <span class="username">${safeUsername}</span>
                        <div class="dropdown-container">
                            ${isAdmin ? '<a href="#admin-dashboard" class="admin-badge">ADMIN</a>' : ''}
                            <span class="logout-option">
                                <a href="#" class="logout">Logout</a>
                            </span>
                        </div>
                    </div>
                `;
                $('body').append(userStatusHtml);
                const $loginLink = $('header nav ul li a[href="#login"]');
                if ($loginLink.length) {
                    $loginLink.text('Logout').attr('href', '#').addClass('logout').closest('li').attr('id', 'logout-nav');
                }
            } else {
                $('#employee-portal-content').hide();
                $('#employee-portal-login-required').show();
                const $logoutLink = $('header nav ul li a.logout');
                if ($logoutLink.length) {
                    $logoutLink.text('Member Login').attr('href', '#login').removeClass('logout').closest('li').removeAttr('id');
                }
                $('.user-status').remove();
            }
        } catch {
            $('#employee-portal-content').hide();
            $('#employee-portal-login-required').show();
            AuthUtils.showNotification('An error occurred while checking login status.', 'error');
        }
    }

    // Employee Portal Functions
    // ==================================

    // Career Paths Functions
    /**
     * Load career paths from the API
     */
    async function loadCareerPaths() {
        const $careerPathList = $('.career-path-list');
        $careerPathList.html('<p>Loading career paths...</p>');

        // Get token from session storage
        const token = sessionStorage.getItem('aydocorpToken');
        if (!token) {
            $careerPathList.html(`
                <div class="error-message">
                    <h3>Authentication Required</h3>
                    <p>Please <a href="#signin">log in</a> to view career paths.</p>
                </div>
            `);
            return;
        }

        try {

            // Set up headers with both authentication methods
            const headers = {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': `Bearer ${token}`,
                'x-auth-token': token
            };

            // Make the API request
            const response = await fetch(getApiUrl('employee-portal/career-paths'), {
                method: 'GET',
                headers: headers
            });

            if (!response.ok) {
                // If unauthorized, try to refresh token
                if (response.status === 401) {
                    console.error('Authentication error loading career paths, attempting to refresh token');

                    // Try to validate token
                    const isValid = await validateToken();

                    if (isValid) {
                        // Token is valid, retry the request
                        console.log('Token validated, retrying career paths request');

                        // Try again with the same headers
                        const retryResponse = await fetch(getApiUrl('employee-portal/career-paths'), {
                            method: 'GET',
                            headers: headers
                        });

                        if (retryResponse.ok) {
                            // Success on retry, process the response
                            const careerPaths = await retryResponse.json();
                            renderCareerPaths(careerPaths, $careerPathList);
                            return;
                        }
                    }

                    // If we still can't access, show login required
                    // If we get here, the retry failed or token is invalid
                    // Show a more informative error message with options to continue
                    $careerPathList.html(`
                        <div class="error-message">
                            <h3>Authentication Required</h3>
                            <p>Your session may have expired. Please <a href="#signin">log in</a> again.</p>
                        </div>
                    `);
                    return;
                }

                console.error('Failed to load career paths');
                $careerPathList.html(`
                    <div class="error-message">
                        <h3>Error Loading Career Paths</h3>
                        <p>Status: ${response.status}</p>
                        <button class="retry-button">Retry</button>
                    </div>
                `);

                // Add retry button handler
                const $retryButton = $('.retry-button');
                $retryButton.on('click', function() {
                    loadCareerPaths();
                });

                return;
            }

            const careerPaths = await response.json();
            renderCareerPaths(careerPaths, $careerPathList);
        } catch (error) {
            console.error('Error loading career paths:', error);
            $careerPathList.html(`
                <div class="error-message">
                    <h3>Error Loading Career Paths</h3>
                    <p>${error.message}</p>
                    <button class="retry-button">Retry</button>
                </div>
            `);

            // Add retry button handler
            const $retryButton = $('.retry-button');
            $retryButton.on('click', function() {
                loadCareerPaths();
            });
        }
    }

    // Helper function to render career paths (add this after loadCareerPaths)
    function renderCareerPaths(careerPaths, $container) {

        if (careerPaths.length === 0) {
            $container.html('<p>No career paths found.</p>');
            return;
        }

        // Render career paths
        let html = '<div class="career-paths">';

        careerPaths.forEach(careerPath => {
            // Safely trim description
            const description = careerPath.description || '';
            const trimmedDescription = description.substring(0, 100) + (description.length > 100 ? '...' : '');

            html += `
                <div class="career-path-item" data-id="${AuthUtils.sanitizeHtml(careerPath._id)}">
                    <h4>${AuthUtils.sanitizeHtml(careerPath.department)}</h4>
                    <p>${AuthUtils.sanitizeHtml(trimmedDescription)}</p>
                    <button class="view-career-path button small" data-id="${AuthUtils.sanitizeHtml(careerPath._id)}">View Details</button>
                </div>
            `;
        });

        html += '</div>';
        $container.html(html);

        // Add event listeners to the view buttons
        $('.view-career-path').on('click', function() {
            const careerPathId = $(this).data('id');
            loadCareerPathDetails(careerPathId);
        });
    }

    /**
     * Load details for a specific career path
     * @param {string} careerPathId - The ID of the career path to load
     */
    async function loadCareerPathDetails(careerPathId) {
        try {
            const $careerPathDetails = $('.career-path-details');
            const $careerPathList = $('.career-path-list');

            // Input validation
            if (!careerPathId) {
                AuthUtils.showNotification('Invalid career path ID', 'error');
                return;
            }

            const url = getApiUrl(`employee-portal/career-paths/${careerPathId}`);
            if (!url) {
                AuthUtils.showNotification('Invalid API configuration', 'error');
                return;
            }

            const response = await AuthUtils.secureRequest(url);

            if (!response.ok) {
                console.error('Failed to load career path details');
                $careerPathDetails.html(`
                    <div class="error-message">
                        <h3>Error Loading Career Path Details</h3>
                        <p>Failed to load career path details</p>
                        <button class="back-to-career-paths button">Back to Career Paths</button>
                    </div>
                `).show();
                $careerPathList.hide();

                // Add event listener to the back button
                const $backButton = $('.back-to-career-paths');
                $backButton.on('click', function() {
                    $careerPathDetails.hide();
                    $careerPathList.show();
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

            $careerPathDetails.html(html).show();
            $careerPathList.hide();

            // Add event listener to the back button
            const $backButton = $('.back-to-career-paths');
            $backButton.on('click', function() {
                $careerPathDetails.hide();
                $careerPathList.show();
            });
        } catch (error) {
            console.error('Error loading career path details:', error);
            $careerPathDetails.html(`
                <div class="error-message">
                    <h3>Error Loading Career Path Details</h3>
                    <p>${error.message}</p>
                    <button class="back-to-career-paths button">Back to Career Paths</button>
                </div>
            `).show();
            $careerPathList.hide();

            // Add event listener to the back button
            const $backButton = $('.back-to-career-paths');
            $backButton.on('click', function() {
                $careerPathDetails.hide();
                $careerPathList.show();
            });
        }
    }

    // Employee Database Functions
    /**
     * Load all employees from the API
     */
    async function loadEmployees() {
        try {
            const $employeeListContainer = $('.employee-list-container');

            const url = getApiUrl('employee-portal/employees');
            if (!url) {
                AuthUtils.showNotification('Invalid API configuration', 'error');
                return;
            }

            const response = await AuthUtils.secureRequest(url);

            if (!response.ok) {
                console.error('Failed to load employees');

                // Special handling for authentication errors
                if (response.status === 401) {
                    console.warn('Authentication error loading employees, attempting to refresh token');

                    // Try to validate token
                    const isValid = await validateToken();

                    if (isValid) {
                        // Token is valid, retry the request
                        console.log('Token validated, retrying employees request');
                        const retryResponse = await AuthUtils.secureRequest(url);

                        if (retryResponse.ok) {
                            // Success on retry, process the response
                            const employees = await retryResponse.json();

                            if (employees.length === 0) {
                                $employeeListContainer.html('<p>No employees found.</p>');
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
                            $employeeListContainer.html(html);

                            // Add event listeners to the view buttons
                            const $viewEmployeeButtons = $('.view-employee');
                            $viewEmployeeButtons.on('click', function() {
                                const employeeId = $(this).data('id');
                                loadEmployeeProfile(employeeId);
                            });

                            return;
                        }
                    }

                    // If we get here, the retry failed or token is invalid
                    $employeeListContainer.html(`
                        <div class="error-message">
                            <h3>Authentication Error</h3>
                            <p>Your session may have expired. Please try refreshing the page or logging in again.</p>
                            <button class="retry-button button small">Retry</button>
                            <a href="#signin" class="button small">Login Again</a>
                        </div>
                    `);

                    // Add event listener to retry button
                    const $authRetryButton = $('.retry-button');
                    $authRetryButton.on('click', function() {
                        loadEmployees();
                    });

                    return;
                }

                // Handle other errors
                $employeeListContainer.html(`
                    <div class="error-message">
                        <h3>Error Loading Employees</h3>
                        <p>Failed to load employees</p>
                        <button class="retry-button button small">Retry</button>
                    </div>
                `);

                // Add event listener to retry button
                const $errorRetryButton = $('.retry-button');
                $errorRetryButton.on('click', function() {
                    loadEmployees();
                });

                return;
            }

            const employees = await response.json();

            if (employees.length === 0) {
                $employeeListContainer.html('<p>No employees found.</p>');
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
            $employeeListContainer.html(html);

            // Add event listeners to the view buttons
            const $viewEmployeeButtons = $('.view-employee');
            $viewEmployeeButtons.on('click', function() {
                const employeeId = $(this).data('id');
                loadEmployeeProfile(employeeId);
            });
        } catch (error) {
            console.error('Error loading employees:', error);
            $employeeListContainer.html(`
                <div class="error-message">
                    <h3>Error Loading Employees</h3>
                    <p>${error.message}</p>
                </div>
            `);
        }
    }

    /**
     * Load profile for a specific employee
     * @param {string} employeeId - The ID of the employee to load
     */
    async function loadEmployeeProfile(employeeId) {
        try {
            const $employeeProfileContainer = $('.employee-profile-container');
            const $employeeListContainer = $('.employee-list-container');

            // Input validation
            if (!employeeId) {
                AuthUtils.showNotification('Invalid employee ID', 'error');
                return;
            }

            const url = getApiUrl(`employee-portal/employees/${employeeId}`);
            if (!url) {
                AuthUtils.showNotification('Invalid API configuration', 'error');
                return;
            }

            const response = await AuthUtils.secureRequest(url);

            if (!response.ok) {
                console.error('Failed to load employee profile');
                $employeeProfileContainer.html(`
                    <div class="error-message">
                        <h3>Error Loading Employee Profile</h3>
                        <p>Failed to load employee profile</p>
                        <button class="back-to-employees button">Back to Employee List</button>
                    </div>
                `).show();
                $employeeListContainer.hide();

                // Add event listener to the back button
                const $backButton = $('.back-to-employees');
                $backButton.on('click', function() {
                    $employeeProfileContainer.hide();
                    $employeeListContainer.show();
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

            $employeeProfileContainer.html(html).show();
            $employeeListContainer.hide();

            // Add event listener to the back button
            const $backButton = $('.back-to-employees');
            $backButton.on('click', function() {
                $employeeProfileContainer.hide();
                $employeeListContainer.show();
            });
        } catch (error) {
            console.error('Error loading employee profile:', error);
            $employeeProfileContainer.html(`
                <div class="error-message">
                    <h3>Error Loading Employee Profile</h3>
                    <p>${error.message}</p>
                    <button class="back-to-employees button">Back to Employee List</button>
                </div>
            `).show();
            $employeeListContainer.hide();

            // Add event listener to the back button
            const $backButton = $('.back-to-employees');
            $backButton.on('click', function() {
                $employeeProfileContainer.hide();
                $employeeListContainer.show();
            });
        }
    }

    // Events Functions
    /**
     * Load all events from the API
     */
    async function loadEvents() {
        try {
            const $eventsListContainer = $('.events-list-container');

            const url = getApiUrl('employee-portal/events');
            if (!url) {
                AuthUtils.showNotification('Invalid API configuration', 'error');
                return;
            }

            const response = await AuthUtils.secureRequest(url);

            if (!response.ok) {
                console.error('Failed to load events');

                // Special handling for authentication errors
                if (response.status === 401) {
                    console.warn('Authentication error loading events, attempting to refresh token');

                    // Try to validate token
                    const isValid = await validateToken();

                    if (isValid) {
                        // Token is valid, retry the request
                        console.log('Token validated, retrying events request');
                        const retryResponse = await AuthUtils.secureRequest(url);

                        if (retryResponse.ok) {
                            // Success on retry, process the response
                            const events = await retryResponse.json();

                            if (events.length === 0) {
                                $eventsListContainer.html('<p>No events found.</p>');
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
                            $eventsListContainer.html(html);

                            // Add event listeners to the view buttons
                            const $viewEventButtons = $('.view-event');
                            $viewEventButtons.on('click', function() {
                                const eventId = $(this).data('id');
                                loadEventDetails(eventId);
                            });

                            return;
                        }
                    }

                    // If we get here, the retry failed or token is invalid
                    $eventsListContainer.html(`
                        <div class="error-message">
                            <h3>Authentication Error</h3>
                            <p>Your session may have expired. Please try refreshing the page or logging in again.</p>
                            <button class="retry-button button small">Retry</button>
                            <a href="#signin" class="button small">Login Again</a>
                        </div>
                    `);

                    // Add event listener to retry button
                    $('.retry-button').on('click', function() {
                        loadEvents();
                    });

                    return;
                }

                // Handle other errors
                $eventsListContainer.html(`
                    <div class="error-message">
                        <h3>Error Loading Events</h3>
                        <p>Failed to load events</p>
                        <button class="retry-button button small">Retry</button>
                    </div>
                `);

                // Add event listener to retry button
                $('.retry-button').on('click', function() {
                    loadEvents();
                });

                return;
            }

            const events = await response.json();

            if (events.length === 0) {
                $eventsListContainer.html('<p>No events found.</p>');
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
            $eventsListContainer.html(html);

            // Add event listeners to the view buttons
            const $viewEventButtons = $('.view-event');
            $viewEventButtons.on('click', function() {
                const eventId = $(this).data('id');
                loadEventDetails(eventId);
            });
        } catch (error) {
            console.error('Error loading events:', error);
            $eventsListContainer.html(`
                <div class="error-message">
                    <h3>Error Loading Events</h3>
                    <p>${error.message}</p>
                </div>
            `);
        }
    }

    /**
     * Load details for a specific event
     * @param {string} eventId - The ID of the event to load
     */
    async function loadEventDetails(eventId) {
        try {
            const $eventDetailsContainer = $('.event-details-container');
            const $eventsListContainer = $('.events-list-container');

            // Input validation
            if (!eventId) {
                AuthUtils.showNotification('Invalid event ID', 'error');
                return;
            }

            const url = getApiUrl(`employee-portal/events/${eventId}`);
            if (!url) {
                AuthUtils.showNotification('Invalid API configuration', 'error');
                return;
            }

            const response = await AuthUtils.secureRequest(url);

            if (!response.ok) {
                console.error('Failed to load event details');
                $eventDetailsContainer.html(`
                    <div class="error-message">
                        <h3>Error Loading Event Details</h3>
                        <p>Failed to load event details</p>
                        <button class="back-to-events button">Back to Events</button>
                    </div>
                `).show();
                $eventsListContainer.hide();

                // Add event listener to the back button
                const $backToEventsButton = $('.back-to-events');
                $backToEventsButton.on('click', function() {
                    $eventDetailsContainer.hide();
                    $eventsListContainer.show();
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

            $eventDetailsContainer.html(html).show();
            $eventsListContainer.hide();

            // Add event listener to the back button
            const $backToEventsButton = $('.back-to-events');
            $backToEventsButton.on('click', function() {
                $eventDetailsContainer.hide();
                $eventsListContainer.show();
            });
        } catch (error) {
            console.error('Error loading event details:', error);
            $eventDetailsContainer.html(`
                <div class="error-message">
                    <h3>Error Loading Event Details</h3>
                    <p>${error.message}</p>
                    <button class="back-to-events button">Back to Events</button>
                </div>
            `).show();
            $eventsListContainer.hide();

            // Add event listener to the back button
            const $backToEventsButton = $('.back-to-events');
            $backToEventsButton.on('click', function() {
                $eventDetailsContainer.hide();
                $eventsListContainer.show();
            });
        }
    }

    // Operations Functions
    /**
     * Load all operations from the API
     */
    async function loadOperations() {
        try {
            const $operationsListContainer = $('.operations-list-container');

            const url = getApiUrl('employee-portal/operations');
            if (!url) {
                AuthUtils.showNotification('Invalid API configuration', 'error');
                return;
            }

            const response = await AuthUtils.secureRequest(url);

            if (!response.ok) {
                console.error('Failed to load operations');

                // Special handling for authentication errors
                if (response.status === 401) {
                    console.warn('Authentication error loading operations, attempting to refresh token');

                    // Try to validate token
                    const isValid = await validateToken();

                    if (isValid) {
                        // Token is valid, retry the request
                        console.log('Token validated, retrying operations request');
                        const retryResponse = await AuthUtils.secureRequest(url);

                        if (retryResponse.ok) {
                            // Success on retry, process the response
                            const operations = await retryResponse.json();

                            if (operations.length === 0) {
                                $operationsListContainer.html('<p>No operations found.</p>');
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
                            $operationsListContainer.html(html);

                            // Add event listeners to the view buttons
                            const $viewOperationButtons = $('.view-operation');
                            $viewOperationButtons.on('click', function() {
                                const operationId = $(this).data('id');
                                loadOperationDetails(operationId);
                            });

                            return;
                        }
                    }

                    // If we get here, the retry failed or token is invalid
                    $operationsListContainer.html(`
                        <div class="error-message">
                            <h3>Authentication Error</h3>
                            <p>Your session may have expired. Please try refreshing the page or logging in again.</p>
                            <button class="retry-button button small">Retry</button>
                            <a href="#signin" class="button small">Login Again</a>
                        </div>
                    `);

                    // Add event listener to retry button
                    const $retryButton = $('.retry-button');
                    $retryButton.on('click', function() {
                        loadOperations();
                    });

                    return;
                }

                // Handle other errors
                $operationsListContainer.html(`
                    <div class="error-message">
                        <h3>Error Loading Operations</h3>
                        <p>Failed to load operations</p>
                        <button class="retry-button button small">Retry</button>
                    </div>
                `);

                // Add event listener to retry button
                const $retryButton = $('.retry-button');
                $retryButton.on('click', function() {
                    loadOperations();
                });

                return;
            }

            const operations = await response.json();

            if (operations.length === 0) {
                $operationsListContainer.html('<p>No operations found.</p>');
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
            $operationsListContainer.html(html);

            // Add event listeners to the view buttons
            const $viewOperationButtons = $('.view-operation');
            $viewOperationButtons.on('click', function() {
                const operationId = $(this).data('id');
                loadOperationDetails(operationId);
            });
        } catch (error) {
            console.error('Error loading operations:', error);
            $operationsListContainer.html(`
                <div class="error-message">
                    <h3>Error Loading Operations</h3>
                    <p>${error.message}</p>
                </div>
            `);
        }
    }

    /**
     * Load details for a specific operation
     * @param {string} operationId - The ID of the operation to load
     */
    async function loadOperationDetails(operationId) {
        try {
            const $operationDetailsContainer = $('.operation-details-container');
            const $operationsListContainer = $('.operations-list-container');

            // Input validation
            if (!operationId) {
                AuthUtils.showNotification('Invalid operation ID', 'error');
                return;
            }

            const url = getApiUrl(`employee-portal/operations/${operationId}`);
            if (!url) {
                AuthUtils.showNotification('Invalid API configuration', 'error');
                return;
            }

            const response = await AuthUtils.secureRequest(url);

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

            $operationDetailsContainer.html(html).show();
            $operationsListContainer.hide();

            // Add event listener to the back button
            const $backToOperationsButton = $('.back-to-operations');
            $backToOperationsButton.on('click', function() {
                $operationDetailsContainer.hide();
                $operationsListContainer.show();
            });

            // Add event listeners to related operations links
            $('.related-operation-link').on('click', function(e) {
                e.preventDefault();
                const relatedId = $(this).data('id');
                loadOperationDetails(relatedId);
            });
        } catch (error) {
            console.error('Error loading operation details:', error);
            $operationDetailsContainer.html(`
                <div class="error-message">
                    <h3>Error Loading Operation Details</h3>
                    <p>${error.message}</p>
                    <button class="back-to-operations button">Back to Operations</button>
                </div>
            `).show();
            $operationsListContainer.hide();

            // Add event listener to the back button
            const $backToOperationsButton = $('.back-to-operations');
            $backToOperationsButton.on('click', function() {
                $operationDetailsContainer.hide();
                $operationsListContainer.show();
            });
        }
    }

    // Admin Dashboard Functions
    // ==================================

    // Function to initialize the rich text editor
    function initRichTextEditor() {
        // Set a timeout to detect if TinyMCE initialization takes too long
        let initTimeout;

        // Function to handle TinyMCE loading failure
        function handleTinyMCEFailure(reason) {
            console.warn('TinyMCE initialization issue: ' + reason + '. Falling back to basic textarea.');
            // Show notification to user
            if (typeof AuthUtils !== 'undefined' && AuthUtils.showNotification) {
                AuthUtils.showNotification('Rich text editor could not be loaded. Using basic editor instead.', 'warning', 5000);
            }
            // Make the basic textarea visible and usable
            $('#element-content').css('height', '400px');

            // Clear timeout if it exists
            if (initTimeout) {
                clearTimeout(initTimeout);
                initTimeout = null;
            }
        }

        // Add TinyMCE script dynamically if it's not already loaded
        if (!window.tinymce) {
            // Set a timeout to detect if script loading takes too long
            initTimeout = setTimeout(function() {
                if (!window.tinymce) {
                    handleTinyMCEFailure('loading timeout');
                }
            }, 10000); // 10 second timeout

            const script = document.createElement('script');
            script.src = 'https://cdn.tiny.cloud/1/dfjp0m1prdsyswkg18dqr12k27zcz32ncqx9ep9e2q70lob1/tinymce/5/tinymce.min.js';
            script.referrerPolicy = 'origin';
            script.async = true; // Load asynchronously

            // Add error handling
            script.onerror = function() {
                handleTinyMCEFailure('script load error');
            };

            script.onload = function() {
                // Clear the timeout since script loaded successfully
                if (initTimeout) {
                    clearTimeout(initTimeout);
                    initTimeout = null;
                }
                initTinyMCE();
            };

            document.head.appendChild(script);
        } else {
            initTinyMCE();
        }

        // Initialize TinyMCE editor
        function initTinyMCE() {
            // Set a timeout for TinyMCE initialization
            const initTinyMCETimeout = setTimeout(function() {
                handleTinyMCEFailure('initialization timeout');
            }, 15000); // 15 second timeout for initialization

            try {
                tinymce.init({
                    selector: '#element-content',
                    height: 400,
                    menubar: false,
                    plugins: [
                        'advlist autolink lists link image charmap print preview anchor',
                        'searchreplace visualblocks code fullscreen',
                        'insertdatetime media table paste code help wordcount'
                    ],
                    toolbar: 'undo redo | formatselect | ' +
                        'bold italic backcolor | alignleft aligncenter ' +
                        'alignright alignjustify | bullist numlist outdent indent | ' +
                        'removeformat | link image | help',
                    toolbar_mode: 'floating',
                    content_style: 'body { font-family: -apple-system, BlinkMacSystemFont, San Francisco, Segoe UI, Roboto, Helvetica Neue, sans-serif; font-size: 14px; }',
                    convert_urls: false,
                    relative_urls: false,
                    remove_script_host: false,
                    image_advtab: true,
                    image_uploadtab: true,
                    // Fix console warnings
                    touch_passive: true, // Make touch event listeners passive
                    document_write: false, // Prevent document.write() usage
                    promotion: false, // Disable promotional popups
                    referrer_policy: 'origin', // Set proper referrer policy
                    suffix: '.min', // Ensure minified versions are used
                    content_security_policy: "script-src 'self'", // Improve security
                    // Disable telemetry to prevent ERR_BLOCKED_BY_CLIENT errors
                    disable_telemetry: true,
                    // Disable analytics
                    send_analytics: false,
                    images_upload_handler: function (blobInfo, success, failure) {
                        // Convert the blob to a base64 data URL
                        const reader = new FileReader();
                        reader.onload = function() {
                            success(reader.result);
                        };
                        reader.readAsDataURL(blobInfo.blob());
                    },
                    setup: function(editor) {
                        // Handle content change
                        editor.on('change', function() {
                            // Update the original textarea
                            editor.save();
                        });

                        // Add custom button for markdown headings
                        editor.ui.registry.addButton('markdownheading', {
                            text: 'Add Section',
                            tooltip: 'Add a new section with heading',
                            onAction: function() {
                                const headingText = prompt('Enter section heading:');
                                if (headingText) {
                                    editor.insertContent('<h3>' + headingText + '</h3><p>Section content goes here.</p>');
                                }
                            }
                        });

                        // Clear the timeout when editor is initialized
                        editor.on('init', function() {
                            clearTimeout(initTinyMCETimeout);
                        });
                    }
                }).then(function(editors) {
                    // Success callback - editor initialized
                    clearTimeout(initTinyMCETimeout);
                    console.log('TinyMCE initialized successfully');
                }).catch(function(error) {
                    // Error callback
                    handleTinyMCEFailure('initialization error: ' + error);
                });
            } catch (error) {
                // Catch any synchronous errors during initialization
                handleTinyMCEFailure('initialization exception: ' + error);
            }

            // Handle the image upload container (for backward compatibility)
            const $imageUploadContainer = $('.image-upload-container');

            // Cancel image insertion
            $('#cancel-image-button').on('click', function() {
                $('#image-url').val('');
                $('#image-alt').val('');
                $('#image-upload').val('');
                $imageUploadContainer.hide();
            });
        }
    }

    // Function to load page content for editing
    function loadPageContent(pageElement) {
        // Show the content editor
        $('#content-editor-container').show();

        // Get the title and content from the DOM
        let title;
        let htmlContent;
        let $article;

        switch(pageElement) {
            case 'about':
                $article = $('#about');
                title = $article.find('h2.major').text();

                // Get all content HTML
                let aboutContent = '';

                // Don't include the image in the editor content
                // The image is preserved separately in updatePageContent

                // Get all h3 headings and their following paragraphs
                $article.find('h3').each(function() {
                    const heading = $(this).text();
                    const paragraphs = [];

                    // Add the heading
                    aboutContent += `<h3>${heading}</h3>`;

                    // Get all paragraphs that follow this heading until the next heading
                    let $nextElem = $(this).next();
                    while($nextElem.length && !$nextElem.is('h3')) {
                        if ($nextElem.is('p')) {
                            aboutContent += $nextElem.prop('outerHTML');
                        }
                        $nextElem = $nextElem.next();
                    }

                    // Add a spacer
                    aboutContent += '<br>';
                });

                htmlContent = aboutContent.trim();
                break;

            case 'services':
                $article = $('#services');
                title = $article.find('h2.major').text();

                // Get all content HTML
                let servicesContent = '';

                // Get the image if it exists
                const $servicesImage = $article.find('span.image.main');
                if ($servicesImage.length) {
                    servicesContent += $servicesImage.prop('outerHTML') + '<br><br>';
                }

                // Add intro paragraph if it exists
                const $introPara = $article.find('h2.major').nextAll('p').first();
                if ($introPara.length) {
                    servicesContent += $introPara.prop('outerHTML');
                }

                // Get all h3 headings and their following paragraphs
                $article.find('h3').each(function() {
                    const heading = $(this).text();

                    // Add the heading
                    servicesContent += `<h3>${heading}</h3>`;

                    // Get all paragraphs that follow this heading until the next heading
                    let $nextElem = $(this).next();
                    while($nextElem.length && !$nextElem.is('h3')) {
                        if ($nextElem.is('p')) {
                            servicesContent += $nextElem.prop('outerHTML');
                        }
                        $nextElem = $nextElem.next();
                    }

                    // Add a spacer
                    servicesContent += '<br>';
                });

                // Add final paragraph if it exists
                const $finalPara = $article.find('.hire-us-button-container').prev('p');
                if ($finalPara.length) {
                    servicesContent += $finalPara.prop('outerHTML');
                }

                htmlContent = servicesContent.trim();
                break;

            case 'subsidiaries':
                $article = $('#subsidiaries');
                title = $article.find('h2.major').text();

                // Get all subsidiary cards
                let subsidiariesContent = '';

                $article.find('.subsidiary-card').each(function() {
                    const cardTitle = $(this).find('h3').text();
                    const cardImage = $(this).find('span.image.subsidiary').prop('outerHTML');
                    const cardContent = $(this).find('p').text();

                    subsidiariesContent += `<h3>${cardTitle}</h3>`;
                    subsidiariesContent += cardImage;
                    subsidiariesContent += `<p>${cardContent}</p><br>`;
                });

                htmlContent = subsidiariesContent.trim();
                break;

            case 'contact':
                $article = $('#contact');
                title = $article.find('h2.major').text();

                // Get content after the form
                let contactContent = '';

                // Get h3 headings and paragraphs after the form
                const $contactInfo = $article.find('form').nextAll();
                $contactInfo.each(function() {
                    if ($(this).is('h3')) {
                        contactContent += `<h3>${$(this).text()}</h3>`;
                    } else if ($(this).is('p')) {
                        contactContent += $(this).prop('outerHTML');
                    } else if ($(this).is('ul.contact-info')) {
                        contactContent += '<h4>Contact channels:</h4><ul>';
                        $(this).find('li').each(function() {
                            contactContent += `<li>${$(this).text()}</li>`;
                        });
                        contactContent += '</ul><br>';
                    }
                });

                htmlContent = contactContent.trim();
                break;

            default:
                title = 'Select a page element';
                htmlContent = '<p>Please select a page element to edit.</p>';
        }

        // Set the title value
        $('#element-title').val(title);

        // Set the content in the TinyMCE editor if it's initialized
        if (window.tinymce && tinymce.get('element-content')) {
            tinymce.get('element-content').setContent(htmlContent);
        } else {
            // Fallback to setting the value directly
            $('#element-content').val(htmlContent);

            // Try to initialize TinyMCE if it's not already initialized
            if (typeof initRichTextEditor === 'function') {
                initRichTextEditor();
            }
        }
    }

    // Function to save page content
    async function savePageContent(pageElement, title, content) {
        try {
            console.log(`Saving content: ${title} - ${content.substring(0, 50)}...`);

            // First, update the content in the DOM
            // This ensures the web server content is updated even if the database operations fail
            updatePageContent(pageElement, title, content);

            let dbUpdateSuccess = false;
            let fileUpdateSuccess = false;

            // Try to update the HTML file on the server
            try {
                console.log(`Updating HTML file for ${pageElement}...`);
                const fileUpdateResponse = await fetch('/update-content.php', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        pageElement: pageElement,
                        title: title,
                        content: content
                    })
                });

                const fileUpdateResult = await fileUpdateResponse.json();

                if (fileUpdateResponse.ok && fileUpdateResult.success) {
                    console.log(`HTML file updated successfully for ${pageElement}`);
                    fileUpdateSuccess = true;
                } else {
                    console.warn(`Failed to update HTML file: ${fileUpdateResult.message}`);
                    // Continue anyway since we've already updated the DOM
                }
            } catch (fileError) {
                console.warn('HTML file update failed, but content was updated in the DOM:', fileError);
                // Continue since we've already updated the DOM
            }

            try {
                // Try to create/update the content in the database
                // First check if the page exists
                const checkUrl = getApiUrl(`page-content/pages/${pageElement}`);
                const checkResponse = await AuthUtils.secureRequest(checkUrl);

                // If page doesn't exist (404), create it first
                if (checkResponse.status === 404) {
                    console.log(`Page ${pageElement} not found, creating it first...`);
                    const createPageUrl = getApiUrl('page-content/pages');
                    const createPageResponse = await AuthUtils.secureRequest(createPageUrl, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            pageName: pageElement,
                            pageTitle: title,
                            description: '',
                            sections: [],
                            isPublished: true
                        })
                    });

                    if (!createPageResponse.ok) {
                        console.warn(`Failed to create page in database: ${createPageResponse.status} ${createPageResponse.statusText}`);
                        // Continue anyway since we've already updated the DOM
                    } else {
                        console.log(`Page ${pageElement} created successfully in database`);
                    }
                }

                // Try to add the section to the page in the database
                const url = getApiUrl(`page-content/pages/${pageElement}/sections`);

                // Send the data to the server
                const response = await AuthUtils.secureRequest(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        title: title,
                        content: content,
                        order: 0,
                        isVisible: true
                    })
                });

                if (!response.ok) {
                    console.warn(`Failed to save content to database: ${response.status} ${response.statusText}`);
                    // Continue anyway since we've already updated the DOM
                } else {
                    console.log(`Content saved successfully to database`);
                    dbUpdateSuccess = true;
                }
            } catch (dbError) {
                console.warn('Database operations failed, but content was updated in the DOM:', dbError);
                // Continue since we've already updated the DOM
            }

            // Show appropriate success message based on update status
            if (fileUpdateSuccess) {
                if (dbUpdateSuccess) {
                    AuthUtils.showNotification(`Content for "${pageElement}" has been saved successfully!`, 'success');
                } else {
                    AuthUtils.showNotification(
                        `Content for "${pageElement}" has been updated on the page and will persist after refresh, but could not be saved to the database.`, 
                        'success'
                    );
                }
            } else {
                if (dbUpdateSuccess) {
                    AuthUtils.showNotification(
                        `Content for "${pageElement}" has been saved to the database but could not be permanently updated on the website. ` +
                        `Your changes will be visible now but may not persist after refresh.`, 
                        'warning',
                        6000
                    );
                } else {
                    AuthUtils.showNotification(
                        `Content for "${pageElement}" has been updated on the page, but could not be saved permanently. ` +
                        `Your changes will be visible to users but will not persist after page refresh.`, 
                        'warning',
                        6000 // Show for longer (6 seconds) since this is important information
                    );
                }
            }

            // Reset the form
            $('#page-element-selector').val('');
            $('#element-title').val('');
            $('#element-content').val('');
            $('#content-editor-container').hide();
        } catch (error) {
            console.error('Error saving page content:', error);
            AuthUtils.showNotification(`Error saving content: ${error.message}`, 'error');
        }
    }

    // Function to update page content in the DOM
    function updatePageContent(pageElement, title, content) {
        // Get the HTML content from TinyMCE if it's initialized
        let htmlContent = content;
        if (window.tinymce && tinymce.get('element-content')) {
            htmlContent = tinymce.get('element-content').getContent();
        }

        // Update the content in the DOM based on the page element
        switch(pageElement) {
            case 'about':
                // Update the title
                $('#about h2.major').text(title);

                // Clear existing content except the title and image
                const $aboutArticle = $('#about');
                const $aboutTitle = $aboutArticle.find('h2.major').clone();
                const $aboutImage = $aboutArticle.find('span.image.main').clone();
                $aboutArticle.empty().append($aboutTitle).append($aboutImage);

                // Create a temporary div to parse the HTML content
                const $aboutTemp = $('<div></div>').html(htmlContent);

                // Process the content
                processEditorContent($aboutTemp, $aboutArticle);
                break;

            case 'services':
                // Update the title
                $('#services h2.major').text(title);

                // Clear existing content except the title and image
                const $servicesArticle = $('#services');
                const $servicesTitle = $servicesArticle.find('h2.major').clone();
                const $servicesImage = $servicesArticle.find('span.image.main').clone();
                $servicesArticle.empty().append($servicesTitle).append($servicesImage);

                // Create a temporary div to parse the HTML content
                const $servicesTemp = $('<div></div>').html(htmlContent);

                // Process the content
                processEditorContent($servicesTemp, $servicesArticle);

                // Preserve the hire-us button if it exists
                const $hireUsButton = $('<div class="hire-us-button-container"><a href="https://docs.google.com/forms/d/e/1FAIpQLSekyn2ZhdU9czvQrcLSpo1b0wIzRX__DxLFk89L4Y0NZ8FiwQ/viewform?usp=header" target="_blank" class="hire-us-button">Hire Us!</a></div>');
                $servicesArticle.append($hireUsButton);
                break;

            case 'subsidiaries':
                // Update the title
                $('#subsidiaries h2.major').text(title);

                // Clear existing content except the title
                const $subsidiariesArticle = $('#subsidiaries');
                const $subsidiariesTitle = $subsidiariesArticle.find('h2.major').clone();
                $subsidiariesArticle.empty().append($subsidiariesTitle);

                // Create the subsidiaries grid
                const $subsidiariesGrid = $('<div class="subsidiaries-grid"></div>');
                $subsidiariesArticle.append($subsidiariesGrid);

                // Create a temporary div to parse the HTML content
                const $subsidiariesTemp = $('<div></div>').html(htmlContent);

                // Process each h3 section as a subsidiary card
                $subsidiariesTemp.find('h3').each(function() {
                    const heading = $(this).text();
                    const cardId = heading.toLowerCase().replace(/\s+/g, '-') + '-card';
                    const subsidiaryName = heading.toLowerCase().replace(/\s+/g, '');

                    // Find the image and paragraph that follow this heading
                    let $image = $(this).next('span.image.subsidiary');
                    if (!$image.length) {
                        // If no image found, use default based on subsidiary name
                        $image = $(`<span class="image subsidiary"><img src="images/${subsidiaryName === 'aydoexpress' ? 'Logistics_logo_DISC.png' : 'Empyrion_Industries_disc.png'}" alt="${heading} Logo" /></span>`);
                    }

                    let $paragraph = $image.next('p');
                    if (!$paragraph.length) {
                        $paragraph = $(this).next('p');
                    }

                    // Create the card
                    const $card = $('<div></div>')
                        .addClass('subsidiary-card')
                        .attr('id', cardId)
                        .append($('<h3></h3>').text(heading))
                        .append($image.clone())
                        .append($paragraph.clone())
                        .append($('<button></button>')
                            .addClass('subsidiary-more')
                            .attr('data-subsidiary', subsidiaryName)
                            .text('Learn More'));

                    $subsidiariesGrid.append($card);
                });
                break;

            case 'contact':
                // Update the title
                $('#contact h2.major').text(title);

                // Get the form
                const $contactArticle = $('#contact');
                const $contactForm = $contactArticle.find('form').clone();

                // Clear existing content except the title
                const $contactTitle = $contactArticle.find('h2.major').clone();
                $contactArticle.empty().append($contactTitle).append($contactForm);

                // Create a temporary div to parse the HTML content
                const $contactTemp = $('<div></div>').html(htmlContent);

                // Process the content
                $contactTemp.children().each(function() {
                    const $elem = $(this);

                    if ($elem.is('h3')) {
                        // Add headings directly
                        $contactArticle.append($elem.clone());
                    } else if ($elem.is('h4') && $elem.text() === 'Contact channels:') {
                        // Handle contact channels list
                        const $list = $elem.next('ul');
                        if ($list.length) {
                            const $contactInfo = $('<ul class="contact-info"></ul>');
                            $list.find('li').each(function() {
                                $contactInfo.append($(this).clone());
                            });
                            $contactArticle.append($contactInfo);
                        }
                    } else if ($elem.is('p')) {
                        // Add paragraphs directly
                        $contactArticle.append($elem.clone());
                    }
                });
                break;
        }
    }

    // Helper function to process editor content and add it to the target element
    function processEditorContent($source, $target) {
        // Process each element in the source
        $source.children().each(function() {
            const $elem = $(this);

            // Skip the image if it's already in the target (we preserved it)
            if ($elem.is('span.image.main') && $target.find('span.image.main').length) {
                return;
            }

            // Add the element to the target
            $target.append($elem.clone());
        });
    }

    // Utility to get cookie value by name
    function getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
        return null;
    }

    // Initialize on document ready
    // ==================================
    $(document).ready(function () {
        // Ensure subsidiary popup is hidden on page load
        $('#subsidiary-popup').hide();

        // Cache jQuery selectors
        const $portalSection = $('.portal-section');
        const $portalTab = $('.portal-tab');
        const $operationsListContainer = $('#operations-list-container');
        const $operationDetailsContainer = $('#operation-details-container');
        const $newPostFormContainer = $('#new-post-form-container');

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


        // Handle hash changes for admin dashboard
        $(window).on('hashchange', function() {
            if (window.location.hash === '#admin-dashboard') {
                // Check if user is admin before showing dashboard
                const userJson = sessionStorage.getItem('aydocorpUser');
                if (userJson) {
                    try {
                        const user = AuthUtils.safeJsonParse(userJson, null);
                        // Check if user is admin - either by role or by username for specific admin users
                        if (!user || (user.role !== 'admin' && user.username !== 'Devil')) {
                            // Redirect non-admin users
                            AuthUtils.showNotification('You do not have permission to access the Admin Dashboard.', 'error');
                            window.location.href = '#';
                        } else {
                            // User is admin, explicitly show the admin dashboard
                            // This prevents conflicts with the main.js hashchange handler
                            $('#main').children('article').hide();
                            $('#admin-dashboard').show().addClass('active');
                            $('body').addClass('is-article-visible');
                            $('#header').hide();
                            $('#footer').hide();
                            $('#main').show();
                        }
                    } catch (error) {
                        console.error('Error parsing user data:', error);
                        AuthUtils.showNotification('An error occurred while checking permissions.', 'error');
                        window.location.href = '#';
                    }
                } else {
                    // Redirect users who are not logged in
                    AuthUtils.showNotification('Please log in with an admin account to access the Admin Dashboard.', 'warning');
                    window.location.href = '#login';
                }

                // Prevent the default hashchange handler in main.js from running
                return false;
            }
        });

        // Check admin access on initial load if hash is #admin-dashboard
        if (window.location.hash === '#admin-dashboard') {
            const userJson = sessionStorage.getItem('aydocorpUser');
            if (userJson) {
                try {
                    const user = AuthUtils.safeJsonParse(userJson, null);
                    // Check if user is admin - either by role or by username for specific admin users
                    if (!user || (user.role !== 'admin' && user.username !== 'Devil')) {
                        AuthUtils.showNotification('You do not have permission to access the Admin Dashboard.', 'error');
                        window.location.href = '#';
                    } else {
                        // User is admin, explicitly show the admin dashboard
                        // This prevents conflicts with the main.js hashchange handler
                        setTimeout(function() {
                            $('#main').children('article').hide();
                            $('#admin-dashboard').show().addClass('active');
                            $('body').addClass('is-article-visible');
                            $('#header').hide();
                            $('#footer').hide();
                            $('#main').show();
                        }, 100); // Small delay to ensure DOM is ready
                    }
                } catch (error) {
                    console.error('Error parsing user data:', error);
                    AuthUtils.showNotification('An error occurred while checking permissions.', 'error');
                    window.location.href = '#';
                }
            } else {
                AuthUtils.showNotification('Please log in with an admin account to access the Admin Dashboard.', 'warning');
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
        $portalTab.on('click', function(e) {
            e.preventDefault();

            // Get the section to show
            const section = $(this).data('section');

            // Update active tab
            $portalTab.removeClass('active');
            $(this).addClass('active');

            // Hide all sections and show the selected one
            $portalSection.hide();
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

            try {
                // Get current user data
                const userJson = sessionStorage.getItem('aydocorpUser');
                if (!userJson) {
                    AuthUtils.showNotification('You must be logged in to edit your profile.', 'error');
                    return;
                }

                const user = AuthUtils.safeJsonParse(userJson, null);
                if (!user || !user.id) {
                    AuthUtils.showNotification('Invalid user data. Please log in again.', 'error');
                    return;
                }

                const userId = user.id;
                const url = getApiUrl('employee-portal/employees');

                if (!url) {
                    AuthUtils.showNotification('Invalid API configuration', 'error');
                    return;
                }

                // Try to load existing profile data
                AuthUtils.secureRequest(url)
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
                    AuthUtils.showNotification('Error loading profile data. Please try again.', 'error');
                    // Show the edit form anyway
                    $('.employee-edit-form-container').show();
                });
            } catch (error) {
                console.error('Error in edit profile handler:', error);
                AuthUtils.showNotification('An error occurred. Please try again.', 'error');
            }
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
            const certifications = $('#employee-certifications').val().split(',').map(c => c.trim()).filter(c => c);
            const discord = $('#employee-discord').val();
            const rsiHandle = $('#employee-rsi').val();

            // Validation
            if (!fullName) {
                AuthUtils.showNotification('Please enter your full name.', 'error');
                return;
            }

            try {
                const url = getApiUrl('employee-portal/employees');
                if (!url) {
                    AuthUtils.showNotification('Invalid API configuration', 'error');
                    return;
                }

                // Sanitize inputs before sending to server
                const sanitizedData = {
                    fullName: AuthUtils.sanitizeHtml(fullName),
                    photo: AuthUtils.sanitizeHtml(photo),
                    backgroundStory: AuthUtils.sanitizeHtml(backgroundStory),
                    rank: AuthUtils.sanitizeHtml(rank),
                    department: AuthUtils.sanitizeHtml(department),
                    specializations: specializations.map(s => AuthUtils.sanitizeHtml(s)),
                    certifications: certifications.map(c => AuthUtils.sanitizeHtml(c)),
                    contactInfo: {
                        discord: AuthUtils.sanitizeHtml(discord),
                        rsiHandle: AuthUtils.sanitizeHtml(rsiHandle)
                    }
                };

                const response = await AuthUtils.secureRequest(url, {
                    method: 'POST',
                    body: JSON.stringify(sanitizedData)
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    AuthUtils.showNotification('Failed to save profile: ' + (errorData.message || 'Unknown error'), 'error');
                    return;
                }

                // Profile saved successfully
                AuthUtils.showNotification('Profile saved successfully!', 'success');

                // Hide the edit form and reload employees
                $('.employee-edit-form-container').hide();
                $('.employee-list-container').show();
                loadEmployees();

            } catch (error) {
                console.error('Profile save error:', error);
                AuthUtils.showNotification('Error saving profile: ' + (error.message || 'Network error'), 'error');
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
            const $registerButton = $('#register-button');

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
            $registerButton.val('Creating account...').prop('disabled', true);

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
                $registerButton.val('Create Account').prop('disabled', false);
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
                if (sessionStorage.getItem('aydocorpLoggedIn') === 'true') {
                    // Default to showing the Career Paths section
                    $portalSection.hide();
                    $('#career-paths-section').show();
                    $portalTab.removeClass('active');
                    $portalTab.filter('[data-section="career-paths"]').addClass('active');

                    // Load career paths data
                    loadCareerPaths();
                } else {
                    // If not logged in, show notification
                    AuthUtils.showNotification('Please log in to access the Employee Portal.', 'warning');
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
        debugApiConnection();

        // New Operation button click handler
        $('#new-post-button').on('click', function(event) {
            event.preventDefault();

            // Hide other containers
            $operationsListContainer.hide();
            $operationDetailsContainer.hide();

            // Show the new operation form
            $newPostFormContainer.show();
        });

        // Operation submission handler
        $('#new-post-form').on('submit', async function(event) {
            event.preventDefault();

            const $postTitle = $('#post-title');
            const $postContent = $('#post-content');
            const title = $postTitle.val();
            const content = $postContent.val();

            // Validation
            if (!title || !content) {
                AuthUtils.showNotification('Please fill in both title and content.', 'error');
                return;
            }

            try {
                // Show loading state
                const $submitButton = $(this).find('button[type="submit"]');
                const originalButtonText = $submitButton.text();
                $submitButton.text('Creating Operation...').prop('disabled', true);

                const url = getApiUrl('employee-portal/operations');
                if (!url) {
                    AuthUtils.showNotification('Invalid API configuration', 'error');
                    return;
                }

                // Sanitize inputs before sending to server
                const sanitizedData = {
                    title: AuthUtils.sanitizeHtml(title),
                    description: 'Created from portal',
                    content: AuthUtils.sanitizeHtml(content),
                    category: 'document',
                    classification: 'internal'
                };

                const response = await AuthUtils.secureRequest(url, {
                    method: 'POST',
                    body: JSON.stringify(sanitizedData)
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    AuthUtils.showNotification('Failed to create operation: ' + (errorData.message || 'Unknown error'), 'error');
                    return;
                }

                // Operation created successfully
                AuthUtils.showNotification('Operation created successfully!', 'success');

                // Clear form fields
                $postTitle.val('');
                $postContent.val('');

                // Redirect to employee portal operations section
                window.location.href = '#employee-portal';

                // Show the operations section
                $portalSection.hide();
                $('#operations-section').show();
                $portalTab.removeClass('active');
                $portalTab.filter('[data-section="operations"]').addClass('active');

                // Reload operations data
                loadOperations();

            } catch (error) {
                console.error('Operation creation error:', error);
                AuthUtils.showNotification('Error creating operation: ' + (error.message || 'Network error'), 'error');
            } finally {
                // Reset button state
                $submitButton.text(originalButtonText).prop('disabled', false);
            }
        });
    });
})(jQuery);
