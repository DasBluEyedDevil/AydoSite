@echo off
setlocal enabledelayedexpansion

:: API Authentication Test Script for Windows
:: This script demonstrates how to authenticate and access the operations endpoint

:: Replace these values with your actual credentials
set USERNAME=your-username
set PASSWORD=your-password
set SERVER_URL=http://aydocorp.space

echo === API Authentication Test Script ===
echo.
echo Step 1: Obtaining a JWT token by logging in
echo ----------------------------------------

:: Create a temporary file for the login request
echo {"username":"%USERNAME%","password":"%PASSWORD%"} > login_data.json

:: Login and get token
echo Sending login request to %SERVER_URL%/api/auth/login...
curl -s -X POST "%SERVER_URL%/api/auth/login" ^
  -H "Content-Type: application/json" ^
  -d @login_data.json > login_response.json

:: Check if curl command succeeded
if %ERRORLEVEL% neq 0 (
  echo Failed to execute curl command. Make sure curl is installed and in your PATH.
  goto cleanup
)

:: Display the response for debugging
type login_response.json

:: Extract token from response using findstr (Windows equivalent of grep)
:: This is a simplified extraction and might not work for all JSON responses
for /f "tokens=2 delims=:," %%a in ('findstr "token" login_response.json') do (
  set TOKEN=%%a
  :: Remove quotes and whitespace
  set TOKEN=!TOKEN:"=!
  set TOKEN=!TOKEN: =!
)

if not defined TOKEN (
  echo Failed to obtain token. See login_response.json for details.
  goto cleanup
)

echo Successfully obtained JWT token
echo Token: !TOKEN:~0,10!... (truncated for security)
echo.

echo Step 2: Accessing operations endpoint with Authorization header
echo ------------------------------------------------------------
echo curl -X GET "%SERVER_URL%/api/employee-portal/operations" -H "Authorization: Bearer !TOKEN!"
echo.

:: Access operations endpoint with Authorization header
curl -s -X GET "%SERVER_URL%/api/employee-portal/operations" ^
  -H "Authorization: Bearer !TOKEN!" > operations_response.json

:: Check if the response contains an error message
findstr /i "error denied unauthorized" operations_response.json > nul
if %ERRORLEVEL% equ 0 (
  echo Error accessing operations endpoint:
  type operations_response.json
) else (
  echo Successfully accessed operations endpoint!
  echo Response saved to operations_response.json
)

echo.
echo Step 3: Alternative - Accessing operations endpoint with x-auth-token header
echo ------------------------------------------------------------------------
echo curl -X GET "%SERVER_URL%/api/employee-portal/operations" -H "x-auth-token: !TOKEN!"
echo.

:: Access operations endpoint with x-auth-token header
curl -s -X GET "%SERVER_URL%/api/employee-portal/operations" ^
  -H "x-auth-token: !TOKEN!" > operations_alt_response.json

:: Check if the response contains an error message
findstr /i "error denied unauthorized" operations_alt_response.json > nul
if %ERRORLEVEL% equ 0 (
  echo Error accessing operations endpoint with x-auth-token:
  type operations_alt_response.json
) else (
  echo Successfully accessed operations endpoint with x-auth-token!
  echo Response saved to operations_alt_response.json
)

echo.
echo === Test Complete ===
echo If you see 'Successfully accessed operations endpoint' messages, authentication is working correctly.
echo If you see errors, please check your credentials and server status.

:cleanup
:: Clean up temporary files
if exist login_data.json del login_data.json
echo.
echo Note: Response files (login_response.json, operations_response.json, operations_alt_response.json)
echo have been kept for your reference. You can delete them manually when no longer needed.

endlocal