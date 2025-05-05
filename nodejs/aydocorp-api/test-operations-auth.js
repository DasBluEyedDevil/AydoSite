const axios = require('axios');

// Replace these values with your actual credentials and server URL
const username = 'your-username';
const password = 'your-password';
const serverUrl = 'http://aydocorp.space'; // or 'http://localhost:8080' for local testing

// Function to get a JWT token by logging in
async function getToken() {
  try {
    console.log('Attempting to log in and get JWT token...');
    const response = await axios.post(`${serverUrl}/api/auth/login`, {
      username,
      password
    });
    
    if (response.data && response.data.token) {
      console.log('Successfully obtained JWT token');
      return response.data.token;
    } else {
      console.error('Login response did not include a token:', response.data);
      return null;
    }
  } catch (error) {
    console.error('Error logging in:', error.response ? error.response.data : error.message);
    return null;
  }
}

// Function to access the operations endpoint with authentication
async function getOperations(token) {
  if (!token) {
    console.error('No token provided, cannot access operations');
    return;
  }
  
  try {
    console.log('Accessing operations endpoint with authentication...');
    
    // Method 1: Using Authorization header with Bearer token (recommended)
    const response = await axios.get(`${serverUrl}/api/employee-portal/operations`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('Successfully accessed operations endpoint');
    console.log(`Found ${response.data.length} operations`);
    
    // Print the first operation as an example
    if (response.data.length > 0) {
      const firstOperation = response.data[0];
      console.log('\nExample operation:');
      console.log(`Title: ${firstOperation.title}`);
      console.log(`Description: ${firstOperation.description}`);
      console.log(`Category: ${firstOperation.category}`);
    }
    
    return response.data;
  } catch (error) {
    console.error('Error accessing operations:', error.response ? error.response.data : error.message);
    return null;
  }
}

// Alternative function using x-auth-token header
async function getOperationsAlt(token) {
  if (!token) {
    console.error('No token provided, cannot access operations');
    return;
  }
  
  try {
    console.log('\nAlternative method: Accessing operations endpoint with x-auth-token header...');
    
    // Method 2: Using x-auth-token header
    const response = await axios.get(`${serverUrl}/api/employee-portal/operations`, {
      headers: {
        'x-auth-token': token
      }
    });
    
    console.log('Successfully accessed operations endpoint using x-auth-token');
    console.log(`Found ${response.data.length} operations`);
    
    return response.data;
  } catch (error) {
    console.error('Error accessing operations:', error.response ? error.response.data : error.message);
    return null;
  }
}

// Function to demonstrate curl command equivalent
function showCurlExample(token) {
  if (!token) return;
  
  console.log('\nEquivalent curl commands:');
  console.log('\n1. Using Authorization header (recommended):');
  console.log(`curl -X GET ${serverUrl}/api/employee-portal/operations -H "Authorization: Bearer ${token}"`);
  
  console.log('\n2. Using x-auth-token header:');
  console.log(`curl -X GET ${serverUrl}/api/employee-portal/operations -H "x-auth-token: ${token}"`);
}

// Main function to run the example
async function main() {
  console.log('=== Operations API Authentication Example ===\n');
  
  // First get a token
  const token = await getToken();
  
  if (token) {
    // Try to access operations with the token
    await getOperations(token);
    
    // Show alternative method
    await getOperationsAlt(token);
    
    // Show curl examples
    showCurlExample(token);
  } else {
    console.error('\nFailed to obtain authentication token. Please check your credentials.');
  }
}

// Run the example
main().catch(error => {
  console.error('Unhandled error:', error);
});