#!/bin/bash

# Application directory
APP_DIR="/home/aydocorp/public_html/nodejs/aydocorp-api"
LOG_FILE="$APP_DIR/pm2.log"
TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")

# Navigate to application directory
cd $APP_DIR

# Log startup attempt
echo "[$TIMESTAMP] Starting application with local PM2..." >> $LOG_FILE

# Use the full path to the local PM2
NODE_MODULES_BIN="$APP_DIR/node_modules/.bin"

# Make sure PM2 bin directory exists
if [ ! -d "$NODE_MODULES_BIN" ]; then
    echo "[$TIMESTAMP] ERROR: node_modules/.bin directory not found. Is PM2 installed?" >> $LOG_FILE
    echo "[$TIMESTAMP] Running npm install to ensure dependencies..." >> $LOG_FILE
    npm install
fi

# Check if PM2 executable exists
if [ ! -f "$NODE_MODULES_BIN/pm2" ]; then
    echo "[$TIMESTAMP] ERROR: PM2 executable not found at $NODE_MODULES_BIN/pm2" >> $LOG_FILE
    echo "[$TIMESTAMP] Contents of node_modules/.bin:" >> $LOG_FILE
    ls -la $NODE_MODULES_BIN >> $LOG_FILE
    echo "[$TIMESTAMP] Running npm install pm2 --save to install PM2..." >> $LOG_FILE
    npm install pm2 --save
fi

# Try to run PM2 using relative path
$NODE_MODULES_BIN/pm2 delete aydocorp-api 2>/dev/null || true
$NODE_MODULES_BIN/pm2 start server.js --name aydocorp-api

# Save PM2 process list
$NODE_MODULES_BIN/pm2 save

# Log completion
echo "[$TIMESTAMP] PM2 startup completed" >> $LOG_FILE