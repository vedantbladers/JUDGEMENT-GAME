# Complete End-to-End Azure Deployment Guide
### Judgement Multiplayer Card Game: Go Backend + Docker + Azure VM + PostgreSQL Flexible Server + Vercel Next.js

This guide provides **every single step, command, and setting** required to deploy your Go backend to Microsoft Azure and connect it to your live Vercel Next.js frontend with secure HTTPS and WebSockets (WSS).

---

## Architecture Overview

```
Next.js Frontend (Vercel)
         │
         │ HTTPS / WSS (Port 443)
         ▼
Azure Linux VM (Standard_B1s Ubuntu with Static Public IP & Free DNS)
         │
         ▼
       Nginx (Reverse Proxy + Free Let's Encrypt SSL via Certbot)
         │
         │ Proxy to internal port 127.0.0.1:8080
         ▼
Docker Container (Go Backend `judgement-backend`)
         │
         │ Database Connection (SSL Required)
         ▼
Azure Database for PostgreSQL Flexible Server (Burstable B1ms)
```

---

## Phase 1: Create Azure Resources (Azure Portal)

### Step 1.1: Create a Resource Group
1. Sign in to the [Azure Portal](https://portal.azure.com/).
2. In the top search bar, type **Resource groups** and select it.
3. Click **+ Create**.
4. Configure the settings:
   * **Subscription**: Select your student or standard subscription.
   * **Resource group**: `rg-judgement-prod`
   * **Region**: Choose the region closest to your users (e.g. `Central India`, `East US`, or `North Europe`).
5. Click **Review + create** ➔ **Create**.

---

### Step 1.2: Create Azure Database for PostgreSQL Flexible Server
1. In the top search bar, type **Azure Database for PostgreSQL flexible servers** and select it.
2. Click **+ Create**.
3. In the **Basics** tab:
   * **Resource group**: `rg-judgement-prod`
   * **Server name**: `psql-judgement-prod` (must be globally unique, e.g., `psql-judgement-<yourname>`)
   * **Region**: Same region as your resource group (e.g. `East US`).
   * **PostgreSQL version**: `15` or `16` (15 matches your local docker setup).
   * **Workload type**: Select **Development** (Burstable).
   * **Compute + storage**: Click **Configure server**:
     * Compute tier: **Burstable**
     * Compute size: `Standard_B1ms` (1 vCPU, 2 GiB memory — student free tier eligible).
     * Storage: `32 GiB` (Storage auto-grow: Enabled).
     * Click **Save**.
   * **High availability**: Unchecked (Disabled).
   * **Authentication method**: Select **PostgreSQL authentication only**.
   * **Admin username**: `judgement_admin`
   * **Password**: Generate a strong password (e.g., `JudgementSecure2026!#`) and **save it safely**.
4. In the **Networking** tab:
   * **Connectivity method**: Select **Public access (allowed IP addresses)**.
   * Check **Allow public access from any Azure service within Azure to this server to this server**.
   * Click **+ Add current client IP address** (so you can connect from your local machine/DBeaver if needed).
   * Firewall rule name: `allow-all-azure`, Start IP: `0.0.0.0`, End IP: `0.0.0.0`.
5. Click **Review + create** ➔ **Create** *(Deployment takes ~3–5 minutes)*.
6. Once deployed, navigate to the PostgreSQL server resource:
   * Click **Databases** on the left menu.
   * Click **+ Add**.
   * Database name: `judgement_db` ➔ Click **Save**.
7. Note down your connection string:
   ```text
   postgres://judgement_admin:<YOUR_PASSWORD>@psql-judgement-prod.postgres.database.azure.com:5432/judgement_db?sslmode=require
   ```

---

### Step 1.3: Create Azure Container Registry (ACR)
1. In the top search bar, type **Container registries** and select it.
2. Click **+ Create**.
3. Configure settings:
   * **Resource group**: `rg-judgement-prod`
   * **Registry name**: `acrjudgementprod` (only alphanumeric, e.g. `acrjudgement<yourname>`).
   * **Region**: Same region (e.g. `East US`).
   * **SKU**: **Basic** (lowest cost, student eligible).
4. Click **Review + create** ➔ **Create**.
5. Once created, go to the registry:
   * Under **Settings** on the left sidebar, click **Access keys**.
   * Enable the toggle for **Admin user**.
   * Copy and save:
     * **Login server** (e.g. `acrjudgementprod.azurecr.io`)
     * **Username** (e.g. `acrjudgementprod`)
     * **password** (e.g. `abc123xyz...`)

---

### Step 1.4: Create Azure Linux Virtual Machine
1. In the top search bar, type **Virtual machines** and select it.
2. Click **+ Create** ➔ **Azure virtual machine**.
3. In the **Basics** tab:
   * **Resource group**: `rg-judgement-prod`
   * **Virtual machine name**: `vm-judgement-backend`
   * **Region**: Same region (e.g. `East US`).
   * **Availability options**: No infrastructure redundancy required.
   * **Security type**: Standard.
   * **Image**: **Ubuntu Server 22.04 LTS - x64 Gen2** (or 24.04 LTS).
   * **VM architecture**: x64.
   * **Size**: Click **See all sizes** ➔ Select **B1s** (`Standard_B1s` - 1 vCPU, 1 GiB RAM).
   * **Authentication type**: Select **SSH public key**.
   * **Username**: `azureuser`
   * **SSH public key source**: Select **Generate new key pair**.
   * **Key pair name**: `judgement-vm-key`.
4. In the **Disks** tab:
   * **OS disk type**: **Standard SSD** (LRS) or Standard HDD.
   * **OS disk size**: **32 GiB**.
5. In the **Networking** tab:
   * **Virtual network**: Accept default created network.
   * **Subnet**: Accept default.
   * **Public IP**: Click **Create new**:
     * Assignment: **Static** (Crucial: ensures your IP never changes on reboot).
   * **NIC network security group**: Select **Advanced** ➔ click **Create new**:
     * We need 4 inbound rules:
       1. **SSH**: Port `22`, Priority `1000` (Allow).
       2. **HTTP**: Port `80`, Priority `1010` (Allow - required for Let's Encrypt certificate challenge).
       3. **HTTPS**: Port `443`, Priority `1020` (Allow - for secure Vercel API & WebSocket traffic).
       4. **Go-Direct**: Port `8080`, Priority `1030` (Allow - for testing).
     * Click **OK**.
6. Click **Review + create** ➔ Click **Create**.
7. **IMPORTANT**: A popup will appear saying *Generate new key pair*. Click **Download private key and create resource**.
   * Save the file (`judgement-vm-key.pem`) to your computer (e.g., `~/.ssh/judgement-vm-key.pem`).
8. After deployment finishes, navigate to `vm-judgement-backend`:
   * Under the **Overview** section, click on the **Public IP address** link.
   * In the left menu of the Public IP resource, click **Configuration**.
   * In **DNS name label (optional)**, type a unique subdomain, for example:
     `judgement-api`
   * Your free FQDN will be:
     `judgement-api.<your-region>.cloudapp.azure.com` (e.g. `judgement-api.eastus.cloudapp.azure.com`).
   * Click **Save**. *(Now you have a free permanent domain name for SSL!)*

---

## Phase 2: Virtual Machine Setup (SSH Terminal)

Open your local terminal and execute the following:

### Step 2.1: Secure the SSH Key and Connect
```bash
# On your local machine:
chmod 400 ~/.ssh/judgement-vm-key.pem

# SSH into the VM (replace with your VM's public IP or DNS)
ssh -i ~/.ssh/judgement-vm-key.pem azureuser@judgement-api.eastus.cloudapp.azure.com
```

---

### Step 2.2: Add Swap Space (Crucial for B1s 1GB RAM)
Because the B1s instance has 1GB RAM, allocating 2GB swap prevents out-of-memory errors during Docker pulls:
```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

---

### Step 2.3: Install Docker & Docker Compose
```bash
# Update Ubuntu package index
sudo apt update && sudo apt upgrade -y

# Install prerequisite tools
sudo apt install -y ca-certificates curl gnupg lsb-release

# Add Docker official GPG key
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# Set up repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Grant azureuser permission to run docker without sudo
sudo usermod -aG docker $USER

# Apply group changes immediately
newgrp docker

# Verify Docker works
docker run hello-world
```

---

### Step 2.4: Log In to Azure Container Registry on the VM
Run this on the VM so Docker is authenticated to pull your private container image:
```bash
docker login <YOUR_ACR_NAME>.azurecr.io -u <ACR_USERNAME> -p <ACR_PASSWORD>
```
*(You will see: `Login Succeeded`)*

---

### Step 2.5: Install Nginx & Certbot (Let's Encrypt SSL)
```bash
sudo apt install -y nginx certbot python3-certbot-nginx
```

---

### Step 2.6: Configure Nginx as Reverse Proxy with WebSocket Support
Create a new Nginx configuration file for your game backend:

```bash
sudo nano /etc/nginx/sites-available/judgement
```

Paste the following configuration (replace `judgement-api.eastus.cloudapp.azure.com` with your exact Azure DNS name):

```nginx
server {
    listen 80;
    server_name judgement-api.eastus.cloudapp.azure.com;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;

        # Crucial WebSocket headers:
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # Standard proxy headers:
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Prevent WebSocket disconnections during gameplay:
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
    }
}
```

Enable the configuration and verify syntax:
```bash
sudo ln -s /etc/nginx/sites-available/judgement /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

---

### Step 2.7: Obtain Free SSL Certificate via Certbot
Run Certbot to automatically configure HTTPS and redirect all HTTP traffic to HTTPS:
```bash
sudo certbot --nginx -d judgement-api.eastus.cloudapp.azure.com
```
* Enter your email address for renewal notices.
* Agree to terms (`Y`).
* When prompted to redirect HTTP to HTTPS, select **Yes / Redirect**.

Certbot will automatically edit `/etc/nginx/sites-available/judgement` to add managed SSL certificates and set up automatic renewal (`certbot renew`).

---

## Phase 3: Set Up Automated CI/CD (GitHub Actions)

We will configure GitHub Actions so every push to `main` automatically runs tests, builds the Docker container, pushes it to ACR, and deploys it to your Azure VM.

### Step 3.1: Add GitHub Repository Secrets
1. Go to your GitHub repository: `https://github.com/vedantbladers/JUDGEMENT-GAME`.
2. Click **Settings** ➔ **Secrets and variables** ➔ **Actions**.
3. Click **New repository secret** for each of the following:

| Secret Name | Exact Value Description | Example / Note |
| :--- | :--- | :--- |
| `AZURE_ACR_NAME` | Name of your container registry | `acrjudgementprod` |
| `AZURE_ACR_USERNAME` | ACR Admin Username from Step 1.3 | `acrjudgementprod` |
| `AZURE_ACR_PASSWORD` | ACR Admin Password from Step 1.3 | `wXYZ12345...` |
| `AZURE_VM_HOST` | VM Static Public IP or DNS label | `judgement-api.eastus.cloudapp.azure.com` |
| `AZURE_VM_USER` | VM Username | `azureuser` |
| `AZURE_VM_SSH_KEY` | Entire content of `judgement-vm-key.pem` | Starts with `-----BEGIN RSA PRIVATE KEY-----` |
| `DB_URL` | Full Azure PostgreSQL connection URI | `postgres://judgement_admin:Password@psql-judgement-prod.postgres.database.azure.com:5432/judgement_db?sslmode=require` |
| `JWT_SECRET` | A secure random 32+ character string | `super_secret_production_jwt_key_2026_judgement` |
| `FRONTEND_URL` | Your Vercel frontend URL | `https://judgement-game-gamma.vercel.app` |

---

### Step 3.2: Create GitHub Actions Deployment Workflow
In your repository, create the file `.github/workflows/deploy-azure.yml`:

```yaml
name: Deploy Backend to Azure VM

on:
  push:
    branches: [ "main" ]
    paths:
      - 'backend/**'
      - '.github/workflows/deploy-azure.yml'

jobs:
  test-and-build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Code
        uses: actions/checkout@v4

      - name: Set up Go
        uses: actions/setup-go@v5
        with:
          go-version: '1.22'
          cache-dependency-path: backend/go.sum

      - name: Run Backend Unit Tests
        run: |
          cd backend
          go mod download
          go test -v ./...

      - name: Log in to Azure Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ secrets.AZURE_ACR_NAME }}.azurecr.io
          username: ${{ secrets.AZURE_ACR_USERNAME }}
          password: ${{ secrets.AZURE_ACR_PASSWORD }}

      - name: Build and Push Docker Image
        uses: docker/build-push-action@v5
        with:
          context: ./backend
          file: ./backend/Dockerfile
          push: true
          tags: |
            ${{ secrets.AZURE_ACR_NAME }}.azurecr.io/judgement-backend:latest
            ${{ secrets.AZURE_ACR_NAME }}.azurecr.io/judgement-backend:${{ github.sha }}

  deploy:
    needs: test-and-build
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to Azure VM via SSH
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.AZURE_VM_HOST }}
          username: ${{ secrets.AZURE_VM_USER }}
          key: ${{ secrets.AZURE_VM_SSH_KEY }}
          script: |
            # Authenticate Docker to ACR
            docker login ${{ secrets.AZURE_ACR_NAME }}.azurecr.io -u ${{ secrets.AZURE_ACR_USERNAME }} -p ${{ secrets.AZURE_ACR_PASSWORD }}

            # Pull the fresh image
            docker pull ${{ secrets.AZURE_ACR_NAME }}.azurecr.io/judgement-backend:latest

            # Stop and remove existing container if running
            docker stop judgement-backend || true
            docker rm judgement-backend || true

            # Run new container listening on internal port 127.0.0.1:8080
            docker run -d \
              --name judgement-backend \
              --restart unless-stopped \
              -p 127.0.0.1:8080:8080 \
              -e PORT=8080 \
              -e DB_URL="${{ secrets.DB_URL }}" \
              -e JWT_SECRET="${{ secrets.JWT_SECRET }}" \
              -e FRONTEND_URL="${{ secrets.FRONTEND_URL }}" \
              ${{ secrets.AZURE_ACR_NAME }}.azurecr.io/judgement-backend:latest

            # Clean up old unused images to save disk space
            docker image prune -af --filter "until=48h"
```

---

## Phase 4: Connect Vercel Next.js Frontend

Now that your backend is running with a valid HTTPS domain (`https://judgement-api.eastus.cloudapp.azure.com`), update your Vercel project:

1. Open your project on [Vercel](https://vercel.com/dashboard).
2. Go to **Settings** ➔ **Environment Variables**.
3. Update (or Add) the following two environment variables:

| Variable | New Production Value | Note |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_API_URL` | `https://judgement-api.eastus.cloudapp.azure.com/api/v1` | Notice **`https://`** |
| `NEXT_PUBLIC_WS_URL` | `wss://judgement-api.eastus.cloudapp.azure.com/api/v1/lobbies` | Notice **`wss://`** (Secure WebSocket) |

4. Go to the **Deployments** tab on Vercel and click **Redeploy** on the latest deployment (or push a new commit) so the client builds with the new environment variables.

---

## Phase 5: Verification & Testing Checklist

Once deployed, verify everything works seamlessly:

1. **Verify Backend Health via HTTPS**:
   ```bash
   curl -i https://judgement-api.eastus.cloudapp.azure.com/health
   ```
   *Expected Response:*
   ```json
   HTTP/2 200
   content-type: application/json
   {"status": "ok", "message": "Server is running", "database": "connected"}
   ```

2. **Verify Database Auto-Migrations**:
   * Open the app in your browser at `https://judgement-game-gamma.vercel.app/login`.
   * Click **Register** and create a new account.
   * Check VM Docker logs:
     ```bash
     docker logs -f judgement-backend
     ```
     You will see: `Database schema auto-migrated successfully.` and clean incoming HTTP 200/201 requests.

3. **Verify WebSocket Gameplay**:
   * Create a lobby on your Vercel frontend.
   * Add an AI bot (`Atlas (Bot)`).
   * Notice the WebSocket instantly transitions to the live room.
   * Play a round of cards.
   * Open Browser DevTools (`F12` ➔ **Network** ➔ **WS** tab):
     * The WebSocket connection URL will show `wss://judgement-api.eastus.cloudapp.azure.com/api/v1/lobbies/<LOBBY_ID>/ws`.
     * Status code will be `101 Switching Protocols`.
     * Green/Red directional message frames (`STATE_UPDATE`, `PLAY_CARD`, `PLACE_BID`) will flow in real-time with zero Mixed Content errors!

---

## Troubleshooting Guide

* **Issue: `502 Bad Gateway` from Nginx**
  * *Cause*: Docker container is not running or crashed on startup.
  * *Fix*: SSH into the VM and inspect `docker logs judgement-backend`. Common cause is an incorrect `DB_URL` password or PostgreSQL firewall blocking the VM IP.
* **Issue: PostgreSQL `no pg_hba.conf entry for host` or Connection Refused**
  * *Cause*: PostgreSQL Flexible Server firewall rule missing.
  * *Fix*: In Azure Portal ➔ PostgreSQL Flexible Server ➔ Networking ➔ Ensure **Allow public access from any Azure service** is checked, and verify your password.
* **Issue: WebSocket connects and disconnects immediately**
  * *Cause*: CORS or origin mismatch.
  * *Fix*: Verify `FRONTEND_URL` in GitHub secrets matches your exact Vercel frontend URL (`https://judgement-game-gamma.vercel.app` without trailing slash).
