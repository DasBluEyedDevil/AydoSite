// routes/auth0Routes.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { requireAuth, requireAdmin } = require('../middleware/auth0');

// Basic route to confirm auth routes are working
router.get('/', (req, res) => {
  res.json({ message: 'Auth0 routes are working' });
});

// @route   GET api/auth/profile
// @desc    Get user profile from Auth0
// @access  Private
router.get('/profile', requireAuth, async (req, res) => {
  try {
    // Get user info from Auth0
    const auth0User = req.oidc.user;
    
    // Check if user exists in our database
    let user = await User.findOne({ email: auth0User.email });
    
    // If user doesn't exist, create a new one
    if (!user) {
      user = new User({
        username: auth0User.nickname || auth0User.name,
        email: auth0User.email,
        // No need to store password as Auth0 handles authentication
        password: 'AUTH0_MANAGED', // Placeholder as password is required in schema
        // Default role is 'employee' as defined in User model
      });
      await user.save();
    }
    
    // Return user profile
    res.json({
      id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      auth0Id: auth0User.sub,
      createdAt: user.createdAt
    });
  } catch (err) {
    console.error('Profile error:', err.message);
    res.status(500).json({
      message: 'Server error while fetching profile',
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
    });
  }
});

// @route   GET api/auth/users
// @desc    Get all users
// @access  Private (admin only)
router.get('/users', requireAdmin, async (req, res) => {
  try {
    // Get all users from database, excluding passwords
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

// @route   GET api/auth/users/:id
// @desc    Get user by ID
// @access  Private (admin only)
router.get('/users/:id', requireAdmin, async (req, res) => {
  try {
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
router.put('/users/:id', requireAdmin, async (req, res) => {
  try {
    const { username, email, role } = req.body;

    // Validate input
    if (!username || !email) {
      return res.status(400).json({ message: 'Username and email are required' });
    }

    // Check if username or email is already taken by another user
    const existingUser = await User.findOne({
      $or: [
        { username },
        { email }
      ],
      _id: { $ne: req.params.id }
    });

    if (existingUser) {
      return res.status(400).json({ message: 'Username or email is already taken' });
    }

    // Update user
    const updateData = { username, email };
    if (role) updateData.role = role;
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

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

// @route   GET api/auth/logout
// @desc    Logout user
// @access  Public
router.get('/logout', (req, res) => {
  res.oidc.logout({ returnTo: process.env.FRONTEND_URL || 'http://localhost:3000' });
});

module.exports = router;