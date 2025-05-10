// Auth0 Integration for AydoCorp
// This file handles Auth0 authentication for the frontend

// API Utilities
function getApiBaseUrl() {
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:3001';
  }
  return window.location.origin;
}

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

// Auth0 configuration
let auth0Client = null;

// Function to fetch Auth0 configuration from the server
const fetchAuthConfig = () => fetch("/auth_config.json");

// Function to configure the Auth0 client
const configureClient = async () => {
  try {
    const response = await fetchAuthConfig();
    const config = await response.json();

    auth0Client = await auth0.createAuth0Client({
      domain: config.domain,
      clientId: config.clientId,
      authorizationParams: {
        redirect_uri: window.location.origin + "/#",
        audience: config.audience
      },
      cacheLocation: 'localstorage'
    });

    console.log("Auth0 client configured successfully");
    return true;
  } catch (error) {
    console.error("Error configuring Auth0 client:", error);
    return false;
  }
};

// Function to handle the Auth0 callback
const handleAuth0Callback = async () => {
  // Check for the code and state parameters
  const query = window.location.search;
  if (query.includes("code=") && query.includes("state=")) {
    try {
      // Process the login state
      await auth0Client.handleRedirectCallback();

      // Update UI
      updateAuthUI();

      // Use replaceState to redirect the user away and remove the querystring parameters
      window.history.replaceState({}, document.title, "/");

      return true;
    } catch (error) {
      console.error("Error handling Auth0 callback:", error);
      return false;
    }
  }
  return false;
};

// Check if user is authenticated
const isAuthenticated = async () => {
  try {
    if (!auth0Client) await configureClient();
    return await auth0Client.isAuthenticated();
  } catch (error) {
    console.error("Error checking authentication status:", error);
    return false;
  }
};

// Login with Auth0
const login = async () => {
  try {
    if (!auth0Client) await configureClient();
    await auth0Client.loginWithRedirect({
      authorizationParams: {
        redirect_uri: window.location.origin + "/#"
      }
    });
  } catch (error) {
    console.error("Error during login:", error);
  }
};

// Logout from Auth0
const logout = async () => {
  try {
    if (!auth0Client) await configureClient();
    await auth0Client.logout({
      logoutParams: {
        returnTo: window.location.origin
      }
    });

    // Clear any local storage or cookies
    clearAllAuthData();
  } catch (error) {
    console.error("Error during logout:", error);
  }
};

// Get user profile from Auth0
const getUserProfile = async () => {
  try {
    if (!auth0Client) await configureClient();
    const isAuth = await auth0Client.isAuthenticated();
    if (!isAuth) return null;

    // Get user info from Auth0
    const user = await auth0Client.getUser();

    // Get access token
    const token = await auth0Client.getTokenSilently();

    // Get user profile from our API
    const response = await fetch(getApiUrl('auth/profile'), {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!response.ok) {
      console.error('Failed to get user profile from API:', response.status);
      return user; // Return Auth0 user info as fallback
    }

    const userProfile = await response.json();

    // Store user info in localStorage for easy access
    localStorage.setItem('aydocorpUser', JSON.stringify(userProfile));

    return userProfile;
  } catch (error) {
    console.error('Error getting user profile:', error);
    return null;
  }
};

// Get the access token
const getAccessToken = async () => {
  try {
    if (!auth0Client) await configureClient();
    return await auth0Client.getTokenSilently();
  } catch (error) {
    console.error("Error getting access token:", error);
    return null;
  }
};

// Call the protected API endpoint
const callApi = async () => {
  try {
    // Get the access token
    const token = await getAccessToken();
    if (!token) {
      console.error("No access token available");
      return { error: "No access token available" };
    }

    // Call the API
    const response = await fetch("/api/external", {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("API call failed:", errorData);
      return { error: errorData.msg || "API call failed" };
    }

    const data = await response.json();
    console.log("API call successful:", data);
    return data;
  } catch (error) {
    console.error("Error calling API:", error);
    return { error: error.message || "Error calling API" };
  }
};

// Update UI based on authentication status
const updateAuthUI = async () => {
  try {
    const isAuth = await isAuthenticated();

    // Get elements
    const loginBtn = document.getElementById('login-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const profileSection = document.getElementById('profile-section');
    const loginMessage = document.getElementById('login-required-message');
    const accessTokenElement = document.getElementById('ipt-access-token');
    const userProfileElement = document.getElementById('ipt-user-profile');
    const gatedContent = document.getElementById('gated-content');
    const callApiBtn = document.getElementById('btn-call-api');

    if (isAuth) {
      // User is authenticated
      const userProfile = await getUserProfile();
      const accessToken = await getAccessToken();

      // Update UI for authenticated user
      if (loginBtn) loginBtn.style.display = 'none';
      if (logoutBtn) logoutBtn.style.display = 'block';
      if (profileSection) profileSection.style.display = 'block';
      if (loginMessage) loginMessage.style.display = 'none';
      if (gatedContent) gatedContent.classList.remove('hidden');

      // Display access token and user profile if elements exist
      if (accessTokenElement) accessTokenElement.innerHTML = accessToken || 'No access token available';
      if (userProfileElement) userProfileElement.textContent = JSON.stringify(userProfile, null, 2);

      // Enable the API call button
      if (callApiBtn) callApiBtn.disabled = false;

      // Update user info in UI
      if (userProfile) {
        const userNameElement = document.getElementById('user-name');
        if (userNameElement) userNameElement.textContent = userProfile.username || userProfile.name || 'Employee';

        // Add user status div with hover-over button
        // First, remove any existing user status div
        document.querySelectorAll('.user-status').forEach(el => el.remove());

        // Check if user is admin
        const isAdmin = userProfile.role === 'admin' || 
                       (userProfile['https://aydocorp.space/roles'] && 
                        userProfile['https://aydocorp.space/roles'].includes('admin'));

        // Create user status HTML
        const safeUsername = userProfile.username || userProfile.name || 'Employee';
        const userStatusHtml = `
            <div class="user-status">
                <span class="username">${safeUsername}</span>
                <div class="dropdown-container">
                    ${isAdmin ? '<a href="/index.html#admin-dashboard" class="admin-badge">ADMIN</a>' : ''}
                    <span class="logout-option">
                        <a href="#" class="logout">Logout</a>
                    </span>
                </div>
            </div>
        `;

        // Append to body
        document.body.insertAdjacentHTML('beforeend', userStatusHtml);

        // Update the Member Login link to Logout
        const loginLink = document.querySelector('header nav ul li a[href="#login"]');
        if (loginLink) {
            loginLink.textContent = 'Logout';
            loginLink.setAttribute('href', '#');
            loginLink.classList.add('logout');
            const parentLi = loginLink.closest('li');
            if (parentLi) parentLi.setAttribute('id', 'logout-nav');
        }
      }
    } else {
      // User is not authenticated
      if (loginBtn) loginBtn.style.display = 'block';
      if (logoutBtn) logoutBtn.style.display = 'none';
      if (profileSection) profileSection.style.display = 'none';
      if (loginMessage) loginMessage.style.display = 'block';
      if (gatedContent) gatedContent.classList.add('hidden');

      // Disable the API call button
      if (callApiBtn) callApiBtn.disabled = true;

      // Remove user status div
      document.querySelectorAll('.user-status').forEach(el => el.remove());

      // Reset Logout link back to Member Login
      const logoutLink = document.querySelector('header nav ul li a.logout');
      if (logoutLink) {
          logoutLink.textContent = 'Member Login';
          logoutLink.setAttribute('href', '#login');
          logoutLink.classList.remove('logout');
          const parentLi = logoutLink.closest('li');
          if (parentLi) parentLi.removeAttribute('id');
      }
    }
  } catch (error) {
    console.error("Error updating UI:", error);
  }
};

// Initialize Auth0 when the page loads
window.onload = async () => {
  try {
    // Configure the Auth0 client
    await configureClient();

    // Handle the Auth0 callback if present
    const query = window.location.search;
    if (query.includes("code=") && query.includes("state=")) {
      // Process the login state
      await handleAuth0Callback();
    } else {
      // Update the UI based on the current authentication state
      await updateAuthUI();
    }

    // Set up event listeners for login/logout buttons
    const loginBtn = document.getElementById('login-btn');
    if (loginBtn) {
      loginBtn.addEventListener('click', login);
    }

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', logout);
    }

    // Set up event listener for API call button
    const callApiBtn = document.getElementById('btn-call-api');
    if (callApiBtn) {
      callApiBtn.addEventListener('click', async () => {
        const resultElement = document.getElementById('api-call-result');
        if (resultElement) {
          resultElement.textContent = 'Calling API...';
          try {
            const result = await callApi();
            resultElement.textContent = JSON.stringify(result, null, 2);
          } catch (error) {
            resultElement.textContent = `Error: ${error.message || 'Unknown error'}`;
          }
        }
      });
    }
  } catch (error) {
    console.error("Error initializing Auth0:", error);
  }
};

// Function to clear all authentication data (from portal.js)
function clearAllAuthData() {
  // Clear localStorage
  localStorage.removeItem('aydocorpToken');
  localStorage.removeItem('aydocorpUser');
  localStorage.removeItem('aydocorpLoggedIn');

  // Clear sessionStorage
  sessionStorage.removeItem('aydocorpToken');
  sessionStorage.removeItem('aydocorpUser');
  sessionStorage.removeItem('aydocorpLoggedIn');
  sessionStorage.removeItem('aydocorpValidationFallback');
  sessionStorage.removeItem('fallbackWarningShown');
  sessionStorage.removeItem('tokenValidationRetries');
  sessionStorage.removeItem('lastLoginTime');

  // Clear cookies
  document.cookie = 'aydocorpToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';

  // Clear any other potential storage
  try {
    // Clear all localStorage items related to aydocorp
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.toLowerCase().includes('aydocorp')) {
        localStorage.removeItem(key);
      }
    }

    // Clear all sessionStorage items related to aydocorp
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && key.toLowerCase().includes('aydocorp')) {
        sessionStorage.removeItem(key);
      }
    }

    // Clear all cookies
    const cookies = document.cookie.split(";");
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i];
      const eqPos = cookie.indexOf("=");
      const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
      document.cookie = name + "=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    }

    console.log('[Auth0] All authentication data cleared successfully');
  } catch (e) {
    console.error('[Auth0] Error clearing storage:', e);
  }
}

// Export functions for use in other files
window.auth0Integration = {
  login,
  logout,
  isAuthenticated,
  getUserProfile,
  updateAuthUI,
  getAccessToken,
  callApi
};
