#!/usr/bin/env bash
set -e

# ==============================================================================
# Judgement Card Game: Azure VM Initialization Script
# Run this script once on your fresh Ubuntu 22.04 / 24.04 Azure Linux VM
# ==============================================================================

export DEBIAN_FRONTEND=noninteractive

echo ">>> [1/6] Updating system packages..."
sudo -E apt update && sudo -E apt upgrade -y -o Dpkg::Options::="--force-confdef" -o Dpkg::Options::="--force-confold"
sudo -E apt install -y ca-certificates curl gnupg lsb-release ufw

echo ">>> [2/6] Configuring 2GB Swap Memory (prevents OOM on B1s 1GB RAM)..."
if [ ! -f /swapfile ]; then
    sudo fallocate -l 2G /swapfile
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
    echo "Swap created successfully."
else
    echo "Swapfile already exists, skipping."
fi

echo ">>> [3/6] Installing Docker Engine..."
sudo install -m 0755 -d /etc/apt/keyrings
if [ ! -f /etc/apt/keyrings/docker.gpg ]; then
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    sudo chmod a+r /etc/apt/keyrings/docker.gpg
fi

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo -E apt update
sudo -E apt install -y -o Dpkg::Options::="--force-confdef" -o Dpkg::Options::="--force-confold" docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Grant current user docker group access
sudo usermod -aG docker "$USER"
echo "Docker installed successfully."

echo ">>> [4/6] Installing Nginx and Certbot for SSL..."
sudo -E apt install -y -o Dpkg::Options::="--force-confdef" -o Dpkg::Options::="--force-confold" nginx certbot python3-certbot-nginx

echo ">>> [5/6] Creating Nginx Reverse Proxy Configuration..."
DOMAIN_NAME=${1:-"_"}

sudo bash -c "cat > /etc/nginx/sites-available/judgement <<EOF
server {
    listen 80;
    server_name ${DOMAIN_NAME};

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;

        # WebSocket support
        proxy_set_header Upgrade \\\$http_upgrade;
        proxy_set_header Connection \"upgrade\";

        # Forwarded request headers
        proxy_set_header Host \\\$host;
        proxy_set_header X-Real-IP \\\$remote_addr;
        proxy_set_header X-Forwarded-For \\\$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \\\$scheme;

        # Long timeouts to maintain active WebSocket games
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
        proxy_connect_timeout 60s;
    }
}
EOF"

# Enable the configuration
sudo rm -f /etc/nginx/sites-enabled/default
sudo ln -sf /etc/nginx/sites-available/judgement /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

echo ">>> [6/6] VM Setup Complete!"
echo "------------------------------------------------------------------------"
echo "NEXT STEPS:"
echo "1. Run the following command with your Azure domain to issue a free SSL certificate:"
echo "   sudo certbot --nginx -d <your-azure-dns-name>"
echo "   Example: sudo certbot --nginx -d judgement-api.eastus.cloudapp.azure.com"
echo "2. Re-login or run 'newgrp docker' to enable running Docker without sudo."
echo "------------------------------------------------------------------------"
