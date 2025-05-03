#!/bin/bash

# Set path to your Node.js app
APP_DIR=/home/aydocorp/public_html/nodejs/aydocorp-api
LOG_FILE=$APP_DIR/app.log
TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")

# Check if the Node.js process is running
if pgrep -f "node server.js" > /dev/null
then
    echo "[$TIMESTAMP] Node.js process is running." >> $APP_DIR/monitor.log
else
    echo "[$TIMESTAMP] Node.js process is not running. Restarting..." >> $APP_DIR/monitor.log
    
    # Change to the app directory
    cd $APP_DIR
    
    # Restart using npm
    npm restart >> $APP_DIR/monitor.log 2>&1
    
    echo "[$TIMESTAMP] Node.js process restarted via npm restart" >> $APP_DIR/monitor.log
fi