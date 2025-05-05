#!/bin/bash

# Application directory
APP_DIR="/home/aydocorp/public_html/nodejs/aydocorp-api"
LOG_FILE="$APP_DIR/monitor.log"
PID_FILE="$APP_DIR/app.pid"
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

# First check: See if our process is running via PID file
process_running=false
if [ -f "$PID_FILE" ]; then
    PID=$(cat $PID_FILE)
    if ps -p $PID > /dev/null; then
        log_message "Node.js process is running with PID $PID"
        process_running=true
    else
        log_message "PID file exists with PID $PID, but the process is not running."
    fi
fi

# Second check: Use pgrep as a backup
if [ "$process_running" = false ]; then
    if pgrep -f "node server.js" > /dev/null; then
        log_message "Node.js process is running (detected by pgrep)"
        process_running=true
        
        # Update PID file with the correct PID since we detected it without the file
        NEW_PID=$(pgrep -f "node server.js" | head -n 1)
        echo $NEW_PID > $PID_FILE
        log_message "Updated PID file with PID $NEW_PID"
    else
        log_message "No Node.js process found running"
    fi
fi

# If process isn't running, start it
if [ "$process_running" = false ]; then
    log_message "Starting Node.js process..."
    ./start.sh
    log_message "Start script executed"
    
    # Verify the process started
    sleep 3
    if [ -f "$PID_FILE" ] && ps -p $(cat $PID_FILE) > /dev/null; then
        log_message "Verified: Process started successfully with PID $(cat $PID_FILE)"
    else
        log_message "WARNING: Process may not have started correctly after restart attempt"
    fi
fi

# Check if the API is responding
API_CHECK=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/api/test 2>/dev/null || echo "Failed")
if [ "$API_CHECK" = "200" ]; then
    log_message "API health check: OK (HTTP 200)"
else
    log_message "API health check: Failed (Response: $API_CHECK)"
    
    # If process is running but API is not responding, it might be stuck
    if [ "$process_running" = true ]; then
        log_message "Process is running but API is not responding. Restarting..."
        
        # Kill the current process
        if [ -f "$PID_FILE" ]; then
            PID=$(cat $PID_FILE)
            kill $PID
            log_message "Killed process with PID $PID"
        else
            pkill -f "node server.js"
            log_message "Used pkill to terminate node server.js processes"
        fi
        
        # Wait a moment for the process to terminate
        sleep 2
        
        # Start a new process
        ./start.sh
        log_message "Restarted the application"
    fi
fi

log_message "Monitoring check completed"
