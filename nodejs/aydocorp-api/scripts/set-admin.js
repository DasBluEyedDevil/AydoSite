// scripts/set-admin.js
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

// Admin user details
const adminUsername = 'Devil';

async function setAdmin() {
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

    // Check if user already exists
    let user = await User.findOne({ username: adminUsername });

    if (user) {
      console.log(`User '${adminUsername}' already exists.`);

      // Check if user is already an admin
      if (user.role === 'admin') {
        console.log(`User '${adminUsername}' is already an admin.`);
      } else {
        // Update user role to admin
        await User.updateOne({ _id: user._id }, { $set: { role: 'admin' } });
        console.log(`User '${adminUsername}' has been updated to admin role.`);
      }
    } else {
      console.log(`User '${adminUsername}' does not exist. Please create this user first through the registration process.`);
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

setAdmin();
