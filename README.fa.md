<div dir="rtl" style="text-align: right;">

<style>
pre, code, .highlight {
    direction: ltr !important;
    text-align: left !important;
}
</style>

# چتر سوکت - راهنمای استقرار

یک اپلیکیشن چت بلادرنگ ساخته شده با Node.js، TypeScript، Socket.IO و Prisma.

## فهرست مطالب

- [نمای کلی پروژه](#نمای-کلی-پروژه)
- [پیش‌نیازها](#پیش‌نیازها)
- [راه‌اندازی سرور](#راه‌اندازی-سرور)
- [راه‌اندازی پایگاه داده](#راه‌اندازی-پایگاه-داده)
- [استقرار اپلیکیشن](#استقرار-اپلیکیشن)
- [پیکربندی Nginx](#پیکربندی-nginx)
- [مدیریت فرآیند PM2](#مدیریت-فرآیند-pm2)
- [راه‌اندازی phpMyAdmin](#راه‌اندازی-phpmyadmin)
- [راه‌اندازی گواهی SSL](#راه‌اندازی-گواهی-ssl)
- [نظارت و نگهداری](#نظارت-و-نگهداری)

## نمای کلی پروژه

این یک اپلیکیشن چت بلادرنگ با ویژگی‌های زیر است:
- پیام‌رسانی بلادرنگ با Socket.IO
- قابلیت آپلود فایل
- قابلیت تماس صوتی/تصویری
- احراز هویت کاربر با JWT
- پایگاه داده MySQL با Prisma ORM
- اعلان‌های پوش Firebase

## پیش‌نیازها

قبل از استقرار، اطمینان حاصل کنید که دارید:
- Ubuntu 20.04 یا بالاتر
- نام دامنه که به سرور شما اشاره می‌کند
- دسترسی root یا sudo

## راه‌اندازی سرور

### ۱. به‌روزرسانی سیستم

<div dir="ltr">

```bash
sudo apt update && sudo apt upgrade -y
```

</div>

### ۲. نصب Node.js (از طریق NodeSource)

<div dir="ltr">

```bash
# نصب Node.js 18.x (LTS)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# تأیید نصب
node --version
npm --version
```

</div>

### ۳. نصب PM2 به صورت سراسری

<div dir="ltr">

```bash
sudo npm install -g pm2
```

</div>

### ۴. نصب Nginx

<div dir="ltr">

```bash
sudo apt install nginx -y
sudo systemctl start nginx
sudo systemctl enable nginx
```

</div>

### ۵. نصب MySQL

<div dir="ltr">

```bash
sudo apt install mysql-server -y
sudo systemctl start mysql
sudo systemctl enable mysql

# ایمن‌سازی نصب MySQL
sudo mysql_secure_installation
```

</div>

## راه‌اندازی پایگاه داده

### ۱. ایجاد پایگاه داده و کاربر

<div dir="ltr">

```bash
sudo mysql -u root -p
```

</div>

<div dir="ltr">

```sql
-- ایجاد پایگاه داده
CREATE DATABASE chatter;

-- ایجاد کاربر و اعطای مجوزها
CREATE USER 'chatter_user'@'localhost' IDENTIFIED BY 'your_strong_password';
GRANT ALL PRIVILEGES ON chatter.* TO 'chatter_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

</div>

### ۲. به‌روزرسانی متغیرهای محیطی

ایجاد فایل `.env.production`:

<div dir="ltr">

```bash
DATABASE_URL="mysql://chatter_user:your_strong_password@localhost:3306/chatter"
SECRET_KEY="your_jwt_secret_key_here"
CDN_HOST="https://yourdomain.com"
PORT=3000
NODE_ENV=production
```

</div>

## استقرار اپلیکیشن

### ۱. کلون کردن مخزن

<div dir="ltr">

```bash
cd /var/www
sudo git clone https://github.com/yourusername/chatter-socket.git
sudo chown -R $USER:$USER /var/www/chatter-socket
cd chatter-socket
```

</div>

### ۲. نصب وابستگی‌ها

<div dir="ltr">

```bash
npm install
```

</div>

### ۳. ساخت اپلیکیشن

<div dir="ltr">

```bash
npm run build
```

</div>

### ۴. اجرای مهاجرت‌های پایگاه داده

<div dir="ltr">

```bash
# کپی فایل محیط تولید
cp .env.production .env

# تولید کلاینت Prisma
npx prisma generate

# اجرای مهاجرت‌ها
npx prisma migrate deploy
```

</div>

### ۵. ایجاد دایرکتوری آپلودها

<div dir="ltr">

```bash
mkdir -p uploads
sudo chown -R www-data:www-data uploads
sudo chmod -R 755 uploads
```

</div>

## مدیریت فرآیند PM2

### ۱. ایجاد فایل اکوسیستم PM2

ایجاد `ecosystem.config.js`:

<div dir="ltr">

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

</div>

### ۲. ایجاد دایرکتوری لاگ‌ها

<div dir="ltr">

```bash
mkdir -p logs
```

</div>

### ۳. شروع اپلیکیشن با PM2

<div dir="ltr">

```bash
# شروع در حالت تولید
pm2 start ecosystem.config.js --env production

# ذخیره پیکربندی PM2
pm2 save

# راه‌اندازی PM2 برای شروع در زمان بوت
pm2 startup
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u $USER --hp $HOME
```

</div>

### ۴. دستورات مدیریت PM2

<div dir="ltr">

```bash
# بررسی وضعیت
pm2 status

# مشاهده لاگ‌ها
pm2 logs chatter-socket

# راه‌اندازی مجدد اپلیکیشن
pm2 restart chatter-socket

# توقف اپلیکیشن
pm2 stop chatter-socket

# حذف اپلیکیشن
pm2 delete chatter-socket

# نظارت بر منابع
pm2 monit
```

</div>

## پیکربندی Nginx

### ۱. ایجاد پیکربندی Nginx

<div dir="ltr">

```bash
sudo nano /etc/nginx/sites-available/chatter-socket
```

</div>

پیکربندی زیر را اضافه کنید:

<div dir="ltr">

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # تغییر مسیر HTTP به HTTPS (پس از راه‌اندازی SSL)
    # return 301 https://$server_name$request_uri;

    # برای راه‌اندازی اولیه بدون SSL:
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
        
        # مخصوص Socket.IO
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_buffering off;
    }

    # سرو فایل‌های استاتیک
    location /uploads/ {
        alias /var/www/chatter-socket/uploads/;
        expires 1M;
        access_log off;
        add_header Cache-Control "public, immutable";
    }

    # هدرهای امنیتی
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # فشرده‌سازی Gzip
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
}
```

</div>

### ۲. فعال‌سازی سایت

<div dir="ltr">

```bash
# فعال‌سازی سایت
sudo ln -s /etc/nginx/sites-available/chatter-socket /etc/nginx/sites-enabled/

# حذف سایت پیش‌فرض (اختیاری)
sudo rm /etc/nginx/sites-enabled/default

# تست پیکربندی
sudo nginx -t

# راه‌اندازی مجدد Nginx
sudo systemctl restart nginx
```

</div>

## راه‌اندازی phpMyAdmin

### ۱. نصب phpMyAdmin

<div dir="ltr">

```bash
sudo apt install phpmyadmin php-mbstring php-zip php-gd php-json php-curl -y
```

</div>

در طول نصب:
- "apache2" را انتخاب کنید (Space را برای انتخاب، سپس Tab و Enter فشار دهید)
- "Yes" را برای پیکربندی پایگاه داده phpMyAdmin انتخاب کنید
- رمز عبور phpMyAdmin را تنظیم کنید

### ۲. نصب Apache (اگر قبلاً نصب نشده)

<div dir="ltr">

```bash
sudo apt install apache2 -y
sudo systemctl enable apache2
```

</div>

### ۳. پیکربندی Apache برای phpMyAdmin

<div dir="ltr">

```bash
# فعال‌سازی ماژول‌های مورد نیاز
sudo phpenmod mbstring
sudo systemctl restart apache2

# ایجاد میزبان مجازی Apache برای phpMyAdmin
sudo nano /etc/apache2/sites-available/phpmyadmin.conf
```

</div>

موارد زیر را اضافه کنید:

<div dir="ltr">

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

</div>

### ۴. پیکربندی پورت‌های Apache

<div dir="ltr">

```bash
sudo nano /etc/apache2/ports.conf
```

</div>

اضافه کنید:

<div dir="ltr">

```apache
Listen 8080
```

</div>

### ۵. فعال‌سازی سایت phpMyAdmin

<div dir="ltr">

```bash
sudo a2ensite phpmyadmin.conf
sudo systemctl restart apache2
```

</div>

### ۶. ایجاد کاربر phpMyAdmin (اختیاری)

<div dir="ltr">

```bash
sudo mysql -u root -p
```

</div>

<div dir="ltr">

```sql
CREATE USER 'phpmyadmin'@'localhost' IDENTIFIED BY 'strong_password_here';
GRANT ALL PRIVILEGES ON *.* TO 'phpmyadmin'@'localhost' WITH GRANT OPTION;
FLUSH PRIVILEGES;
EXIT;
```

</div>

### ۷. دسترسی به phpMyAdmin

بازدید کنید: `http://yourdomain.com:8080/phpmyadmin`

**جزئیات اتصال پایگاه داده:**
- سرور: `localhost`
- نام کاربری: `chatter_user` (یا `phpmyadmin`)
- رمز عبور: `your_password`
- پایگاه داده: `chatter`

## راه‌اندازی گواهی SSL

### ۱. نصب Certbot

<div dir="ltr">

```bash
sudo apt install certbot python3-certbot-nginx -y
```

</div>

### ۲. دریافت گواهی SSL

<div dir="ltr">

```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

</div>

### ۳. راه‌اندازی تجدید خودکار

<div dir="ltr">

```bash
# تست تجدید خودکار
sudo certbot renew --dry-run

# بررسی crontab (باید خودکار باشد)
sudo crontab -l
```

</div>

### ۴. به‌روزرسانی پیکربندی Nginx برای HTTPS

پس از راه‌اندازی SSL، `/etc/nginx/sites-available/chatter-socket` را به‌روزرسانی کنید:

<div dir="ltr">

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
    
    # پیکربندی SSL
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;

    # ... بقیه پیکربندی شما
}
```

</div>

## نظارت و نگهداری

### ۱. راه‌اندازی چرخش لاگ

<div dir="ltr">

```bash
sudo nano /etc/logrotate.d/chatter-socket
```

</div>

<div dir="ltr">

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

</div>

### ۲. پیکربندی فایروال

<div dir="ltr">

```bash
# فعال‌سازی UFW
sudo ufw enable

# اجازه SSH
sudo ufw allow ssh

# اجازه HTTP و HTTPS
sudo ufw allow 'Nginx Full'

# اجازه MySQL (در صورت نیاز از خارج)
sudo ufw allow 3306

# اجازه پورت phpMyAdmin
sudo ufw allow 8080

# بررسی وضعیت
sudo ufw status
```

</div>

### ۳. اسکریپت پشتیبان‌گیری

ایجاد `/home/ubuntu/backup.sh`:

<div dir="ltr">

```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/home/ubuntu/backups"
DB_NAME="chatter"
DB_USER="chatter_user"
DB_PASS="your_password"

mkdir -p $BACKUP_DIR

# پشتیبان‌گیری پایگاه داده
mysqldump -u $DB_USER -p$DB_PASS $DB_NAME > $BACKUP_DIR/chatter_db_$DATE.sql

# پشتیبان‌گیری آپلودها
tar -czf $BACKUP_DIR/uploads_$DATE.tar.gz /var/www/chatter-socket/uploads

# حذف پشتیبان‌های قدیمی‌تر از ۷ روز
find $BACKUP_DIR -type f -mtime +7 -delete

echo "پشتیبان‌گیری تکمیل شد: $DATE"
```

</div>

قابل اجرا کردن و اضافه کردن به crontab:

<div dir="ltr">

```bash
chmod +x /home/ubuntu/backup.sh

# اضافه کردن به crontab (روزانه در ساعت ۲ صبح)
crontab -e
# اضافه کنید: 0 2 * * * /home/ubuntu/backup.sh
```

</div>

### ۴. دستورات نظارت

<div dir="ltr">

```bash
# بررسی منابع سیستم
htop

# بررسی استفاده از دیسک
df -h

# بررسی استفاده از حافظه
free -m

# بررسی وضعیت Nginx
sudo systemctl status nginx

# بررسی وضعیت MySQL
sudo systemctl status mysql

# بررسی لاگ‌های اپلیکیشن
pm2 logs chatter-socket

# بررسی لاگ‌های Nginx
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

</div>

## چک‌لیست استقرار

- [ ] سرور به‌روزرسانی و ایمن شده
- [ ] Node.js و PM2 نصب شده
- [ ] MySQL نصب و پیکربندی شده
- [ ] پایگاه داده با کاربر مناسب ایجاد شده
- [ ] اپلیکیشن کلون و ساخته شده
- [ ] متغیرهای محیطی پیکربندی شده
- [ ] PM2 پیکربندی و در حال اجرا
- [ ] Nginx پیکربندی و در حال اجرا
- [ ] phpMyAdmin نصب و قابل دسترسی
- [ ] گواهی SSL نصب شده
- [ ] فایروال پیکربندی شده
- [ ] اسکریپت پشتیبان‌گیری پیکربندی شده
- [ ] DNS دامنه به سرور اشاره می‌کند

## عیب‌یابی

### مشکلات رایج

۱. **اپ PM2 شروع نمی‌شود:**

<div dir="ltr">

```bash
pm2 logs chatter-socket
# بررسی تضاد پورت یا وابستگی‌های گم‌شده
```

</div>

۲. **Nginx 502 Bad Gateway:**

<div dir="ltr">

```bash
# بررسی اجرای اپ
pm2 status
# بررسی لاگ‌های خطای Nginx
sudo tail -f /var/log/nginx/error.log
```

</div>

۳. **مشکلات اتصال پایگاه داده:**

<div dir="ltr">

```bash
# تست اتصال MySQL
mysql -u chatter_user -p chatter
# بررسی مجوزهای مناسب کاربر
```

</div>

۴. **مشکلات آپلود فایل:**

<div dir="ltr">

```bash
# بررسی مجوزهای دایرکتوری uploads
ls -la uploads/
sudo chown -R www-data:www-data uploads/
```

</div>

۵. **مشکلات اتصال Socket.IO:**
   - اطمینان از شامل بودن هدرهای WebSocket در پیکربندی پروکسی Nginx
   - بررسی تنظیمات فایروال
   - تأیید URL اتصال کلاینت

## پشتیبانی

برای مشکلات و پشتیبانی:
- بررسی لاگ‌های اپلیکیشن: `pm2 logs chatter-socket`
- بررسی لاگ‌های سیستم: `sudo journalctl -u nginx`
- نظارت بر منابع: `pm2 monit`

---

**نکته:** `yourdomain.com` را با نام دامنه واقعی خود جایگزین کنید و تمام رمزهای عبور را با رمزهای قوی و منحصر به فرد به‌روزرسانی کنید.

</div>
