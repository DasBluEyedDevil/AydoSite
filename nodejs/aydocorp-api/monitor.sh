#!/bin/bash

# Set path to your Node.js app
APP_DIR=~/public_html/nodejs/aydocorp-api
LOG_FILE=$APP_DIR/app.log
TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")

# Check if the Node.js process is running
if pgrep -f "node server.js" > /dev/null
then
    echo "[$TIMESTAMP] Node.js process is running." >> $APP_DIR/monitor.log
else
    echo "[$TIMESTAMP] Node.js process is not running. Restarting..." >> $APP_DIR/monitor.log
    
    # Kill any zombie processes if they exist
    pkill -f "node server.js" >> $APP_DIR/monitor.log 2>&1
    
    # Start Node.js process
    cd $APP_DIR
    nohup node server.js > $LOG_FILE 2>&1 &
    
    echo "[$TIMESTAMP] Node.js process restarted with PID: $!" >> $APP_DIR/monitor.log
fi