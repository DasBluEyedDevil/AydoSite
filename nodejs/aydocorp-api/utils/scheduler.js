// utils/scheduler.js
const cron = require('node-cron');
const googleSheetsUtil = require('./googleSheetsUtil');
const googleDocsUtil = require('./googleDocsUtil');
const Employee = require('../models/Employee');
const CareerPath = require('../models/CareerPath');
const Event = require('../models/Event');
const Operation = require('../models/Operation');

/**
 * Scheduler utility for periodic data synchronization
 */
class Scheduler {
  constructor() {
    this.jobs = {};
    this.initialized = false;
  }

  /**
   * Initialize the scheduler
   */
  initialize() {
    if (this.initialized) {
      console.log('Scheduler already initialized');
      return;
    }

    console.log('Initializing data sync scheduler...');
    
    // Schedule jobs
    this.scheduleEmployeeSync();
    this.scheduleCareerPathSync();
    this.scheduleEventSync();
    this.scheduleOperationSync();
    
    this.initialized = true;
    console.log('Data sync scheduler initialized successfully');
  }

  /**
   * Schedule employee data synchronization
   */
  scheduleEmployeeSync() {
    // Run every hour at minute 0 (e.g., 1:00, 2:00, etc.)
    this.jobs.employeeSync = cron.schedule('0 * * * *', async () => {
      console.log('Running scheduled employee data sync...');
      try {
        // Get employees from database
        const dbEmployees = await Employee.find()
          .populate('user', 'username email')
          .sort({ fullName: 1 });

        // Sync with Google Sheets if enabled
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

            console.log('Scheduled employee sync completed successfully');
          } catch (syncError) {
            console.error('Error in scheduled employee sync:', syncError.message);
          }
        } else {
          console.log('Skipping employee sync: GOOGLE_SHEETS_EMPLOYEE_ID not configured');
        }
      } catch (err) {
        console.error('Error in scheduled employee sync job:', err.message);
      }
    });

    console.log('Employee sync job scheduled (hourly)');
  }

  /**
   * Schedule career path data synchronization
   */
  scheduleCareerPathSync() {
    // Run every 2 hours at minute 15 (e.g., 1:15, 3:15, etc.)
    this.jobs.careerPathSync = cron.schedule('15 */2 * * *', async () => {
      console.log('Running scheduled career path data sync...');
      try {
        // Get career paths from database
        const dbCareerPaths = await CareerPath.find();

        // Sync with Google Docs if enabled
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

            console.log('Scheduled career path sync completed successfully');
          } catch (syncError) {
            console.error('Error in scheduled career path sync:', syncError.message);
          }
        } else {
          console.log('Skipping career path sync: GOOGLE_DOCS_CAREER_PATHS_ID not configured');
        }
      } catch (err) {
        console.error('Error in scheduled career path sync job:', err.message);
      }
    });

    console.log('Career path sync job scheduled (every 2 hours)');
  }

  /**
   * Schedule event data synchronization
   */
  scheduleEventSync() {
    // Run every 3 hours at minute 30 (e.g., 0:30, 3:30, 6:30, etc.)
    this.jobs.eventSync = cron.schedule('30 */3 * * *', async () => {
      console.log('Running scheduled event data sync...');
      try {
        // Get events from database
        const dbEvents = await Event.find()
          .populate('organizer', 'username')
          .populate('attendees.user', 'username')
          .sort({ startDate: 1 });

        // Sync with Google Docs if enabled
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
                // Create new event with a default organizer (first admin user)
                const adminUser = await require('mongoose').model('User').findOne({ role: 'admin' });
                
                if (!adminUser) {
                  console.warn('No admin user found for event creation, skipping new event');
                  continue;
                }

                // Create new event
                const newEvent = new Event({
                  title: docsEvent.title,
                  description: docsEvent.description,
                  eventType: docsEvent.eventType,
                  location: docsEvent.location,
                  startDate: docsEvent.startDate,
                  endDate: docsEvent.endDate,
                  isRecurring: docsEvent.isRecurring || false,
                  organizer: adminUser._id, // Set admin user as organizer
                  attendees: [{ user: adminUser._id }], // Add admin as first attendee
                  maxAttendees: docsEvent.maxAttendees || 0,
                  requirements: docsEvent.requirements || '',
                  isPrivate: docsEvent.isPrivate || false
                });

                await newEvent.save();
              }
            }

            console.log('Scheduled event sync completed successfully');
          } catch (syncError) {
            console.error('Error in scheduled event sync:', syncError.message);
          }
        } else {
          console.log('Skipping event sync: GOOGLE_DOCS_EVENTS_ID not configured');
        }
      } catch (err) {
        console.error('Error in scheduled event sync job:', err.message);
      }
    });

    console.log('Event sync job scheduled (every 3 hours)');
  }

  /**
   * Schedule operation data synchronization
   */
  scheduleOperationSync() {
    // Run every 4 hours at minute 45 (e.g., 0:45, 4:45, 8:45, etc.)
    this.jobs.operationSync = cron.schedule('45 */4 * * *', async () => {
      console.log('Running scheduled operation data sync...');
      try {
        // Get operations from database
        const dbOperations = await Operation.find()
          .populate('author', 'username')
          .sort({ updatedAt: -1 });

        // Sync with Google Docs if enabled
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
                // Create new operation with a default author (first admin user)
                const adminUser = await require('mongoose').model('User').findOne({ role: 'admin' });
                
                if (!adminUser) {
                  console.warn('No admin user found for operation creation, skipping new operation');
                  continue;
                }

                // Create new operation
                const newOperation = new Operation({
                  title: docsOperation.title,
                  description: docsOperation.description,
                  content: docsOperation.content,
                  category: docsOperation.category || 'document',
                  classification: docsOperation.classification || 'internal',
                  author: adminUser._id, // Set admin user as author
                  status: docsOperation.status || 'active',
                  accessRoles: ['admin'] // Default access to admins only
                });

                await newOperation.save();
              }
            }

            console.log('Scheduled operation sync completed successfully');
          } catch (syncError) {
            console.error('Error in scheduled operation sync:', syncError.message);
          }
        } else {
          console.log('Skipping operation sync: GOOGLE_DOCS_OPERATIONS_ID not configured');
        }
      } catch (err) {
        console.error('Error in scheduled operation sync job:', err.message);
      }
    });

    console.log('Operation sync job scheduled (every 4 hours)');
  }

  /**
   * Stop all scheduled jobs
   */
  stopAll() {
    console.log('Stopping all scheduled sync jobs...');
    Object.values(this.jobs).forEach(job => job.stop());
    console.log('All scheduled sync jobs stopped');
  }
}

// Export a singleton instance
const scheduler = new Scheduler();
module.exports = scheduler;