#!/bin/bash
# Change to the directory containing server.js
cd /home/aydocorp/public_html/nodejs/aydocorp-api/ >> app.log 2>&1
# Run the Node.js server and redirect output to app.log
node server.js >> app.log 2>&1