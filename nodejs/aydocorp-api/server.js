const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const fs = require('fs');
const http = require('http');
const https = require('https');

// Load environment variables
dotenv.config();

// Initialize express app
const app = express();

// Debug middleware - place this first to log all incoming requests
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - Origin: ${req.headers.origin || 'none'}`);
    next();
});

// Enhanced CORS configuration
app.use(cors({
  origin: '*',  // This allows any domain to access your API (be careful with this in production)
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-auth-token'],
  credentials: true
}));

app.use(express.json());
app.use(express.static('../'));  // Serve static files from parent directory

// Debug endpoint for connectivity testing
app.get('/api/test', (req, res) => {
  console.log('Test endpoint hit!');
  res.json({
    message: 'API connection successful',
    time: new Date().toISOString(),
    origin: req.headers.origin || 'unknown origin',
    host: req.headers.host
  });
});

// Basic route for testing
app.get('/', (req, res) => {
    console.log('Root endpoint hit!');
    res.send('AydoCorp API is running');
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/forum', require('./routes/forum'));

// Connect to MongoDB - Move this after routes to ensure it doesn't block request handling
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

// Error handling middleware - must be last
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({
        message: 'Server error occurred',
        error: process.env.NODE_ENV === 'production' ? {} : err.message
    });
});

const PORT = process.env.PORT || 8080;
const HTTPS_PORT = process.env.HTTPS_PORT || 8443;

// Start HTTP server - the 0.0.0.0 means "listen on all network interfaces"
const httpServer = http.createServer(app);
httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`HTTP Server running on port ${PORT} (0.0.0.0 means all interfaces)`);
    console.log(`Server accessible at:`);
    console.log(`- Locally: http://localhost:${PORT}`);
    console.log(`- From outside: http://YOUR_SERVER_IP:${PORT}`);
});

// For HTTPS server
try {
    // Try to load SSL certificates
    const privateKey = fs.readFileSync('/path/to/your/privkey.pem', 'utf8');
    const certificate = fs.readFileSync('/path/to/your/cert.pem', 'utf8');
    const ca = fs.readFileSync('/path/to/your/chain.pem', 'utf8');

    const credentials = {
        key: privateKey,
        cert: certificate,
        ca: ca
    };

    const httpsServer = https.createServer(credentials, app);
    httpsServer.listen(HTTPS_PORT, '0.0.0.0', () => {
        console.log(`HTTPS Server running on port ${HTTPS_PORT} (0.0.0.0 means all interfaces)`);
    });
} catch (error) {
    console.log('SSL certificates not found or invalid:', error.message);
    console.log('HTTPS server not started.');
}

// Improved error handling
httpServer.on('error', (error) => {
    console.error('Server startup error:', error);
    if (error.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use. Is another instance running?`);
        console.error(`Try using a different port by setting PORT in .env file or as an environment variable.`);
    }
});