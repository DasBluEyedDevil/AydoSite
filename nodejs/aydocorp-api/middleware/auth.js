// middleware/auth.js
const jwt = require('jsonwebtoken');

module.exports = function(req, res, next) {
    console.log('Auth middleware called for:', req.originalUrl);
    console.log('Request headers:', req.headers);

    // Get token from header (support both x-auth-token and Authorization: Bearer)
    let token = req.header('x-auth-token');
    console.log('x-auth-token:', token ? 'exists' : 'not found');

    // Check for Authorization header (Bearer token)
    const authHeader = req.header('Authorization');
    console.log('Authorization header:', authHeader ? authHeader.substring(0, 20) + '...' : 'not found');
    if (!token && authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
        console.log('Using Bearer token');
    }

    // Check if no token
    if (!token) {
        console.log('No token found in request');
        return res.status(401).json({ message: 'No token, authorization denied' });
    }

    if (!process.env.JWT_SECRET) {
        console.error('JWT_SECRET is not defined');
        return res.status(500).json({ message: 'Server configuration error' });
    }

    try {
        console.log('Verifying token...');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log('Token verified successfully');

        // Add additional validation
        if (!decoded.user || !decoded.user.id) {
            console.log('Invalid token structure:', decoded);
            return res.status(401).json({ message: 'Invalid token structure' });
        }

        req.user = decoded;
        console.log('User attached to request:', {
            id: decoded.user.id,
            role: decoded.user.role
        });
        next();
    } catch (err) {
        console.error('Token verification error:', err.message);
        res.status(401).json({ 
            message: 'Token is not valid',
            error: process.env.NODE_ENV !== 'production' ? err.message : undefined
        });
    }
};
