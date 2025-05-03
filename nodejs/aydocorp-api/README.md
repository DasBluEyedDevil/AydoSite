# AydoCorp API - Scripts Guide

This document provides a clear explanation of all the scripts in this project, what they do, and when to use them.

## Table of Contents

1. [Issue Resolution Scripts](#issue-resolution-scripts)
   - [Package.json Fix Scripts](#packagejson-fix-scripts)
   - [Git Conflict Resolution Scripts](#git-conflict-resolution-scripts)
2. [Monitoring Scripts](#monitoring-scripts)
3. [Testing Scripts](#testing-scripts)

## Issue Resolution Scripts

### Package.json Fix Scripts

**Files:**
- `fix-package-json.bat` (Windows)
- `fix-package-json.sh` (Linux/Mac)
- `package.json.fixed` (Corrected version of package.json)
- `PACKAGE-JSON-FIX.md` (Detailed documentation)

**Purpose:**
These scripts fix the syntax error in the package.json file that was causing npm install to fail.

**When to use:**
Use these scripts when you see this error:
```
npm ERR! code EJSONPARSE
npm ERR! JSON.parse Expected ',' or '}' after property value in JSON
```

**How to use:**
- On Windows: Double-click `fix-package-json.bat` or run it from Command Prompt
- On Linux/Mac: Run `bash fix-package-json.sh` or `./fix-package-json.sh` (after making it executable with `chmod +x fix-package-json.sh`)

**What it does:**
1. Creates a backup of your current package.json
2. Replaces it with the fixed version
3. Runs npm install to verify the fix worked

### Git Conflict Resolution Scripts

**Files:**
- `resolve-git-conflict.bat` (Windows)
- `resolve-git-conflict.sh` (Linux/Mac)
- `GIT-CONFLICT-RESOLUTION.md` (Detailed documentation)

**Purpose:**
These scripts help resolve Git conflicts that occur when trying to pull changes from the remote repository.

**When to use:**
Use these scripts when you see this error:
```
error: Your local changes to the following files would be overwritten by merge:
        nodejs/aydocorp-api/package-lock.json
        nodejs/aydocorp-api/package.json
Please commit your changes or stash them before you merge.
Aborting
```

**How to use:**
- On Windows: Double-click `resolve-git-conflict.bat` or run it from Command Prompt
- On Linux/Mac: Run `bash resolve-git-conflict.sh` or `./resolve-git-conflict.sh` (after making it executable with `chmod +x resolve-git-conflict.sh`)

**What it does:**
1. Stashes your local changes
2. Pulls the latest changes from the remote repository
3. Provides instructions on how to apply your stashed changes if needed

## Monitoring Scripts

**Files:**
- `monitor.sh`

**Purpose:**
This script monitors the Node.js process and restarts it if it crashes.

**When to use:**
This script is typically set up as a cron job on the server to run at regular intervals (e.g., every 5 minutes).

**How to use:**
1. Make the script executable: `chmod +x monitor.sh`
2. Run it manually: `./monitor.sh`
3. Or set up a cron job: `crontab -e` and add `*/5 * * * * /path/to/monitor.sh`

**What it does:**
1. Checks if the Node.js process is running
2. If not, it restarts the application
3. Logs the restart in a monitor.log file

## Testing Scripts

**Files:**
- `test-api.js`

**Purpose:**
This script tests various API endpoints to ensure they're working correctly.

**When to use:**
Use this script when:
- You want to verify the API is working after making changes
- You're troubleshooting API issues
- You want to check if the server is responding correctly

**How to use:**
Run the script with Node.js:
```
node test-api.js
```

**What it does:**
1. Tests the root endpoint
2. Tests the /api/test endpoint
3. Tests the auth routes
4. Tests the forum routes
5. Tests registration with invalid data to check error handling
6. Logs detailed information about any errors that occur

## Additional Information

For more detailed information about each script, please refer to the corresponding documentation files:
- `PACKAGE-JSON-FIX.md` for package.json fix scripts
- `GIT-CONFLICT-RESOLUTION.md` for Git conflict resolution scripts

If you have any questions or need further assistance, please contact the development team.