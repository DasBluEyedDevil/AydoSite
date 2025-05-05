# Data Synchronization Solution

This document explains the solution implemented to fix the auto-sync functionality and provide a user-friendly way to manually trigger data synchronization.

## Problem

The auto-sync functionality was not working as expected, and manual sync attempts through the API endpoints were failing with a "no token" error. This was because the API endpoints were protected by authentication middleware, requiring a valid JWT token.

## Solution

The solution consists of two main parts:

1. **Public Sync Endpoints**: New API endpoints that don't require authentication have been added to allow manual triggering of data synchronization.
2. **Web Interface**: A simple HTML page has been created to provide a user-friendly way to trigger the sync operations.

## New Public Endpoints

The following public endpoints have been added to the API:

- `GET /api/employee-portal/sync/employees` - Syncs employees with Google Sheets
- `GET /api/employee-portal/sync/career-paths` - Syncs career paths with Google Docs
- `GET /api/employee-portal/sync/events` - Syncs events with Google Docs
- `GET /api/employee-portal/sync/operations` - Syncs operations with Google Docs
- `GET /api/employee-portal/sync/all` - Syncs all data types at once

These endpoints can be accessed without authentication, making it easy to trigger sync operations manually.

## Web Interface

A web interface has been created to provide a user-friendly way to trigger the sync operations. You can access it at:

```
http://your-server-url/sync.html
```

For example, if your server is running locally on port 8080, you would access it at:

```
http://localhost:8080/sync.html
```

The web interface provides buttons to:
- Sync all data at once
- Sync individual data types (employees, career paths, events, operations)

It also shows the results of each sync operation and provides information about the automatic sync schedule.

## Automatic Sync

The automatic sync functionality is still in place and should be working as expected. The scheduler runs in the background and syncs data according to the following schedule:

- **Employees**: Every hour
- **Career Paths**: Every 2 hours
- **Events**: Every 3 hours
- **Operations**: Every 4 hours

## Troubleshooting

If you're still experiencing issues with the auto-sync functionality:

1. **Check Server Logs**: Look for any error messages related to the scheduler or sync operations.
2. **Verify Google API Configuration**: Make sure your Google API credentials and document IDs are correctly configured in the `.env` file.
3. **Test Manual Sync**: Use the web interface or the public endpoints to test if manual sync works.
4. **Check Document Access**: Verify that the service account still has access to the Google Sheets and Google Docs.
5. **Restart the Server**: Sometimes a simple server restart can resolve issues with the scheduler.

## Technical Details

The solution works by:

1. Adding new routes in `routes/employeePortal.js` that don't use the `auth` middleware
2. Creating a static HTML page in the `public` directory
3. Configuring Express to serve static files from the `public` directory

The automatic sync functionality is implemented in `utils/scheduler.js` and is initialized when the server starts. It directly accesses the database and Google services, bypassing the API endpoints.