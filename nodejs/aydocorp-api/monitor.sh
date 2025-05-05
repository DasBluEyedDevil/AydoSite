#!/bin/bash

# Application directory
APP_DIR="/home/aydocorp/public_html/nodejs/aydocorp-api"
LOG_FILE="$APP_DIR/monitor.log"
PID_FILE="$APP_DIR/app.pid"
APP_LOG="$APP_DIR/app.log"
TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")

# Create monitor log file if it doesn't exist
touch $LOG_FILE

# Function to log messages
log_message() {
    echo "[$TIMESTAMP] $1" >> $LOG_FILE
}

log_message "Starting monitoring check"

# Change to the app directory
cd $APP_DIR || {
    log_message "ERROR: Could not change to application directory $APP_DIR"
    exit 1
}

# Primary check: See if the Node.js process is running using pgrep
if pgrep -f "node server.js" > /dev/null
then
    log_message "Node.js process is running (verified via pgrep)."
else
    # Secondary check: Check PID file if it exists
    if [ -f "$PID_FILE" ]; then
        PID=$(cat $PID_FILE)
        if ps -p $PID > /dev/null; then
            log_message "Node.js process is running with PID $PID (verified via PID file)."
        else
            log_message "PID file exists with PID $PID, but the process is not running. Restarting..."
            # Remove stale PID file
            rm $PID_FILE
            # Restart the application
            log_message "Running start script to restart the application..."
            ./start.sh
            log_message "Node.js process restarted"
        fi
    else
        # No PID file and no running process detected
        log_message "Node.js process is not running and no PID file found. Restarting..."
        # Restart the application
        log_message "Running start script to restart the application..."
        ./start.sh
        log_message "Node.js process restarted"
        
        # Verify restart was successful
        sleep 3
        if pgrep -f "node server.js" > /dev/null; then
            log_message "Restart verification: Process is now running."
        else
            log_message "WARNING: Process still not detected after restart attempt."
            
            # Check for errors in the application log
            if [ -f "$APP_LOG" ]; then
                LAST_ERRORS=$(tail -n 20 $APP_LOG | grep -i "error")
                if [ ! -z "$LAST_ERRORS" ]; then
                    log_message "Found errors in application log:"
                    log_message "$LAST_ERRORS"
                fi
            fi
        fi
    fi
fi

# Check if the API is responding
API_CHECK=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/api/health-check 2>/dev/null || echo "Failed")
if [ "$API_CHECK" = "200" ]; then
    log_message "API health check: OK (HTTP 200)"
else
    log_message "API health check: Failed (Response: $API_CHECK)"
    
    # If process is running but API is not responding, it might be stuck
    if pgrep -f "node server.js" > /dev/null; then
        log_message "Process is running but API is not responding. The application might be stuck."
        
        # Optional: You could implement a forced restart here
        # log_message "Performing forced restart..."
        # ./stop.sh
        # sleep 2
        # ./start.sh
    fi
fi

log_message "Monitoring check completed"
