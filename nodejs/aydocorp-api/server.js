const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const fs = require('fs');
const http = require('http');
const https = require('https');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

// Load environment variables
dotenv.config();

// Initialize express app
const app = express();

// Add security headers
app.use(helmet());

// Use morgan for logging in development
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
} else {
  // In production, only log errors
  app.use(morgan('combined', {
    skip: (req, res) => res.statusCode < 400
  }));
}

// Enhanced CORS configuration
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : 
          (process.env.NODE_ENV === 'production' ? [] : '*'),
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-auth-token'],
  credentials: true
}));

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again after 15 minutes'
});
app.use('/api/', apiLimiter);

app.use(express.json());
// Serve static files from a dedicated public directory, not parent directory
app.use(express.static('./public'));

// Debug endpoint for connectivity testing
app.get('/api/test', (req, res) => {
  res.json({
    message: 'API connection successful',
    time: new Date().toISOString(),
    origin: req.headers.origin || 'unknown origin',
    host: req.headers.host
  });
});

// Basic route for testing
app.get('/', (req, res) => {
  res.send('AydoCorp API is running');
});

const PORT = process.env.PORT || 8080;
const HTTPS_PORT = process.env.HTTPS_PORT || 8443;
let httpServer, httpsServer;

// Connect to MongoDB first, then set up routes and start server
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    
    // Only set up routes after successful database connection
    app.use('/api/auth', require('./routes/auth'));
    app.use('/api/forum', require('./routes/forum'));
    
    // Error handling middleware - must be last
    app.use((err, req, res, next) => {
      console.error('Server error:', err);
      res.status(500).json({
        message: 'Server error occurred',
        error: process.env.NODE_ENV === 'production' ? {} : err.message
      });
    });

    // Start HTTP server
    httpServer = http.createServer(app);
    httpServer.listen(PORT, '0.0.0.0', () => {
      console.log(`HTTP Server running on port ${PORT}`);
    });

    // Error handling for HTTP server
    httpServer.on('error', handleServerError(PORT, 'HTTP'));

    // Start HTTPS server if certificates are available
    try {
      // Try to load SSL certificates from environment variables
      const privateKey = fs.readFileSync(process.env.SSL_KEY_PATH || '/path/to/your/privkey.pem', 'utf8');
      const certificate = fs.readFileSync(process.env.SSL_CERT_PATH || '/path/to/your/cert.pem', 'utf8');
      const ca = fs.readFileSync(process.env.SSL_CA_PATH || '/path/to/your/chain.pem', 'utf8');

      const credentials = {
        key: privateKey,
        cert: certificate,
        ca: ca
      };

      httpsServer = https.createServer(credentials, app);
      httpsServer.listen(HTTPS_PORT, '0.0.0.0', () => {
        console.log(`HTTPS Server running on port ${HTTPS_PORT}`);
      });

      // Error handling for HTTPS server
      httpsServer.on('error', handleServerError(HTTPS_PORT, 'HTTPS'));
    } catch (error) {
      console.log('SSL certificates not found or invalid:', error.message);
      console.log('HTTPS server not started.');
    }
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1); // Exit if cannot connect to database
  });

// Function to handle server errors
function handleServerError(port, serverType) {
  return (error) => {
    console.error(`${serverType} Server startup error:`, error);
    if (error.code === 'EADDRINUSE') {
      console.error(`Port ${port} is already in use. Is another instance running?`);
      console.error(`Try using a different port by setting ${serverType === 'HTTPS' ? 'HTTPS_PORT' : 'PORT'} in .env file or as an environment variable.`);
    }
  };
}

// Graceful shutdown
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

function gracefulShutdown() {
  console.log('Received shutdown signal, closing servers and database connections...');
  
  // Close HTTP server if it exists
  if (httpServer) {
    httpServer.close(() => {
      console.log('HTTP server closed');
    });
  }
  
  // Close HTTPS server if it exists
  if (httpsServer) {
    httpsServer.close(() => {
      console.log('HTTPS server closed');
    });
  }
  
  // Close database connection
  mongoose.connection.close(false)
    .then(() => {
      console.log('MongoDB connection closed');
      process.exit(0);
    })
    .catch(err => {
      console.error('Error during MongoDB connection close:', err);
      process.exit(1);
    });
    
  // Force close if graceful shutdown takes too long
  setTimeout(() => {
    console.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
}