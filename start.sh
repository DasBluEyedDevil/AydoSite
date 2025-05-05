#!/bin/bash

# Application directory
APP_DIR="/home/aydocorp/public_html/nodejs/aydocorp-api"
LOG_FILE="$APP_DIR/pm2.log"
TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")

# Navigate to application directory
cd $APP_DIR

# Log startup attempt
echo "[$TIMESTAMP] Starting application with PM2..." >> $LOG_FILE

# Use relative path to node_modules/.bin/pm2
# This is important in cPanel environments
export PATH="$APP_DIR/node_modules/.bin:$PATH"

# Stop any existing instances
./node_modules/.bin/pm2 delete aydocorp-api 2>/dev/null || true

# Start the application with PM2
./node_modules/.bin/pm2 start server.js --name aydocorp-api

# Save PM2 process list so it survives server restarts
./node_modules/.bin/pm2 save

# Log completion
echo "[$TIMESTAMP] PM2 startup completed" >> $LOG_FILE