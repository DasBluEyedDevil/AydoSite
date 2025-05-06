(function ($) {
    // API and Authentication Utilities
    // ==================================
    /**
     * Get the base URL for API requests
     * @returns {string} The base URL for API requests
     */
    function getApiBaseUrl() {
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            return 'http://localhost:8080';
        } else {
            // Fix: Remove the '/api' suffix since we're adding it in getApiUrl
            // Use a secure approach instead of proxy.php with direct URL parameter
            // This prevents open redirect vulnerabilities
            return window.location.origin;
        }
    }
    
    /**
     * Construct a proper API URL with validation
     * @param {string} endpoint - The API endpoint to call
     * @returns {string} The complete API URL
     */
    function getApiUrl(endpoint) {
        if (!endpoint) {
            console.error('Invalid endpoint provided to getApiUrl');
            return null;
        }
    
        const baseUrl = getApiBaseUrl();
    
        // Ensure baseUrl ends with a slash and endpoint doesn't start with one
        const baseWithSlash = baseUrl.endsWith('/') ? baseUrl : baseUrl + '/';
        const cleanEndpoint = endpoint.startsWith('/') ? endpoint.substring(1) : endpoint;
    
        // Validate the endpoint to prevent injection
        if (!/^[a-zA-Z0-9\-_\/\.]+$/.test(cleanEndpoint)) {
            console.error('Invalid characters in API endpoint');
            return null;
        }
    
        return baseWithSlash + cleanEndpoint;
    }

    /**
     * Debug helper for API connectivity issues
     */
    function debugApiConnection() {
        console.group('API Connection Debug');
        
        const baseUrl = getApiBaseUrl();
        console.log('Base URL:', baseUrl);
        
        // Test various endpoints
        const testEndpoints = [
            'api/test',
            'api/auth',
            'test',
            'auth'
        ];
        
        console.log('Testing endpoints:');
            // Use Promise.race to try both endpoints simultaneously
            // This is more efficient than sequential requests
        testEndpoints.forEach(endpoint => {
            const url = getApiUrl(endpoint);
            console.log(`${endpoint} -> ${url}`);
        });
        
        // Show server info
        console.log('Server Info:');
        console.log('  Hostname:', window.location.hostname);
        console.log('  Origin:', window.location.origin);
        console.log('  Protocol:', window.location.protocol);
        
        console.groupEnd();
    }
    
    // Call the debug function immediately

    /**
     * Test if the API server is reachable
     * @returns {Promise<boolean>} True if the API is reachable
     */
    async function testApiConnection() {
        try {
            const apiUrl = getApiUrl('api/test');
            console.log('Testing API connection to:', apiUrl);
            
            const response = await fetch(apiUrl, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                },
                // Add a short timeout to avoid long waits
                signal: AbortSignal.timeout(5000)
            });
            
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

    // Authentication Functions
    // ==================================
    /**
     * Handle user login with secure authentication
     * @param {string} username - The username
     * @param {string} password - The password
     * @returns {Promise<void>}
     */
    async function handleLogin(username, password) {
        // Input validation
        if (!username || !password) {
            throw new Error('Please enter both username and password.');
        }
        
        try {
            // First test connection
            const connectionTest = await testApiConnection();
            if (!connectionTest) {
                throw new Error('Cannot connect to the server. Please try again later.');
            }
            
            // In your handleLogin function
            console.log('Attempting login at:', getApiUrl('api/auth/login')); // Make sure 'api/' is included
                        
            // Attempt login
            // Use secure request with CSRF protection
            const response = await fetch(getApiUrl('api/auth/login'), { // Make sure 'api/' is included
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({username, password})
            });
            
            // Parse response
            if (!response.ok) {
            // Check response type and handle accordingly
                const contentType = response.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || 'Login failed. Please check your credentials.');
                } else {
                    throw new Error(`Login failed with status: ${response.status}`);
                }
            }
            
            // Handle successful login
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                // Parse JSON response
                const data = await response.json();
                console.log('Login successful');
                
                if (!data.token) {
                    throw new Error('Server did not return an authentication token.');
                }
                
                // Store token and user info in sessionStorage
                sessionStorage.setItem('aydocorpToken', data.token);
                    // We'll store this in sessionStorage which is cleared when the browser is closed
                sessionStorage.setItem('aydocorpUser', JSON.stringify(data.user || {}));
                sessionStorage.setItem('aydocorpLoggedIn', 'true');
                
                // Store token in a cookie for APIs that use cookie auth
                document.cookie = `aydocorpToken=${data.token}; path=/; max-age=86400; SameSite=Strict`;
                
                // Show success message
                AuthUtils.showNotification(`Welcome back, ${data.user?.username || 'User'}!`, 'success');
                
                // Update UI
                    // Update UI to show admin badge if applicable
                checkLoginStatus();
                
                // Redirect to employee portal
                window.location.href = '#employee-portal';
            } else {
                throw new Error('Unexpected response format from server.');
            }
        } catch (error) {
            console.error('Login error:', error);
            AuthUtils.showNotification(error.message || 'Login failed', 'error');
            throw error;
        }
    }

    /**
     * Handle user logout with secure authentication
     */
    async function handleLogout() {
        try {
            // Try to call logout endpoint to clear the secure cookie
            let logoutSuccess = false;

            // Try standard endpoint first
            const standardUrl = getApiUrl('auth/logout');
            if (standardUrl) {
                try {
                    const response = await AuthUtils.secureRequest(standardUrl, {
                        method: 'POST'
                    });
                    logoutSuccess = response.ok;
                } catch (e) {
                    console.warn('Standard logout endpoint failed:', e);
                }
            }

            // If standard endpoint fails, try alternatives
            if (!logoutSuccess) {
                console.log('Standard logout endpoint failed, trying alternatives...');

                // Try alternative endpoint 1
                const altUrl1 = getApiUrl('auth/signout');
                if (altUrl1) {
                    try {
                        const response = await AuthUtils.secureRequest(altUrl1, {
                            method: 'POST'
                        });
                        logoutSuccess = response.ok;
                    } catch (e) {
                        console.warn('Alternative logout endpoint 1 failed:', e);
                    }
                }

                // Try alternative endpoint 2
                if (!logoutSuccess) {
                    const altUrl2 = getApiUrl('logout');
                    if (altUrl2) {
                        try {
                            const response = await AuthUtils.secureRequest(altUrl2, {
                                method: 'POST'
                            });
                            logoutSuccess = response.ok;
                        } catch (e) {
                            console.warn('Alternative logout endpoint 2 failed:', e);
                        }
                    }
                }
            }

            // Even if all endpoints fail, proceed with client-side logout
            if (!logoutSuccess) {
                console.warn('All logout endpoints failed, proceeding with client-side logout only');
            }

            // Clear session storage
            sessionStorage.removeItem('aydocorpUser');
            sessionStorage.removeItem('aydocorpLoggedIn');

            // Clear any cookies by setting them to expire in the past
            document.cookie = 'aydocorp_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
            document.cookie = 'aydocorp_session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';

            // Update UI
            $('.user-status').remove();
            $('#logout-nav').attr('id', '').find('a').text('Member Login').attr('href', '#login').removeClass('logout');

            // Show notification
            AuthUtils.showNotification('You have been logged out successfully.', 'info');

            // Redirect to home
            window.location.href = '#';

            // Update UI state
            checkLoginStatus();
        } catch (error) {
            console.error('Logout error:', error);

            // Even if there's an error, still clear client-side data
            sessionStorage.removeItem('aydocorpUser');
            sessionStorage.removeItem('aydocorpLoggedIn');

            // Clear any cookies
            document.cookie = 'aydocorp_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
            document.cookie = 'aydocorp_session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';

            // Update UI
            $('.user-status').remove();
            $('#logout-nav').attr('id', '').find('a').text('Member Login').attr('href', '#login').removeClass('logout');

            AuthUtils.showNotification('An error occurred during logout, but you have been logged out locally.', 'warning');

            // Redirect to home
            window.location.href = '#';

            // Update UI state
            checkLoginStatus();
        }
    }

    /**
     * Check user login status and update UI accordingly
     * Uses sessionStorage for UI state and validates with the server
     */
    async function checkLoginStatus() {
        console.log('checkLoginStatus called');

        try {
            // First check sessionStorage for quick UI updates
            const isLoggedIn = sessionStorage.getItem('aydocorpLoggedIn') === 'true';
            const userJson = sessionStorage.getItem('aydocorpUser');

            if (isLoggedIn && userJson) {
                // Parse user data safely
                const user = AuthUtils.safeJsonParse(userJson, null);

                if (!user) {
                    console.error('Invalid user data in session storage');
                    await handleLogout();
                    return;
                }

                console.log('User data from sessionStorage:', user);
                console.log('Is admin?', user.role === 'admin');

                // Validate token with server in the background
                // Don't immediately log out on validation failure
                // Instead, set a flag to retry validation later
                let tokenValidationRetries = parseInt(sessionStorage.getItem('tokenValidationRetries') || '0');
                const maxRetries = 5; // Increased from 3 to 5 for more tolerance

                validateToken().then(isValid => {
                    if (!isValid) {
                        console.warn(`Token validation failed (attempt ${tokenValidationRetries + 1}/${maxRetries})`);

                        // Only log out after maxRetries failed attempts
                        if (tokenValidationRetries >= maxRetries - 1) {
                            console.warn(`Token validation failed ${maxRetries} times, showing warning to user`);

                            // Instead of automatic logout, show a warning to the user
                            AuthUtils.showNotification(
                                'Your session may have validation issues. You can continue using the portal, but some features might not work correctly. Try refreshing the page if you encounter problems.',
                                'warning',
                                10000 // Show for 10 seconds
                            );

                            // Reset counter but don't log out
                            sessionStorage.removeItem('tokenValidationRetries');

                            // Try one more time after a longer delay
                            setTimeout(() => {
                                validateToken().catch(err => {
                                    console.warn('Final validation attempt failed:', err);
                                });
                            }, 60000); // Try again after 1 minute
                        } else {
                            // Increment retry counter
                            sessionStorage.setItem('tokenValidationRetries', (tokenValidationRetries + 1).toString());

                            // Schedule another validation attempt with increasing delay
                            const delay = 30000 + (tokenValidationRetries * 10000); // 30s, 40s, 50s, etc.
                            setTimeout(() => {
                                validateToken().then(retryValid => {
                                    if (!retryValid) {
                                        console.warn(`Retry token validation failed (attempt ${tokenValidationRetries + 1}/${maxRetries})`);
                                    } else {
                                        console.log('Retry token validation succeeded');
                                        sessionStorage.removeItem('tokenValidationRetries');
                                    }
                                });
                            }, delay);
                        }
                    } else {
                        // Reset retry counter on successful validation
                        sessionStorage.removeItem('tokenValidationRetries');
                    }
                });

                // Show employee portal content
                $('#employee-portal-login-required').hide();
                $('#employee-portal-content').show();

                // Add user status indicator to the top right
                $('.user-status').remove();

                // Sanitize username before inserting into HTML
                const safeUsername = AuthUtils.sanitizeHtml(user.username);

                const userStatusHtml = `
                    <div class="user-status">
                        <span class="username">${safeUsername}</span>
                        ${user.role === 'admin' ? '<a href="#admin-dashboard" class="admin-badge">ADMIN</a>' : ''}
                        <span class="logout-option">
                            <a href="#" class="logout">Logout</a>
                        </span>
                    </div>
                `;

                // Append to body
                $('body').append(userStatusHtml);

                // Replace the "Member Login" link with just "Logout"
                const $loginLink = $('header nav ul li a[href="#login"]');
                if ($loginLink.length) {
                    $loginLink.text('Logout')
                             .attr('href', '#')
                             .addClass('logout')
                             .closest('li')
                             .attr('id', 'logout-nav');
                }
            } else {
                // User is not logged in
                $('#employee-portal-content').hide();
                $('#employee-portal-login-required').show();

                // Ensure login link is correct
                const $logoutLink = $('header nav ul li a.logout');
                if ($logoutLink.length) {
                    $logoutLink.text('Member Login')
                              .attr('href', '#login')
                              .removeClass('logout')
                              .closest('li')
                              .removeAttr('id');
                }
                $('.user-status').remove();
            }
        } catch (error) {
            console.error('Error checking login status:', error);
            // Handle error gracefully
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
        try {
            const $careerPathList = $('.career-path-list');
            $careerPathList.html('<p>Loading career paths...</p>');
            
            // Get token from session storage
            const token = sessionStorage.getItem('aydocorpToken');
            if (!token) {
                throw new Error('Authentication required');
            }
            
            // Set up headers with both authentication methods
            const headers = {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': `Bearer ${token}`,
                'x-auth-token': token
            };
            
            // Make the API request
            const response = await fetch(getApiUrl('api/employee-portal/career-paths'), {
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
                        const retryResponse = await fetch(getApiUrl('api/employee-portal/career-paths'), {
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
                            <p>Your session may have expired. Please <a href="#login">log in</a> again.</p>
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
                $('.retry-button').on('click', function() {
                    loadCareerPaths();
                });

                return;
            }
            
            const careerPaths = await response.json();
            renderCareerPaths(careerPaths, $careerPathList);
        } catch (error) {
            console.error('Error loading career paths:', error);
            $('.career-path-list').html(`
                <div class="error-message">
                    <h3>Error Loading Career Paths</h3>
                    <p>${error.message}</p>
                    <button class="retry-button">Retry</button>
                </div>
            `);
            
            // Add retry button handler
            $('.retry-button').on('click', function() {
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
                $('.back-to-career-paths').on('click', function() {
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
            $('.back-to-career-paths').on('click', function() {
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
            $('.back-to-career-paths').on('click', function() {
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
                            $('.view-employee').on('click', function() {
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
                            <a href="#login" class="button small">Login Again</a>
                        </div>
                    `);

                    // Add event listener to retry button
                    $('.retry-button').on('click', function() {
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
                $('.retry-button').on('click', function() {
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
            $('.view-employee').on('click', function() {
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
                $('.back-to-employees').on('click', function() {
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
            $('.back-to-employees').on('click', function() {
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
            $('.back-to-employees').on('click', function() {
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
                            $('.view-event').on('click', function() {
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
                            <a href="#login" class="button small">Login Again</a>
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
            $('.view-event').on('click', function() {
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
                            $('.view-operation').on('click', function() {
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
                            <a href="#login" class="button small">Login Again</a>
                        </div>
                    `);

                    // Add event listener to retry button
                    $('.retry-button').on('click', function() {
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
                $('.retry-button').on('click', function() {
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
            $('.view-operation').on('click', function() {
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
        // Cache jQuery selectors
        const $imageUploadContainer = $('.image-upload-container');
        const $editorButton = $('.editor-button');

        // Add event listeners to editor buttons
        $editorButton.on('click', function(e) {
            e.preventDefault();
            const command = $(this).data('command');

            if (command === 'createLink') {
                const url = prompt('Enter the link URL:');
                if (url) {
                    document.execCommand(command, false, url);
                }
            } else if (command === 'insertImage') {
                // Show image upload container
                $imageUploadContainer.show();
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
            const $imageUrl = $('#image-url');
            const $imageAlt = $('#image-alt');
            const imageUrl = $imageUrl.val();
            const altText = $imageAlt.val() || 'Image';

            if (imageUrl) {
                const imageHtml = `<img src="${imageUrl}" alt="${altText}" />`;
                document.execCommand('insertHTML', false, imageHtml);

                // Clear fields and hide container
                $imageUrl.val('');
                $imageAlt.val('');
                $imageUploadContainer.hide();
            } else {
                alert('Please enter an image URL.');
            }
        });

        // Handle image upload
        const $imageUpload = $('#image-upload');
        $imageUpload.on('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(event) {
                    $imageUrl.val(event.target.result);
                };
                reader.readAsDataURL(file);
            }
        });

        // Cancel image insertion
        $('#cancel-image-button').on('click', function() {
            $imageUrl.val('');
            $imageAlt.val('');
            $imageUpload.val('');
            $imageUploadContainer.hide();
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
        console.log(`Saving content: ${title} - ${content.substring(0, 50)}...`);
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
        const $userListContainer = $('#user-list-container');
        $userListContainer.show();

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

        $userListContainer.html(html);

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

        // Handle view users button
        $('#view-users-button').on('click', function() {
            loadUserList();
        });

        // Handle hash changes for admin dashboard
        $(window).on('hashchange', function() {
            if (window.location.hash === '#admin-dashboard') {
                // Check if user is admin before showing dashboard
                const userJson = sessionStorage.getItem('aydocorpUser');
                if (userJson) {
                    try {
                        const user = AuthUtils.safeJsonParse(userJson, null);
                        if (!user || user.role !== 'admin') {
                            // Redirect non-admin users
                            AuthUtils.showNotification('You do not have permission to access the Admin Dashboard.', 'error');
                            window.location.href = '#';
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
            }
        });

        // Check admin access on initial load if hash is #admin-dashboard
        if (window.location.hash === '#admin-dashboard') {
            const userJson = sessionStorage.getItem('aydocorpUser');
            if (userJson) {
                try {
                    const user = AuthUtils.safeJsonParse(userJson, null);
                    if (!user || user.role !== 'admin') {
                        AuthUtils.showNotification('You do not have permission to access the Admin Dashboard.', 'error');
                        window.location.href = '#';
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
            const certifications = $('#employee-certifications').val().split(',').map(s => s.trim()).filter(s => s);
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
