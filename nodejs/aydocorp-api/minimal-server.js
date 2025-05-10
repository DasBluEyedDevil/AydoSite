// minimal-server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const bodyParser = require('body-parser');

// Initialize the Express app
const app = express();

// Middleware setup
app.use(cors({
    origin: ['https://aydocorp.space', 'http://localhost:3001', 'http://127.0.0.1:3001'],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'x-auth-token']
}));
app.use(helmet({
    contentSecurityPolicy: false
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Basic routes only
app.get('/', (req, res) => {
    res.json({ message: 'AydoCorp API is running (minimal mode)' });
});

app.get('/api/test', (req, res) => {
    res.json({ message: 'API is working correctly' });
});

app.get('/api/health-check', (req, res) => {
    res.json({
        status: 'ok',
        message: 'Server is running in minimal mode'
    });
});

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Minimal server running on port ${PORT}`);
    console.log('Running in fallback minimal mode - API functionality will be limited');
}); 