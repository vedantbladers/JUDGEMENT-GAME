# Complete End-to-End Request Flow & Architecture Guide
### Judgement Multiplayer Card Game: Vercel Next.js ➔ Azure VM (Nginx + Go Docker) ➔ Azure PostgreSQL

This document provides an expanded, step-by-step explanation of how network requests, real-time WebSockets, and data packets travel through your application stack from start to finish.

---

## 1. High-Level Architecture Diagram

```text
══════════════════════════════════════════════════════════════════════════════════
[ 1. CLIENT LAYER ]
Player's Browser (Mobile / Desktop)
Running Next.js React UI hosted on Vercel: https://judgement-game-gamma.vercel.app
══════════════════════════════════════════════════════════════════════════════════
                               │
                               │  (1) HTTPS / WSS Requests over Public Internet
                               │      Target: https://judgement-api.eastus.cloudapp.azure.com:443
                               ▼
══════════════════════════════════════════════════════════════════════════════════
[ 2. NETWORK & SECURITY PERIMETER (Azure) ]
• Azure Public DNS: Resolves domain to the VM's Static Public IP
• Azure Network Security Group (NSG Firewall):
  - Port 22  (SSH)   ➔ Allowed (Admin management only)
  - Port 80  (HTTP)  ➔ Allowed (ACME SSL Challenge & redirect)
  - Port 443 (HTTPS) ➔ Allowed (All production player traffic)
  - Port 8080 (Go)   ➔ BLOCKED to the public internet
  - Port 5432 (DB)   ➔ BLOCKED to the public internet
══════════════════════════════════════════════════════════════════════════════════
                               │
                               │  (2) Encrypted TLS 1.3 Packets enter VM on Port 443
                               ▼
══════════════════════════════════════════════════════════════════════════════════
[ 3. REVERSE PROXY & SSL TERMINATION (Nginx) ]
Host: Azure Linux VM (Ubuntu 24.04 LTS)
• Holds Let's Encrypt SSL Certificate (Public Cert + Private Key)
• Decrypts HTTPS/WSS packets in RAM into plain HTTP / raw socket bytes
• Manages WebSocket Handshake (Upgrade: websocket ➔ 101 Switching Protocols)
• Preserves Client Identity (Host, X-Real-IP, X-Forwarded-For, X-Forwarded-Proto)
══════════════════════════════════════════════════════════════════════════════════
                               │
                               │  (3) Local unencrypted communication via Loopback
                               │      Target: http://127.0.0.1:8080 (Never leaves computer RAM)
                               ▼
══════════════════════════════════════════════════════════════════════════════════
[ 4. APPLICATION RUNTIME (Go in Docker Container) ]
Container Name: judgement-backend (Listening strictly on 127.0.0.1:8080)
• Chi Router: Dispatches HTTP endpoints (/health, /api/v1/auth/*, /api/v1/lobbies/*)
• Middleware: CORS verification against FRONTEND_URL + JWT token parsing
• WebSocket Hub: Concurrent Goroutine Actor Loop for live card arena broadcasting
• Game Engine: Trick evaluation, turn rotations, and autonomous AI bots
══════════════════════════════════════════════════════════════════════════════════
                               │
                               │  (4) PostgreSQL Wire Protocol over TLS (Port 5432)
                               ▼
══════════════════════════════════════════════════════════════════════════════════
[ 5. MANAGED PERSISTENCE LAYER ]
Azure Database for PostgreSQL Flexible Server (Port 5432, sslmode=require)
• Stores User Credentials (bcrypt hashes), Lobby Sessions, Match History, and Scores
══════════════════════════════════════════════════════════════════════════════════
```

---

## 2. Decoded: All the IPs, Addresses, and Port Numbers

To understand the system, here is what every single address and port number actually does:

| Address / Port | Technical Name | Plain English Meaning | Its Specific Role in Judgement |
| :--- | :--- | :--- | :--- |
| **`127.0.0.1`** | **Localhost (Loopback IP)** | *"This machine itself"* | A virtual internal network simulated inside Linux RAM. Data sent here **never leaves the physical computer**. Used for Nginx to talk directly to Go in total privacy. |
| **Port `443`** | **HTTPS / WSS Standard Port** | *Secure Front Door* | The universal internet port for encrypted web traffic. **Nginx listens here**. When your browser requests `https://...`, it connects automatically to port 443. |
| **Port `80`** | **HTTP Standard Port** | *Unencrypted Front Door* | Standard unencrypted web port. Nginx uses this solely to answer Let's Encrypt domain verification checks, and automatically redirects normal human visitors to `443` (HTTPS). |
| **Port `8080`** | **Application Internal Port** | *Go's Private Room* | A non-privileged port chosen for your Go backend container. Go listens on `127.0.0.1:8080`. External internet visitors cannot touch port 8080 directly because Azure's firewall drops them. |
| **Port `5432`** | **PostgreSQL Wire Port** | *The Database Vault Door* | The standard port for PostgreSQL. Your Go backend connects across this port to read and write database records using TLS encryption (`sslmode=require`). |
| **Port `22`** | **SSH Port** | *Admin Maintenance Door* | Secure Shell port used only by you from your command line (`ssh -i key.pem azureuser@...`) to manage and update the Linux VM. |

---

## 3. Step-by-Step Walkthrough of the Entire Flow

### Step 1: Action on Vercel (Client Layer)
* A player opens `https://judgement-game-gamma.vercel.app` on their device.
* The player logs in or joins a match.
* The Next.js frontend reads its environment variables:
  * `NEXT_PUBLIC_API_URL` = `https://judgement-api.eastus.cloudapp.azure.com/api/v1`
  * `NEXT_PUBLIC_WS_URL` = `wss://judgement-api.eastus.cloudapp.azure.com/api/v1/lobbies`
* The browser initiates an outbound connection over the public internet to `judgement-api.eastus.cloudapp.azure.com` on **Port 443**.

### Step 2: Azure Ingress & Firewall Inspection
* Public DNS resolves the domain name to the **Azure VM's Static Public IP**.
* The packet arrives at Azure's **Network Security Group (NSG)** perimeter firewall:
  * Destination is Port 443 ➔ **Rule matches: ALLOW**.
  * Packet is forwarded directly to the VM's network interface (`eth0`).

### Step 3: Nginx Receives the Request & SSL Termination
* Nginx is actively listening on `0.0.0.0:443` (the public interface).
* **The Cryptographic Handshake**:
  1. The browser and Nginx perform a TLS 1.3 handshake.
  2. Nginx proves its identity using the Let's Encrypt certificate (`fullchain.pem`).
  3. Browser and Nginx establish a shared symmetric session encryption key.
* **Decryption (SSL Termination)**:
  * Nginx decrypts the incoming HTTPS ciphertext in system memory into clean, standard HTTP text.
  * *Why "Termination"?* Because the public encryption layer ends right here at Nginx. Go does not have to waste CPU cycles doing heavy cryptographic math.

### Step 4: Nginx Passes Traffic to Go via Loopback (`127.0.0.1:8080`)
* Nginx checks its configuration file:
  ```nginx
  proxy_pass http://127.0.0.1:8080;
  ```
* Nginx attaches essential client headers so Go knows who is calling:
  * `Host`: The domain the user visited (`judgement-api.eastus.cloudapp.azure.com`).
  * `X-Real-IP`: The player's actual home/mobile IP address (for logging and security).
  * `X-Forwarded-Proto`: Tells Go the original request was secure `https`.
* Nginx writes the decrypted payload directly across `127.0.0.1` to port `8080`.
* The Linux kernel instantly copies this data buffer in RAM directly into the Docker Go container.

### Step 5: Go Backend Execution
* Inside the Docker container, the compiled Go binary (`judgement-backend`) is listening on `:8080`.
* **Routing & Security**:
  * **CORS Middleware**: Verifies that the `Origin` header matches `FRONTEND_URL` (`https://judgement-game-gamma.vercel.app`).
  * **JWT Middleware**: If it's a protected endpoint, validates the Bearer token signature using `JWT_SECRET`.
* **Game Logic & State**:
  * If a card was played, the game engine verifies card legality (following suit, trump rules).
  * It evaluates trick winners, updates player scores, or prompts autonomous AI bots to calculate their response.

### Step 6: Database Persistence (Azure PostgreSQL)
* When match data, user credentials, or round scores must be saved:
* Go initiates a TCP connection to the managed **Azure Database for PostgreSQL Flexible Server** on **Port 5432**.
* Go uses `sslmode=require` to ensure credentials and database rows are encrypted while crossing from the VM to the managed database service.
* PostgreSQL writes the records to disk and sends back an acknowledgment to Go.

### Step 7: Outbound Journey (Returning the Response)
1. **Go ➔ Nginx**: Go formats the result into a plain JSON response (e.g. `HTTP 200 OK`) and writes it back to the local socket `127.0.0.1`.
2. **Nginx Encrypts**: Nginx receives the plain JSON, wraps it in **TLS/HTTPS encryption** using the player's session key.
3. **Nginx ➔ Internet ➔ Player**: Nginx transmits the encrypted packet out of port 443 across the internet.
4. **Browser Rendering**: The player's browser decrypts the response and React immediately updates the visual cards, turn indicators, and scores on screen.

---

## 4. How WebSockets (Live Gameplay) Differ from Standard HTTP

While login and user registration use standard request-response HTTP, the live card arena table uses a **persistent WebSocket (WSS)**.

```text
[ Browser ]                                              [ Nginx ]                                        [ Go Backend ]
     │                                                       │                                                  │
     │── (1) GET /ws (HTTP Upgrade Request) ────────────────>│                                                  │
     │       Headers: Upgrade: websocket                     │── (2) Forwards Upgrade to 127.0.0.1:8080 ───────>│
     │                Connection: upgrade                    │       Headers preserved by Nginx                 │
     │                                                       │                                                  │
     │                                                       │<── (3) HTTP/1.1 101 Switching Protocols ─────────│
     │<── (4) Encrypted 101 Switching Protocols ─────────────│        (Go accepts the WebSocket connection)     │
     │                                                       │                                                  │
════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
                     THE CONNECTION IS NOW AN OPEN, PERMANENT BIDIRECTIONAL STREAM
════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
     │                                                       │                                                  │
     │── (5) Player Plays Card (Encrypted WSS Frame) ───────>│── Decrypts ➔ Passes raw JSON Frame ─────────────>│
     │                                                       │                                                  │
     │                                                       │                                     (Go updates board)
     │                                                       │                                                  │
     │<── (6) Broadcast Updated Board (Encrypted WSS) ───────│<── Sends to all players in room (Plain WS) ──────│
```

### Why the Nginx WebSocket Configuration Matters:
```nginx
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection "upgrade";
proxy_read_timeout 3600s;
proxy_send_timeout 3600s;
```
* **Without `Upgrade` & `Connection`**: Standard HTTP proxies strip these headers, causing WebSockets to fail with a `400 Bad Request`. Nginx passes them through, allowing the connection to switch from HTTP to a live TCP socket.
* **Without `proxy_read_timeout 3600s`**: Nginx closes connections after 60 seconds of silence. The 1-hour timeout prevents players from getting disconnected when someone takes time to think about their turn.

---

## 5. Frequently Asked Questions & Core Concepts

### Q1: Is it safe for Go to use plain unencrypted HTTP on `127.0.0.1:8080`?
**Yes, 100% safe.** 
`127.0.0.1` is the loopback interface. It is simulated by the Linux kernel entirely inside computer memory (RAM). Packets sent between Nginx and Go never touch a physical network card, Wi-Fi, router, or cable. No external attacker on the internet can access or sniff the loopback interface.

### Q2: What URL does Vercel actually see?
Vercel and the player's browser **only see your public Azure domain**:
`https://judgement-api.eastus.cloudapp.azure.com`
They have **zero knowledge** of port 8080, `127.0.0.1`, Docker, or Go. To the outside world, your backend is just a single secure HTTPS/WSS address.

### Q3: Why not put SSL certificates directly inside Go?
1. **CPU Efficiency**: Nginx is written in optimized C with direct hardware cryptographic acceleration (AES-NI). It handles encryption far more efficiently than application-layer code.
2. **Zero-Downtime Renewals**: Let's Encrypt certificates expire every 90 days. Certbot automatically renews them and reloads Nginx in memory without restarting your Go app or dropping active card matches.
3. **Defense in Depth**: Nginx acts as a bouncer that absorbs malformed HTTP requests and connection flood attacks before they can consume resources inside your Go application.
