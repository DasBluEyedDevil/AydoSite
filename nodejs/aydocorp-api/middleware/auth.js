// middleware/auth.js
const jwt = require('jsonwebtoken');

module.exports = function(req, res, next) {
    // Get token from header (support both x-auth-token and Authorization: Bearer)
    let token = req.header('x-auth-token');

    // Check for Authorization header (Bearer token)
    const authHeader = req.header('Authorization');
    if (!token && authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
    }

    // Check if no token
    if (!token) {
        return res.status(401).json({ message: 'No token, authorization denied' });
    }

    if (!process.env.JWT_SECRET) {
        console.error('JWT_SECRET is not defined');
        return res.status(500).json({ message: 'Server configuration error' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Add additional validation
        if (!decoded.user || !decoded.user.id) {
            return res.status(401).json({ message: 'Invalid token structure' });
        }

        req.user = decoded;
        next();
    } catch (err) {
        console.error('Token verification error:', err.message);
        res.status(401).json({ 
            message: 'Token is not valid',
            error: process.env.NODE_ENV !== 'production' ? err.message : undefined
        });
    }
};
