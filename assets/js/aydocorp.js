(function ($) {
    // API and Authentication Utilities
    // ==================================
    function getApiBaseUrl() {
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            return 'http://localhost:8080';
        } else {
            // Use the direct server IP that your domain points to
            return 'http://31.22.7.56:8080';
        }
    }

    async function testApiConnection() {
        try {
            const apiBase = getApiBaseUrl();
            // Make sure API endpoint has a leading slash
            const response = await fetch(`${apiBase}/api/test`);
            console.log('API request URL:', `${apiBase}/api/test`);
            return response.ok;
        } catch (error) {
            console.error('API connection test failed:', error);
            return false;
        }
    }


    async function validateToken() {
        try {
            const token = localStorage.getItem('aydocorpToken');
            if (!token) return false;

            const apiBase = getApiBaseUrl();
            // Make sure API endpoint has a leading slash
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
    async function handleLogin(username, password, $loginButton) {
        if (!username || !password) {
            throw new Error('Please enter both username and password.');
        }

        // First test connection
        const connectionTest = await testApiConnection();
        if (!connectionTest) {
            throw new Error('Cannot connect to the server. Please try again later.');
        }

        const apiBase = getApiBaseUrl();
        // Make sure API endpoint has a leading slash
        console.log('Attempting login at:', `${apiBase}/api/auth/login`);

        // Perform login request
        const response = await fetch(`${apiBase}/api/auth/login`, {
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

                // Store token and user info
                localStorage.setItem('aydocorpToken', data.token);
                localStorage.setItem('aydocorpUser', JSON.stringify(data.user));
                localStorage.setItem('aydocorpLoggedIn', 'true');

                // Show success message
                alert(`Welcome back, ${data.user.username}!`);

                // Redirect to forum
                window.location.href = '#forum';
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
        const isLoggedIn = localStorage.getItem('aydocorpLoggedIn') === 'true';
        const token = localStorage.getItem('aydocorpToken');
        const userJson = localStorage.getItem('aydocorpUser');

        if (isLoggedIn && token && userJson) {
            try {
                const user = JSON.parse(userJson);

                // Show forum content
                $('#forum-login-required').hide();
                $('#forum-content').show();

                // Add user status indicator to the top right
                $('.user-status').remove();
                $('body').append(`
                    <div class="user-status">
                        <span class="username">${user.username}</span>
                        <span class="logout-option">
                            <a href="#" class="logout">Logout</a>
                        </span>
                    </div>
                `);

                // Replace the "Member Login" link with just "Logout"
                $('header nav ul li a[href="#login"]').text('Logout').attr('href', '#').addClass('logout').closest('li').attr('id', 'logout-nav');
            } catch (error) {
                console.error('Error checking login status:', error);
                handleLogout();
            }
        } else {
            // User is not logged in
            $('#forum-content').hide();
            $('#forum-login-required').show();

            // Ensure login link is correct
            $('header nav ul li a.logout').text('Member Login').attr('href', '#login').removeClass('logout').closest('li').removeAttr('id');
            $('.user-status').remove();
        }
    }

    // Forum Functions
    // ==================================
    async function loadBulletinBoard() {
        try {
            const apiBase = getApiBaseUrl();
            const token = localStorage.getItem('aydocorpToken');

            const response = await fetch(`${apiBase}/api/forum/posts`, {
                headers: {
                    'x-auth-token': token
                }
            });

            if (!response.ok) {
                throw new Error('Failed to load posts');
            }

            const posts = await response.json();

            if (posts.length === 0) {
                $('#post-list-container').html('<p>No posts found. Be the first to create one!</p>');
                return;
            }

            // Render posts
            let html = '<div class="post-list">';

            posts.forEach(post => {
                html += `
                    <div class="post-item ${post.pinned ? 'pinned' : ''}">
                        ${post.pinned ? '<div class="pin-indicator">📌 Pinned</div>' : ''}
                        <h3><a href="#forum/post/${post._id}">${post.title}</a></h3>
                        <div class="post-meta">
                            Posted by <strong>${post.author.username}</strong>
                            on ${new Date(post.createdAt).toLocaleDateString()}
                        </div>
                        <div class="post-preview">${post.content.substring(0, 100)}${post.content.length > 100 ? '...' : ''}</div>
                        <div class="post-stats">
                            <span>${post.replies ? post.replies.length : 0} replies</span>
                        </div>
                    </div>
                `;
            });

            html += '</div>';
            $('#post-list-container').html(html);
        } catch (error) {
            console.error('Error loading bulletin board:', error);
            $('#post-list-container').html(`
                <div class="error-message">
                    <h3>Error Loading Posts</h3>
                    <p>${error.message}</p>
                </div>
            `);
        }
    }

    async function loadSinglePost(postId) {
        // Load and display a single post (implementation details omitted)
        console.log('Loading post:', postId);
    }

    async function loadTopic(topicId) {
        // Legacy function for backward compatibility
        console.log('Loading topic:', topicId);
    }

    // Initialize on document ready
    // ==================================
    $(document).ready(function () {
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

        // Authentication event handlers
        $('#login-form').on('submit', async function (event) {
            event.preventDefault();

            const username = $('#username').val();
            const password = $('#password').val();

            // Show loading state
            const $loginButton = $(this).find('input[type="submit"]');
            const originalButtonText = $loginButton.val();
            $loginButton.val('Logging in...').prop('disabled', true);

            try {
                await handleLogin(username, password, $loginButton);
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

            try {
                // Show loading indicator
                $('#register-button').val('Creating account...').prop('disabled', true);

                const apiBase = getApiBaseUrl();

                // Send registration request with correct URL format
                const response = await fetch(`${apiBase}/api/auth/register`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({username, email, password})
                });
                
                // Rest of the function remains the same
                // ...
            } catch (error) {
                alert('Registration failed: ' + error.message);
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

            // Check for forum-related URLs
            if (hash === '#forum') {
                // Show the post list if logged in
                if (localStorage.getItem('aydocorpLoggedIn') === 'true') {
                    $('#single-post-container').hide();
                    $('#new-post-form-container').hide();
                    $('#post-list-container').show();
                    loadBulletinBoard();
                }
            } else if (hash === '#forum/new') {
                // NEW CASE: Handle new post form
                if (localStorage.getItem('aydocorpLoggedIn') === 'true') {
                    $('#single-post-container').hide();
                    $('#post-list-container').hide();
                    $('#new-post-form-container').show();
                } else {
                    window.location.href = '#login';
                }
            } else if (hash.match(/#forum\/post\/(.+)/)) {
                // Handle single post view
                const postMatch = hash.match(/#forum\/post\/(.+)/);
                if (postMatch && postMatch[1]) {
                    const postId = postMatch[1];
                    loadSinglePost(postId);
                }
            } else if (hash.match(/#forum\/topic\/(.+)/)) {
                // Handle topic view (for compatibility)
                const topicMatch = hash.match(/#forum\/topic\/(.+)/);
                if (topicMatch && topicMatch[1]) {
                    const topicId = topicMatch[1];
                    loadTopic(topicId);
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

        // Back to forum button
        $('#back-to-forum').on('click', function () {
            window.location.href = '#forum';
        });

        // Initial API test
        testApiConnection();

        // Add this to your $(document).ready function
        // After your other event handlers

        // New Post button click handler
        $('#new-post-button').on('click', function(event) {
            event.preventDefault();
            
            // Hide other containers
            $('#post-list-container').hide();
            $('#single-post-container').hide();
            
            // Show the new post form
            $('#new-post-form-container').show();
        });

        // Update your post submission handler
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
                $submitButton.text('Posting...').prop('disabled', true);
                
                const apiBase = getApiBaseUrl();
                const token = localStorage.getItem('aydocorpToken');
                
                // CORRECTED URL CONSTRUCTION - ensure leading slash
                const response = await fetch(`${apiBase}/api/forum/posts`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-auth-token': token
                    },
                    body: JSON.stringify({ title, content })
                });
                
                // Rest of the function remains the same
                // ...
            } catch (error) {
                // Error handling code
                // ...
            }
        });
    });
    // At the end of the file, REMOVE THIS CODE
    // $(document).ready(function() {
    //    // Your existing code...
    //    
    //    // Test proxy POST functionality
    //    testProxyPost();
    // });
})(jQuery);