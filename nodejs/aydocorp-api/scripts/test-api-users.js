// scripts/test-api-users.js
require('dotenv').config();
const http = require('http');

function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        res.body = data;
        resolve(res);
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (postData) {
      req.write(postData);
    }

    req.end();
  });
}

async function testApiUsers() {
  try {
    console.log('Testing /api/auth/users endpoint...');

    // Create a test admin user first if needed
    // This step is optional if you already have an admin user

    // Get a token by logging in
    console.log('Getting authentication token...');

    const loginData = JSON.stringify({
      username: 'admin', // Replace with an actual admin username
      password: 'admin123' // Replace with the actual password
    });

    const loginOptions = {
      hostname: 'localhost',
      port: 8080,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(loginData)
      }
    };

    const loginResponse = await makeRequest(loginOptions, loginData);

    if (loginResponse.statusCode !== 200) {
      console.error('Login failed:', loginResponse.body);
      process.exit(1);
    }

    const loginResult = JSON.parse(loginResponse.body);
    const token = loginResult.token;
    console.log('Got token:', token.substring(0, 10) + '...');

    // Test the /api/auth/users endpoint
    console.log('Testing /api/auth/users endpoint...');

    const usersOptions = {
      hostname: 'localhost',
      port: 8080,
      path: '/api/auth/users',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'x-auth-token': token
      }
    };

    const usersResponse = await makeRequest(usersOptions);

    console.log('Response status:', usersResponse.statusCode);
    console.log('Response headers:', usersResponse.headers);

    if (usersResponse.statusCode !== 200) {
      console.error('API request failed:', usersResponse.body);
      process.exit(1);
    }

    const users = JSON.parse(usersResponse.body);
    console.log(`Found ${users.length} users via API:`);
    console.log('------------------------------------');

    // Display user information
    users.forEach((user, index) => {
      console.log(`User ${index + 1}:`);
      console.log(`  ID: ${user._id}`);
      console.log(`  Username: ${user.username}`);
      console.log(`  Email: ${user.email}`);
      console.log(`  Role: ${user.role}`);
      console.log(`  Created: ${user.createdAt}`);
      console.log('------------------------------------');
    });

    console.log('API test completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

testApiUsers();
