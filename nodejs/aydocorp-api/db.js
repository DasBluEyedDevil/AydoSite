const mongoose = require('mongoose');
require('dotenv').config();

// MongoDB connection options
const mongoOptions = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000, // Timeout after 5 seconds
    socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
    family: 4, // Use IPv4, skip trying IPv6
    maxPoolSize: 10, // Maintain up to 10 socket connections
    connectTimeoutMS: 10000, // Give up initial connection after 10 seconds
    retryWrites: true
};

// Maximum number of connection retries
const MAX_RETRIES = 3;

/**
 * Connect to MongoDB with retry mechanism
 * @param {number} retryCount - Current retry attempt (default: 0)
 * @returns {Promise} - Resolves when connected successfully
 */
const connectDB = async (retryCount = 0) => {
    try {
        await mongoose.connect(process.env.MONGODB_URI, mongoOptions);

        // Set up connection event listeners
        mongoose.connection.on('error', (err) => {
            console.error('MongoDB connection error:', err);
            // Don't exit process on runtime errors, attempt to recover
        });

        mongoose.connection.on('disconnected', () => {
            console.warn('MongoDB disconnected. Attempting to reconnect...');
        });

        mongoose.connection.on('reconnected', () => {
            console.log('MongoDB reconnected successfully');
        });

        console.log('MongoDB connected successfully');
    } catch (err) {
        console.error(`MongoDB connection error (attempt ${retryCount + 1}/${MAX_RETRIES + 1}):`, err.message);

        if (retryCount < MAX_RETRIES) {
            // Exponential backoff: 1s, 2s, 4s, etc.
            const retryDelay = Math.pow(2, retryCount) * 1000;
            console.log(`Retrying connection in ${retryDelay}ms...`);

            return new Promise(resolve => {
                setTimeout(() => {
                    resolve(connectDB(retryCount + 1));
                }, retryDelay);
            });
        } else {
            console.error('Maximum connection retry attempts reached. Exiting process.');
            process.exit(1);
        }
    }
};

module.exports = connectDB;
