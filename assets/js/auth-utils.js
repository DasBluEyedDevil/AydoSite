/**
 * Authentication Utilities
 * Provides secure authentication methods using HttpOnly cookies and CSRF protection
 */

(function($) {
    // CSRF token handling
    let csrfToken = '';

    /**
     * Initialize CSRF protection
     * Fetches a CSRF token from the server and stores it for future requests
     */
    async function initCsrf() {
        try {
            // First try the standard endpoint
            let response = await fetch('/api/auth/csrf-token', {
                method: 'GET',
                credentials: 'include' // Important for cookies
            });

            // If that fails, try alternative endpoint
            if (!response.ok) {
                console.log('Standard CSRF endpoint not found, trying alternative...');
                response = await fetch('/api/csrf', {
                    method: 'GET',
                    credentials: 'include'
                });
            }

            if (response.ok) {
                const data = await response.json();
                csrfToken = data.csrfToken;
                return true;
            }

            // If both endpoints fail, proceed without CSRF for now
            console.warn('CSRF endpoints not available, proceeding without CSRF protection');
            return true;
        } catch (error) {
            console.error('Failed to initialize CSRF protection:', error);
            // Continue without CSRF protection rather than blocking the user
            return true;
        }
    }

    /**
     * Get the current CSRF token
     */
    function getCsrfToken() {
        return csrfToken;
    }

    /**
     * Create a secure API request with proper headers including CSRF token
     * @param {string} url - The API endpoint URL
     * @param {Object} options - Fetch options
     * @returns {Promise} - Fetch promise
     */
    async function secureRequest(url, options = {}) {
        // Default options with credentials included for cookies
        const defaultOptions = {
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        };

        // Add authentication token from sessionStorage if it exists
        const token = sessionStorage.getItem('aydocorpToken');
        if (token) {
            defaultOptions.headers['Authorization'] = `Bearer ${token}`;
            defaultOptions.headers['x-auth-token'] = token;
        }

        // Only add CSRF token if it exists
        if (csrfToken) {
            defaultOptions.headers['X-CSRF-Token'] = csrfToken;
        }

        // Merge with user provided options
        const mergedOptions = {
            ...defaultOptions,
            ...options,
            headers: {
                ...defaultOptions.headers,
                ...(options.headers || {})
            }
        };

        try {
            // Add retry logic for network errors
            let retries = 2;
            let response;

            while (retries >= 0) {
                try {
                    response = await fetch(url, mergedOptions);
                    break; // If successful, exit the loop
                } catch (fetchError) {
                    if (retries === 0) {
                        throw fetchError; // If out of retries, rethrow the error
                    }
                    console.warn(`Request failed, retrying... (${retries} retries left)`, fetchError);
                    retries--;
                    // Wait a bit before retrying
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }

            return response;
        } catch (error) {
            console.error('Secure request failed after retries:', error);
            throw error;
        }
    }

    /**
     * Show a non-blocking notification instead of using alert()
     * @param {string} message - The message to display
     * @param {string} type - The type of notification (success, error, warning, info)
     * @param {number} duration - How long to show the notification in ms
     */
    function showNotification(message, type = 'info', duration = 3000) {
        // Remove any existing notifications
        $('.notification').remove();

        // Create notification element
        const notification = $(`
            <div class="notification ${type}">
                <div class="notification-content">
                    <span class="notification-message">${message}</span>
                    <button class="notification-close">&times;</button>
                </div>
            </div>
        `);

        // Add to body
        $('body').append(notification);

        // Add event listener to close button
        $('.notification-close').on('click', function() {
            $(this).closest('.notification').fadeOut(300, function() {
                $(this).remove();
            });
        });

        // Auto-hide after duration
        setTimeout(function() {
            notification.fadeOut(300, function() {
                $(this).remove();
            });
        }, duration);
    }

    /**
     * Safely parse JSON with error handling
     * @param {string} jsonString - The JSON string to parse
     * @param {*} defaultValue - Default value to return if parsing fails
     * @returns {*} - Parsed object or default value
     */
    function safeJsonParse(jsonString, defaultValue = null) {
        try {
            return JSON.parse(jsonString);
        } catch (error) {
            console.error('JSON parse error:', error);
            return defaultValue;
        }
    }

    /**
     * Sanitize HTML content to prevent XSS attacks
     * @param {string} html - The HTML string to sanitize
     * @returns {string} - Sanitized HTML
     */
    function sanitizeHtml(html) {
        if (!html) return '';

        // Create a temporary div
        const temp = document.createElement('div');
        temp.textContent = html;
        return temp.innerHTML;
    }

    // Expose public methods
    window.AuthUtils = {
        initCsrf,
        getCsrfToken,
        secureRequest,
        showNotification,
        safeJsonParse,
        sanitizeHtml
    };

})(jQuery);

/**
 * Debug helper for authentication issues
 * @returns {Promise<Object>} A summary of auth state
 */
async function debugAuth() {
    console.group('Authentication Debug Information');

    // Check stored token
    const token = sessionStorage.getItem('aydocorpToken');
    console.log('Token exists:', !!token);
    if (token) {
        // Don't log full token for security reasons
        console.log('Token preview:', token.substring(0, 10) + '...');
    }

    // Check user info
    const userJson = sessionStorage.getItem('aydocorpUser');
    console.log('User info exists:', !!userJson);
    if (userJson) {
        try {
            const user = JSON.parse(userJson);
            console.log('User:', { ...user, token: undefined }); // Don't log token if present
        } catch (e) {
            console.error('Failed to parse user JSON:', e);
        }
    }

    // Check login status
    const isLoggedIn = sessionStorage.getItem('aydocorpLoggedIn') === 'true';
    console.log('Is logged in:', isLoggedIn);

    // Try API test
    try {
        const apiTest = await testApiConnection();
        console.log('API reachable:', apiTest);
    } catch (e) {
        console.error('API test error:', e);
    }

    // Try token validation
    if (token) {
        try {
            const isValid = await validateToken();
            console.log('Token valid:', isValid);
        } catch (e) {
            console.error('Token validation error:', e);
        }
    }

    console.groupEnd();

    // Return a summary
    return {
        hasToken: !!token,
        hasUserInfo: !!userJson,
        isLoggedIn: isLoggedIn,
        message: token ? 'Authentication data exists but may not be valid with server' : 'No authentication data found'
    };
}

// Export if using as a module, or make available in global scope
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        debugAuth
    };
} else {
    // Make it available globally
    window.debugAuth = debugAuth;
}
