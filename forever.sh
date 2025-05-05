#!/bin/bash

# Set path variables
APP_DIR="/home/aydocorp/public_html/nodejs/aydocorp-api"
LOG_FILE="$APP_DIR/app.log"
TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")

# Navigate to the application directory
cd $APP_DIR

# Log start attempt
echo "[$TIMESTAMP] Starting Node.js application with nohup..." >> $LOG_FILE

# Kill any existing node processes for this app
pkill -f "node $APP_DIR/server.js" || true

# Start the application with nohup
nohup node server.js >> $LOG_FILE 2>&1 &

# Get the process ID
PID=$!
echo "[$TIMESTAMP] Node.js process started with PID: $PID" >> $LOG_FILE
echo $PID > "$APP_DIR/app.pid"

# Report success
echo "Application started in background. Check app.log for details."