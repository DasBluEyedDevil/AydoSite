const axios = require('axios');

async function testLogin() {
  try {
    console.log('Testing login with Devil user...');
    const response = await axios.post('http://localhost:3001/api/auth/login', {
      username: 'Devil',
      password: 'password123'
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    console.log('Login successful!');
    console.log('Response status:', response.status);
    console.log('Response data:', response.data);
    
    // If login successful, test getting users
    if (response.data.token) {
      console.log('\nTesting get users with token...');
      const usersResponse = await axios.get('http://localhost:3001/api/auth/users', {
        headers: {
          'Authorization': `Bearer ${response.data.token}`
        }
      });
      console.log('Get users successful!');
      console.log('Response status:', usersResponse.status);
      console.log('Response data:', usersResponse.data);
    }
  } catch (error) {
    console.error('Test failed!');
    console.error('Error status:', error.response?.status);
    console.error('Error message:', error.response?.data);
    if (error.response?.data?.error) {
      console.error('Detailed error:', error.response.data.error);
    }
  }
}

testLogin(); 