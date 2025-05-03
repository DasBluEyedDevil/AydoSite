// routes/auth.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');

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

        // Create new user
        user = new User({
            username,
            email,
            password
        });

        // Hash password
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);

        // Save user
        await user.save();

        // Create and return JWT token
        const payload = {
            user: {
                id: user.id
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
                        id: user.id,
                        username: user.username,
                        email: user.email
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
                id: user.id
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
                        id: user.id,
                        username: user.username,
                        email: user.email
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
        res.json(user);
    } catch (err) {
        console.error('Validation error:', err.message);
        res.status(500).json({
            message: 'Server error during token validation',
            error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
        });
    }
});

module.exports = router;