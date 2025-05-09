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

// Initialize the Express app
const app = express();

// Middleware setup
app.use(cors({
    origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['https://aydocorp.space', 'http://localhost:8080', 'http://127.0.0.1:8080'],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'x-auth-token']
}));
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

// Define routes
const authRoutes = require('./routes/auth');
const forumRoutes = require('./routes/forum');
const employeePortalRoutes = require('./routes/employeePortal');
const pageContentRoutes = require('./routes/pageContent');

// Mount routes
app.use('/api/auth', authRoutes);
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

// Add this alongside your other basic routes
app.get('/api/health-check', (req, res) => {
    res.json({
        status: 'ok',
        message: 'Server is running normally'
    });
});

// Debug route to check auth headers
app.get('/api/auth-debug', (req, res) => {
    const token = req.header('x-auth-token') || (req.header('Authorization') ? req.header('Authorization').replace('Bearer ', '') : null);
    res.json({
        hasToken: !!token,
        tokenPreview: token ? `${token.substring(0, 10)}...` : null,
        headers: {
            authorization: req.header('Authorization'),
            xAuthToken: req.header('x-auth-token')
        }
    });
});

// Add this alongside your other basic routes
app.post('/api/test-post', (req, res) => {
    res.json({
        message: 'POST request received successfully',
        receivedData: req.body
    });
});

// Special routes to handle requests without the slash between portal and the resource
// Redirect to the correct endpoints with a slash
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

// Add debug middleware to log all requests
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
    console.log('Headers:', req.headers);
    next();
});

// Catch-all route for undefined API routes (moved to the end)
app.all('/api/*', (req, res) => {
    console.log('Catch-all route hit for:', req.originalUrl, req.method);
    console.log('Request headers:', req.headers);
    res.status(404).json({
        message: 'API endpoint not found',
        path: req.originalUrl,
        method: req.method
    });
});

// MongoDB connection with proper error handling AND keep-alive options
async function connectToMongoDB() {
    try {
        if (!process.env.MONGODB_URI) {
            // Diagnostic log: Indicate if URI is missing
            console.error('MONGODB_URI environment variable is NOT defined! Check hosting panel settings or .env file.');
            throw new Error('MONGODB_URI environment variable is not defined');
        }

        // Diagnostic log: Show that the connection process is starting and part of the URI
        console.log('Attempting to connect to MongoDB with URI (first 20 chars):', process.env.MONGODB_URI.substring(0, 20) + '...');


        // Recommended options for a persistent connection
        const connectionOptions = {
            serverSelectionTimeoutMS: 5000, // Keep trying to connect for 5 seconds
            connectTimeoutMS: 10000,       // Give the initial connection attempt 10 seconds
            socketTimeoutMS: 45000,        // Close sockets after 45 seconds of inactivity
            family: 4,                     // Use IPv4, skip trying IPv6
            maxPoolSize: 10,               // Maximum number of connections in the pool
            minPoolSize: 5,                // Minimum number of connections in the pool
            maxIdleTimeMS: 60000,          // Close idle connections after 60 seconds
            heartbeatFrequencyMS: 10000    // Check server status every 10 seconds
        };

        await mongoose.connect(process.env.MONGODB_URI, connectionOptions);

        // Success log message (updated for clarity)
        console.log('MongoDB connected successfully');

        // Add listeners for connection events for better monitoring
        mongoose.connection.on('disconnected', () => {
            console.warn('MongoDB disconnected! Attempting to reconnect...');
            // Implement reconnection logic
            setTimeout(async () => {
                try {
                    await mongoose.connect(process.env.MONGODB_URI, connectionOptions);
                    console.log('MongoDB reconnected successfully');
                } catch (error) {
                    console.error('Failed to reconnect to MongoDB:', error.message);
                }
            }, 5000); // Try to reconnect after 5 seconds
        });

        mongoose.connection.on('error', (err) => {
            console.error('MongoDB connection error:', err);
            // Log additional diagnostic information
            console.error('Connection state:', mongoose.connection.readyState);
            console.error('Connection options:', connectionOptions);
        });

        // Add listener for successful reconnection
        mongoose.connection.on('reconnected', () => {
            console.log('MongoDB reconnected successfully');
        });

        // Add listener for connection close
        mongoose.connection.on('close', () => {
            console.log('MongoDB connection closed');
        });

    } catch (error) {
        // Log specific error details for initial connection failure
        console.error('MongoDB initial connection error:', error.message);
        console.error('Detailed error:', error);
        // Exit with failure if initial connection fails - crucial for dependent apps
        process.exit(1);
    }
}

// Generic error handler (catch-all for unhandled errors)
app.use((err, req, res, next) => {
    console.error('Unhandled application error:', err); // Log the error details
    res.status(500).json({
        message: 'Server error',
        // Only expose detailed error message in non-production environments
        error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
    });
});


// Start server function
function startServer() {
    const PORT = process.env.PORT || 8080;

    // Listen for HTTP connections
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    }).on('error', handleServerError(PORT, 'HTTP'));

    // Note: Your code also had logic for an HTTPS server that was failing due to missing certs.
    // I've kept the HTTP server startup as the primary listen for simplicity based on your working case.
    // If you intend to use HTTPS, you'll need to resolve the certificate file paths.
    // Example (commented out):
    /*
    const HTTPS_PORT = process.env.HTTPS_PORT || 8443;
    const httpsOptions = {
        key: fs.readFileSync('/path/to/your/privkey.pem'), // !! Update this path !!
        cert: fs.readFileSync('/path/to/your/cert.pem')   // !! Update this path !!
    };
    https.createServer(httpsOptions, app).listen(HTTPS_PORT, () => {
        console.log(`HTTPS Server running on port ${HTTPS_PORT}`);
    }).on('error', handleServerError(HTTPS_PORT, 'HTTPS'));
    */
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
connectToMongoDB()
    .then(() => {
        // Only start the HTTP server if the database connection is successful
        startServer();

        // Initialize the scheduler for periodic data synchronization
        scheduler.initialize();
        console.log('Automatic data synchronization scheduler started');
    })
    .catch(error => {
        // This catch handles errors from connectToMongoDB's initial connection
        console.error('Failed to start application due to MongoDB connection error:', error);
        process.exit(1); // Exit if DB connection failed at startup
    });
