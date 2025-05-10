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
const { configureAuth0 } = require('./middleware/auth0');

// Initialize the Express app
const app = express();

// Connect to MongoDB
connectDB();

// Make sure your server.js has these settings
const PORT = process.env.PORT || 3001;

// Proper CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['https://aydocorp.space', 'http://localhost:3000'];
app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
console.log('CORS configured with allowed origins:', allowedOrigins);

// Middleware setup
app.use(helmet({
    contentSecurityPolicy: false // Disable CSP for simplicity, enable in production with proper config
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Auth0 middleware setup
app.use(configureAuth0());
console.log('Auth0 middleware configured');

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
const authRoutes = require('./routes/auth'); // Legacy auth routes
const auth0Routes = require('./routes/auth0Routes'); // New Auth0 routes
const forumRoutes = require('./routes/forum');
const employeePortalRoutes = require('./routes/employeePortal');
const pageContentRoutes = require('./routes/pageContent');

// Mount routes
app.use('/api/auth', auth0Routes); // Use Auth0 routes for /api/auth
app.use('/api/auth/legacy', authRoutes); // Keep legacy routes accessible at /api/auth/legacy
app.use('/api/forum', forumRoutes);
app.use('/api/employee-portal', employeePortalRoutes);
app.use('/api/page-content', pageContentRoutes);

// Basic routes
app.get('/', (req, res) => {
    res.json({ message: 'AydoCorp API is running' });
});

// Endpoint to serve the Auth0 configuration file
app.get('/auth_config.json', (req, res) => {
    res.sendFile(path.join(__dirname, '..', '..', 'auth_config.json'));
});

app.get('/api/test', (req, res) => {
    res.json({ message: 'API is working correctly' });
});

// Protected API endpoint that requires a valid access token
const { validateApiToken } = require('./middleware/auth0');
app.get('/api/external', validateApiToken, (req, res) => {
    res.json({
        msg: "Your access token was successfully validated!",
        user: req.auth
    });
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

// Error handler for JWT authentication errors
app.use((err, req, res, next) => {
    if (err.name === "UnauthorizedError") {
        return res.status(401).json({ msg: "Invalid token" });
    }

    // Generic error handler (catch-all for unhandled errors)
    console.error('Unhandled application error:', err);
    res.status(500).json({
        message: 'Server error',
        error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
    });
});

// Start server function
function startServer() {
    // Listen for HTTP connections
    const server = app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });

    // Add error handler for the server
    server.on('error', handleServerError(PORT, 'HTTP'));
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

// Initialize the scheduler for periodic data synchronization
try {
    scheduler.initialize();
    console.log('Automatic data synchronization scheduler started');
} catch (error) {
    console.error('Failed to initialize scheduler:', error);
    // Don't exit the process, as this is not a critical failure
}
