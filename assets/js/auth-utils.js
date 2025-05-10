/**
 * Authentication Utilities
 * Provides secure authentication methods using HttpOnly cookies and CSRF protection
 */

(function($) {
    let csrfToken = '';

    /**
     * Initialize CSRF protection by fetching a CSRF token from the server.
     */
    async function initCsrf() {
        try {
            let response = await fetch('/api/auth/csrf-token', {
                method: 'GET',
                credentials: 'include'
            });

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

            console.warn('CSRF endpoints not available, proceeding without CSRF protection');
            return true;
        } catch (error) {
            console.error('Failed to initialize CSRF protection:', error);
            return true;
        }
    }

    /**
     * Retrieve the current CSRF token.
     */
    function getCsrfToken() {
        return csrfToken;
    }

    /**
     * Create a secure API request with proper headers including CSRF token.
     * @param {string} url - The API endpoint URL
     * @param {Object} options - Fetch options
     * @returns {Promise} - Fetch promise
     */
    async function secureRequest(url, options = {}) {
        console.log('secureRequest called for URL:', url);
        const defaultOptions = {
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        };

        const token = sessionStorage.getItem('aydocorpToken');
        console.log('Token exists:', !!token);
        if (token) {
            defaultOptions.headers['Authorization'] = `Bearer ${token}`;
            defaultOptions.headers['x-auth-token'] = token;
            console.log('Added token to headers');
        } else {
            console.warn('No token found in sessionStorage');
        }

        if (csrfToken) {
            defaultOptions.headers['X-CSRF-Token'] = csrfToken;
            console.log('Added CSRF token to headers');
        }

        const mergedOptions = {
            ...defaultOptions,
            ...options,
            headers: {
                ...defaultOptions.headers,
                ...(options.headers || {})
            }
        };

        console.log('Request options:', {
            ...mergedOptions,
            headers: {
                ...mergedOptions.headers,
                Authorization: mergedOptions.headers.Authorization ? 'Bearer [REDACTED]' : undefined,
                'x-auth-token': mergedOptions.headers['x-auth-token'] ? '[REDACTED]' : undefined
            }
        });

        try {
            console.log('Making fetch request...');
            const response = await fetch(url, mergedOptions);
            console.log('Response status:', response.status);
            console.log('Response headers:', Object.fromEntries(response.headers.entries()));
            return response;
        } catch (error) {
            console.error('Fetch error:', error);
            throw error;
        }
    }

    /**
     * Display a non-blocking notification.
     * @param {string} message - The message to display
     * @param {string} type - Notification type (success, error, warning, info)
     * @param {number} duration - Duration in ms
     */
    function showNotification(message, type = 'info', duration = 3000) {
        $('.notification').remove();

        const notification = $(`
            <div class="notification ${type}">
                <div class="notification-content">
                    <span class="notification-message">${message}</span>
                    <button class="notification-close">&times;</button>
                </div>
            </div>
        `);

        $('body').append(notification);

        $('.notification-close').on('click', function() {
            $(this).closest('.notification').fadeOut(300, function() {
                $(this).remove();
            });
        });

        setTimeout(function() {
            notification.fadeOut(300, function() {
                $(this).remove();
            });
        }, duration);
    }

    /**
     * Safely parse JSON with error handling.
     * @param {string} jsonString - JSON string to parse
     * @param {*} defaultValue - Default value if parsing fails
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
     * Sanitize HTML content to prevent XSS attacks.
     * @param {string} html - HTML string to sanitize
     * @returns {string} - Sanitized HTML
     */
    function sanitizeHtml(html) {
        if (!html) return '';

        const temp = document.createElement('div');
        temp.textContent = html;
        return temp.innerHTML;
    }

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
 * Get the base URL for API requests.
 */
function getApiBaseUrl() {
    // For local development, use localhost:3001
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return 'http://localhost:3001';
    }
    // For production, use the current origin
    return window.location.origin;
}

/**
 * Test if the API server is reachable.
 */
async function testApiConnection() {
    try {
        const url = getApiBaseUrl() + '/api/test';
        const response = await fetch(url);
        return response.ok;
    } catch {
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
            const response = await AuthUtils.secureRequest(getApiBaseUrl() + '/api/auth/validate');
            if (response.ok) return true;
            if (response.status !== 404) console.warn(`Standard validate endpoint failed: ${response.status}`);
        } catch {}
        for (const endpoint of ['auth/check', 'auth/status']) {
            try {
                const altResponse = await AuthUtils.secureRequest(getApiBaseUrl() + '/api/' + endpoint);
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
 * Debug helper for authentication issues.
 * @returns {Promise<Object>} A summary of auth state
 */
async function debugAuth() {
    console.group('Authentication Debug Information');

    const token = sessionStorage.getItem('aydocorpToken');
    console.log('Token exists:', !!token);
    if (token) {
        console.log('Token preview:', token.substring(0, 10) + '...');
    }

    const userJson = sessionStorage.getItem('aydocorpUser');
    console.log('User info exists:', !!userJson);
    if (userJson) {
        try {
            const user = JSON.parse(userJson);
            console.log('User:', { ...user, token: undefined });
        } catch (e) {
            console.error('Failed to parse user JSON:', e);
        }
    }

    const isLoggedIn = sessionStorage.getItem('aydocorpLoggedIn') === 'true';
    console.log('Is logged in:', isLoggedIn);

    try {
        const apiTest = await testApiConnection();
        console.log('API reachable:', apiTest);
    } catch (e) {
        console.error('API test error:', e);
    }

    if (token) {
        try {
            const isValid = await validateToken();
            console.log('Token valid:', isValid);
        } catch (e) {
            console.error('Token validation error:', e);
        }
    }

    // Check auth headers with the server
    try {
        const baseUrl = getApiBaseUrl();
        const url = `${baseUrl}/api/auth-debug`;
        console.log('Checking auth headers with server at:', url);

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': token ? `Bearer ${token}` : '',
                'x-auth-token': token || ''
            }
        });

        if (response.ok) {
            const data = await response.json();
            console.log('Server auth debug response:', data);
        } else {
            console.error('Auth debug request failed:', response.status);
        }
    } catch (e) {
        console.error('Auth debug request error:', e);
    }

    console.groupEnd();

    return {
        hasToken: !!token,
        hasUserInfo: !!userJson,
        isLoggedIn: isLoggedIn,
        message: token ? 'Authentication data exists but may not be valid with server' : 'No authentication data found'
    };
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        debugAuth,
        getApiBaseUrl,
        testApiConnection,
        validateToken
    };
} else {
    window.debugAuth = debugAuth;
    window.getApiBaseUrl = getApiBaseUrl;
    window.testApiConnection = testApiConnection;
    window.validateToken = validateToken;
}