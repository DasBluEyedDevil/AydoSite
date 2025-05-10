// routes/users.js
const express = require('express');
const router = express.Router();
const { auth, adminAuth } = require('../middleware/auth');
const User = require('../models/User');

// @route   GET api/auth/users
// @desc    Get all users (admin only)
// @access  Admin
router.get('/users', adminAuth, async (req, res) => {
    try {
        const users = await User.find().select('-password');
        res.json(users);
    } catch (err) {
        console.error('Error fetching users:', err.message);
        res.status(500).json({
            message: 'Server error while fetching users',
            error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
        });
    }
});

module.exports = router;