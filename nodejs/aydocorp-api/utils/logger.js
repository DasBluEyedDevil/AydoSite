// utils/logger.js
const fs = require('fs');
const path = require('path');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '..', 'logs');
let logsAccessible = true;

try {
    if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
    }

    // Test write access
    fs.accessSync(logsDir, fs.constants.W_OK);
} catch (err) {
    console.error(`Cannot access logs directory: ${err.message}`);
    logsAccessible = false;
}

// Create log file paths
const errorLogPath = logsAccessible ? path.join(logsDir, 'error.log') : null;
const combinedLogPath = logsAccessible ? path.join(logsDir, 'combined.log') : null;

/**
 * Log an error with context
 * @param {Error} err - The error object
 * @param {string} context - The context where the error occurred
 * @param {Object} additionalInfo - Any additional information to log
 */
function logError(err, context, additionalInfo = {}) {
    const timestamp = new Date().toISOString();
    const errorObj = {
        timestamp,
        context,
        message: err.message,
        stack: err.stack,
        ...additionalInfo
    };

    const logEntry = JSON.stringify(errorObj) + '\n';

    // Log to console in development
    if (process.env.NODE_ENV !== 'production') {
        console.error(`[${timestamp}] [${context}] Error:`, err.message);
        console.error(err.stack);
        if (Object.keys(additionalInfo).length > 0) {
            console.error('Additional Info:', additionalInfo);
        }
    }

    // Always log to file if logs are accessible
    if (errorLogPath) {
        fs.appendFile(errorLogPath, logEntry, (writeErr) => {
            if (writeErr) {
                console.error('Failed to write to error log:', writeErr);
            }
        });
    } else {
        // Always log to console if logs are not accessible
        console.error(`[${timestamp}] [${context}] Error (not logged to file):`, err.message);
    }
}

/**
 * Log an info message
 * @param {string} message - The message to log
 * @param {string} context - The context where the message was logged
 * @param {Object} additionalInfo - Any additional information to log
 */
function logInfo(message, context, additionalInfo = {}) {
    const timestamp = new Date().toISOString();
    const infoObj = {
        timestamp,
        level: 'info',
        context,
        message,
        ...additionalInfo
    };

    const logEntry = JSON.stringify(infoObj) + '\n';

    // Log to console in development
    if (process.env.NODE_ENV !== 'production') {
        console.log(`[${timestamp}] [${context}] Info:`, message);
        if (Object.keys(additionalInfo).length > 0) {
            console.log('Additional Info:', additionalInfo);
        }
    }

    // Always log to file if logs are accessible
    if (combinedLogPath) {
        fs.appendFile(combinedLogPath, logEntry, (writeErr) => {
            if (writeErr) {
                console.error('Failed to write to combined log:', writeErr);
            }
        });
    } else {
        // Always log to console if logs are not accessible
        console.log(`[${timestamp}] [${context}] Info (not logged to file):`, message);
    }
}

module.exports = {
    logError,
    logInfo
};
