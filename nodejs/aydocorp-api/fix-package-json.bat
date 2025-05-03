@echo off
echo Fixing package.json syntax error...

REM Backup the original file
copy package.json package.json.bak
echo Original package.json backed up to package.json.bak

REM Replace the file with the fixed version
copy package.json.fixed package.json
echo package.json has been replaced with the fixed version

REM Try to run npm install to verify the fix
echo Running npm install to verify the fix...
npm install

echo Fix completed. If npm install was successful, the issue has been resolved.
pause