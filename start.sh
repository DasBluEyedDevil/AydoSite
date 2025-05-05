#!/bin/bash

# Application directory
APP_DIR="/home/aydocorp/public_html/nodejs/aydocorp-api"
LOG_FILE="$APP_DIR/app.log"
TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")

# Navigate to application directory
cd $APP_DIR

# Log startup attempt
echo "[$TIMESTAMP] Starting Node.js application..." >> $LOG_FILE

# Start the application with nohup to keep it running
# Use & to run in the background
nohup node server.js >> $LOG_FILE 2>&1 &

# Save the PID to a file
echo $! > $APP_DIR/app.pid

# Log completion
echo "[$TIMESTAMP] Started Node.js process with PID $!" >> $LOG_FILE