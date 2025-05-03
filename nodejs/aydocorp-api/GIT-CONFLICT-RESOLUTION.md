# Git Conflict Resolution Guide

## Issue Description

When trying to pull changes from the remote repository, you encountered the following error:

```
error: Your local changes to the following files would be overwritten by merge:
        nodejs/aydocorp-api/package-lock.json
        nodejs/aydocorp-api/package.json
Please commit your changes or stash them before you merge.
Aborting
```

This error occurs because you have local modifications to `package.json` and `package-lock.json` that would be overwritten by the incoming changes from the remote repository.

## Solution

There are two main approaches to resolve this conflict:

### Option 1: Stash your local changes (Recommended)

This approach temporarily saves your local changes, pulls the remote changes, and then gives you the option to reapply your local changes if needed.

1. Open a command prompt in the root directory of your repository
2. Run the provided script:
   - On Windows: `nodejs\aydocorp-api\resolve-git-conflict.bat`
   - On Linux/Mac: `bash nodejs/aydocorp-api/resolve-git-conflict.sh`

The script will:
- Stash your local changes
- Pull the latest changes from the remote repository
- Provide instructions on how to apply your stashed changes if needed

### Option 2: Commit your local changes

If you want to keep your local changes and merge them with the remote changes:

1. Commit your local changes:
   ```
   git add nodejs/aydocorp-api/package.json nodejs/aydocorp-api/package-lock.json
   git commit -m "Update package dependencies"
   ```

2. Pull the remote changes:
   ```
   git pull
   ```

3. Resolve any merge conflicts if they occur

### Option 3: Discard your local changes

If your local changes are not important and you want to use the remote version:

```
git checkout -- nodejs/aydocorp-api/package.json nodejs/aydocorp-api/package-lock.json
git pull
```

## Understanding package.json and package-lock.json

These files are used by npm to manage dependencies:

- `package.json`: Lists the packages your project depends on and their version ranges
- `package-lock.json`: Locks the exact versions of all dependencies and their dependencies

Changes to these files typically occur when:
- You run `npm install` to add new packages
- You update existing packages
- You remove packages

## Preventing Future Conflicts

To minimize conflicts with these files:

1. Always pull changes before making local changes
2. Coordinate with team members when updating dependencies
3. Consider using a more structured approach to dependency management, such as using a package.json merge tool

## Need Help?

If you encounter issues with the resolution process, please contact your team's Git administrator or refer to the Git documentation at [git-scm.com](https://git-scm.com/doc).