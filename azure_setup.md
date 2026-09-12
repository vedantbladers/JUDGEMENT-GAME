# Judgement Card Game: Azure Production Deployment Journal (`azure_setup.md`)

This living document tracks every resource, configuration, command, and step executed to deploy the Judgement multiplayer game backend to Microsoft Azure and connect it to the Vercel frontend.

---

## 1. Deployed Infrastructure Overview

```
Frontend (Vercel)
   │
   │ HTTPS / WSS (Port 443)
   ▼
Azure Linux VM (vm-judgement-backend @ Central India - Pune)
   ├── Static Public IP: 20.207.192.6
   ├── FQDN / Domain: judgement-api-vedant.centralindia.cloudapp.azure.com
   │
   ▼
Nginx Reverse Proxy (Host OS)
   ├── SSL: Free Let's Encrypt TLS (Certbot Auto-Renew)
   ├── WebSocket Headers: Upgrade $http_upgrade & Connection "upgrade"
   ├── Game Connection Timeout: 3600s (1 Hour)
   │
   ▼ (Local proxy to 127.0.0.1:8080)
Docker Container (judgement-backend:latest)
   └── Compiled Go API Server (Alpine Multi-Stage, ~20MB)
   │
   ▼ (PostgreSQL Wire Protocol over SSL)
Azure Database for PostgreSQL Flexible Server (psql-judgement-vedant)
   └── Database: judgement_db
```

---

## 2. Azure Resources Provisioned (Phase 2)

| Resource | Resource Name | Azure Region | Specifications / Notes |
| :--- | :--- | :--- | :--- |
| **Resource Group** | `rg-judgement-prod` | `Central India` (Pune) | Houses all deployment resources |
| **PostgreSQL Flexible Server** | `psql-judgement-vedant` | `Central India` | Burstable `Standard_B1ms`, 1 vCore, 2 GiB RAM, 32 GiB SSD. Free-tier eligible (750 hrs/mo & 32GB). |
| **Database** | `judgement_db` | `Central India` | UTF-8 collation; auto-migrated by GORM on startup. |
| **Container Registry (ACR)** | `acrjudgementvedant` | `Central India` | Basic SKU; admin user enabled; login: `acrjudgementvedant.azurecr.io`. |
| **Linux Virtual Machine** | `vm-judgement-backend` | `Central India` | `Standard_B2ats_v2` (2 vCPUs AMD, 1 GiB RAM), 30 GiB Standard SSD. |
| **Static Public IP** | `vm-judgement-backend-ip` | `Central India` | IPv4: `20.207.192.6` (Static assignment, never changes). |
| **Azure DNS Domain** | `judgement-api-vedant` | `Central India` | Full FQDN: `judgement-api-vedant.centralindia.cloudapp.azure.com`. |
| **SSH Key Pair** | `vm-judgement-backend_key` | Local (`~/.ssh/`) | Stored at `~/.ssh/vm-judgement-backend_key.pem` (`chmod 400`). |

---

## 3. Database Connection String
```text
postgres://judgement_admin:<YOUR_PASSWORD>@psql-judgement-vedant.postgres.database.azure.com:5432/judgement_db?sslmode=require
```

---

## 4. Phase 3: VM Initialization Commands

Execute these steps in your terminal to configure the VM:

### 1. Transfer Setup Script to VM
```bash
scp -i ~/.ssh/vm-judgement-backend_key.pem "/home/vedant/WEBDEV/PERSONAL/JUDGEMENT CARD GAME/scripts/setup-vm.sh" azureuser@20.207.192.6:~/setup-vm.sh
```

### 2. Connect via SSH
```bash
ssh -i ~/.ssh/vm-judgement-backend_key.pem azureuser@20.207.192.6
```

### 3. Run Initialization (Docker + Swap + Nginx)
```bash
bash ~/setup-vm.sh judgement-api-vedant.centralindia.cloudapp.azure.com
```

### 4. Issue Free SSL Certificate (Certbot)
```bash
sudo certbot --nginx -d judgement-api-vedant.centralindia.cloudapp.azure.com
```

### 5. Activate Docker Permissions
```bash
newgrp docker
docker ps
```

---

## 5. Phase 4: GitHub Actions Repository Secrets

In GitHub repository (`https://github.com/vedantbladers/JUDGEMENT-GAME`) under **Settings > Secrets and variables > Actions**, add the following 9 secrets:

| Secret Name | Value Description |
| :--- | :--- |
| `AZURE_ACR_NAME` | `acrjudgementvedant` |
| `AZURE_ACR_USERNAME` | `acrjudgementvedant` |
| `AZURE_ACR_PASSWORD` | Password from ACR Access Keys |
| `AZURE_VM_HOST` | `judgement-api-vedant.centralindia.cloudapp.azure.com` |
| `AZURE_VM_USER` | `azureuser` |
| `AZURE_VM_SSH_KEY` | Entire content of `~/.ssh/vm-judgement-backend_key.pem` |
| `DB_URL` | `postgres://judgement_admin:<PASS>@psql-judgement-vedant.postgres.database.azure.com:5432/judgement_db?sslmode=require` |
| `JWT_SECRET` | 32+ character random string (e.g. `judgement_super_secret_production_jwt_key_2026`) |
| `FRONTEND_URL` | `https://judgement-game-gamma.vercel.app` |

---

## 6. Phase 5: Vercel Frontend Environment Variables

In [Vercel Dashboard](https://vercel.com/dashboard) under **Project Settings > Environment Variables**, set:

| Variable | Production Value |
| :--- | :--- |
| `NEXT_PUBLIC_API_URL` | `https://judgement-api-vedant.centralindia.cloudapp.azure.com/api/v1` |
| `NEXT_PUBLIC_WS_URL` | `wss://judgement-api-vedant.centralindia.cloudapp.azure.com/api/v1/lobbies` |

Then click **Redeploy** on the latest Vercel deployment.

---

## 7. Useful Server Management Commands (Run on VM via SSH)

* **View live backend logs:**
  ```bash
  docker logs -f judgement-backend
  ```
* **Restart the backend container:**
  ```bash
  docker restart judgement-backend
  ```
* **Check memory and CPU usage:**
  ```bash
  free -h
  docker stats --no-stream
  ```
* **Test backend health from terminal:**
  ```bash
  curl -i https://judgement-api-vedant.centralindia.cloudapp.azure.com/health
  ```
