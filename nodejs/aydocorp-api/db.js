const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://dasblueeyeddevil:x8R4iMKUzcbGfBBb@aydo.famnahg.mongodb.net/?retryWrites=true&w=majority&appName=Aydo');
        console.log('MongoDB connected successfully');
    } catch (err) {
        console.error('MongoDB connection error:', err.message);
        process.exit(1);
    }
};

module.exports = connectDB; 