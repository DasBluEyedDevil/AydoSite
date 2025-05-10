const axios = require('axios');

// Replace with your actual server URL
const serverUrl = 'http://localhost:3001';

// Test the redirects
async function testRedirects() {
  console.log('Testing API endpoint redirects...');
  
  // Test endpoints with and without slash
  const endpoints = [
    '/api/employee-portal/operations',
    '/api/employee-portal-operations',
    '/api/employee-portal/employees',
    '/api/employee-portal-employees',
    '/api/employee-portal/career-paths',
    '/api/employee-portal-career-paths',
    '/api/employee-portal/events',
    '/api/employee-portal-events'
  ];
  
  // Get a token for authentication
  let token;
  try {
    const loginResponse = await axios.post(`${serverUrl}/api/auth/login`, {
      username: 'your-username',
      password: 'your-password'
    });
    token = loginResponse.data.token;
    console.log('Successfully obtained authentication token');
  } catch (error) {
    console.error('Failed to obtain authentication token:', error.message);
    console.log('Continuing tests without authentication (will expect 401 errors)');
  }
  
  // Test each endpoint
  for (const endpoint of endpoints) {
    try {
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      const response = await axios.get(`${serverUrl}${endpoint}`, { headers });
      console.log(`✅ ${endpoint}: Success (${response.status})`);
    } catch (error) {
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        if (error.response.status === 401) {
          console.log(`⚠️ ${endpoint}: Authentication required (401) - This is expected if no valid token`);
        } else {
          console.error(`❌ ${endpoint}: Failed with status ${error.response.status}`);
          console.error(`   Error message: ${error.response.data.message || 'No error message'}`);
        }
      } else if (error.request) {
        // The request was made but no response was received
        console.error(`❌ ${endpoint}: No response received`);
      } else {
        // Something happened in setting up the request that triggered an Error
        console.error(`❌ ${endpoint}: Error setting up request: ${error.message}`);
      }
    }
  }
  
  console.log('\nTest completed. If you see "Success" or "Authentication required" for all endpoints, the redirects are working correctly.');
}

testRedirects();