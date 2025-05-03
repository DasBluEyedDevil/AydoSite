// test-api.js
const axios = require('axios');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Base URL for API requests
const baseURL = `http://localhost:${process.env.PORT || 8080}`;

// Function to test API endpoints
async function testAPI() {
    try {
        console.log('Testing API endpoints...');
        
        // Test the root endpoint
        console.log('\nTesting root endpoint:');
        try {
            const rootResponse = await axios.get(baseURL);
            console.log('Root endpoint response:', rootResponse.status, rootResponse.data);
        } catch (error) {
            console.error('Error testing root endpoint:', error.response ? error.response.status : error.message);
            if (error.response) {
                console.error('Response data:', error.response.data);
            }
        }
        
        // Test the API test endpoint
        console.log('\nTesting /api/test endpoint:');
        try {
            const testResponse = await axios.get(`${baseURL}/api/test`);
            console.log('API test endpoint response:', testResponse.status, testResponse.data);
        } catch (error) {
            console.error('Error testing /api/test endpoint:', error.response ? error.response.status : error.message);
            if (error.response) {
                console.error('Response data:', error.response.data);
            }
        }
        
        // Test the auth routes
        console.log('\nTesting auth routes:');
        try {
            const authResponse = await axios.get(`${baseURL}/api/auth`);
            console.log('Auth routes response:', authResponse.status, authResponse.data);
        } catch (error) {
            console.error('Error testing auth routes:', error.response ? error.response.status : error.message);
            if (error.response) {
                console.error('Response data:', error.response.data);
            }
        }
        
        // Test the forum routes
        console.log('\nTesting forum routes:');
        try {
            const forumResponse = await axios.get(`${baseURL}/api/forum`);
            console.log('Forum routes response:', forumResponse.status, forumResponse.data);
        } catch (error) {
            console.error('Error testing forum routes:', error.response ? error.response.status : error.message);
            if (error.response) {
                console.error('Response data:', error.response.data);
            }
        }
        
        // Test registration with invalid data to see error handling
        console.log('\nTesting registration with invalid data:');
        try {
            const registerResponse = await axios.post(`${baseURL}/api/auth/register`, {
                // Missing required fields
            });
            console.log('Register response:', registerResponse.status, registerResponse.data);
        } catch (error) {
            console.error('Error testing registration:', error.response ? error.response.status : error.message);
            if (error.response) {
                console.error('Response data:', error.response.data);
            }
        }
        
        console.log('\nAPI testing completed.');
    } catch (error) {
        console.error('Unexpected error during API testing:', error.message);
    }
}

// Run the tests
testAPI();