# Deployment Guide for AydoCorp API Updates

This guide explains how to deploy the changes made to the AydoCorp API, specifically the updated sync schedule and the fix for accessing the sync.html page.

## Changes Made

1. **Updated Sync Schedule**: All data synchronization jobs now run every 5 minutes instead of the previous hourly/multi-hour schedule.
2. **Apache Configuration**: Added instructions to properly configure Apache to serve the sync.html file.

## Deploying the Changes

### 1. Update the Node.js Application

1. Copy the updated files to your server:
   - `utils/scheduler.js` - Contains the updated sync schedule
   - `public/sync.html` - Contains the updated schedule information
   - `AUTO_SYNC_README.md` - Contains updated documentation

2. Restart the Node.js application:
   ```bash
   # If using PM2
   pm2 restart aydocorp-api

   # If using systemd
   sudo systemctl restart aydocorp-api

   # If using forever
   forever restart server.js
   ```

### 2. Configure Apache to Serve Static Files

The 404 error when accessing `http://www.aydocorp.space/sync.html` indicates that Apache is not properly configured to serve the static files from the Node.js application. Here's how to fix it:

#### Option 1: Use Apache as a Reverse Proxy

Add the following configuration to your Apache virtual host configuration (typically in `/etc/apache2/sites-available/your-site.conf`):

```apache
<VirtualHost *:80>
    ServerName www.aydocorp.space
    ServerAlias aydocorp.space

    # Proxy requests to the Node.js application
    ProxyRequests Off
    ProxyPreserveHost On
    ProxyVia Full

    # Enable the proxy modules if not already enabled
    # sudo a2enmod proxy
    # sudo a2enmod proxy_http

    # Proxy all requests to the Node.js application
    ProxyPass / http://localhost:8080/
    ProxyPassReverse / http://localhost:8080/

    # Log settings
    ErrorLog ${APACHE_LOG_DIR}/aydocorp-error.log
    CustomLog ${APACHE_LOG_DIR}/aydocorp-access.log combined
</VirtualHost>
```

After making changes to the Apache configuration, restart Apache:

```bash
sudo systemctl restart apache2
```

#### Option 2: Copy Static Files to Apache's Document Root

Alternatively, you can copy the static files to Apache's document root:

1. Create a directory for the static files in Apache's document root:
   ```bash
   sudo mkdir -p /var/www/html/aydocorp
   ```

2. Copy the sync.html file to this directory:
   ```bash
   sudo cp /path/to/nodejs/aydocorp-api/public/sync.html /var/www/html/aydocorp/
   ```

3. Update your Apache virtual host configuration to serve these files:
   ```apache
   <VirtualHost *:80>
       ServerName www.aydocorp.space
       ServerAlias aydocorp.space

       DocumentRoot /var/www/html/aydocorp

       # API requests are proxied to the Node.js application
       ProxyPass /api http://localhost:8080/api
       ProxyPassReverse /api http://localhost:8080/api

       # Static files are served directly by Apache
       <Directory /var/www/html/aydocorp>
           Options Indexes FollowSymLinks
           AllowOverride All
           Require all granted
       </Directory>

       # Log settings
       ErrorLog ${APACHE_LOG_DIR}/aydocorp-error.log
       CustomLog ${APACHE_LOG_DIR}/aydocorp-access.log combined
   </VirtualHost>
   ```

4. Restart Apache:
   ```bash
   sudo systemctl restart apache2
   ```

### 3. Verify the Deployment

1. Check that the Node.js application is running:
   ```bash
   # If using PM2
   pm2 status

   # If using systemd
   sudo systemctl status aydocorp-api

   # If using forever
   forever list
   ```

2. Check the application logs to verify that the sync jobs are running every 5 minutes:
   ```bash
   # If using PM2
   pm2 logs aydocorp-api

   # If using systemd
   sudo journalctl -u aydocorp-api -f

   # If using forever
   forever logs server.js
   ```

3. Access the sync.html page in your browser:
   ```
   http://www.aydocorp.space/sync.html
   ```

4. Verify that you can trigger manual syncs using the buttons on the sync.html page.

## Troubleshooting

If you encounter issues after deploying the changes, check the following:

1. **Node.js Application Logs**: Look for any error messages related to the scheduler or sync operations.

2. **Apache Error Logs**: Check for any errors in the Apache error logs:
   ```bash
   sudo tail -f /var/log/apache2/error.log
   ```

3. **Apache Access Logs**: Check if requests to sync.html are being received by Apache:
   ```bash
   sudo tail -f /var/log/apache2/access.log
   ```

4. **Apache Configuration**: Verify that the Apache configuration is correct:
   ```bash
   sudo apache2ctl -t
   ```

5. **Firewall Settings**: Make sure that port 80 (HTTP) is open in your firewall:
   ```bash
   sudo ufw status
   ```

6. **SELinux**: If you're using SELinux, make sure it's not blocking the proxy:
   ```bash
   sudo setsebool -P httpd_can_network_connect 1
   ```

If you continue to experience issues, please contact the developer for assistance.