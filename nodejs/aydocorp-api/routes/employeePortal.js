// routes/employeePortal.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Employee = require('../models/Employee');
const CareerPath = require('../models/CareerPath');
const Event = require('../models/Event');
const Operation = require('../models/Operation');
const User = require('../models/User');

// Basic route to confirm employee portal routes are working
router.get('/', (req, res) => {
  res.json({ message: 'Employee Portal routes are working' });
});

// Note: Google API integration has been removed
// All sync routes have been removed

// ===== Employee Database Routes =====

// @route   GET api/employee-portal/employees
// @desc    Get all employees
// @access  Private
router.get('/employees', auth, async (req, res) => {
  try {
    // Get employees from database
    const employees = await Employee.find()
      .populate('user', 'username email')
      .sort({ fullName: 1 });

    res.json(employees);
  } catch (err) {
    console.error('Error fetching employees:', err.message);
    res.status(500).json({
      message: 'Server error while fetching employees',
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
    });
  }
});

// @route   GET api/employee-portal/employees/:id
// @desc    Get employee by ID
// @access  Private
router.get('/employees/:id', auth, async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id)
      .populate('user', 'username email');

    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    res.json(employee);
  } catch (err) {
    console.error('Error fetching employee:', err.message);

    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Employee not found' });
    }

    res.status(500).json({
      message: 'Server error while fetching employee',
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
    });
  }
});

// @route   POST api/employee-portal/employees
// @desc    Create or update employee profile
// @access  Private
router.post('/employees', auth, async (req, res) => {
  try {
    const {
      fullName,
      photo,
      backgroundStory,
      rank,
      department,
      specializations,
      certifications,
      contactInfo
    } = req.body;

    // Check if employee profile already exists for this user
    let employee = await Employee.findOne({ user: req.user.user.id });

    if (employee) {
      // Update existing profile
      employee = await Employee.findOneAndUpdate(
        { user: req.user.user.id },
        { 
          $set: {
            fullName,
            photo,
            backgroundStory,
            rank,
            department,
            specializations,
            certifications,
            contactInfo,
            lastActive: Date.now()
          }
        },
        { new: true }
      );
    } else {
      // Create new profile
      employee = new Employee({
        user: req.user.user.id,
        fullName,
        photo,
        backgroundStory,
        rank,
        department,
        specializations,
        certifications,
        contactInfo
      });

      await employee.save();
    }

    res.json(employee);
  } catch (err) {
    console.error('Error creating/updating employee:', err.message);
    res.status(500).json({
      message: 'Server error while creating/updating employee',
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
    });
  }
});

// ===== Career Paths Routes =====

// @route   GET api/employee-portal/career-paths
// @desc    Get all career paths
// @access  Private
router.get('/career-paths', auth, async (req, res) => {
  try {
    // Get career paths from database
    const careerPaths = await CareerPath.find();

    res.json(careerPaths);
  } catch (err) {
    console.error('Error fetching career paths:', err.message);
    res.status(500).json({
      message: 'Server error while fetching career paths',
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
    });
  }
});

// @route   POST api/employee-portal/career-paths
// @desc    Create a new career path
// @access  Private
router.post('/career-paths', auth, async (req, res) => {
  try {
    const {
      department,
      description,
      ranks,
      certifications,
      trainingGuides
    } = req.body;

    // Check if career path already exists for this department
    let careerPath = await CareerPath.findOne({ department });

    if (careerPath) {
      return res.status(400).json({ message: 'Career path for this department already exists' });
    }

    // Create new career path
    careerPath = new CareerPath({
      department,
      description,
      ranks: ranks || [],
      certifications: certifications || [],
      trainingGuides: trainingGuides || []
    });

    await careerPath.save();
    res.json(careerPath);
  } catch (err) {
    console.error('Error creating career path:', err.message);
    res.status(500).json({
      message: 'Server error while creating career path',
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
    });
  }
});

// @route   GET api/employee-portal/career-paths/:id
// @desc    Get career path by ID
// @access  Private
router.get('/career-paths/:id', auth, async (req, res) => {
  try {
    const careerPath = await CareerPath.findById(req.params.id);

    if (!careerPath) {
      return res.status(404).json({ message: 'Career path not found' });
    }

    res.json(careerPath);
  } catch (err) {
    console.error('Error fetching career path:', err.message);

    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Career path not found' });
    }

    res.status(500).json({
      message: 'Server error while fetching career path',
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
    });
  }
});

// ===== Events Routes =====

// @route   GET api/employee-portal/events
// @desc    Get all events
// @access  Private
router.get('/events', auth, async (req, res) => {
  try {
    // Get events from database
    const events = await Event.find()
      .populate('organizer', 'username')
      .populate('attendees.user', 'username')
      .sort({ startDate: 1 });

    res.json(events);
  } catch (err) {
    console.error('Error fetching events:', err.message);
    res.status(500).json({
      message: 'Server error while fetching events',
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
    });
  }
});

// @route   POST api/employee-portal/events
// @desc    Create a new event
// @access  Private
router.post('/events', auth, async (req, res) => {
  try {
    const {
      title,
      description,
      eventType,
      location,
      startDate,
      endDate,
      isRecurring,
      recurrencePattern,
      maxAttendees,
      requirements,
      isPrivate
    } = req.body;

    // Create new event
    const newEvent = new Event({
      title,
      description,
      eventType: eventType || 'other',
      location,
      startDate,
      endDate,
      isRecurring: isRecurring || false,
      recurrencePattern: recurrencePattern || '',
      organizer: req.user.user.id,
      maxAttendees: maxAttendees || 0,
      requirements: requirements || '',
      isPrivate: isPrivate || false,
      attendees: [{ user: req.user.user.id }] // Add creator as first attendee
    });

    const event = await newEvent.save();
    await event.populate('organizer', 'username');
    await event.populate('attendees.user', 'username');

    res.json(event);
  } catch (err) {
    console.error('Error creating event:', err.message);
    res.status(500).json({
      message: 'Server error while creating event',
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
    });
  }
});

// @route   GET api/employee-portal/events/:id
// @desc    Get event by ID
// @access  Private
router.get('/events/:id', auth, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('organizer', 'username')
      .populate('attendees.user', 'username');

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    res.json(event);
  } catch (err) {
    console.error('Error fetching event:', err.message);

    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Event not found' });
    }

    res.status(500).json({
      message: 'Server error while fetching event',
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
    });
  }
});

// ===== User Routes =====

// @route   GET api/employee-portal/users
// @desc    Get all users (basic info only)
// @access  Private
router.get('/users', auth, async (req, res) => {
  try {
    // Get users from database, but only return basic info
    // This endpoint is available to all authenticated users, but only returns limited data
    const users = await User.find().select('username email role createdAt');

    // Map to a simplified format with less sensitive information
    const simplifiedUsers = users.map(user => ({
      id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt
    }));

    res.json(simplifiedUsers);
  } catch (err) {
    console.error('Error fetching users:', err.message);
    res.status(500).json({
      message: 'Server error while fetching users',
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
    });
  }
});

// ===== Operations Routes =====

// @route   GET api/employee-portal/operations
// @desc    Get all operations
// @access  Private
router.get('/operations', auth, async (req, res) => {
  try {
    // Get operations from database
    const operations = await Operation.find()
      .populate('author', 'username')
      .sort({ updatedAt: -1 });

    res.json(operations);
  } catch (err) {
    console.error('Error fetching operations:', err.message);
    res.status(500).json({
      message: 'Server error while fetching operations',
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
    });
  }
});

// @route   POST api/employee-portal/operations
// @desc    Create a new operation
// @access  Private
router.post('/operations', auth, async (req, res) => {
  try {
    const {
      title,
      description,
      content,
      category,
      classification,
      attachments,
      relatedOperations,
      version,
      status,
      accessRoles
    } = req.body;

    // Create new operation
    const newOperation = new Operation({
      title,
      description,
      content,
      category: category || 'document',
      classification: classification || 'internal',
      author: req.user.user.id,
      attachments: attachments || [],
      relatedOperations: relatedOperations || [],
      version: version || '1.0',
      status: status || 'active',
      accessRoles: accessRoles || ['admin']
    });

    const operation = await newOperation.save();
    await operation.populate('author', 'username');

    if (operation.attachments.length > 0) {
      await operation.populate('attachments.uploadedBy', 'username');
    }

    res.json(operation);
  } catch (err) {
    console.error('Error creating operation:', err.message);
    res.status(500).json({
      message: 'Server error while creating operation',
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
    });
  }
});

// @route   GET api/employee-portal/operations/:id
// @desc    Get operation by ID
// @access  Private
router.get('/operations/:id', auth, async (req, res) => {
  try {
    const operation = await Operation.findById(req.params.id)
      .populate('author', 'username')
      .populate('attachments.uploadedBy', 'username');

    if (!operation) {
      return res.status(404).json({ message: 'Operation not found' });
    }

    res.json(operation);
  } catch (err) {
    console.error('Error fetching operation:', err.message);

    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Operation not found' });
    }

    res.status(500).json({
      message: 'Server error while fetching operation',
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
    });
  }
});

module.exports = router;
