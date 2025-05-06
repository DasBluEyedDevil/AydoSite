// scripts/set-user-admin.js
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

// Get username from command line arguments
const username = process.argv[2];

async function setUserAdmin() {
  try {
    // Check if username was provided
    if (!username) {
      console.error('Error: No username provided.');
      console.log('Usage: node scripts/set-user-admin.js <username>');
      process.exit(1);
    }

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

    // Check if user already exists
    let user = await User.findOne({ username: username });

    if (user) {
      console.log(`User '${username}' found.`);
      
      // Check if user is already an admin
      if (user.role === 'admin') {
        console.log(`User '${username}' is already an admin.`);
      } else {
        // Update user role to admin
        await User.updateOne({ _id: user._id }, { $set: { role: 'admin' } });
        console.log(`User '${username}' has been updated to admin role.`);
      }
    } else {
      console.log(`User '${username}' does not exist. Please create this user first through the registration process.`);
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

setUserAdmin();