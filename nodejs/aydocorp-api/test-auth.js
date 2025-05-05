const axios = require('axios');

// Replace with your actual JWT token
const token = 'your-jwt-token';

// Test with Authorization: Bearer header
async function testAuthorizationBearer() {
  try {
    const response = await axios.get('http://localhost:8080/api/employee-portal/employees', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    console.log('Authorization: Bearer header test successful');
    console.log('Response status:', response.status);
    console.log('Response data:', response.data);
  } catch (error) {
    console.error('Authorization: Bearer header test failed');
    console.error('Error status:', error.response?.status);
    console.error('Error message:', error.response?.data);
  }
}

// Test with x-auth-token header
async function testXAuthToken() {
  try {
    const response = await axios.get('http://localhost:8080/api/employee-portal/employees', {
      headers: {
        'x-auth-token': token
      }
    });
    console.log('x-auth-token header test successful');
    console.log('Response status:', response.status);
    console.log('Response data:', response.data);
  } catch (error) {
    console.error('x-auth-token header test failed');
    console.error('Error status:', error.response?.status);
    console.error('Error message:', error.response?.data);
  }
}

// Run tests
async function runTests() {
  console.log('Testing authentication with different header formats...');
  await testAuthorizationBearer();
  console.log('\n----------------------------\n');
  await testXAuthToken();
}

runTests();