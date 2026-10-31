#!/usr/bin/env bash
set -e

# ==============================================================================
# Judgement Card Game: AWS EC2 Initialization Script
# Run this script once on your fresh Ubuntu 24.04 / 22.04 AWS EC2 instance.
# Usage: ./setup-aws-ec2.sh <your-duckdns-domain>
# Example: ./setup-aws-ec2.sh judgement-api.duckdns.org
# ==============================================================================

export DEBIAN_FRONTEND=noninteractive

DOMAIN_NAME=${1:-""}
if [ -z "$DOMAIN_NAME" ]; then
    echo "ERROR: Please provide your domain name as the first argument."
    echo "Usage: ./setup-aws-ec2.sh <your-domain>"
    echo "Example: ./setup-aws-ec2.sh judgement-api.duckdns.org"
    exit 1
fi

echo ">>> [1/7] Updating system packages..."
sudo -E apt update && sudo -E apt upgrade -y -o Dpkg::Options::="--force-confdef" -o Dpkg::Options::="--force-confold"
sudo -E apt install -y ca-certificates curl gnupg lsb-release ufw unzip

echo ">>> [2/7] Configuring 2GB Swap Memory (prevents OOM on t3.micro 1GB RAM)..."
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

echo ">>> [3/7] Installing Docker Engine..."
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

echo ">>> [4/7] Installing AWS CLI v2..."
if ! command -v aws &> /dev/null; then
    curl -fsSL "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
    unzip -q awscliv2.zip
    sudo ./aws/install
    rm -rf aws awscliv2.zip
    echo "AWS CLI v2 installed successfully."
else
    echo "AWS CLI already installed, skipping."
fi

echo ">>> [5/7] Installing Nginx and Certbot for SSL..."
sudo -E apt install -y -o Dpkg::Options::="--force-confdef" -o Dpkg::Options::="--force-confold" nginx certbot python3-certbot-nginx

echo ">>> [6/7] Creating Nginx Reverse Proxy Configuration with WebSocket support..."
sudo bash -c "cat > /etc/nginx/sites-available/judgement <<EOF
server {
    listen 80;
    server_name ${DOMAIN_NAME};

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;

        # WebSocket support headers
        proxy_set_header Upgrade \\\$http_upgrade;
        proxy_set_header Connection \"upgrade\";

        # Forwarded request headers
        proxy_set_header Host \\\$host;
        proxy_set_header X-Real-IP \\\$remote_addr;
        proxy_set_header X-Forwarded-For \\\$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \\\$scheme;

        # Long timeouts to prevent WebSocket game disconnection
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
        proxy_connect_timeout 60s;
    }
}
EOF"

# Enable configuration and reload Nginx
sudo rm -f /etc/nginx/sites-enabled/default
sudo ln -sf /etc/nginx/sites-available/judgement /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

echo ">>> [7/7] Obtaining SSL Certificate via Certbot..."
sudo certbot --nginx -d "${DOMAIN_NAME}" --non-interactive --agree-tos --register-unsafely-without-email || {
    echo "Certbot automated setup failed or domain DNS not yet pointing to this IP."
    echo "Make sure your domain (${DOMAIN_NAME}) points to this server's Elastic IP, then run:"
    echo "  sudo certbot --nginx -d ${DOMAIN_NAME}"
}

echo "------------------------------------------------------------------------"
echo "✅ EC2 SETUP COMPLETE!"
echo "------------------------------------------------------------------------"
echo "To apply Docker permissions to your current shell session, run:"
echo "  newgrp docker"
echo "------------------------------------------------------------------------"
