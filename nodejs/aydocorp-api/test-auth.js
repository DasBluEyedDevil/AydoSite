const axios = require('axios');

// Login credentials
const credentials = {
  username: 'Devil',
  password: 'noob1'
};

// Get token from login endpoint
async function getToken() {
  try {
    const response = await axios.post('http://localhost:8080/api/auth/login', credentials);
    return response.data.token;
  } catch (error) {
    console.error('Login failed:', error.response?.data);
    throw error;
  }
}

// Test with Authorization: Bearer header
async function testAuthorizationBearer(token) {
  try {
    const response = await axios.get('http://localhost:8080/api/auth/users', {
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
async function testXAuthToken(token) {
  try {
    const response = await axios.get('http://localhost:8080/api/auth/users', {
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
  try {
    console.log('Getting token from login endpoint...');
    const token = await getToken();
    console.log('Token obtained successfully');
    
    console.log('\nTesting authentication with different header formats...');
    await testAuthorizationBearer(token);
    console.log('\n----------------------------\n');
    await testXAuthToken(token);
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

runTests();