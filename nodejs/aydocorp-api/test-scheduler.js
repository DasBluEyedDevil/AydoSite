// test-scheduler.js
// This script tests the data synchronization functions in the scheduler

// Import required modules
const mongoose = require('mongoose');
require('dotenv').config();
const googleSheetsUtil = require('./utils/googleSheetsUtil');
const googleDocsUtil = require('./utils/googleDocsUtil');
const Employee = require('./models/Employee');
const CareerPath = require('./models/CareerPath');
const Event = require('./models/Event');
const Operation = require('./models/Operation');

// Connect to MongoDB
async function connectToMongoDB() {
  try {
    if (!process.env.MONGODB_URI) {
      console.error('MONGODB_URI environment variable is NOT defined!');
      process.exit(1);
    }

    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    process.exit(1);
  }
}

// Test employee sync
async function testEmployeeSync() {
  console.log('\n=== Testing Employee Sync ===');
  try {
    // Get employees from database
    const dbEmployees = await Employee.find()
      .populate('user', 'username email')
      .sort({ fullName: 1 });
    
    console.log(`Found ${dbEmployees.length} employees in database`);

    // Sync with Google Sheets if enabled
    if (process.env.GOOGLE_SHEETS_EMPLOYEE_ID) {
      try {
        console.log('Syncing with Google Sheets...');
        const updatedEmployees = await googleSheetsUtil.syncEmployees(dbEmployees);
        console.log(`Processed ${updatedEmployees.length} employees from Google Sheets`);
        console.log('Employee sync test completed successfully');
      } catch (syncError) {
        console.error('Error syncing with Google Sheets:', syncError.message);
      }
    } else {
      console.log('Skipping employee sync: GOOGLE_SHEETS_EMPLOYEE_ID not configured');
    }
  } catch (err) {
    console.error('Error in employee sync test:', err.message);
  }
}

// Test career path sync
async function testCareerPathSync() {
  console.log('\n=== Testing Career Path Sync ===');
  try {
    // Get career paths from database
    const dbCareerPaths = await CareerPath.find();
    console.log(`Found ${dbCareerPaths.length} career paths in database`);

    // Sync with Google Docs if enabled
    if (process.env.GOOGLE_DOCS_CAREER_PATHS_ID) {
      try {
        console.log('Syncing with Google Docs...');
        const docsCareerPaths = await googleDocsUtil.getCareerPathsContent();
        console.log(`Processed ${docsCareerPaths.length} career paths from Google Docs`);
        console.log('Career path sync test completed successfully');
      } catch (syncError) {
        console.error('Error syncing with Google Docs:', syncError.message);
      }
    } else {
      console.log('Skipping career path sync: GOOGLE_DOCS_CAREER_PATHS_ID not configured');
    }
  } catch (err) {
    console.error('Error in career path sync test:', err.message);
  }
}

// Test event sync
async function testEventSync() {
  console.log('\n=== Testing Event Sync ===');
  try {
    // Get events from database
    const dbEvents = await Event.find()
      .populate('organizer', 'username')
      .populate('attendees.user', 'username')
      .sort({ startDate: 1 });
    
    console.log(`Found ${dbEvents.length} events in database`);

    // Sync with Google Docs if enabled
    if (process.env.GOOGLE_DOCS_EVENTS_ID) {
      try {
        console.log('Syncing with Google Docs...');
        const docsEvents = await googleDocsUtil.getEventsContent();
        console.log(`Processed ${docsEvents.length} events from Google Docs`);
        console.log('Event sync test completed successfully');
      } catch (syncError) {
        console.error('Error syncing with Google Docs:', syncError.message);
      }
    } else {
      console.log('Skipping event sync: GOOGLE_DOCS_EVENTS_ID not configured');
    }
  } catch (err) {
    console.error('Error in event sync test:', err.message);
  }
}

// Test operation sync
async function testOperationSync() {
  console.log('\n=== Testing Operation Sync ===');
  try {
    // Get operations from database
    const dbOperations = await Operation.find()
      .populate('author', 'username')
      .sort({ updatedAt: -1 });
    
    console.log(`Found ${dbOperations.length} operations in database`);

    // Sync with Google Docs if enabled
    if (process.env.GOOGLE_DOCS_OPERATIONS_ID) {
      try {
        console.log('Syncing with Google Docs...');
        const docsOperations = await googleDocsUtil.getOperationsContent();
        console.log(`Processed ${docsOperations.length} operations from Google Docs`);
        console.log('Operation sync test completed successfully');
      } catch (syncError) {
        console.error('Error syncing with Google Docs:', syncError.message);
      }
    } else {
      console.log('Skipping operation sync: GOOGLE_DOCS_OPERATIONS_ID not configured');
    }
  } catch (err) {
    console.error('Error in operation sync test:', err.message);
  }
}

// Run all tests
async function runTests() {
  try {
    // Connect to MongoDB
    await connectToMongoDB();

    console.log('Starting data sync tests...');
    
    // Run tests
    await testEmployeeSync();
    await testCareerPathSync();
    await testEventSync();
    await testOperationSync();
    
    console.log('\nAll tests completed');
    
    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    
    process.exit(0);
  } catch (error) {
    console.error('Error running tests:', error);
    process.exit(1);
  }
}

// Run the tests
runTests();