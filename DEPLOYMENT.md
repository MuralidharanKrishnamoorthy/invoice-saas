# PayMe.ai Deployment Guide

## Prerequisites

- Docker & Docker Compose installed
- Node.js 18+ (for local development)
- Supabase account with database set up
- OpenAI API key
- Email SMTP credentials (optional, for email features)

---

## Environment Setup

### 1. Backend Environment Variables

Create `.env` file in `payme-backend/`:

```bash
# Server
NODE_ENV=production
PORT=3000
LOG_LEVEL=info

# Database (Supabase)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_KEY=your_service_key_here

# JWT (Generate a strong 32+ character secret)
JWT_SECRET=your_very_strong_secret_key_min_32_characters_here
JWT_EXPIRES_IN=7d

# OpenAI
OPENAI_API_KEY=sk-your-openai-api-key-here

# Email (Gmail SMTP)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-specific-password
EMAIL_FROM=PayMe.ai <noreply@payme.ai>

# Frontend URL
FRONTEND_URL=https://your-domain.com

# Cron Schedule (9 AM daily)
CRON_SCHEDULE=0 9 * * *

# Security
BCRYPT_SALT_ROUNDS=12
```

### 2. Run Database Migration

In Supabase SQL Editor, run:
```sql
-- Run migrations/001_add_clients_table.sql
```

---

## Deployment Options

### Option 1: Docker Compose (Recommended)

#### Build and Run
```bash
# Build images
docker-compose build

# Start services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

#### Access
- Frontend: http://localhost
- Backend: http://localhost:3000
- Health Check: http://localhost:3000/api/health

---

### Option 2: Separate Deployments

#### Backend (Railway/Heroku/DigitalOcean)

**Railway:**
```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Initialize project
cd payme-backend
railway init

# Add environment variables in Railway dashboard

# Deploy
railway up
```

**Heroku:**
```bash
# Install Heroku CLI
npm i -g heroku

# Login
heroku login

# Create app
cd payme-backend
heroku create payme-backend

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET=your_secret
# ... set all other env vars

# Deploy
git push heroku main
```

#### Frontend (Vercel/Netlify)

**Vercel:**
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
cd payme-frontend
vercel --prod

# Set environment variables in Vercel dashboard:
# VITE_API_URL=https://your-backend-url.com
```

**Netlify:**
```bash
# Install Netlify CLI
npm i -g netlify-cli

# Build
cd payme-frontend
npm run build

# Deploy
netlify deploy --prod --dir=dist
```

---

### Option 3: VPS (DigitalOcean/AWS/GCP)

#### 1. Set up server
```bash
# SSH into server
ssh root@your-server-ip

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
apt install docker-compose

# Install Node.js (optional, for PM2)
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs
```

#### 2. Clone repository
```bash
git clone https://github.com/yourusername/payme.git
cd payme
```

#### 3. Set up environment
```bash
# Create .env file
nano payme-backend/.env
# Paste your environment variables

# Create logs directory
mkdir -p payme-backend/logs
```

#### 4. Deploy with Docker
```bash
docker-compose up -d
```

#### 5. Set up Nginx reverse proxy
```bash
apt install nginx

# Create nginx config
nano /etc/nginx/sites-available/payme

# Add configuration:
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# Enable site
ln -s /etc/nginx/sites-available/payme /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

#### 6. Set up SSL with Let's Encrypt
```bash
apt install certbot python3-certbot-nginx
certbot --nginx -d your-domain.com
```

---

## Production Checklist

### Before Deployment
- [ ] Run database migrations
- [ ] Set all environment variables
- [ ] Generate strong JWT secret (32+ characters)
- [ ] Configure email SMTP
- [ ] Test OpenAI API key
- [ ] Update FRONTEND_URL to production domain
- [ ] Set NODE_ENV=production

### Security
- [ ] Enable HTTPS/SSL
- [ ] Set up firewall rules
- [ ] Configure rate limiting
- [ ] Review CORS settings
- [ ] Rotate secrets regularly
- [ ] Set up monitoring

### Monitoring
- [ ] Set up error tracking (Sentry)
- [ ] Configure uptime monitoring
- [ ] Set up log aggregation
- [ ] Configure alerts
- [ ] Set up database backups

---

## Maintenance

### View Logs
```bash
# Docker
docker-compose logs -f backend
docker-compose logs -f frontend

# PM2 (if using)
pm2 logs
```

### Update Application
```bash
# Pull latest code
git pull origin main

# Rebuild and restart
docker-compose down
docker-compose build
docker-compose up -d
```

### Database Backup
```bash
# Supabase has automatic backups
# Download backup from Supabase dashboard
```

### Scale Services
```bash
# Increase backend instances
docker-compose up -d --scale backend=3
```

---

## Troubleshooting

### Backend not starting
1. Check environment variables: `docker-compose logs backend`
2. Verify database connection
3. Check OpenAI API key validity

### Frontend not loading
1. Check nginx logs: `docker-compose logs frontend`
2. Verify API URL configuration
3. Check CORS settings

### Database connection errors
1. Verify Supabase credentials
2. Check network connectivity
3. Review firewall rules

### Email not sending
1. Verify SMTP credentials
2. Check email provider settings
3. Review logs for errors

---

## Performance Optimization

### Backend
- Enable compression (already configured)
- Use Redis for caching (optional)
- Optimize database queries
- Enable CDN for static assets

### Frontend
- Enable gzip compression (already configured)
- Use CDN for assets
- Optimize images
- Enable browser caching

---

## Monitoring & Alerts

### Recommended Tools
- **Error Tracking**: Sentry
- **Uptime Monitoring**: UptimeRobot, Pingdom
- **Log Management**: Logtail, Papertrail
- **Performance**: New Relic, DataDog

### Set up Sentry (Optional)
```bash
# Backend
npm install @sentry/node

# Add to server.js
const Sentry = require('@sentry/node');
Sentry.init({ dsn: 'your-sentry-dsn' });

# Frontend
npm install @sentry/react

# Add to main.jsx
import * as Sentry from '@sentry/react';
Sentry.init({ dsn: 'your-sentry-dsn' });
```

---

## Support

For issues or questions:
1. Check logs first
2. Review environment variables
3. Verify database connection
4. Check API key validity

---

## Quick Commands Reference

```bash
# Build
docker-compose build

# Start
docker-compose up -d

# Stop
docker-compose down

# Restart
docker-compose restart

# Logs
docker-compose logs -f

# Shell access
docker-compose exec backend sh
docker-compose exec frontend sh

# Remove everything
docker-compose down -v --rmi all
```

---

**Deployment Complete! 🎉**

Your PayMe.ai application is now running in production.
