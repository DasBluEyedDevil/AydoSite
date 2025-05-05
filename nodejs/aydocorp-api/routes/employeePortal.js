// routes/employeePortal.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Employee = require('../models/Employee');
const CareerPath = require('../models/CareerPath');
const Event = require('../models/Event');
const Operation = require('../models/Operation');
const googleSheetsUtil = require('../utils/googleSheetsUtil');
const googleDocsUtil = require('../utils/googleDocsUtil');

// Basic route to confirm employee portal routes are working
router.get('/', (req, res) => {
  res.json({ message: 'Employee Portal routes are working' });
});

// ===== Employee Database Routes =====

// @route   GET api/employee-portal/employees
// @desc    Get all employees
// @access  Private
router.get('/employees', auth, async (req, res) => {
  try {
    // Get employees from database
    const dbEmployees = await Employee.find()
      .populate('user', 'username email')
      .sort({ fullName: 1 });

    // Try to sync with Google Sheets if enabled
    let employees = dbEmployees;
    if (process.env.GOOGLE_SHEETS_EMPLOYEE_ID) {
      try {
        // Sync employees with Google Sheets
        const updatedEmployees = await googleSheetsUtil.syncEmployees(dbEmployees);

        // Update database with any changes from Google Sheets
        for (const updatedEmployee of updatedEmployees) {
          // Skip if this is just a database employee with no changes
          if (!updatedEmployee._id || dbEmployees.some(e => e._id.toString() === updatedEmployee._id.toString())) {
            continue;
          }

          // This is a new employee from the sheet, add to database
          const newEmployee = new Employee(updatedEmployee);
          await newEmployee.save();
        }

        // Update existing employees in database
        for (const dbEmployee of dbEmployees) {
          const updatedEmployee = updatedEmployees.find(e => e._id.toString() === dbEmployee._id.toString());
          if (updatedEmployee) {
            // Update fields that can be edited in the sheet
            dbEmployee.fullName = updatedEmployee.fullName;
            dbEmployee.backgroundStory = updatedEmployee.backgroundStory;
            dbEmployee.rank = updatedEmployee.rank;
            dbEmployee.department = updatedEmployee.department;
            dbEmployee.specializations = updatedEmployee.specializations;
            dbEmployee.certifications = updatedEmployee.certifications;

            // Handle contactInfo separately as it's an object
            if (updatedEmployee.contactInfo) {
              dbEmployee.contactInfo = {
                ...dbEmployee.contactInfo,
                ...updatedEmployee.contactInfo
              };
            }

            await dbEmployee.save();
          }
        }

        // Refresh employees from database after updates
        employees = await Employee.find()
          .populate('user', 'username email')
          .sort({ fullName: 1 });

        console.log('Employees synced with Google Sheets successfully');
      } catch (syncError) {
        console.error('Error syncing with Google Sheets:', syncError.message);
        // Continue with database employees if sync fails
      }
    }

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
    const dbCareerPaths = await CareerPath.find();

    // Try to sync with Google Docs if enabled
    let careerPaths = dbCareerPaths;
    if (process.env.GOOGLE_DOCS_CAREER_PATHS_ID) {
      try {
        // Get career paths from Google Docs
        const docsCareerPaths = await googleDocsUtil.getCareerPathsContent();

        // Create a map of database career paths by department for quick lookup
        const dbCareerPathMap = new Map();
        dbCareerPaths.forEach(careerPath => {
          dbCareerPathMap.set(careerPath.department.toLowerCase(), careerPath);
        });

        // Process career paths from Google Docs
        for (const docsCareerPath of docsCareerPaths) {
          // Check if career path with this department exists in database
          const existingCareerPath = dbCareerPathMap.get(docsCareerPath.department.toLowerCase());

          if (existingCareerPath) {
            // Update existing career path
            existingCareerPath.description = docsCareerPath.description;

            // Update ranks if provided
            if (docsCareerPath.ranks && docsCareerPath.ranks.length > 0) {
              existingCareerPath.ranks = docsCareerPath.ranks;
            }

            existingCareerPath.updatedAt = new Date();
            await existingCareerPath.save();
          } else {
            // Create new career path
            const newCareerPath = new CareerPath({
              department: docsCareerPath.department,
              description: docsCareerPath.description,
              ranks: docsCareerPath.ranks || []
            });

            await newCareerPath.save();
          }
        }

        // Refresh career paths from database after updates
        careerPaths = await CareerPath.find();

        console.log('Career paths synced with Google Docs successfully');
      } catch (syncError) {
        console.error('Error syncing with Google Docs:', syncError.message);
        // Continue with database career paths if sync fails
      }
    }

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
    const dbEvents = await Event.find()
      .populate('organizer', 'username')
      .populate('attendees.user', 'username')
      .sort({ startDate: 1 });

    // Try to sync with Google Docs if enabled
    let events = dbEvents;
    if (process.env.GOOGLE_DOCS_EVENTS_ID) {
      try {
        // Get events from Google Docs
        const docsEvents = await googleDocsUtil.getEventsContent();

        // Create a map of database events by title and date for quick lookup
        const dbEventMap = new Map();
        dbEvents.forEach(event => {
          const key = `${event.title.toLowerCase()}_${event.startDate.toISOString().split('T')[0]}`;
          dbEventMap.set(key, event);
        });

        // Process events from Google Docs
        for (const docsEvent of docsEvents) {
          // Create a key for lookup
          const startDateStr = docsEvent.startDate.toISOString().split('T')[0];
          const key = `${docsEvent.title.toLowerCase()}_${startDateStr}`;

          // Check if event with this title and date exists in database
          const existingEvent = dbEventMap.get(key);

          if (existingEvent) {
            // Update existing event
            existingEvent.description = docsEvent.description;
            existingEvent.eventType = docsEvent.eventType;
            existingEvent.location = docsEvent.location;

            // Only update end date if provided
            if (docsEvent.endDate) {
              existingEvent.endDate = docsEvent.endDate;
            }

            existingEvent.updatedAt = new Date();
            await existingEvent.save();
          } else {
            // Create new event
            const newEvent = new Event({
              title: docsEvent.title,
              description: docsEvent.description,
              eventType: docsEvent.eventType,
              location: docsEvent.location,
              startDate: docsEvent.startDate,
              endDate: docsEvent.endDate,
              isRecurring: docsEvent.isRecurring || false,
              organizer: req.user.user.id, // Set current user as organizer
              attendees: [{ user: req.user.user.id }], // Add creator as first attendee
              maxAttendees: docsEvent.maxAttendees || 0,
              requirements: docsEvent.requirements || '',
              isPrivate: docsEvent.isPrivate || false
            });

            await newEvent.save();
          }
        }

        // Refresh events from database after updates
        events = await Event.find()
          .populate('organizer', 'username')
          .populate('attendees.user', 'username')
          .sort({ startDate: 1 });

        console.log('Events synced with Google Docs successfully');
      } catch (syncError) {
        console.error('Error syncing with Google Docs:', syncError.message);
        // Continue with database events if sync fails
      }
    }

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

// ===== Operations Routes =====

// @route   GET api/employee-portal/operations
// @desc    Get all operations
// @access  Private
router.get('/operations', auth, async (req, res) => {
  try {
    // Get operations from database
    const dbOperations = await Operation.find()
      .populate('author', 'username')
      .sort({ updatedAt: -1 });

    // Try to sync with Google Docs if enabled
    let operations = dbOperations;
    if (process.env.GOOGLE_DOCS_OPERATIONS_ID) {
      try {
        // Get operations from Google Docs
        const docsOperations = await googleDocsUtil.getOperationsContent();

        // Create a map of database operations by title for quick lookup
        const dbOperationMap = new Map();
        dbOperations.forEach(operation => {
          dbOperationMap.set(operation.title.toLowerCase(), operation);
        });

        // Process operations from Google Docs
        for (const docsOperation of docsOperations) {
          // Check if operation with this title exists in database
          const existingOperation = dbOperationMap.get(docsOperation.title.toLowerCase());

          if (existingOperation) {
            // Update existing operation
            existingOperation.description = docsOperation.description;
            existingOperation.content = docsOperation.content;
            existingOperation.updatedAt = new Date();
            await existingOperation.save();
          } else {
            // Create new operation
            const newOperation = new Operation({
              title: docsOperation.title,
              description: docsOperation.description,
              content: docsOperation.content,
              category: docsOperation.category || 'document',
              classification: docsOperation.classification || 'internal',
              author: req.user.user.id, // Set current user as author
              status: docsOperation.status || 'active',
              accessRoles: ['admin'] // Default access to admins only
            });

            await newOperation.save();
          }
        }

        // Refresh operations from database after updates
        operations = await Operation.find()
          .populate('author', 'username')
          .sort({ updatedAt: -1 });

        console.log('Operations synced with Google Docs successfully');
      } catch (syncError) {
        console.error('Error syncing with Google Docs:', syncError.message);
        // Continue with database operations if sync fails
      }
    }

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
