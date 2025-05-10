const express = require('express');
const router = express.Router();

// Import feature routes
const authRoutes = require('./auth');
// TODO: Add other feature routes as they are implemented
// const employeeRoutes = require('./employees');
// const careerRoutes = require('./careers');
// const eventRoutes = require('./events');
// const forumRoutes = require('./forum');
// const operationRoutes = require('./operations');
// const pageRoutes = require('./pages');

// Mount feature routes
router.use('/auth', authRoutes);
// TODO: Mount other feature routes as they are implemented
// router.use('/employee-portal', employeeRoutes);
// router.use('/employee-portal/career-paths', careerRoutes);
// router.use('/employee-portal/events', eventRoutes);
// router.use('/forum', forumRoutes);
// router.use('/employee-portal/operations', operationRoutes);
// router.use('/page-content', pageRoutes);

// Basic routes
router.get('/test', (req, res) => {
  res.json({ message: 'API is working correctly' });
});

router.get('/health-check', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Server is running normally'
  });
});

// Debug route to check auth headers
router.get('/auth-debug', (req, res) => {
  const token = req.header('Authorization') ? req.header('Authorization').replace('Bearer ', '') : null;
  res.json({
    hasToken: !!token,
    tokenPreview: token ? `${token.substring(0, 10)}...` : null,
    headers: {
      authorization: req.header('Authorization')
    }
  });
});

module.exports = router;