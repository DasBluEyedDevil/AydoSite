const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../../../models/User');
const auth = require('../../../middleware/auth');
const { validate } = require('../../../middleware/validation/validator');
const { 
  registerValidation, 
  loginValidation 
} = require('../../../middleware/validation/authValidation');

/**
 * @swagger
 * /auth:
 *   get:
 *     summary: Check if auth routes are working
 *     tags: [Authentication]
 *     responses:
 *       200:
 *         description: Auth routes are working
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 */
router.get('/', (req, res) => {
  res.json({ message: 'Auth routes are working' });
});

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - email
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *     responses:
 *       200:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         description: Invalid input or user already exists
 *       500:
 *         description: Server error
 */
router.post('/register', validate(registerValidation), async (req, res) => {
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

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Authenticate user and get token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *                 format: password
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     username:
 *                       type: string
 *                     email:
 *                       type: string
 *                     role:
 *                       type: string
 *       400:
 *         description: Invalid credentials
 *       500:
 *         description: Server error
 */
router.post('/login', validate(loginValidation), async (req, res) => {
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

/**
 * @swagger
 * /auth/validate:
 *   get:
 *     summary: Validate token and get user data
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Token is valid
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 username:
 *                   type: string
 *                 email:
 *                   type: string
 *                 role:
 *                   type: string
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *       401:
 *         description: No token or invalid token
 *       500:
 *         description: Server error
 */
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

module.exports = router;