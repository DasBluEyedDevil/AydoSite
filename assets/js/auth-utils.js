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
        const defaultOptions = {
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        };

        const token = sessionStorage.getItem('aydocorpToken');
        if (token) {
            defaultOptions.headers['Authorization'] = `Bearer ${token}`;
            defaultOptions.headers['x-auth-token'] = token;
        }

        if (csrfToken) {
            defaultOptions.headers['X-CSRF-Token'] = csrfToken;
        }

        const mergedOptions = {
            ...defaultOptions,
            ...options,
            headers: {
                ...defaultOptions.headers,
                ...(options.headers || {})
            }
        };

        try {
            let retries = 2;
            let response;

            while (retries >= 0) {
                try {
                    response = await fetch(url, mergedOptions);
                    break;
                } catch (fetchError) {
                    if (retries === 0) {
                        throw fetchError;
                    }
                    console.warn(`Request failed, retrying... (${retries} retries left)`, fetchError);
                    retries--;
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
        debugAuth
    };
} else {
    window.debugAuth = debugAuth;
}
