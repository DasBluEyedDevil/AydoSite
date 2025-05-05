#!/bin/bash

# Kill any existing Node.js server
pkill -f "node server.js" || true

# Start Node.js in the background
cd /home/aydocorp/public_html/nodejs/aydocorp-api
nohup node server.js > /home/aydocorp/nodejs_app.log 2>&1 &

# Print confirmation
echo "Started Node.js server with PID $!"