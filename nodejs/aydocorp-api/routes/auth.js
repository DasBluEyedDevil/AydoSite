// routes/auth.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const auth = require('../middleware/auth');
const transporter = require('../utils/emailConfig');
const { Op } = require('sequelize');

// Basic route to confirm auth routes are working
router.get('/', (req, res) => {
  res.json({ message: 'Auth routes are working' });
});

// @route   POST api/auth/register
// @desc    Register a user
// @access  Public
router.post('/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // Check if user already exists
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ message: 'User already exists' });
        }

        user = await User.findOne({ username });
        if (user) {
            return res.status(400).json({ message: 'Username already taken' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create new user
        user = new User({
            username,
            email,
            password: hashedPassword
        });
        await user.save();

        // Create and return JWT token
        const payload = {
            user: {
                id: user._id,
                role: user.role
            }
        };

        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '7d' },
            (err, token) => {
                if (err) {
                    console.error('JWT signing error during registration:', err.message);
                    return res.status(500).json({
                        message: 'Error generating authentication token',
                        error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
                    });
                }
                res.json({ 
                    token,
                    user: {
                        id: user._id,
                        username: user.username,
                        email: user.email,
                        role: user.role
                    }
                });
            }
        );
    } catch (err) {
        console.error('Registration error:', err.message);
        res.status(500).json({
            message: 'Server error during registration',
            error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
        });
    }
});

// @route   POST api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // Check if user exists
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Check password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Create and return JWT token
        const payload = {
            user: {
                id: user._id,
                role: user.role
            }
        };

        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '7d' },
            (err, token) => {
                if (err) {
                    console.error('JWT signing error during login:', err.message);
                    return res.status(500).json({
                        message: 'Error generating authentication token',
                        error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
                    });
                }
                res.json({ 
                    token,
                    user: {
                        id: user._id,
                        username: user.username,
                        email: user.email,
                        role: user.role
                    }
                });
            }
        );
    } catch (err) {
        console.error('Login error:', err.message);
        res.status(500).json({
            message: 'Server error during login',
            error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
        });
    }
});

// @route   GET api/auth/validate
// @desc    Validate token and get user data
// @access  Private
router.get('/validate', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.user.id).select('-password');
        res.json({
            id: user._id,
            username: user.username,
            email: user.email,
            role: user.role,
            createdAt: user.createdAt
        });
    } catch (err) {
        console.error('Validation error:', err.message);
        res.status(500).json({
            message: 'Server error during token validation',
            error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
        });
    }
});

// @route   GET api/auth/users
// @desc    Get all users
// @access  Private (admin only)
router.get('/users', auth, async (req, res) => {
    try {
        // Log the request for debugging
        console.log(`[${new Date().toISOString()}] GET /auth/users - User: ${req.user.user.id}, Role: ${req.user.user.role}`);
        console.log('Request headers:', req.headers);

        // Check if user is admin
        const isAdmin = req.user.user.role === 'admin';
        console.log('Is admin:', isAdmin);

        if (!isAdmin) {
            console.log(`Access denied for user ${req.user.user.id} (role: ${req.user.user.role})`);
            return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
        }

        // Get all users from database, excluding passwords
        const users = await User.find().select('-password');
        console.log(`Found ${users.length} users`);
        res.json(users);
    } catch (err) {
        console.error('Error fetching users:', err.message);
        res.status(500).json({
            message: 'Server error while fetching users',
            error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
        });
    }
});

// @route   GET api/auth/users/:id
// @desc    Get user by ID
// @access  Private (admin only)
router.get('/users/:id', auth, async (req, res) => {
    try {
        // Check if user is admin
        if (req.user.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
        }

        const user = await User.findById(req.params.id).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json(user);
    } catch (err) {
        console.error('Error fetching user:', err.message);
        res.status(500).json({
            message: 'Server error while fetching user',
            error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
        });
    }
});

// @route   PUT api/auth/users/:id
// @desc    Update user
// @access  Private (admin only)
router.put('/users/:id', auth, async (req, res) => {
    try {
        // Check if user is admin
        if (req.user.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
        }

        const { username, email } = req.body;

        // Validate input
        if (!username || !email) {
            return res.status(400).json({ message: 'Username and email are required' });
        }

        // Check if username or email is already taken by another user
        const existingUser = await User.findOne({
            where: {
                [Op.or]: [
                    { username },
                    { email }
                ],
                id: { [Op.ne]: req.params.id }
            }
        });

        if (existingUser) {
            return res.status(400).json({ message: 'Username or email is already taken' });
        }

        // Update user
        const [updatedRows, updatedUsers] = await User.update(
            { username, email },
            { where: { id: req.params.id }, returning: true, individualHooks: true }
        );
        const user = updatedUsers && updatedUsers.length > 0 ? updatedUsers[0] : null;

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json(user);
    } catch (err) {
        console.error('Error updating user:', err.message);
        res.status(500).json({
            message: 'Server error while updating user',
            error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
        });
    }
});

// @route   POST api/auth/users/:id/make-admin
// @desc    Make user an admin
// @access  Private (admin only)
router.post('/users/:id/make-admin', auth, async (req, res) => {
    try {
        // Check if user is admin
        if (req.user.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
        }

        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        await user.update({ role: 'admin' });

        res.json(user);
    } catch (err) {
        console.error('Error making user admin:', err.message);
        res.status(500).json({
            message: 'Server error while making user admin',
            error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
        });
    }
});

// @route   POST api/auth/users/:id/remove-admin
// @desc    Remove admin rights from user
// @access  Private (admin only)
router.post('/users/:id/remove-admin', auth, async (req, res) => {
    try {
        // Check if user is admin
        if (req.user.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
        }

        // Prevent removing admin rights from the last admin
        const adminCount = await User.count({ where: { role: 'admin' } });
        if (adminCount <= 1) {
            return res.status(400).json({ message: 'Cannot remove admin rights from the last admin user' });
        }

        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        await user.update({ role: 'employee' });

        res.json(user);
    } catch (err) {
        console.error('Error removing admin rights:', err.message);
        res.status(500).json({
            message: 'Server error while removing admin rights',
            error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
        });
    }
});

// @route   POST api/auth/users/:id/reset-password
// @desc    Reset user's password to "noob1"
// @access  Private (admin only)
router.post('/users/:id/reset-password', auth, async (req, res) => {
    try {
        // Check if user is admin
        if (req.user.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
        }

        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Hash the default password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('noob1', salt);

        // Update user's password
        await user.update({ password: hashedPassword });

        res.json({ message: 'Password has been reset successfully' });
    } catch (err) {
        console.error('Error resetting password:', err.message);
        res.status(500).json({
            message: 'Server error while resetting password',
            error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
        });
    }
});

// @route   POST api/auth/request-password-reset
// @desc    Request password reset
// @access  Public
router.post('/request-password-reset', async (req, res) => {
    try {
        const { email } = req.body;

        // Find user by email
        const user = await User.findOne({ where: { email } });
        if (!user) {
            // Don't reveal if email exists or not
            return res.json({ message: 'If your email is registered, you will receive a password reset link' });
        }

        // Generate reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenExpiry = Date.now() + 3600000; // Token valid for 1 hour

        // Save reset token to user
        await user.update({
            resetPasswordToken: resetToken,
            resetPasswordExpires: resetTokenExpiry
        });

        // Create reset URL
        const resetUrl = `${process.env.FRONTEND_URL || 'https://aydocorp.space'}/reset-password/${resetToken}`;

        // Send email
        await transporter.sendMail({
            from: process.env.SMTP_FROM || 'noreply@aydocorp.space',
            to: user.email,
            subject: 'Password Reset Request',
            html: `
                <h1>Password Reset Request</h1>
                <p>You requested a password reset. Click the link below to reset your password:</p>
                <a href="${resetUrl}">Reset Password</a>
                <p>This link will expire in 1 hour.</p>
                <p>If you didn't request this, please ignore this email.</p>
            `
        });

        res.json({ message: 'If your email is registered, you will receive a password reset link' });
    } catch (err) {
        console.error('Password reset request error:', err.message);
        res.status(500).json({
            message: 'Server error during password reset request',
            error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
        });
    }
});

// @route   POST api/auth/reset-password/:token
// @desc    Reset password with token
// @access  Public
router.post('/reset-password/:token', async (req, res) => {
    try {
        const { token } = req.params;
        const { password } = req.body;

        // Validate password
        if (!password || password.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters long' });
        }

        // Find user with valid reset token
        const user = await User.findOne({
            where: {
                resetPasswordToken: token,
                resetPasswordExpires: { [Op.gt]: Date.now() }
            }
        });

        if (!user) {
            return res.status(400).json({ message: 'Password reset token is invalid or has expired' });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        
        // Clear reset token fields
        await user.update({
            resetPasswordToken: null,
            resetPasswordExpires: null,
            password: hashedPassword
        });
        
        res.json({ message: 'Password has been reset successfully' });
    } catch (err) {
        console.error('Password reset error:', err.message);
        res.status(500).json({
            message: 'Server error during password reset',
            error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
        });
    }
});

module.exports = router;
