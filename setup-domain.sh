#!/bin/bash

# Domain Setup Script for evidra.online
DOMAIN="evidra.online"
EMAIL="muralikrishnamoorthy27@gmail.com"  # Change this to your email

echo "Setting up domain: $DOMAIN"

# Install Certbot
sudo apt update
sudo apt install -y certbot python3-certbot-nginx

# Stop containers temporarily
cd ~/app
sudo docker compose down

# Install Nginx if not already installed
sudo apt install -y nginx

# Create Nginx config for the domain
sudo tee /etc/nginx/sites-available/evidra.online > /dev/null <<EOF
server {
    listen 80;
    server_name evidra.online www.evidra.online;

    # Frontend
    location / {
        proxy_pass http://localhost:5173;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

# Enable the site
sudo ln -sf /etc/nginx/sites-available/evidra.online /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test Nginx config
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx

# Start containers
sudo docker compose up -d

# Wait for services to start
sleep 10

# Get SSL certificate
sudo certbot --nginx -d evidra.online -d www.evidra.online --non-interactive --agree-tos --email $EMAIL --redirect

# Setup auto-renewal
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer

echo "Domain setup complete!"
echo "Your site should be available at: https://evidra.online"
