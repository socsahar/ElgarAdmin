# ELGAR ADMIN SITE - DEPLOYMENT REQUIREMENTS
# Complete Hosting & Deployment Guide
# Created: August 2025

## OVERVIEW
This document contains all requirements for deploying the Elgar Admin Site to production hosting.
The system consists of:
- React.js Frontend (client/) with Hebrew RTL support
- Node.js/Express Backend (server/) with real-time features
- Supabase PostgreSQL Database
- File Upload System for profile photos
- Real-time WebSocket connections

## RUNTIME REQUIREMENTS

### 1. NODE.JS VERSION
- **Minimum**: Node.js 16.x or higher
- **Recommended**: Node.js 18.x or 20.x LTS
- **Package Manager**: npm 8+ or yarn 1.22+

### 2. SERVER ENVIRONMENT VARIABLES (.env)
Create a `.env` file in the server directory with the following variables:

```env
# Application Configuration
NODE_ENV=production
PORT=5000

# Supabase Database Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# JWT Configuration
JWT_SECRET=your-very-long-random-secret-key-here-minimum-32-characters

# Client URL (for CORS)
CLIENT_URL=https://your-domain.com

# Security Settings
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=1000
```

## PACKAGE DEPENDENCIES

### 3. SERVER DEPENDENCIES (server/package.json)
```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.53.0",
    "bcrypt": "^6.0.0",
    "bcryptjs": "^2.4.3",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "express": "^4.18.2",
    "express-rate-limit": "^7.1.5",
    "express-validator": "^7.0.1",
    "helmet": "^7.1.0",
    "joi": "^17.11.0",
    "jsonwebtoken": "^9.0.2",
    "moment": "^2.29.4",
    "mongoose": "^8.0.3",
    "multer": "^1.4.5-lts.1",
    "socket.io": "^4.7.4",
    "swagger-jsdoc": "^6.2.8",
    "swagger-ui-express": "^5.0.0"
  }
}
```

### 4. CLIENT DEPENDENCIES (client/package.json)
```json
{
  "dependencies": {
    "@emotion/cache": "^11.14.0",
    "@emotion/react": "^11.11.1",
    "@emotion/styled": "^11.11.0",
    "@fontsource/heebo": "^5.2.6",
    "@mui/icons-material": "^5.14.19",
    "@mui/material": "^5.14.20",
    "@mui/x-data-grid": "^6.18.2",
    "@mui/x-date-pickers": "^6.18.2",
    "@supabase/supabase-js": "^2.53.0",
    "axios": "^1.6.2",
    "date-fns": "^2.30.0",
    "mui-file-input": "^3.0.1",
    "notistack": "^3.0.1",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-hook-form": "^7.48.2",
    "react-query": "^3.39.3",
    "react-router-dom": "^6.20.1",
    "react-scripts": "5.0.1",
    "recharts": "^2.15.4",
    "socket.io-client": "^4.7.4",
    "stylis": "^4.3.6",
    "stylis-plugin-rtl": "^2.1.1"
  }
}
```

## DATABASE SETUP

### 5. SUPABASE POSTGRESQL DATABASE
**Required Supabase Project Setup:**

1. **Create Supabase Project**: https://supabase.com
2. **Run Database Schema**: Execute `/database-setup.sql` in Supabase SQL Editor
3. **Configure Row Level Security (RLS)**: 
   - Enable RLS on all tables
   - Create policies for admin access
4. **Get Connection Details**:
   - Project URL: `https://YOUR_PROJECT.supabase.co`
   - Anon Key: Found in Project Settings > API
   - Service Role Key: Found in Project Settings > API (keep secret!)

**Database Tables Created:**
- `users` - User management with Hebrew roles and car information
- `volunteers` - Extended volunteer information and location tracking
- `events` - Car theft event tracking with intelligent categorization
- `event_responses` - User responses to events with location data
- `event_volunteer_assignments` - Volunteer task assignments with proper relationships
- `action_reports` - Incident reporting with digital signatures
- `system_messages` - Admin notifications with targeting
- `message_reads` - Message tracking and read receipts
- `logs` - System activity logging with user attribution
- `app_settings` - Application configuration management

**Required PostgreSQL Extensions:**
- `uuid-ossp` - For UUID generation
- Built-in ENUM types for Hebrew role system

### 6. DATABASE MIGRATION
**Important**: Run the migration script after initial setup:
```sql
-- Execute database-setup.sql in Supabase SQL Editor
-- This creates all tables, constraints, and default data
```

## FILE SYSTEM REQUIREMENTS

### 7. DIRECTORY STRUCTURE
```
/var/www/elgar-admin/
├── client/                 # React frontend (built)
│   └── build/             # Static files served by web server
├── server/                # Node.js backend
│   ├── uploads/          # User uploaded files (create with write permissions)
│   │   └── profile-photos/  # Profile photo storage
│   ├── config/
│   ├── routes/
│   ├── middleware/
│   ├── utils/
│   ├── scripts/
│   └── index.js          # Main server file
└── .env                  # Environment variables
```

### 8. FILE PERMISSIONS
```bash
# Upload directory must be writable by Node.js process
chmod 755 /var/www/elgar-admin/server/uploads/
chmod 755 /var/www/elgar-admin/server/uploads/profile-photos/

# Ensure Node.js can read all application files
chown -R www-data:www-data /var/www/elgar-admin/
```

## WEB SERVER CONFIGURATION

### 9. NGINX CONFIGURATION (Recommended)
```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    # SSL Configuration
    ssl_certificate /path/to/your/certificate.crt;
    ssl_certificate_key /path/to/your/private.key;
    
    # Serve React static files
    location / {
        root /var/www/elgar-admin/client/build;
        try_files $uri $uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
    
    # Proxy API requests to Node.js
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # Serve uploaded files
    location /uploads/ {
        alias /var/www/elgar-admin/server/uploads/;
        add_header X-Content-Type-Options nosniff;
        add_header X-Frame-Options DENY;
    }
    
    # Socket.IO support
    location /socket.io/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
    }
    
    # Security headers
    add_header X-Content-Type-Options nosniff;
    add_header X-Frame-Options DENY;
    add_header X-XSS-Protection "1; mode=block";
    add_header Referrer-Policy strict-origin-when-cross-origin;
}
```

### 10. APACHE CONFIGURATION (Alternative)
```apache
<VirtualHost *:80>
    ServerName your-domain.com
    Redirect permanent / https://your-domain.com/
</VirtualHost>

<VirtualHost *:443>
    ServerName your-domain.com
    
    # SSL Configuration
    SSLEngine on
    SSLCertificateFile /path/to/your/certificate.crt
    SSLCertificateKeyFile /path/to/your/private.key
    
    # Document root for React build
    DocumentRoot /var/www/elgar-admin/client/build
    
    # Serve React app
    <Directory /var/www/elgar-admin/client/build>
        Options Indexes FollowSymLinks
        AllowOverride All
        Require all granted
        
        # React Router support
        RewriteEngine On
        RewriteBase /
        RewriteRule ^index\.html$ - [L]
        RewriteCond %{REQUEST_FILENAME} !-f
        RewriteCond %{REQUEST_FILENAME} !-d
        RewriteRule . /index.html [L]
    </Directory>
    
    # Proxy API requests
    ProxyPass /api/ http://localhost:5000/api/
    ProxyPassReverse /api/ http://localhost:5000/api/
    
    # Proxy uploads
    ProxyPass /uploads/ http://localhost:5000/uploads/
    ProxyPassReverse /uploads/ http://localhost:5000/uploads/
    
    # Socket.IO support
    ProxyPass /socket.io/ ws://localhost:5000/socket.io/
    ProxyPassReverse /socket.io/ ws://localhost:5000/socket.io/
</VirtualHost>
```

## PROCESS MANAGEMENT

### 11. PM2 CONFIGURATION (Recommended)
Install PM2 globally:
```bash
npm install -g pm2
```

Create `ecosystem.config.js`:
```javascript
module.exports = {
  apps: [{
    name: 'elgar-admin',
    script: './server/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'development'
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    watch: false,
    max_memory_restart: '500M'
  }]
};
```

Start with PM2:
```bash
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

### 12. SYSTEMD SERVICE (Alternative)
Create `/etc/systemd/system/elgar-admin.service`:
```ini
[Unit]
Description=Elgar Admin Node.js App
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/elgar-admin
Environment=NODE_ENV=production
ExecStart=/usr/bin/node server/index.js
Restart=on-failure
RestartSec=5
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=elgar-admin

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
systemctl enable elgar-admin
systemctl start elgar-admin
```

## SECURITY CONSIDERATIONS

### 13. FIREWALL CONFIGURATION
```bash
# Allow HTTP/HTTPS
ufw allow 80
ufw allow 443

# Allow SSH (if needed)
ufw allow 22

# Block direct access to Node.js port
ufw deny 5000

# Enable firewall
ufw enable
```

### 14. SSL CERTIFICATE
**Options:**
1. **Let's Encrypt (Free)**:
   ```bash
   certbot --nginx -d your-domain.com
   ```

2. **Commercial Certificate**: Follow your provider's instructions

3. **Cloudflare** (Recommended for additional protection)

### 15. ENVIRONMENT SECURITY
- Never commit `.env` files to version control
- Use strong JWT secrets (32+ characters)
- Enable Supabase RLS policies
- Regularly update dependencies
- Monitor logs for suspicious activity

## MONITORING & LOGGING

### 16. LOG MANAGEMENT
**Log Locations:**
- Application logs: `./logs/` (if using PM2)
- System logs: `/var/log/syslog`
- Nginx logs: `/var/log/nginx/`

**Log Rotation:**
```bash
# Add to /etc/logrotate.d/elgar-admin
/var/www/elgar-admin/logs/*.log {
    daily
    missingok
    rotate 52
    compress
    notifempty
    sharedscripts
    postrotate
        pm2 reload elgar-admin
    endscript
}
```

### 17. MONITORING TOOLS
**Recommended:**
- **Uptime monitoring**: UptimeRobot, Pingdom
- **Error tracking**: Sentry
- **Performance**: New Relic, DataDog
- **Database monitoring**: Supabase built-in dashboard

## DEPLOYMENT CHECKLIST

### 18. PRE-DEPLOYMENT CHECKLIST
- [ ] Node.js 16+ installed
- [ ] Supabase project created and configured
- [ ] Environment variables set in `.env`
- [ ] Database schema executed (`database-setup.sql`)
- [ ] SSL certificate installed
- [ ] Web server configured (Nginx/Apache)
- [ ] File permissions set correctly
- [ ] Firewall configured
- [ ] Process manager configured (PM2/Systemd)

### 19. DEPLOYMENT STEPS
```bash
# 1. Clone/upload application files
git clone your-repo /var/www/elgar-admin
cd /var/www/elgar-admin

# 2. Install dependencies
npm run install-all

# 3. Build React frontend
npm run build

# 4. Set up environment
cp .env.example .env
nano .env  # Configure your variables

# 5. Create upload directories
mkdir -p server/uploads/profile-photos
chmod 755 server/uploads/profile-photos

# 6. Start the application
pm2 start ecosystem.config.js --env production

# 7. Configure web server
# (Copy nginx/apache config and reload)

# 8. Test the deployment
curl -f http://localhost:5000/api/health
```

### 20. POST-DEPLOYMENT VERIFICATION
- [ ] Website loads correctly
- [ ] API endpoints respond
- [ ] WebSocket connections work
- [ ] File uploads function
- [ ] Database operations succeed
- [ ] SSL certificate valid
- [ ] All security headers present
- [ ] Performance acceptable
- [ ] Monitoring active

## MAINTENANCE

### 21. REGULAR MAINTENANCE
**Weekly:**
- Check application logs
- Monitor resource usage
- Verify backups

**Monthly:**
- Update dependencies: `npm audit fix`
- Review security patches
- Performance analysis

**Quarterly:**
- Update Node.js version
- Review and update SSL certificates
- Database optimization

### 22. BACKUP STRATEGY
**Database:** Supabase automatic backups + manual exports
**Files:** Regular backup of `/var/www/elgar-admin/server/uploads/`
**Configuration:** Version control for all config files

## TROUBLESHOOTING

### 23. COMMON ISSUES
**Database Connection:**
- Verify Supabase URL and keys
- Check network connectivity
- Confirm RLS policies

**File Uploads:**
- Check directory permissions
- Verify disk space
- Confirm multer configuration

**WebSocket Issues:**
- Verify proxy configuration
- Check firewall rules
- Confirm Socket.IO compatibility

**Performance:**
- Monitor memory usage
- Check database query performance
- Optimize static file serving

## SUPPORT INFORMATION

### 24. TECHNICAL SPECIFICATIONS
- **Frontend**: React 18.x with Material-UI 5.x and Hebrew RTL support
- **Backend**: Node.js 16+ with Express 4.x and comprehensive API system
- **Database**: PostgreSQL (via Supabase) with 10 tables and Hebrew ENUM types
- **Real-time**: Socket.IO 4.x for live user tracking and updates
- **Authentication**: JWT with bcrypt and forced password changes
- **File Upload**: Multer with security validation and ID-based naming
- **Volunteer System**: Complete assignment management with database persistence
- **Language**: Hebrew RTL interface with Israeli localization

### 25. CONTACT & DOCUMENTATION
- **API Documentation**: `https://your-domain.com/api/docs` (Swagger)
- **Frontend Build**: React production build in `client/build/`
- **Backend Entry**: `server/index.js`
- **Database Schema**: `database-setup.sql`

---

**IMPORTANT NOTES:**
1. This system requires HTTPS in production for security
2. Supabase keys must be kept secure and never exposed
3. Regular security updates are essential
4. Monitor file upload storage usage
5. Database backups are critical for data protection

**Last Updated**: August 2025
**Version**: 1.0.0
