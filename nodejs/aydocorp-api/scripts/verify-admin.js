// scripts/verify-admin.js
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

// Admin user details
const adminUsername = 'Devil';

async function verifyAdmin() {
  try {
    console.log('Connecting to MongoDB...');
    
    if (!process.env.MONGODB_URI) {
      console.error('MONGODB_URI environment variable is not defined!');
      process.exit(1);
    }

    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log('Connected to MongoDB successfully');

    // Check if user exists and is an admin
    const user = await User.findOne({ username: adminUsername });

    if (user) {
      console.log(`User '${adminUsername}' exists with the following details:`);
      console.log(`- Username: ${user.username}`);
      console.log(`- Email: ${user.email}`);
      console.log(`- Role: ${user.role}`);
      console.log(`- Created At: ${user.createdAt}`);
      
      if (user.role === 'admin') {
        console.log(`✅ User '${adminUsername}' is confirmed to have admin role.`);
      } else {
        console.log(`❌ User '${adminUsername}' does NOT have admin role. Current role: ${user.role}`);
      }
    } else {
      console.log(`❌ User '${adminUsername}' does not exist in the database.`);
    }

    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

verifyAdmin();