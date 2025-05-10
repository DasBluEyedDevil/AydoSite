// server.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const connectDB = require('./db');
const User = require('./models/User');

// Initialize the Express app
const app = express();

// Connect to MongoDB
connectDB();

// Make sure your server.js has these settings
const PORT = process.env.PORT || 3001;

// Proper CORS configuration
app.use(cors({
  origin: ['https://aydocorp.space', 'http://localhost:3000'],
  credentials: true
}));

// Middleware setup
app.use(helmet({
    contentSecurityPolicy: false // Disable CSP for simplicity, enable in production with proper config
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Configure logging
const logsDir = path.join(__dirname, 'logs');
// Ensure logs directory exists
try {
    if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
    }

    // Create access log stream
    const accessLogStream = fs.createWriteStream(
        path.join(logsDir, 'access.log'),
        { flags: 'a' }
    );

    // Setup morgan logging
    app.use(morgan('combined', { stream: accessLogStream }));
} catch (error) {
    console.warn('Could not set up file logging, falling back to console logging:', error.message);
    app.use(morgan('combined')); // Fallback to console logging
}

// Add debug middleware to log all requests
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
    console.log('Headers:', req.headers);
    next();
});

// Define routes
const authRoutes = require('./routes/auth');
const forumRoutes = require('./routes/forum');
const employeePortalRoutes = require('./routes/employeePortal');
const pageContentRoutes = require('./routes/pageContent');

// Mount routes
// Temporarily commenting out auth routes for troubleshooting
// app.use('/api/auth', authRoutes);
app.use('/api/forum', forumRoutes);
app.use('/api/employee-portal', employeePortalRoutes);
app.use('/api/page-content', pageContentRoutes);

// Basic routes
app.get('/', (req, res) => {
    res.json({ message: 'AydoCorp API is running' });
});

app.get('/api/test', (req, res) => {
    res.json({ message: 'API is working correctly' });
});

app.get('/api/health-check', (req, res) => {
    res.json({
        status: 'ok',
        message: 'Server is running normally'
    });
});

// Debug route to check auth headers
app.get('/api/auth-debug', (req, res) => {
    const token = req.header('Authorization') ? req.header('Authorization').replace('Bearer ', '') : null;
    res.json({
        hasToken: !!token,
        tokenPreview: token ? `${token.substring(0, 10)}...` : null,
        headers: {
            authorization: req.header('Authorization')
        }
    });
});

// Special routes to handle requests without the slash between portal and the resource
app.get('/api/employee-portal-operations', (req, res) => {
    res.redirect('/api/employee-portal/operations');
});

app.get('/api/employee-portal-employees', (req, res) => {
    res.redirect('/api/employee-portal/employees');
});

app.get('/api/employee-portal-career-paths', (req, res) => {
    res.redirect('/api/employee-portal/career-paths');
});

app.get('/api/employee-portal-events', (req, res) => {
    res.redirect('/api/employee-portal/events');
});

// Catch-all route for undefined API routes
app.use('/api/*', (req, res) => {
    console.log(`[${new Date().toISOString()}] Undefined API route: ${req.method} ${req.originalUrl}`);
    res.status(404).json({
        message: 'API endpoint not found',
        path: req.originalUrl,
        method: req.method
    });
});

// Add this alongside your other basic routes
app.post('/api/test-post', (req, res) => {
    res.json({
        message: 'POST request received successfully',
        receivedData: req.body
    });
});

// Remove Sequelize sync and update server startup
startServer();

// Generic error handler (catch-all for unhandled errors)
app.use((err, req, res, next) => {
    console.error('Unhandled application error:', err);
    res.status(500).json({
        message: 'Server error',
        error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
    });
});

// Start server function
function startServer() {
    

    // Listen for HTTP connections
    app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
}

// Error handler for server startup (e.g., port already in use)
function handleServerError(port, serverType) {
    return async (error) => {
        console.error(`${serverType} Server startup error:`, error);

        if (error.code === 'EADDRINUSE') {
            console.error(`Port ${port} is already in use. Is another instance running?`);
            console.error(`Try using a different port by setting ${serverType === 'HTTPS' ? 'HTTPS_PORT' : 'PORT'} in .env file or as an environment variable.`);

            // Try to find the process using the port
            const isWindows = process.platform === 'win32';
            const command = isWindows 
                ? `netstat -ano | findstr :${port}`
                : `lsof -i :${port}`;

            exec(command, (err, stdout, stderr) => {
                if (err) {
                    console.error('Error finding process:', err);
                    return;
                }
                console.log('Process using port:', stdout);
            });
        }

        // Graceful shutdown
        console.log('Initiating graceful shutdown...');

        // Close MongoDB connection
        if (mongoose.connection.readyState !== 0) {
            try {
                await mongoose.connection.close();
                console.log('MongoDB connection closed during shutdown');
            } catch (err) {
                console.error('Error closing MongoDB connection:', err);
            }
        }
        process.exit(1);
    };
}

// Add graceful shutdown handlers
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

async function gracefulShutdown() {
    console.log('Received shutdown signal. Starting graceful shutdown...');

    // Close MongoDB connection
    if (mongoose.connection.readyState !== 0) {
        try {
            await mongoose.connection.close();
            console.log('MongoDB connection closed during shutdown');
        } catch (err) {
            console.error('Error closing MongoDB connection:', err);
        }
    }
    process.exit(0);
}

// Import the scheduler for periodic data synchronization
const scheduler = require('./utils/scheduler');

// Connect to MongoDB then start server
// connectToMongoDB()
//     .then(() => {
//         // Only start the HTTP server if the database connection is successful
//         startServer();
//
//         // Initialize the scheduler for periodic data synchronization
//         scheduler.initialize();
//         console.log('Automatic data synchronization scheduler started');
//     })
//     .catch(error => {
//         // This catch handles errors from connectToMongoDB's initial connection
//         console.error('Failed to start application due to MongoDB connection error:', error);
//         process.exit(1); // Exit if DB connection failed at startup
//     });