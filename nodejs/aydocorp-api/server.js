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

// Initialize the Express app
const app = express();

// Middleware setup
app.use(cors({
    origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true
}));
app.use(helmet({
    contentSecurityPolicy: false // Disable CSP for simplicity, enable in production with proper config
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

// Configure logging
const logsDir = path.join(__dirname, 'logs');
// Ensure logs directory exists
try {
    if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, {recursive: true});
    }

    // Create access log stream
    const accessLogStream = fs.createWriteStream(
        path.join(logsDir, 'access.log'),
        {flags: 'a'}
    );

    // Setup morgan logging
    app.use(morgan('combined', {stream: accessLogStream}));
} catch (error) {
    console.warn('Could not set up file logging, falling back to console logging:', error.message);
    app.use(morgan('combined')); // Fallback to console logging
}

// Define routes
const authRoutes = require('./routes/auth');
const forumRoutes = require('./routes/forum');
const employeePortalRoutes = require('./routes/employeePortal');

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/forum', forumRoutes);
app.use('/api/employee-portal', employeePortalRoutes);

// Basic routes
app.get('/', (req, res) => {
    res.json({message: 'AydoCorp API is running'});
});

app.get('/api/test', (req, res) => {
    res.json({message: 'API is working correctly'});
});

// Add this alongside your other basic routes
app.get('/api/health-check', (req, res) => {
    res.json({
        status: 'ok',
        message: 'Server is running normally'
    });
});

// Add this alongside your other basic routes
app.post('/api/test-post', (req, res) => {
    res.json({
        message: 'POST request received successfully',
        receivedData: req.body
    });
});

// MongoDB connection with proper error handling
async function connectToMongoDB() {
    try {
        if (!process.env.MONGODB_URI) {
            throw new Error('MONGODB_URI environment variable is not defined');
        }

        // Recommended options for a persistent connection
        const connectionOptions = {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 5000, // Keep trying to connect for 5 seconds
            connectTimeoutMS: 10000,       // Give the initial connection attempt 10 seconds
            keepAlive: true,                 // Enable TCP keep-alives
            keepAliveInitialDelay: 300000    // Send the first keep-alive probe after 5 minutes of inactivity (300000 ms)
            // poolSize: 10 // Optional: Adjust based on expected concurrency, default is 10
        };

        await mongoose.connect(process.env.MONGODB_URI, connectionOptions);

        console.log('MongoDB connected successfully');

        // Optional: Add listeners for connection events for better monitoring
        mongoose.connection.on('disconnected', () => {
            console.warn('MongoDB disconnected!');
            // You might want to attempt reconnection here or log more details
        });

        mongoose.connection.on('error', (err) => {
            console.error('MongoDB connection error after initial connect:', err);
            // Handle errors that occur after the initial successful connection
        });

    } catch (error) {
        console.error('MongoDB initial connection error:', error.message);
        console.error('Detailed error:', error);
        process.exit(1);  // Exit with failure if initial connection fails
    }
}

// Generic error handler
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
        message: 'Server error',
        error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
    });
});

// Start server function
function startServer() {
    const PORT = process.env.PORT || 8080;

    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    }).on('error', handleServerError(PORT, 'HTTP'));
}

// Error handler for server startup
function handleServerError(port, serverType) {
    return (error) => {
        console.error(`${serverType} Server startup error:`, error);
        if (error.code === 'EADDRINUSE') {
            console.error(`Port ${port} is already in use. Is another instance running?`);
            console.error(`Try using a different port by setting ${serverType === 'HTTPS' ? 'HTTPS_PORT' : 'PORT'} in .env file or as an environment variable.`);
        }
    };
}

// Connect to MongoDB then start server
connectToMongoDB()
    .then(() => {
        startServer();
    })
    .catch(error => {
        console.error('Failed to start application:', error);
        process.exit(1);
    });
