// middleware/auth0.js
const { auth } = require('express-openid-connect');
const { expressjwt: jwt } = require('express-jwt');
const jwksRsa = require('jwks-rsa');

// Configure Auth0 middleware
const configureAuth0 = () => {
  return auth({
    authRequired: false,
    auth0Logout: true,
    baseURL: process.env.FRONTEND_URL || 'http://localhost:3000',
    clientID: process.env.AUTH0_CLIENT_ID,
    issuerBaseURL: `https://${process.env.AUTH0_DOMAIN}`,
    secret: process.env.AUTH0_CLIENT_SECRET,
    clientSecret: process.env.AUTH0_CLIENT_SECRET,
    authorizationParams: {
      response_type: 'code',
      audience: process.env.AUTH0_AUDIENCE,
      scope: 'openid profile email'
    }
  });
};

// Middleware to check if user is authenticated with Auth0
const requireAuth = (req, res, next) => {
  if (!req.oidc.isAuthenticated()) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  next();
};

// Middleware to check if user has admin role
const requireAdmin = (req, res, next) => {
  if (!req.oidc.isAuthenticated()) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  
  // Check if user has admin role in Auth0 user metadata
  // This assumes you've set up roles in Auth0 and are including them in the ID token
  const user = req.oidc.user;
  if (!user || !user.roles || !user.roles.includes('admin')) {
    return res.status(403).json({ message: 'Admin privileges required' });
  }
  
  next();
};

// Middleware to validate API tokens (for programmatic access)
const validateApiToken = jwt({
  secret: jwksRsa.expressJwtSecret({
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 5,
    jwksUri: `https://${process.env.AUTH0_DOMAIN}/.well-known/jwks.json`
  }),
  audience: process.env.AUTH0_AUDIENCE,
  issuer: `https://${process.env.AUTH0_DOMAIN}/`,
  algorithms: ['RS256']
});

module.exports = {
  configureAuth0,
  requireAuth,
  requireAdmin,
  validateApiToken
};