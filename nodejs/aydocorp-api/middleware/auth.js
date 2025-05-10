// middleware/auth.js
const jwt = require('jsonwebtoken');

module.exports = function(req, res, next) {
    // Get token from header
    const token = req.header('Authorization') ? 
                 req.header('Authorization').replace('Bearer ', '') : null;

    // Check if no token
    if (!token) {
        console.log('No token provided in request');
        return res.status(401).json({ message: 'No token, authorization denied' });
    }

    try {
        // Verify token
        if (!process.env.JWT_SECRET) {
            console.error('JWT_SECRET is not defined');
            return res.status(500).json({ message: 'Server configuration error' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Check token structure
        if (!decoded.user || !decoded.user.id) {
            console.log('Invalid token structure:', decoded);
            return res.status(401).json({ message: 'Invalid token structure' });
        }

        // Add user from payload to request
        req.user = decoded;
        next();
    } catch (err) {
        console.error('Token verification error:', err.message);
        res.status(401).json({ message: 'Token is not valid' });
    }
};
