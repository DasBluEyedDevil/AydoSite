# AydoCorp Scripts Guide

## Overview

This is a quick reference guide to help you understand the various scripts that have been created to help manage and troubleshoot the AydoCorp API.

## Where to Find Detailed Information

The complete documentation for all scripts is located in:

```
nodejs/aydocorp-api/README.md
```

Please refer to this file for detailed information about each script, including:
- What each script does
- When to use each script
- How to use each script
- What problems each script solves

## Common Issues and Their Solutions

1. **Package.json Syntax Error**
   - If you see `npm ERR! code EJSONPARSE` errors
   - Use the fix scripts in `nodejs/aydocorp-api/fix-package-json.bat` (Windows) or `nodejs/aydocorp-api/fix-package-json.sh` (Linux/Mac)

2. **Git Conflict Issues**
   - If you see `error: Your local changes to the following files would be overwritten by merge`
   - Use the resolution scripts in `nodejs/aydocorp-api/resolve-git-conflict.bat` (Windows) or `nodejs/aydocorp-api/resolve-git-conflict.sh` (Linux/Mac)

3. **API Testing**
   - To test if the API is working correctly
   - Use `nodejs/aydocorp-api/test-api.js`

4. **Server Monitoring**
   - To monitor and automatically restart the server if it crashes
   - Use `nodejs/aydocorp-api/monitor.sh`

## Need Help?

If you need further assistance, please refer to the detailed documentation or contact the development team.