#!/bin/bash

# Application directory
APP_DIR="/home/aydocorp/public_html/nodejs/aydocorp-api"
LOG_FILE="$APP_DIR/app.log"
PID_FILE="$APP_DIR/app.pid"
TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")

# Navigate to application directory
cd $APP_DIR

# Kill any existing Node.js process
if [ -f "$PID_FILE" ]; then
    OLD_PID=$(cat $PID_FILE)
    if ps -p $OLD_PID > /dev/null; then
        echo "[$TIMESTAMP] Stopping existing Node.js process with PID $OLD_PID..." >> $LOG_FILE
        kill $OLD_PID
        sleep 2
    fi
    rm $PID_FILE
fi

# Log startup attempt
echo "[$TIMESTAMP] Starting Node.js application..." >> $LOG_FILE

# Start the application with nohup to keep it running after logout
# Use & to run in the background
nohup node server.js >> $LOG_FILE 2>&1 &

# Save the PID to a file
echo $! > $PID_FILE

# Log completion
echo "[$TIMESTAMP] Started Node.js process with PID $!" >> $LOG_FILE

# Verify the process is running
sleep 2
if ps -p $(cat $PID_FILE) > /dev/null; then
    echo "[$TIMESTAMP] Verified: Process is running with PID $(cat $PID_FILE)" >> $LOG_FILE
else
    echo "[$TIMESTAMP] WARNING: Process may not have started correctly. Check logs." >> $LOG_FILE
fi