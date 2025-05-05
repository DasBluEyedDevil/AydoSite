#!/bin/bash

# Application directory
APP_DIR="/home/aydocorp/public_html/nodejs/aydocorp-api"
LOG_FILE="$APP_DIR/monitor.log"
TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")

# Check if the Node.js process is running
if pgrep -f "node server.js" > /dev/null
then
    echo "[$TIMESTAMP] Node.js process is running." >> $LOG_FILE
else
    echo "[$TIMESTAMP] Node.js process is not running. Restarting..." >> $LOG_FILE
    
    # Change to the app directory
    cd $APP_DIR
    
    # Run the start script
    ./start.sh
    
    echo "[$TIMESTAMP] Node.js process restarted" >> $LOG_FILE
fi