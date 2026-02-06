#!/bin/bash

# Oracle Cloud Server Initialization Script
# Run this on your Ubuntu VM: curl -sSL https://raw.githubusercontent.com/.../setup.sh | bash

set -e

echo "--- Updating System ---"
sudo apt update && sudo apt upgrade -y

echo "--- Creating Swap Space (4GB for low RAM instances) ---"
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

echo "--- Installing Dependencies (Docker, Nginx) ---"
sudo apt install -y docker.io docker-compose nginx git ufw

echo "--- Configuring Firewall (OCI Internal) ---"
# OCI uses iptables by default sometimes, we ensure 80/443 are open
sudo iptables -I INPUT 6 -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -p tcp --dport 443 -j ACCEPT
sudo netfilter-persistent save || echo "netfilter-persistent not found, skipping save"

echo "--- Configuring UFW (Operating System) ---"
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable

echo "--- Setting up Nginx ---"
sudo systemctl enable nginx
sudo systemctl start nginx

echo "--- Setup Complete ---"
echo "Next steps:"
echo "1. Clone your repository."
echo "2. Copy your .env file."
echo "3. Run 'docker-compose up -d'."
