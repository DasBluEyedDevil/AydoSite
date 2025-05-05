# API Authentication Guide

## Issue: "No token, authorization denied"

If you're seeing the error message `{"message":"No token, authorization denied"}` when trying to access API endpoints like `/api/employee-portal/operations`, this means you're trying to access a protected endpoint without providing the necessary authentication token.

## Solution

All employee portal endpoints require authentication. You need to include a valid JWT token in your requests.

### How to Authenticate API Requests

1. **First, obtain a JWT token by logging in**:
   ```
   curl -X POST http://aydocorp.space/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"username":"your-username","password":"your-password"}'
   ```

   This will return a response containing a token:
   ```json
   {
     "token": "your-jwt-token",
     "user": {
       "id": "user-id",
       "username": "your-username",
       "email": "your-email"
     }
   }
   ```

2. **Then use the token in subsequent requests** using one of these methods:

   a. Using the Authorization header with Bearer token (recommended):
   ```
   curl -X GET http://aydocorp.space/api/employee-portal/operations \
     -H "Authorization: Bearer your-jwt-token"
   ```

   b. Using the x-auth-token header:
   ```
   curl -X GET http://aydocorp.space/api/employee-portal/operations \
     -H "x-auth-token: your-jwt-token"
   ```

## Test Scripts

We've provided several test scripts that demonstrate how to authenticate and access the operations endpoint:

### Node.js Script

The `test-operations-auth.js` script is a Node.js example:

1. Edit the script to add your actual username and password
2. Install axios if you haven't already: `npm install axios`
3. Run the script: `node test-operations-auth.js`

### Bash Script (Linux/Mac)

The `test-operations-auth.sh` script is a bash shell example:

1. Edit the script to add your actual username and password
2. Make it executable: `chmod +x test-operations-auth.sh`
3. Run the script: `./test-operations-auth.sh`

### Windows Batch Script

The `test-operations-auth.bat` script is a Windows batch file example:

1. Edit the script to add your actual username and password
2. Run the script by double-clicking it or from the command prompt

All scripts will:
- Log in and obtain a JWT token
- Access the operations endpoint using both authentication methods
- Show equivalent curl commands that you can use directly

## Common Issues

1. **Invalid credentials**: Make sure your username and password are correct
2. **Expired token**: JWT tokens expire after 7 days. If your token is expired, you need to log in again to get a new one
3. **Incorrect token format**: When using the Bearer token format, make sure to include the word "Bearer" followed by a space before the token
4. **Server issues**: If the server is down or experiencing issues, authentication may fail

## More Information

For more details on the API and authentication, please refer to the [Google Integration Guide](./GOOGLE_INTEGRATION_GUIDE.md#authentication) which includes a comprehensive section on authentication.
