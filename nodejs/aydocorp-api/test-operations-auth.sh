#!/bin/bash

# API Authentication Test Script
# This script demonstrates how to authenticate and access the operations endpoint

# Replace these values with your actual credentials
USERNAME="your-username"
PASSWORD="your-password"
SERVER_URL="http://aydocorp.space"

echo "=== API Authentication Test Script ==="
echo ""
echo "Step 1: Obtaining a JWT token by logging in"
echo "----------------------------------------"

# Login and get token
LOGIN_RESPONSE=$(curl -s -X POST "${SERVER_URL}/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"${USERNAME}\",\"password\":\"${PASSWORD}\"}")

# Extract token from response using grep and cut (basic parsing)
TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "Failed to obtain token. Login response:"
  echo $LOGIN_RESPONSE
  exit 1
fi

echo "Successfully obtained JWT token"
echo "Token: ${TOKEN:0:10}... (truncated for security)"
echo ""

echo "Step 2: Accessing operations endpoint with Authorization header"
echo "------------------------------------------------------------"
echo "curl -X GET \"${SERVER_URL}/api/employee-portal/operations\" -H \"Authorization: Bearer ${TOKEN}\""
echo ""

OPERATIONS_RESPONSE=$(curl -s -X GET "${SERVER_URL}/api/employee-portal/operations" \
  -H "Authorization: Bearer ${TOKEN}")

# Check if the response contains an error message
if echo "$OPERATIONS_RESPONSE" | grep -q "error\|denied\|unauthorized"; then
  echo "Error accessing operations endpoint:"
  echo $OPERATIONS_RESPONSE
else
  echo "Successfully accessed operations endpoint!"
  echo "Response preview (first 100 characters):"
  echo "${OPERATIONS_RESPONSE:0:100}..."
fi

echo ""
echo "Step 3: Alternative - Accessing operations endpoint with x-auth-token header"
echo "------------------------------------------------------------------------"
echo "curl -X GET \"${SERVER_URL}/api/employee-portal/operations\" -H \"x-auth-token: ${TOKEN}\""
echo ""

ALT_RESPONSE=$(curl -s -X GET "${SERVER_URL}/api/employee-portal/operations" \
  -H "x-auth-token: ${TOKEN}")

# Check if the response contains an error message
if echo "$ALT_RESPONSE" | grep -q "error\|denied\|unauthorized"; then
  echo "Error accessing operations endpoint with x-auth-token:"
  echo $ALT_RESPONSE
else
  echo "Successfully accessed operations endpoint with x-auth-token!"
  echo "Response preview (first 100 characters):"
  echo "${ALT_RESPONSE:0:100}..."
fi

echo ""
echo "=== Test Complete ==="
echo "If you see 'Successfully accessed operations endpoint' messages, authentication is working correctly."
echo "If you see errors, please check your credentials and server status."