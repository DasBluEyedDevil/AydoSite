# How to Give a User the Admin Role

This document explains how to give a user the Admin role in the AydoCorp website.

## Prerequisites

Before you begin, make sure you have:

1. Node.js installed on your system
2. Access to the server where the AydoCorp website is hosted
3. The MongoDB connection string in the `.env` file (MONGODB_URI)

## Steps to Give a User the Admin Role

1. **List all users in the database** to find the username of the user you want to give the Admin role:

   ```bash
   cd nodejs/aydocorp-api
   node scripts/list-users.js
   ```

   This will display all users in the database, including their usernames, emails, and current roles.

2. **Set the user's role to Admin** using the `set-user-admin.js` script:

   ```bash
   node scripts/set-user-admin.js <username>
   ```

   Replace `<username>` with the actual username of the user you want to give the Admin role.

   For example:
   ```bash
   node scripts/set-user-admin.js JohnDoe
   ```

3. **Verify the change** by running the `list-users.js` script again:

   ```bash
   node scripts/list-users.js
   ```

   Check that the user's role has been updated to "admin".

## Testing the Admin Role

After giving a user the Admin role, you should test that they can access the Admin Dashboard:

1. Start the server if it's not already running:

   ```bash
   cd nodejs/aydocorp-api
   npm start
   ```

2. Open the website in a browser
3. Log in as the user you gave the Admin role
4. Navigate to the Admin Dashboard by clicking on the "Admin" link or going to `#admin-dashboard`
5. Verify that you can access the Admin Dashboard and perform admin functions

## Troubleshooting

If you encounter issues:

1. Make sure the MongoDB connection string in the `.env` file is correct
2. Check that the server is running
3. Verify that the user exists in the database
4. Check the browser console for error messages
5. Try logging out and logging back in to refresh the session

If all else fails, you can use the `create-admin.js` script to create a new admin user:

```bash
node scripts/create-admin.js
```

This will create a user with the username "Devil" and the admin role.