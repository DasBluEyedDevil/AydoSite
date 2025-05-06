# User Management Scripts

This directory contains scripts for managing users in the MongoDB database.

## Prerequisites

Before running these scripts, make sure you have:

1. Node.js installed
2. MongoDB connection string in the `.env` file (MONGODB_URI)
3. All dependencies installed (`npm install` in the project root)

## Available Scripts

### 1. List Users

This script lists all users in the database:

```bash
node scripts/list-users.js
```

It will display the ID, username, email, role, and creation date for each user in the database.

### 2. Ensure Devil Admin

This script ensures that the "Devil" user exists and has admin privileges:

```bash
node scripts/ensure-devil-admin.js
```

It will:
- Check if a user with the username "Devil" exists
  - If the user exists but is not an admin, update the role to "admin"
  - If the user doesn't exist, create a new user with the username "Devil", email "shatteredobsidian@yahoo.com", and role "admin"
- Check if a user with the username "Udonman" exists
  - If the user doesn't exist, create a new user with the username "Udonman", email "udonman@aydocorp.space", and role "employee"
- List all users in the database

### 3. Create Admin

This script creates an admin user with the username "Devil":

```bash
node scripts/create-admin.js
```

It will:
- Check if a user with the username "Devil" exists
  - If the user exists but is not an admin, update the role to "admin"
  - If the user doesn't exist, create a new user with the username "Devil", email "admin@example.com", and role "admin"

## Verifying Users in the Admin Dashboard

After running these scripts, you can verify that the users are being correctly retrieved and displayed in the admin dashboard:

1. Start the server: `npm start` (in the project root)
2. Open the website in a browser
3. Log in as "Devil" (or another admin user)
4. Navigate to the Admin Dashboard by clicking on the "Admin" link or going to `#admin-dashboard`
5. Click on "View All Website Users" to see the list of users

If the users are not displayed, check the browser console for error messages. You may see errors like:

```
GET https://aydocorp.space/api/auth/users 404 (Not Found)
```

If this happens, try clicking the "Load Sample Data" button to see a mock list of users.

## Troubleshooting

If you encounter issues:

1. Check the MongoDB connection string in the `.env` file
2. Make sure the server is running
3. Check the browser console for error messages
4. Verify that the user you're logged in as has admin privileges
5. Try running the `ensure-devil-admin.js` script to make sure the admin user exists