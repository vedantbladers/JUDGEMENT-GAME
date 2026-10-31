# 🃏 Judgement Card Game: AWS Production Deployment & System Architecture Guide

> **Production URL (Frontend)**: [https://judgement-game-gamma.vercel.app](https://judgement-game-gamma.vercel.app)  
> **API & WebSocket Host (Backend)**: `https://judgement-game-api.duckdns.org`  
> **Cloud Provider**: Amazon Web Services (AWS) — Region: `ap-southeast-2` (Sydney)

---

## 📑 Table of Contents
1. [Architecture Overview](#1-architecture-overview)
2. [Infrastructure Component Mapping](#2-infrastructure-component-mapping)
3. [Step-by-Step Deployment Documentation](#3-step-by-step-deployment-documentation)
   * [Phase 1: Networking & Security Groups](#phase-1-networking--security-groups)
   * [Phase 2: Compute (AWS EC2) & Swap Configuration](#phase-2-compute-aws-ec2--swap-configuration)
   * [Phase 3: Managed Database (AWS RDS PostgreSQL)](#phase-3-managed-database-aws-rds-postgresql)
   * [Phase 4: Container Registry (AWS ECR) & IAM](#phase-4-container-registry-aws-ecr--iam)
   * [Phase 5: Domain (DuckDNS) & SSL Termination (Certbot Nginx)](#phase-5-domain-duckdns--ssl-termination-certbot-nginx)
   * [Phase 6: Continuous Integration & Deployment (GitHub Actions)](#phase-6-continuous-integration--deployment-github-actions)
   * [Phase 7: Frontend Hosting (Vercel) & Linkage](#phase-7-frontend-hosting-vercel--linkage)
4. [Environment Variables & Secrets Reference](#4-environment-variables--secrets-reference)
5. [Critical Troubleshooting & Real-World Lessons Learned](#5-critical-troubleshooting--real-world-lessons-learned)
6. [20 Production & System Design Interview Questions (With In-Depth Answers)](#6-20-production--system-design-interview-questions)

---

## 1. Architecture Overview

The Judgement multiplayer card game features a **decoupled hybrid architecture**:
* A **Stateless Next.js 16 Frontend** running on Vercel's global Edge network.
* A **Stateful Go Backend Engine** running continuously on an AWS EC2 instance inside Docker.
* An **AWS RDS PostgreSQL** managed database handling user accounts and lobby records.
* **Nginx** acting as an edge reverse proxy and SSL termination endpoint on EC2, seamlessly upgrading HTTP requests to full-duplex WebSockets.

```
┌────────────────────────────────────────────────────────────────────────┐
│ CLIENT LAYER                                                          │
│ Browsers / Mobile Devices (Next.js 16 + React 19 Client)              │
│ Hosted on Vercel: https://judgement-game-gamma.vercel.app              │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTPS (REST) & WSS (WebSockets)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ DNS RESOLUTION                                                         │
│ judgement-game-api.duckdns.org  ──▶  AWS Elastic IP: 52.63.191.114     │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Ports 80 (HTTP) & 443 (HTTPS/WSS)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ AWS EC2 INSTANCE (Ubuntu 24.04 LTS, t3.micro in ap-southeast-2)         │
│ Security Group: ec2-judgement-sg (Inbound: 22 SSH, 80 HTTP, 443 HTTPS) │
│                                                                        │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │ Nginx (Reverse Proxy & SSL Termination)                        │   │
│   │ - Handles TLS handshake via Let's Encrypt (Certbot)            │   │
│   │ - Upgrades HTTP/1.1 to persistent WebSockets (WSS)             │   │
│   │ - Long timeout buffers (3600s) to keep active games alive      │   │
│   └───────────────────────────────┬────────────────────────────────┘   │
│                                   │ http://127.0.0.1:8080              │
│                                   ▼                                    │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │ Docker Container: judgement-backend (Go 1.26 Binary)           │   │
│   │ - Chi HTTP Router: /api/v1/auth, /api/v1/lobbies               │   │
│   │ - Gorilla WebSocket Upgrader (CheckOrigin whitelisted)         │   │
│   │ - Central Hub: Goroutine Fan-In Channel (In-memory game state) │   │
│   │ - Heuristic AI Bot Sparring Engine                             │   │
│   └───────────────────────────────┬────────────────────────────────┘   │
└───────────────────────────────────┼────────────────────────────────────┘
                                    │ Port 5432 (Internal VPC Traffic)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ AWS RDS POSTGRESQL (PostgreSQL 16, db.t4g.micro)                       │
│ Security Group: rds-judgement-sg                                       │
│ Inbound: Port 5432 RESTRICTED ONLY to ec2-judgement-sg ID             │
│ Database Name: judgement_db                                            │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Infrastructure Component Mapping

| Component | Service Used | Configuration Details | Purpose |
| :--- | :--- | :--- | :--- |
| **Compute** | AWS EC2 | `t3.micro` (1 vCPU, 1 GB RAM), Ubuntu 24.04 LTS, 20 GB gp3 | Runs the Dockerized Go backend and Nginx reverse proxy. |
| **Static IP** | AWS Elastic IP | `52.63.191.114` | Permanently binds a public IP to EC2 across reboots. |
| **Database** | AWS RDS PostgreSQL | `db.t4g.micro`, 20 GB gp3, Single-AZ | Managed relational database for users, lobbies, and players. |
| **Container Registry**| AWS ECR | Private repository: `judgement-backend` | Stores versioned Docker images built by GitHub Actions. |
| **Identity & Access** | AWS IAM | User: `github-actions-judgement` | Scoped with `AmazonEC2ContainerRegistryPowerUser` for CI/CD. |
| **Security Firewall** | AWS Security Groups | `ec2-judgement-sg` & `rds-judgement-sg` | Isolates RDS from the internet; exposes only 80, 443, and 22. |
| **Reverse Proxy / SSL**| Nginx + Certbot | Nginx 1.28 + Let's Encrypt TLS v1.3 | SSL termination, HTTP redirect to HTTPS, and WebSocket upgrade. |
| **Dynamic DNS** | DuckDNS | `judgement-game-api.duckdns.org` | Free DNS pointing to the EC2 Elastic IP. |
| **CI/CD Pipeline** | GitHub Actions | `.github/workflows/deploy-aws.yml` | Automatic test, Docker build, ECR push, and SSH deploy. |
| **Frontend** | Vercel | Next.js 16 (App Router) + React 19 + Tailwind v4 | Global CDN hosting with SSR and environment variable injection. |

---

## 3. Step-by-Step Deployment Documentation

### Phase 1: Networking & Security Groups
1. **EC2 Security Group (`ec2-judgement-sg`)**:
   * Inbound Rule 1: Type `SSH`, Port `22`, Source: My IP (or restricted CIDR).
   * Inbound Rule 2: Type `HTTP`, Port `80`, Source: `0.0.0.0/0` (required for Certbot ACME domain validation).
   * Inbound Rule 3: Type `HTTPS`, Port `443`, Source: `0.0.0.0/0` (public HTTPS and WSS traffic).
   * Outbound Rules: Default allow all traffic (`0.0.0.0/0`).
2. **RDS Security Group (`rds-judgement-sg`)**:
   * Inbound Rule: Type `PostgreSQL`, Port `5432`, Source: `ec2-judgement-sg` (Security Group ID).
   * *Crucial Principle*: RDS has **Public access = No**. It has zero public internet exposure; only EC2 can reach port 5432 over internal VPC routing.

---

### Phase 2: Compute (AWS EC2) & Swap Configuration
1. Launched an EC2 instance (`t3.micro`) with Ubuntu Server 24.04 LTS.
2. Allocated an **Elastic IP** (`52.63.191.114`) and associated it with the EC2 instance so the server's public IP address never changes.
3. Created an SSH Key Pair (`judgement-key-pair.pem`) and locked down permissions locally:
   ```bash
   chmod 400 judgement-key-pair.pem
   ```
4. **2GB Swap Memory Allocation**:
   Since `t3.micro` instances only have 1 GB of physical RAM, a sudden spike in memory during a Docker pull could trigger the Linux Out-Of-Memory (OOM) killer. We allocated a 2GB persistent swapfile:
   ```bash
   sudo fallocate -l 2G /swapfile
   sudo chmod 600 /swapfile
   sudo mkswap /swapfile
   sudo swapon /swapfile
   echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
   ```

---

### Phase 3: Managed Database (AWS RDS PostgreSQL)
1. Created an RDS instance with **PostgreSQL 16** on the **Free Tier** (`db.t4g.micro`).
2. Configured database identifier: `judgement-db`.
3. Master username: `judgement_user`.
4. Initial Database name: `judgement_db` (enables GORM auto-migrations to initialize tables on boot).
5. Attached `rds-judgement-sg` and disabled auto minor version upgrade to avoid unplanned restarts during gameplay.
6. Connection string constructed:
   ```text
   postgres://judgement_user:<PASSWORD>@judgement-db.cxxxx.ap-southeast-2.rds.amazonaws.com:5432/judgement_db?sslmode=require
   ```

---

### Phase 4: Container Registry (AWS ECR) & IAM
1. Created a private ECR repository: `judgement-backend`.
2. Created an IAM user: `github-actions-judgement`.
3. Attached policy: `AmazonEC2ContainerRegistryPowerUser`.
4. Generated AWS Access Key ID and Secret Access Key for automated builds.
5. Installed **AWS CLI v2** on the EC2 instance to allow Docker to authenticate and pull private images from ECR.

---

### Phase 5: Domain (DuckDNS) & SSL Termination (Certbot Nginx)
1. Claimed `judgement-game-api.duckdns.org` on DuckDNS and pointed it to `52.63.191.114`.
2. Installed Nginx and configured `/etc/nginx/sites-available/judgement`:
   ```nginx
   server {
       server_name judgement-game-api.duckdns.org;

       location / {
           proxy_pass http://127.0.0.1:8080;
           proxy_http_version 1.1;

           # WebSocket Upgrade Headers
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection "upgrade";

           # Forwarded IP & Protocol Headers
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;

           # Extended timeouts for long-lived card games
           proxy_read_timeout 3600s;
           proxy_send_timeout 3600s;
           proxy_connect_timeout 60s;
       }

       listen 443 ssl;
       ssl_certificate /etc/letsencrypt/live/judgement-game-api.duckdns.org/fullchain.pem;
       ssl_certificate_key /etc/letsencrypt/live/judgement-game-api.duckdns.org/privkey.pem;
       include /etc/letsencrypt/options-ssl-nginx.conf;
       ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
   }

   server {
       listen 80;
       server_name judgement-game-api.duckdns.org;
       return 301 https://$host$request_uri;
   }
   ```
3. Obtained free Let's Encrypt certificates automatically via Certbot:
   ```bash
   sudo certbot --nginx -d judgement-game-api.duckdns.org --non-interactive --agree-tos -m your-email@gmail.com
   ```

---

### Phase 6: Continuous Integration & Deployment (GitHub Actions)
Whenever code is committed and pushed to `main`, `.github/workflows/deploy-aws.yml` triggers:
1. **Test**: Runs `go test -v ./...` inside a clean Go environment.
2. **Build**: Compiles a multi-stage, stripped Go binary inside Alpine Linux (~25MB total image size).
3. **Push**: Authenticates with AWS ECR and pushes `:latest` and `:${{ github.sha }}`.
4. **Deploy**: SSHs into EC2, exports IAM credentials, authenticates Docker with ECR, pulls the new image, stops the old container, starts the updated container on `127.0.0.1:8080`, and prunes dangling images:
   ```bash
   docker run -d \
     --name judgement-backend \
     --restart unless-stopped \
     -p 127.0.0.1:8080:8080 \
     -e PORT=8080 \
     -e DB_URL="${{ secrets.DB_URL }}" \
     -e JWT_SECRET="${{ secrets.JWT_SECRET }}" \
     -e FRONTEND_URL="${{ secrets.FRONTEND_URL }}" \
     $ECR_IMAGE
   ```

---

### Phase 7: Frontend Hosting (Vercel) & Linkage
1. Connected GitHub repository to Vercel and specified root directory as `frontend`.
2. Configured build environment variables:
   * `NEXT_PUBLIC_API_URL` = `https://judgement-game-api.duckdns.org/api/v1`
   * `NEXT_PUBLIC_WS_URL` = `wss://judgement-game-api.duckdns.org/api/v1/lobbies`
3. Whitelisted `https://judgement-game-gamma.vercel.app` in backend CORS and WebSocket `CheckOrigin`.

---

## 4. Environment Variables & Secrets Reference

### GitHub Repository Secrets (Actions)
| Secret Name | Example / Description |
| :--- | :--- |
| `AWS_ACCESS_KEY_ID` | `AKIA...` (IAM User key) |
| `AWS_SECRET_ACCESS_KEY`| `wJalrX...` (IAM User secret) |
| `AWS_REGION` | `ap-southeast-2` |
| `AWS_ACCOUNT_ID` | `149471546722` (12-digit account number) |
| `AWS_EC2_HOST` | `52.63.191.114` (EC2 Elastic IP) |
| `AWS_EC2_SSH_KEY` | Full content of `judgement-key-pair.pem` |
| `DB_URL` | `postgres://judgement_user:pass@endpoint:5432/judgement_db?sslmode=require` |
| `JWT_SECRET` | 64+ character random hex string |
| `FRONTEND_URL` | `https://judgement-game-gamma.vercel.app` |

### Vercel Environment Variables (Frontend)
| Variable Name | Value | Purpose |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_API_URL` | `https://judgement-game-api.duckdns.org/api/v1` | REST endpoints (login, register, create/join lobby) |
| `NEXT_PUBLIC_WS_URL` | `wss://judgement-game-api.duckdns.org/api/v1/lobbies` | Full-duplex WebSocket stream for card play |

---

## 5. Critical Troubleshooting & Real-World Lessons Learned

### Issue 1: Chi's `middleware.Timeout` Stripping `http.Hijacker`
* **Symptoms**: Browser showed `WebSocket connection failed` with code `1006`. Nginx logged nothing or `500 Internal Server Error`.
* **Root Cause**: `r.Use(middleware.Timeout(60 * time.Second))` was applied as a global middleware on the Chi router. Chi's `timeoutWriter` only implements `http.ResponseWriter` and `http.Flusher`, but **does NOT implement `http.Hijacker`**. When Gorilla WebSocket called `w.(http.Hijacker)`, the cast failed and aborted the upgrade.
* **Resolution**: Removed `middleware.Timeout` from the global middleware chain, preserving raw `http.Hijacker` access for WebSockets.

### Issue 2: ECR Pull Authentication Inside SSH Session
* **Symptoms**: GitHub Actions succeeded, but `docker ps` on EC2 showed no running containers.
* **Root Cause**: The EC2 instance did not have AWS IAM credentials configured in its environment, causing `aws ecr get-login-password` to fail silently.
* **Resolution**: Updated `deploy-aws.yml` to inject `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` directly into the SSH session environment and added `set -e` so failures fail fast.

### Issue 3: Cross-Site WebSocket Hijacking (CSWSH) Origin Check
* **Symptoms**: Handshake failed with HTTP 403 Forbidden.
* **Root Cause**: The backend container was running with `FRONTEND_URL=http://localhost:3000`. The Gorilla `Upgrader.CheckOrigin` function rejected requests originating from `https://judgement-game-gamma.vercel.app`.
* **Resolution**: Updated `isAllowedOrigin` in `backend/internal/ws/handler.go` to explicitly allow `https://judgement-game-gamma.vercel.app` and any `*.vercel.app` subdomains.

### Issue 4: Ad-Blocker (uBlock Origin Lite) Blocking Dynamic DNS
* **Symptoms**: Browser console printed `ERR_BLOCKED_BY_CLIENT` when attempting to connect to `wss://judgement-game-api.duckdns.org`, but the game worked fine in Incognito mode.
* **Root Cause**: Popular ad-block filter lists (e.g. Peter Lowe's Blocklist) block `*.duckdns.org` by default because bad actors sometimes abuse free dynamic DNS subdomains for phishing.
* **Resolution**: Added a custom whitelist exception rule `@@||judgement-game-api.duckdns.org^` in uBlock Origin Lite, or toggled filtering off for the site. (Using a custom domain like `.live` or `.com` completely avoids this issue).

---

## 6. 20 Production & System Design Interview Questions

### Question 1: Why can’t we deploy this Go backend on AWS Lambda + API Gateway WebSockets?
**Answer**:  
AWS Lambda is a stateless, ephemeral compute service that spins down after executing a single request. In our Judgement card game, the Go backend maintains persistent, stateful in-memory goroutines (`readPump` and `writePump`) tied directly to active TCP sockets. Furthermore, all card game state mutations fan into a singleton in-memory channel (`Hub.Actions`) to guarantee zero race conditions without distributed locks. 

If we used Lambda, every card played would execute in an isolated container without access to the game engine's in-memory memory map. While AWS API Gateway WebSockets can maintain socket connections and invoke Lambdas, we would have had to completely re-architect the game engine to serialize and deserialize the full game state to a central Redis/ElastiCache store with distributed optimistic locking (`WATCH`/`MULTI`) on every single trick or card play, introducing unacceptable latency and architectural complexity. A persistent server (EC2/ECS) is the correct architectural choice for stateful real-time games.

---

### Question 2: How does the Go backend avoid race conditions when two players play a card simultaneously?
**Answer**:  
Rather than using heavy `sync.Mutex` locks across multiple threads, the engine uses the Go concurrency philosophy: *"Do not communicate by sharing memory; instead, share memory by communicating."* 

For each connected player, the server spawns an isolated `readPump()` goroutine that reads JSON actions from the socket and pushes them into a central, unbuffered Go channel (`Hub.Actions`). The Hub runs a single, dedicated, sequential event loop that pulls one action at a time from this channel. Because only one goroutine ever mutates the active `GameState` struct at any given moment, data races are mathematically impossible, eliminating deadlocks and mutex contention entirely.

---

### Question 3: What is the purpose of Nginx in front of our Go container? Why not expose port 8080 directly to the internet?
**Answer**:  
Putting Nginx in front of Go provides four crucial production benefits:
1. **SSL/TLS Termination**: Nginx offloads cryptographic TLS handshakes from the Go process, keeping CPU cycles free for game logic, and integrates with Certbot for automated Let's Encrypt certificate renewal.
2. **Security & Attack Surface Reduction**: Exposing Go directly to ports 80/443 requires either running Go as `root` (a major security vulnerability) or using `setcap`. Nginx runs as an unprivileged process and drops malformed HTTP packets before they reach application memory.
3. **Slowloris & Buffer Management**: Nginx buffers slow, malicious, or stalled client connections, protecting Go from thread/goroutine exhaustion attacks.
4. **WebSocket Connection Upgrades**: Nginx transparently handles HTTP-to-WebSocket upgrades and manages persistent keep-alive timeouts (`proxy_read_timeout 3600s`).

---

### Question 4: How does a WebSocket handshake work, and why did Chi's `middleware.Timeout` break it?
**Answer**:  
A WebSocket connection begins as a standard HTTP/1.1 request with two special headers: `Upgrade: websocket` and `Connection: Upgrade`, along with a base64 nonce (`Sec-WebSocket-Key`). If the server accepts, it responds with `HTTP/1.1 101 Switching Protocols` and calculates `Sec-WebSocket-Accept`. At that exact instant, the HTTP connection is "hijacked": the server stops treating the TCP connection as request-response and hands the raw TCP socket to the WebSocket engine for full-duplex framing.

In Go's standard library, this hijacking requires the `http.ResponseWriter` to implement the `http.Hijacker` interface (`Hijack() (net.Conn, *bufio.ReadWriter, error)`). Chi's `middleware.Timeout` wraps the response writer in a custom `timeoutWriter` struct to enforce a context deadline. Because `timeoutWriter` does not implement the `http.Hijacker` interface, Gorilla's `upgrader.Upgrade()` cannot cast `w.(http.Hijacker)`, immediately throwing an internal error and terminating the handshake with HTTP 500.

---

### Question 5: How does the Gorilla WebSocket Upgrader prevent Cross-Site WebSocket Hijacking (CSWSH)?
**Answer**:  
Unlike standard REST API calls made with `fetch` or `XMLHttpRequest`, WebSocket connections are **not constrained by the Same-Origin Policy (SOP)** in web browsers. A malicious website (`evil.com`) can easily open a WebSocket connection to `wss://judgement-game-api.duckdns.org`, and the browser will automatically attach any existing session cookies.

Gorilla WebSocket prevents this via its `CheckOrigin` callback. Before completing the handshake, the upgrader inspects the `Origin` HTTP header sent by the browser. In our implementation (`isAllowedOrigin`), the backend validates the header against a strict whitelist (`https://judgement-game-gamma.vercel.app` and `localhost`). If an unauthorized domain attempts to initiate a socket handshake, the server immediately rejects the request with `HTTP 403 Forbidden`.

---

### Question 6: Why did we use an AWS Elastic IP instead of standard EC2 Public IPv4?
**Answer**:  
By default, EC2 instances receive a dynamic public IPv4 address from AWS's shared pool. Whenever the instance is stopped, restarted, or moved to a different physical host during underlying hardware maintenance, that public IP is released and replaced with a new one. 

An **Elastic IP** is an allocated static public IPv4 address associated with your AWS account. It remains permanently reserved and tied to your instance even across stop/start cycles. Without an Elastic IP, any server reboot would change the IP address, breaking our DuckDNS `A` record and disconnecting all clients and SSL cert validation.

---

### Question 7: How does the network architecture prevent unauthorized database access?
**Answer**:  
We implemented **Defense-in-Depth** network isolation:
1. **Private Subnet / No Public IP**: The AWS RDS PostgreSQL instance was provisioned with **Public Access = Disabled**. It has no public IP address and cannot be resolved or routed from the public internet.
2. **Security Group Referencing**: Rather than opening port 5432 to an IP range (e.g. `0.0.0.0/0`), `rds-judgement-sg` has a single inbound rule allowing traffic on port 5432 **only if the traffic originates from the Security Group ID `ec2-judgement-sg`**.
3. **SSL Mode Enforced**: The database connection string specifies `sslmode=require`, encrypting all SQL queries and player records in transit between EC2 and RDS across the AWS internal backbone.

---

### Question 8: Explain the multi-stage Docker build in `backend/Dockerfile`. Why is it critical for production?
**Answer**:  
Our Dockerfile uses two distinct stages:
1. **Stage 1 (`builder`)**: Uses `golang:alpine`. It downloads dependencies, pulls root CA certificates, and compiles the Go source code with stripped debug symbols (`-ldflags="-w -s"`).
2. **Stage 2 (`production`)**: Uses a minimal, pristine `alpine:3.20` image (~5 MB). It copies only the compiled static binary (`server`), adds `ca-certificates` for RDS TLS validation, creates an unprivileged user (`appuser`, UID 10001), and runs the binary as a non-root user.

**Why this matters**:
* **Minimal Attack Surface**: The production container contains no Go compiler, no package manager, no git, and no shell tools. If an attacker discovers an RCE vulnerability, they cannot easily download or compile exploits.
* **Tiny Image Size (~25MB)**: Faster push times to ECR and near-instant `docker pull` on EC2 during CI/CD.
* **Memory & Storage Efficiency**: Uses negligible disk space and fits well within AWS ECR's 500 MB free tier.

---

### Question 9: Why build Docker images in GitHub Actions rather than directly on the EC2 instance?
**Answer**:  
1. **Resource Preservation**: Building a Docker container involves downloading dependencies, running Go compilations, and assembling container filesystem layers. On a `t3.micro` instance with only 1 vCPU and 1 GB of RAM, running `docker build` would saturate CPU burst credits and cause memory exhaustion, freezing the server and dropping active card games.
2. **Ephemeral Build Isolation**: GitHub Actions provides dedicated 2-core, 7 GB RAM cloud runners. Builds execute in a clean, reproducible sandbox without polluting the host EC2 filesystem with build caches or intermediate layers.
3. **Fast Network Throughput**: GitHub's cloud datacenter has multi-gigabit connections to AWS ECR, uploading image layers in 2–3 seconds.

---

### Question 10: What is an AWS ECR Lifecycle Policy and why is it important for cloud cost optimization?
**Answer**:  
Every time GitHub Actions pushes a new container build tagged with the commit SHA, a new image is stored in ECR. Over months of development, hundreds of unused images accumulate. Beyond the 500 MB free tier, AWS charges $0.10/GB-month for ECR storage.

An **ECR Lifecycle Policy** is an automated rule defined in JSON that instructs AWS to automatically expire and delete older untagged or tagged images (for example, *“Retain only the 5 most recent images”*). This keeps storage footprint minimal, predictable, and 100% within the free tier.

---

### Question 11: Why did we configure 2GB of Swap memory on the EC2 `t3.micro` instance?
**Answer**:  
An EC2 `t3.micro` instance has exactly 1024 MB (1 GB) of physical RAM. While the Go binary itself uses less than 40 MB of RAM at idle, system background processes, Nginx, Docker daemon operations, and `docker pull` layer decompression can briefly push memory usage over 1 GB.

Without swap, if the operating system runs out of physical memory, the Linux kernel's **Out-Of-Memory (OOM) Killer** immediately invokes `SIGKILL` on the highest memory-consuming process (which is usually the Go server or Docker daemon). Allocating a 2GB swapfile on the fast NVMe/gp3 EBS volume provides a safety buffer: sudden memory spikes gracefully spill to disk rather than crashing the game server.

---

### Question 12: How does anti-cheat state sanitization work in this architecture?
**Answer**:  
In trick-taking card games like Judgement, knowing opponents' cards completely breaks game integrity. Rather than relying on the client to hide opponents' cards, our Go server enforces **zero-trust state sanitization**:
* The pure Go game engine maintains the true global game state in server RAM.
* Before broadcasting a `GAME_STATE` event over WebSockets, the Hub creates player-specific sanitized clones of the `GameState` struct.
* For each player, the Hub explicitly wipes out the card arrays of all other players, replacing them with empty arrays or card counts.
* Even if an attacker inspects their raw WebSocket frames via Chrome DevTools or Wireshark, the packet physically does not contain opponents' hand data.

---

### Question 13: How does Let's Encrypt / Certbot authenticate domain ownership on EC2, and how does it auto-renew?
**Answer**:  
Certbot uses the **ACME HTTP-01 challenge**:
1. Certbot requests an SSL certificate for `judgement-game-api.duckdns.org` from the Let's Encrypt Certificate Authority (CA).
2. The Let's Encrypt CA responds with a cryptographic challenge token.
3. Certbot writes that token to a temporary webroot path on Nginx: `/.well-known/acme-challenge/<TOKEN>`.
4. The CA fetches `http://judgement-game-api.duckdns.org/.well-known/acme-challenge/<TOKEN>` over port 80.
5. Once verified, the CA signs and issues the TLS certificate.
6. A systemd timer (`certbot.timer`) runs twice daily on Ubuntu to check expiration. When the certificate has less than 30 days remaining, Certbot renews it automatically and executes `nginx -s reload`.

---

### Question 14: How does connection pooling work in our Go backend with GORM and PostgreSQL?
**Answer**:  
Opening a new TCP/TLS connection to PostgreSQL for every HTTP request is expensive (involving TCP 3-way handshakes, TLS negotiation, authentication, and backend process spawning in Postgres). 

In `backend/internal/database/db.go`, GORM wraps the Go standard library's `database/sql` connection pool. On application startup, a pool of persistent connections is established. When an HTTP handler queries the database (e.g. verifying user login), it leases an idle connection from the pool and immediately returns it upon query completion. In `main.go`, we gracefully close the pool on shutdown (`sqlDB.Close()`) to prevent orphaned connection leaks on RDS.

---

### Question 15: What is `ERR_BLOCKED_BY_CLIENT` in modern browsers, and why did uBlock Origin Lite block DuckDNS?
**Answer**:  
`ERR_BLOCKED_BY_CLIENT` is an internal Chromium error indicating that a browser extension (such as an ad-blocker, privacy tool, or antivirus shield) deliberately intercepted and aborted an outgoing network request.

uBlock Origin Lite utilizes community blocklists like Peter Lowe's Blocklist and Steven Black's hosts list. Because free dynamic DNS providers (like `duckdns.org` or `no-ip.org`) are occasionally exploited by bad actors for ephemeral phishing or malware distribution, heuristic blocklists sometimes flag the entire parent domain `*.duckdns.org`. Whitelisting the domain or using a registered top-level domain (like `.live`, `.com`) completely eliminates this issue.

---

### Question 16: How does the authentication system differentiate guest users from registered users?
**Answer**:  
* **Registered Users**: Created via `POST /api/v1/auth/register` with bcrypt-hashed passwords stored in the PostgreSQL `users` table, receiving positive auto-incrementing integer IDs (`1, 2, 3...`).
* **Guest Users**: Created via `POST /api/v1/auth/guest` for instant zero-friction play. The backend generates a cryptographically secure **negative guest ID** (range `-100,000,000` to `-999,999,999`) using `crypto/rand`.
* Both receive signed HMAC-SHA256 JWT tokens containing `user_id`, `username`, and `is_guest`. Because guest IDs are always negative, the database and in-memory game logic can instantly distinguish guest players from registered database accounts with zero collision risk.

---

### Question 17: How does dealer constraint enforcement work in Judgement?
**Answer**:  
In Judgement (Kachuful), a core tactical rule states: **The total number of tricks bid by all players in a round cannot equal the number of cards dealt in that round.** This mathematically guarantees that at least one player at the table will break contract and score 0 points.

In `internal/game/rules.go`, when the dealer submits their bid, the engine sums all previous players' bids plus the dealer's prospective bid. If `sum == roundCards`, the engine rejects the play with an error event, forcing the dealer to bid higher or lower and maintaining the game's competitive tension.

---

### Question 18: How is minimal deployment downtime achieved in our GitHub Actions pipeline?
**Answer**:  
Our deployment script in `.github/workflows/deploy-aws.yml` uses pre-cached Docker images and sequential container replacement:
1. The new image is pulled from ECR to local EC2 disk *before* touching the existing container: `docker pull $ECR_IMAGE`.
2. The running container is stopped and removed: `docker stop judgement-backend && docker rm judgement-backend`.
3. The new container is launched immediately from local cache: `docker run -d ... $ECR_IMAGE`.
4. Because the binary is pre-compiled and the image is already downloaded, the container swap takes **under 1.5 seconds**, minimizing disruption to active web traffic.

---

### Question 19: If this card game scales to 100,000 concurrent players, what architectural changes would be needed?
**Answer**:  
1. **Decouple the Hub with Redis Pub/Sub**: Currently, the Go Hub is an in-memory singleton on one EC2 instance. To scale horizontally across multiple EC2/ECS instances, we would introduce **Redis / Dragonfly** as a distributed message broker to sync lobby events across server instances.
2. **Session Affinity / Lobby Routing**: Use an Application Load Balancer (ALB) or a lightweight gateway (like Envoy) with consistent hashing or room-based routing so all 4 players in lobby `ABCD12` are routed to the specific server holding their in-memory room state.
3. **Database Read Replicas & Connection Pooling**: Add an **AWS RDS Read Replica** for user stats and leaderboard queries, and use **PgBouncer** or **AWS RDS Proxy** to manage thousands of concurrent database connections.
4. **AWS ECS Fargate with Auto Scaling**: Replace the single EC2 instance with an ECS Fargate service that automatically scales tasks up or down based on CPU/Memory utilization and active WebSocket connection metrics.

---

### Question 20: What is the difference between stateful and stateless horizontal scaling?
**Answer**:  
* **Stateless Horizontal Scaling** (e.g. standard REST APIs): Any incoming request can be handled by any server instance at any time because no client session data is stored in the application's RAM. Servers can be killed, spawned, or autoscaled behind a simple Round-Robin load balancer with zero coordination.
* **Stateful Horizontal Scaling** (e.g. real-time multiplayer games): The server holds long-lived bidirectional TCP connections and maintains active game state in local RAM. If a player in Room A connects to Server 1, all other players in Room A must either connect to Server 1 (via sticky sessions / routing gateways) or the servers must synchronize state in real time through an external distributed pub/sub layer (like Redis). Autoscaling down requires graceful connection draining so games in progress are not abruptly severed.
