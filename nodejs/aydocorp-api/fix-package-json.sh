#!/bin/bash

# Script to fix package.json syntax error

echo "Fixing package.json syntax error..."

# Backup the original file
cp package.json package.json.bak
echo "Original package.json backed up to package.json.bak"

# Replace the file with the fixed version
cp package.json.fixed package.json
echo "package.json has been replaced with the fixed version"

# Try to run npm install to verify the fix
echo "Running npm install to verify the fix..."
npm install

echo "Fix completed. If npm install was successful, the issue has been resolved."