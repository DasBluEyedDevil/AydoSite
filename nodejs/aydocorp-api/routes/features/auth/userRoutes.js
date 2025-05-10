const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../../../models/User');
const auth = require('../../../middleware/auth');
const roleAuth = require('../../../middleware/roleAuth');
const { validate } = require('../../../middleware/validation/validator');
const { updateUserValidation } = require('../../../middleware/validation/authValidation');

/**
 * @swagger
 * /auth/users:
 *   get:
 *     summary: Get all users
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all users
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/User'
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized (admin only)
 *       500:
 *         description: Server error
 */
router.get('/', auth, async (req, res) => {
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

/**
 * @swagger
 * /auth/users/{id}:
 *   get:
 *     summary: Get user by ID
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: User details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized (admin only)
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
router.get('/:id', auth, async (req, res) => {
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

/**
 * @swagger
 * /auth/users/{id}:
 *   put:
 *     summary: Update user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: User updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         description: Invalid input or username/email already taken
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized (admin only)
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
router.put('/:id', [auth, roleAuth('admin'), validate(updateUserValidation)], async (req, res) => {
  try {
    const { username, email } = req.body;

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
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { username, email },
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

/**
 * @swagger
 * /auth/users/{id}/make-admin:
 *   post:
 *     summary: Make user an admin
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: User made admin successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized (admin only)
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
router.post('/:id/make-admin', [auth, roleAuth('admin')], async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role: 'admin' },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (err) {
    console.error('Error making user admin:', err.message);
    res.status(500).json({
      message: 'Server error while making user admin',
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
    });
  }
});

/**
 * @swagger
 * /auth/users/{id}/remove-admin:
 *   post:
 *     summary: Remove admin rights from user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: Admin rights removed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         description: Cannot remove admin rights from the last admin
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized (admin only)
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
router.post('/:id/remove-admin', [auth, roleAuth('admin')], async (req, res) => {
  try {
    // Prevent removing admin rights from the last admin
    const adminCount = await User.countDocuments({ role: 'admin' });
    if (adminCount <= 1) {
      return res.status(400).json({ message: 'Cannot remove admin rights from the last admin user' });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role: 'employee' },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (err) {
    console.error('Error removing admin rights:', err.message);
    res.status(500).json({
      message: 'Server error while removing admin rights',
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
    });
  }
});

/**
 * @swagger
 * /auth/users/{id}/reset-password:
 *   post:
 *     summary: Reset user's password to "noob1"
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: Password reset successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized (admin only)
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
router.post('/:id/reset-password', [auth, roleAuth('admin')], async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Hash the default password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('noob1', salt);

    // Update user's password
    user.password = hashedPassword;
    await user.save();

    res.json({ message: 'Password has been reset successfully' });
  } catch (err) {
    console.error('Error resetting password:', err.message);
    res.status(500).json({
      message: 'Server error while resetting password',
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
    });
  }
});

module.exports = router;