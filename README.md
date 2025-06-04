# Chatter Socket - Deployment Guide

A real-time chat application built with Node.js, TypeScript, Socket.IO, and Prisma.

## Table of Contents

- [Project Overview](#project-overview)
- [Prerequisites](#prerequisites)
- [Server Setup](#server-setup)
- [Database Setup](#database-setup)
- [Application Deployment](#application-deployment)
- [Nginx Configuration](#nginx-configuration)
- [PM2 Process Management](#pm2-process-management)
- [phpMyAdmin Setup](#phpmyadmin-setup)
- [SSL Certificate Setup](#ssl-certificate-setup)
- [Monitoring and Maintenance](#monitoring-and-maintenance)

## Project Overview

This is a real-time chat application with features including:
- Real-time messaging with Socket.IO
- File upload functionality
- Voice/Video calling capabilities
- User authentication with JWT
- MySQL database with Prisma ORM
- Firebase push notifications

## Prerequisites

Before deploying, ensure you have:
- Ubuntu 20.04 or later
- Domain name pointed to your server
- Root or sudo access

## Server Setup

### 1. Update System

```bash
sudo apt update && sudo apt upgrade -y
```

### 2. Install Node.js (via NodeSource)

```bash
# Install Node.js 18.x (LTS)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version
npm --version
```

### 3. Install PM2 Globally

```bash
sudo npm install -g pm2
```

### 4. Install Nginx

```bash
sudo apt install nginx -y
sudo systemctl start nginx
sudo systemctl enable nginx
```

### 5. Install MySQL

```bash
sudo apt install mysql-server -y
sudo systemctl start mysql
sudo systemctl enable mysql

# Secure MySQL installation
sudo mysql_secure_installation
```

## Database Setup

### 1. Create Database and User

```bash
sudo mysql -u root -p
```

```sql
-- Create database
CREATE DATABASE chatter;

-- Create user and grant privileges
CREATE USER 'chatter_user'@'localhost' IDENTIFIED BY 'your_strong_password';
GRANT ALL PRIVILEGES ON chatter.* TO 'chatter_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 2. Update Environment Variables

Create `.env.production` file:

```bash
DATABASE_URL="mysql://chatter_user:your_strong_password@localhost:3306/chatter"
SECRET_KEY="your_jwt_secret_key_here"
CDN_HOST="https://yourdomain.com"
PORT=3000
NODE_ENV=production
```

## Application Deployment

### 1. Clone Repository

```bash
cd /var/www
sudo git clone https://github.com/yourusername/chatter-socket.git
sudo chown -R $USER:$USER /var/www/chatter-socket
cd chatter-socket
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Build Application

```bash
npm run build
```

### 4. Run Database Migrations

```bash
# Copy production environment file
cp .env.production .env

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate deploy
```

### 5. Create Uploads Directory

```bash
mkdir -p uploads
sudo chown -R www-data:www-data uploads
sudo chmod -R 755 uploads
```

## PM2 Process Management

### 1. Create PM2 Ecosystem File

Create `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'chatter-socket',
    script: './build/app.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'development'
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    max_memory_restart: '1G',
    node_args: '--max_old_space_size=4096'
  }]
};
```

### 2. Create Logs Directory

```bash
mkdir -p logs
```

### 3. Start Application with PM2

```bash
# Start in production mode
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u $USER --hp $HOME
```

### 4. PM2 Management Commands

```bash
# Check status
pm2 status

# View logs
pm2 logs chatter-socket

# Restart application
pm2 restart chatter-socket

# Stop application
pm2 stop chatter-socket

# Delete application
pm2 delete chatter-socket

# Monitor resources
pm2 monit
```

## Nginx Configuration

### 1. Create Nginx Configuration

```bash
sudo nano /etc/nginx/sites-available/chatter-socket
```

Add the following configuration:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Redirect HTTP to HTTPS (after SSL setup)
    # return 301 https://$server_name$request_uri;

    # For initial setup without SSL:
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Socket.IO specific
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_buffering off;
    }

    # Serve static files
    location /uploads/ {
        alias /var/www/chatter-socket/uploads/;
        expires 1M;
        access_log off;
        add_header Cache-Control "public, immutable";
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
}
```

### 2. Enable Site

```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/chatter-socket /etc/nginx/sites-enabled/

# Remove default site (optional)
sudo rm /etc/nginx/sites-enabled/default

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

## phpMyAdmin Setup

### 1. Install phpMyAdmin

```bash
sudo apt install phpmyadmin php-mbstring php-zip php-gd php-json php-curl -y
```

During installation:
- Select "apache2" (press Space to select, then Tab and Enter)
- Choose "Yes" to configure database for phpMyAdmin
- Set phpMyAdmin password

### 2. Install Apache (if not already installed)

```bash
sudo apt install apache2 -y
sudo systemctl enable apache2
```

### 3. Configure Apache for phpMyAdmin

```bash
# Enable required modules
sudo phpenmod mbstring
sudo systemctl restart apache2

# Create Apache virtual host for phpMyAdmin
sudo nano /etc/apache2/sites-available/phpmyadmin.conf
```

Add the following:

```apache
<VirtualHost *:8080>
    ServerName yourdomain.com
    DocumentRoot /usr/share/phpmyadmin
    
    <Directory /usr/share/phpmyadmin>
        Options FollowSymLinks
        DirectoryIndex index.php
        AllowOverride All
        Require all granted
    </Directory>

    ErrorLog ${APACHE_LOG_DIR}/phpmyadmin_error.log
    CustomLog ${APACHE_LOG_DIR}/phpmyadmin_access.log combined
</VirtualHost>
```

### 4. Configure Apache Ports

```bash
sudo nano /etc/apache2/ports.conf
```

Add:
```apache
Listen 8080
```

### 5. Enable phpMyAdmin Site

```bash
sudo a2ensite phpmyadmin.conf
sudo systemctl restart apache2
```

### 6. Create phpMyAdmin User (Optional)

```bash
sudo mysql -u root -p
```

```sql
CREATE USER 'phpmyadmin'@'localhost' IDENTIFIED BY 'strong_password_here';
GRANT ALL PRIVILEGES ON *.* TO 'phpmyadmin'@'localhost' WITH GRANT OPTION;
FLUSH PRIVILEGES;
EXIT;
```

### 7. Access phpMyAdmin

Visit: `http://yourdomain.com:8080/phpmyadmin`

**Database Connection Details:**
- Server: `localhost`
- Username: `chatter_user` (or `phpmyadmin`)
- Password: `your_password`
- Database: `chatter`

## SSL Certificate Setup

### 1. Install Certbot

```bash
sudo apt install certbot python3-certbot-nginx -y
```

### 2. Obtain SSL Certificate

```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

### 3. Auto-renewal Setup

```bash
# Test auto-renewal
sudo certbot renew --dry-run

# Check crontab (should be automatic)
sudo crontab -l
```

### 4. Update Nginx Configuration for HTTPS

After SSL setup, update `/etc/nginx/sites-available/chatter-socket`:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    
    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;

    # ... rest of your configuration
}
```

## Monitoring and Maintenance

### 1. Set up Log Rotation

```bash
sudo nano /etc/logrotate.d/chatter-socket
```

```
/var/www/chatter-socket/logs/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 www-data www-data
    postrotate
        pm2 reloadLogs
    endscript
}
```

### 2. Firewall Configuration

```bash
# Enable UFW
sudo ufw enable

# Allow SSH
sudo ufw allow ssh

# Allow HTTP and HTTPS
sudo ufw allow 'Nginx Full'

# Allow MySQL (if needed from external)
sudo ufw allow 3306

# Allow phpMyAdmin port
sudo ufw allow 8080

# Check status
sudo ufw status
```

### 3. Backup Script

Create `/home/ubuntu/backup.sh`:

```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/home/ubuntu/backups"
DB_NAME="chatter"
DB_USER="chatter_user"
DB_PASS="your_password"

mkdir -p $BACKUP_DIR

# Backup database
mysqldump -u $DB_USER -p$DB_PASS $DB_NAME > $BACKUP_DIR/chatter_db_$DATE.sql

# Backup uploads
tar -czf $BACKUP_DIR/uploads_$DATE.tar.gz /var/www/chatter-socket/uploads

# Remove backups older than 7 days
find $BACKUP_DIR -type f -mtime +7 -delete

echo "Backup completed: $DATE"
```

Make it executable and add to crontab:

```bash
chmod +x /home/ubuntu/backup.sh

# Add to crontab (daily at 2 AM)
crontab -e
# Add: 0 2 * * * /home/ubuntu/backup.sh
```

### 4. Monitoring Commands

```bash
# Check system resources
htop

# Check disk usage
df -h

# Check memory usage
free -m

# Check Nginx status
sudo systemctl status nginx

# Check MySQL status
sudo systemctl status mysql

# Check application logs
pm2 logs chatter-socket

# Check Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

## Deployment Checklist

- [ ] Server updated and secured
- [ ] Node.js and PM2 installed
- [ ] MySQL installed and configured
- [ ] Database created with proper user
- [ ] Application cloned and built
- [ ] Environment variables configured
- [ ] PM2 configured and running
- [ ] Nginx configured and running
- [ ] phpMyAdmin installed and accessible
- [ ] SSL certificate installed
- [ ] Firewall configured
- [ ] Backup script configured
- [ ] Domain DNS pointing to server

## Troubleshooting

### Common Issues

1. **PM2 app not starting:**
   ```bash
   pm2 logs chatter-socket
   # Check for port conflicts or missing dependencies
   ```

2. **Nginx 502 Bad Gateway:**
   ```bash
   # Check if app is running
   pm2 status
   # Check Nginx error logs
   sudo tail -f /var/log/nginx/error.log
   ```

3. **Database connection issues:**
   ```bash
   # Test MySQL connection
   mysql -u chatter_user -p chatter
   # Check if user has proper permissions
   ```

4. **File upload issues:**
   ```bash
   # Check uploads directory permissions
   ls -la uploads/
   sudo chown -R www-data:www-data uploads/
   ```

5. **Socket.IO connection issues:**
   - Ensure Nginx proxy configuration includes WebSocket headers
   - Check firewall settings
   - Verify client connection URL

## Support

For issues and support:
- Check application logs: `pm2 logs chatter-socket`
- Check system logs: `sudo journalctl -u nginx`
- Monitor resources: `pm2 monit`

---

**Note:** Replace `yourdomain.com` with your actual domain name and update all passwords with strong, unique passwords.
