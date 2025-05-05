# Automatic Data Synchronization

This document explains the automatic data synchronization feature that keeps your Employee Portal data up-to-date with Google Sheets and Google Docs.

## Overview

The Employee Portal now includes an automatic data synchronization system that periodically refreshes data from Google Sheets and Google Docs without requiring manual API calls. This ensures that your employee portal always displays the most up-to-date information.

## How It Works

The system uses a scheduler (powered by node-cron) that runs in the background on the server. The scheduler automatically syncs data at regular intervals:

1. **Employee Data**: Synced with Google Sheets every hour
2. **Career Paths**: Synced with Google Docs every 2 hours
3. **Events**: Synced with Google Docs every 3 hours
4. **Operations**: Synced with Google Docs every 4 hours

This means that when users visit the employee portal, they'll always see the latest data from your Google Sheets and Google Docs, even if no one has manually accessed the API endpoints.

## Benefits

- **Always Up-to-Date**: Data is automatically refreshed without requiring manual API calls
- **Reduced Load**: Sync operations are staggered to distribute the server load
- **Improved User Experience**: Users always see the latest data when they visit the portal
- **Simplified Workflow**: Content editors can update Google Sheets/Docs and know the changes will appear on the site automatically

## Configuration

The automatic synchronization is enabled by default when the server starts. No additional configuration is required beyond the standard Google API setup described in the [Google Integration Guide](./GOOGLE_INTEGRATION_GUIDE.md).

The sync schedule is defined in the `utils/scheduler.js` file and can be modified if needed:

```javascript
// Employee data sync (every hour at minute 0)
cron.schedule('0 * * * *', async () => { ... });

// Career paths sync (every 2 hours at minute 15)
cron.schedule('15 */2 * * *', async () => { ... });

// Events sync (every 3 hours at minute 30)
cron.schedule('30 */3 * * *', async () => { ... });

// Operations sync (every 4 hours at minute 45)
cron.schedule('45 */4 * * *', async () => { ... });
```

## Testing

To test the automatic synchronization, you can use the included test script:

```bash
node test-scheduler.js
```

This script will:
1. Connect to MongoDB
2. Test each sync function individually
3. Log the results
4. Disconnect from MongoDB

The test script is useful for verifying that the synchronization functions work correctly without waiting for the scheduled times.

## Logging

The automatic synchronization system logs its activity to the console. You can monitor these logs to see when sync operations occur and whether they succeed or fail.

Example log messages:

```
Initializing data sync scheduler...
Employee sync job scheduled (hourly)
Career path sync job scheduled (every 2 hours)
Event sync job scheduled (every 3 hours)
Operation sync job scheduled (every 4 hours)
Data sync scheduler initialized successfully
Automatic data synchronization scheduler started

Running scheduled employee data sync...
Found 5 employees in database
Syncing with Google Sheets...
Processed 6 employees from Google Sheets
Scheduled employee sync completed successfully
```

## Troubleshooting

If you encounter issues with the automatic synchronization, check the following:

1. **Check Logs**: Look for error messages in the server logs related to the scheduler or sync operations
2. **Verify Google API Configuration**: Make sure your Google API credentials and document IDs are correctly configured in the `.env` file
3. **Test Manual Sync**: Try accessing the API endpoints manually to see if the sync works when triggered manually
4. **Run Test Script**: Use the `test-scheduler.js` script to test each sync function individually
5. **Check Document Access**: Verify that the service account still has access to the Google Sheets and Google Docs

## Manual Override

Even with automatic synchronization enabled, you can still trigger a manual sync by accessing the API endpoints:

- `/api/employee-portal/employees` - Syncs employee data
- `/api/employee-portal/career-paths` - Syncs career paths
- `/api/employee-portal/events` - Syncs events
- `/api/employee-portal/operations` - Syncs operations

This can be useful if you need to immediately see changes you've made to a Google Sheet or Google Doc.

## Conclusion

The automatic data synchronization feature ensures that your Employee Portal always displays the most up-to-date information from your Google Sheets and Google Docs. This improves the user experience and simplifies the content management workflow.