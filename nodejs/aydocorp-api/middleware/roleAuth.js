// middleware/roleAuth.js
const User = require('../models/User');

/**
 * Middleware to check if the user has the required role
 * @param {string|string[]} roles - The role(s) required to access the route
 * @returns {function} - Express middleware function
 */
module.exports = function(roles) {
    return async function(req, res, next) {
        try {
            // Check if user exists in request (should be added by auth middleware)
            if (!req.user || !req.user.user || !req.user.user.id) {
                return res.status(401).json({ message: 'User not authenticated' });
            }

            // Get user from database to check role
            const user = await User.findById(req.user.user.id);
            
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }

            // Convert roles to array if it's a string
            const requiredRoles = Array.isArray(roles) ? roles : [roles];
            
            // Check if user has one of the required roles
            if (!requiredRoles.includes(user.role)) {
                return res.status(403).json({ 
                    message: 'Access denied. You do not have the required role to access this resource.' 
                });
            }

            // Add user role to request for convenience
            req.userRole = user.role;
            
            next();
        } catch (err) {
            console.error('Role authorization error:', err.message);
            res.status(500).json({ 
                message: 'Server error during role authorization',
                error: process.env.NODE_ENV !== 'production' ? err.message : undefined
            });
        }
    };
};