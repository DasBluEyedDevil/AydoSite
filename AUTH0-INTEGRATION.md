# Auth0 Integration for AydoCorp

This document provides instructions for setting up and using Auth0 as the user profile management system for AydoCorp.

## Overview

Auth0 is a flexible, drop-in solution to add authentication and authorization services to your applications. We've integrated Auth0 to replace our custom user profile management system, providing:

- Secure authentication
- User management
- Role-based access control
- Single sign-on capabilities
- Social login options

## Setup Instructions

### 1. Create an Auth0 Account

1. Go to [Auth0's website](https://auth0.com/) and sign up for an account
2. Create a new tenant (organization)

### 2. Create an Auth0 Application

1. In the Auth0 dashboard, go to "Applications" > "Applications"
2. Click "Create Application"
3. Name it "AydoCorp" and select "Regular Web Application"
4. Click "Create"

### 3. Configure Application Settings

In your application settings:

1. Add the following URLs to "Allowed Callback URLs":
   - `http://localhost:3000/callback`
   - `https://aydocorp.space/callback`

2. Add the following URLs to "Allowed Logout URLs":
   - `http://localhost:3000`
   - `https://aydocorp.space`

3. Add the following URLs to "Allowed Web Origins":
   - `http://localhost:3000`
   - `https://aydocorp.space`

### 4. Create an API

1. Go to "Applications" > "APIs"
2. Click "Create API"
3. Name it "AydoCorp API"
4. Set the identifier to your API domain (e.g., `https://api.aydocorp.space`)
5. Select RS256 as the signing algorithm

### 5. Configure Environment Variables

Update your `.env` file with the following Auth0 configuration:

```
# Auth0 configuration
AUTH0_DOMAIN=your-tenant.auth0.com
AUTH0_CLIENT_ID=your-client-id
AUTH0_CLIENT_SECRET=your-client-secret
AUTH0_CALLBACK_URL=http://localhost:3000/callback
AUTH0_AUDIENCE=https://your-tenant.auth0.com/api/v2/
```

Replace the placeholder values with your actual Auth0 credentials.

### 6. Configure User Roles

1. Go to "User Management" > "Roles"
2. Create two roles:
   - `admin`: For administrators
   - `employee`: For regular employees

3. Assign permissions to these roles as needed

## Frontend Integration

The frontend integration is handled by the `auth0-integration.js` file, which:

1. Loads the Auth0 SPA SDK
2. Provides functions for login, logout, and checking authentication status
3. Updates the UI based on authentication status

To use Auth0 in your frontend:

1. Include the Auth0 integration script in your HTML:
   ```html
   <script src="assets/js/auth0-integration.js"></script>
   ```

2. Update the Auth0 configuration in `auth0-integration.js`:
   ```javascript
   auth0 = await createAuth0Client({
     domain: 'your-tenant.auth0.com',
     client_id: 'your-client-id',
     redirect_uri: window.location.origin,
     audience: 'https://your-tenant.auth0.com/api/v2/',
     cacheLocation: 'localstorage'
   });
   ```

3. Use the provided functions for authentication:
   ```javascript
   // Login
   window.auth0Integration.login();

   // Logout
   window.auth0Integration.logout();

   // Check if user is authenticated
   const isAuthenticated = await window.auth0Integration.isAuthenticated();

   // Get user profile
   const userProfile = await window.auth0Integration.getUserProfile();
   ```

## Backend Integration

The backend integration is handled by:

1. `middleware/auth0.js`: Provides middleware for Auth0 authentication
2. `routes/auth0Routes.js`: Provides routes for Auth0 authentication

The middleware includes:

- `configureAuth0`: Configures Auth0 middleware
- `requireAuth`: Middleware to check if user is authenticated
- `requireAdmin`: Middleware to check if user has admin role
- `validateApiToken`: Middleware to validate API tokens

To use Auth0 in your routes:

```javascript
const { requireAuth, requireAdmin } = require('../middleware/auth0');

// Protected route
router.get('/protected', requireAuth, (req, res) => {
  res.json({ message: 'This is a protected route' });
});

// Admin-only route
router.get('/admin', requireAdmin, (req, res) => {
  res.json({ message: 'This is an admin-only route' });
});
```

## Migration Notes

The Auth0 integration maintains backward compatibility:

1. Legacy authentication routes are still available at `/api/auth/legacy`
2. The frontend falls back to legacy authentication if Auth0 is not available
3. User data is synchronized between Auth0 and the local database

## Troubleshooting

If you encounter issues with Auth0 integration:

1. Check that your Auth0 credentials are correct in the `.env` file
2. Ensure that your application URLs are correctly configured in Auth0
3. Check the browser console for any JavaScript errors
4. Check the server logs for any backend errors

For more help, refer to the [Auth0 documentation](https://auth0.com/docs).