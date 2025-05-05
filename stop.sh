#!/bin/bash

# Application directory
APP_DIR="/home/aydocorp/public_html/nodejs/aydocorp-api"
PID_FILE="$APP_DIR/app.pid"
LOG_FILE="$APP_DIR/app.log"
TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")

# Check if PID file exists
if [ -f "$PID_FILE" ]; then
    # Get the PID
    PID=$(cat $PID_FILE)
    
    # Check if process is running
    if ps -p $PID > /dev/null; then
        echo "[$TIMESTAMP] Stopping Node.js process with PID $PID..." >> $LOG_FILE
        kill $PID
        echo "[$TIMESTAMP] Node.js process stopped" >> $LOG_FILE
    else
        echo "[$TIMESTAMP] Process with PID $PID is not running" >> $LOG_FILE
    fi
    
    # Remove PID file
    rm $PID_FILE
else
    echo "[$TIMESTAMP] PID file not found, process may not be running" >> $LOG_FILE
fi