// Auth0 Integration for AydoCorp
// This file handles Auth0 authentication for the frontend

// Auth0 configuration
let auth0 = null;
const configureAuth0 = async () => {
  // Create Auth0 client
  auth0 = await createAuth0Client({
    domain: 'your-tenant.auth0.com', // Replace with your Auth0 domain
    client_id: 'your-client-id',     // Replace with your Auth0 client ID
    redirect_uri: window.location.origin,
    audience: 'https://your-tenant.auth0.com/api/v2/', // Replace with your Auth0 audience
    cacheLocation: 'localstorage'
  });
  
  // Handle callback from Auth0
  if (window.location.search.includes('code=')) {
    await auth0.handleRedirectCallback();
    window.history.replaceState({}, document.title, window.location.pathname);
    updateAuthUI();
  }
};

// Check if user is authenticated
const isAuthenticated = async () => {
  if (!auth0) await configureAuth0();
  return await auth0.isAuthenticated();
};

// Login with Auth0
const login = async () => {
  if (!auth0) await configureAuth0();
  await auth0.loginWithRedirect({
    redirect_uri: window.location.origin
  });
};

// Logout from Auth0
const logout = async () => {
  if (!auth0) await configureAuth0();
  await auth0.logout({
    returnTo: window.location.origin
  });
  
  // Clear any local storage or cookies
  clearAllAuthData();
};

// Get user profile from Auth0
const getUserProfile = async () => {
  if (!auth0) await configureAuth0();
  const isAuth = await auth0.isAuthenticated();
  if (!isAuth) return null;
  
  try {
    // Get user info from Auth0
    const auth0User = await auth0.getUser();
    
    // Get user profile from our API
    const token = await auth0.getTokenSilently();
    const response = await fetch(getApiUrl('auth/profile'), {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to get user profile from API');
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

// Update UI based on authentication status
const updateAuthUI = async () => {
  const isAuth = await isAuthenticated();
  
  // Get elements
  const loginBtn = document.getElementById('login-btn');
  const logoutBtn = document.getElementById('logout-btn');
  const profileSection = document.getElementById('profile-section');
  const loginMessage = document.getElementById('login-required-message');
  
  if (isAuth) {
    // User is authenticated
    const userProfile = await getUserProfile();
    
    // Update UI for authenticated user
    if (loginBtn) loginBtn.style.display = 'none';
    if (logoutBtn) logoutBtn.style.display = 'block';
    if (profileSection) profileSection.style.display = 'block';
    if (loginMessage) loginMessage.style.display = 'none';
    
    // Update user info in UI
    if (userProfile) {
      const userNameElement = document.getElementById('user-name');
      if (userNameElement) userNameElement.textContent = userProfile.username || 'Employee';
    }
  } else {
    // User is not authenticated
    if (loginBtn) loginBtn.style.display = 'block';
    if (logoutBtn) logoutBtn.style.display = 'none';
    if (profileSection) profileSection.style.display = 'none';
    if (loginMessage) loginMessage.style.display = 'block';
  }
};

// Initialize Auth0 when the page loads
document.addEventListener('DOMContentLoaded', async () => {
  // Load Auth0 SDK
  const script = document.createElement('script');
  script.src = 'https://cdn.auth0.com/js/auth0-spa-js/1.13/auth0-spa-js.production.js';
  script.async = true;
  script.onload = async () => {
    await configureAuth0();
    updateAuthUI();
    
    // Set up event listeners for login/logout buttons
    const loginBtn = document.getElementById('login-btn');
    if (loginBtn) {
      loginBtn.addEventListener('click', login);
    }
    
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', logout);
    }
  };
  document.head.appendChild(script);
});

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
  updateAuthUI
};