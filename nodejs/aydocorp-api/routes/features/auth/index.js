const express = require('express');
const router = express.Router();

// Import route modules
const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const passwordRoutes = require('./passwordRoutes');

// Mount routes
router.use('/', authRoutes);
router.use('/users', userRoutes);
router.use('/', passwordRoutes);

module.exports = router;