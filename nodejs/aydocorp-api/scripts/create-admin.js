// scripts/create-admin.js
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('../models/User');

// Admin user details
const adminUsername = 'Devil';
const adminEmail = 'admin@example.com'; // Replace with actual email if known
const adminPassword = 'adminpassword123'; // Replace with a secure password

async function createAdmin() {
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
        user.role = 'admin';
        await user.save();
        console.log(`User '${adminUsername}' has been updated to admin role.`);
      }
    } else {
      // Create new admin user
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(adminPassword, salt);

      user = new User({
        username: adminUsername,
        email: adminEmail,
        password: hashedPassword,
        role: 'admin'
      });

      await user.save();
      console.log(`Admin user '${adminUsername}' has been created successfully.`);
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

createAdmin();