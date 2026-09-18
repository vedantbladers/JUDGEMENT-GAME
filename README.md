<div align="center">

# 🃏 Judgement Card Game

**A high-performance, real-time multiplayer card game built with Go, WebSockets, Next.js, and PostgreSQL.**

[![Go Version](https://img.shields.io/badge/Go-1.25+-00ADD8?style=for-the-badge&logo=go&logoColor=white)](https://go.dev/)
[![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-336791?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)

[Features](#-key-features) • [Rules](#-game-rules-judgement--kachuful) • [Architecture](#-system-architecture) • [Tech Stack](#-tech-stack) • [Quick Start](#-quick-start) • [API & Protocol](#-api--websocket-protocol) • [Deployment](#-deployment--cicd)

</div>

---

## 📖 Overview

**Judgement** (also widely known as **Kachuful** or **Oh Hell**) is a strategic trick-taking card game played with a standard 52-card deck. The game combines precision bidding, suit management, and tactical card play. Unlike traditional card games where the goal is simply to win as many tricks as possible, Judgement challenges players to predict **exactly** how many tricks they will win in each round. 

This repository delivers a full-stack, enterprise-grade online multiplayer experience featuring:
- A high-throughput, concurrent **Go backend** leveraging Goroutines and Gorilla WebSockets.
- A reactive, glassmorphic **Next.js 16 (React 19)** frontend with fluid card animations powered by **Framer Motion**.
- Intelligent **heuristic-driven AI Bots** capable of filling empty seats or sparring solo.
- **Server-enforced anti-cheat security** guaranteeing hidden hand privacy across the network.

---

## ✨ Key Features

### 🌐 Real-Time Multiplayer Engine
- **Full-Duplex WebSockets**: Persistent, low-latency communication via Gorilla WebSockets.
- **Dedicated Client Pumps**: Isolated `readPump()` and `writePump()` goroutines per player, decoupling network I/O from game logic.
- **Zero Race Conditions**: Single-thread action channel fan-in inside the Central Hub eliminates concurrent state mutation risks without heavy mutex contention.

### 🛡️ Anti-Cheat State Sanitization
- **Server-Side Enforcement**: Game state validation occurs exclusively on the Go server.
- **Per-Player Hand Stripping**: Before broadcasting state updates over WebSockets, opponents' card data is scrubbed from the payload. Client inspection via browser DevTools reveals only public table data and their own hand.

### 🤖 Intelligent AI Bots
- **Automated Fillers & Solo Play**: Bots can join lobbies to allow single-player practice or complete partial tables.
- **Hand Distribution Heuristics**: AI personas calculate bids based on trump honors (Aces/Kings), side-suit control, and void distribution.
- **Rule-Compliant Play**: Bots rigorously evaluate trick state, avoid over-winning when bids are satisfied, and dump high cards safely when off-suit.

### 🎯 Strict Game Mechanics Enforcement
- **Dealer Bidding Constraint**: Automatically enforces the classic rule: *the sum of all player bids cannot equal the total cards dealt*, ensuring at least one player breaks contract each round.
- **Suit Following Validation**: Strictly verifies lead suit adherence, preventing invalid discards if a player holds a matching card.
- **Dynamic Trick Resolution**: Evaluates trump precedence, lead-suit hierarchy, and trick winner rights.

### 🎨 Modern, Responsive Frontend
- **Built on Next.js 16 & React 19**: Server components combined with interactive client states.
- **Styling**: Tailwind CSS v4 paired with DaisyUI for rich dark/emerald glassmorphic themes.
- **Micro-Animations**: Smooth card deals, hover elevations, turn indicators, trick collection physics, and victory confetti.

### 🔐 Authentication & Matchmaking
- **Stateless Auth**: Bcrypt password hashing and signed JSON Web Tokens (JWT) with 72-hour validity.
- **Lobby System**: 6-character room codes (e.g., `ABCD12`), support for 2–4 players, host controls, and public lobby discovery.

---

## 📜 Game Rules (Judgement / Kachuful)

| Phase | Description |
| :--- | :--- |
| **1. Dealing** | Cards are dealt evenly based on the current round number. A random card or designated suit determines the **Trump (Tarneeb/Hukum)**. |
| **2. Bidding** | In turn order starting left of the dealer, each player bids the exact number of tricks they predict they will win. **The dealer cannot make the total bids equal the number of cards in hand.** |
| **3. Trick Play** | Players must **follow suit** if they possess a card of the lead suit. If void, they may play a Trump card to cut or discard an off-suit card. |
| **4. Trick Winner** | The highest Trump played wins the trick. If no Trump is played, the highest card of the led suit wins. The winner leads the next trick. |
| **5. Scoring** | If a player wins **exactly** their bid tricks, they receive `10 + Bid` points. Any deviation (over or under) yields **0 points**. |

---

## 🏗️ System Architecture

The platform separates **stateless HTTP transactions** (authentication, lobby browsing) from **stateful real-time game loops** (WebSockets, trick execution).

### High-Level Architecture Diagram

```mermaid
flowchart TB
    subgraph Clients["Clients (Browsers / Devices)"]
        P1["Player 1 (Host)"]
        P2["Player 2"]
        Bot["AI Bot (Atlas / Nova)"]
    end

    subgraph Frontend["Frontend (Next.js 16 / React 19)"]
        UI["Tailwind CSS v4 + Framer Motion"]
        WSClient["WebSocket Client Manager"]
        APIClient["Fetch / REST API Client"]
    end

    subgraph Backend["Go Application Server (:8080)"]
        Router["Chi HTTP Router / Middleware"]
        AuthService["Auth Service (JWT / Bcrypt)"]
        LobbyService["Lobby Service (Room Codes)"]
        WSUpgrader["Gorilla WebSocket Upgrader"]

        subgraph Engine["Real-Time Engine"]
            Hub["Central Hub (Event Multiplexer)"]
            GameLogic["Pure Game Engine (Deck / Rules / AI)"]
            Sanitizer["State Sanitizer (Anti-Cheat Filter)"]
        end
    end

    subgraph Database["Database Layer"]
        PG[("PostgreSQL 15")]
    end

    %% Connections
    P1 & P2 --> UI
    UI --> WSClient & APIClient

    APIClient -->|HTTP POST /auth, /lobbies| Router
    Router --> AuthService & LobbyService
    AuthService & LobbyService -->|GORM / pgx| PG

    WSClient -->|WS Connect /lobbies/:id/ws| WSUpgrader
    WSUpgrader --> Hub
    Bot -.->|In-Memory Events| Hub
    Hub <--> GameLogic
    Hub --> Sanitizer
    Sanitizer -->|Sanitized State Broadcast| WSClient
```

### Concurrency & Event Flow

```mermaid
sequenceDiagram
    autonumber
    actor Player as Player A (Browser)
    participant RP as Client readPump() (Goroutine)
    participant Hub as Central Hub (Single Channel Loop)
    participant Logic as Game Engine (Pure Go Domain)
    participant San as State Sanitizer
    participant WP as Client writePump() (Goroutine)

    Player->>RP: Send JSON frame: PLAY_CARD {suit: "SPADES", rank: "A"}
    RP->>Hub: Push to Hub.Actions Channel (Fan-In)
    Note over Hub: Sequential execution (No race conditions)
    Hub->>Logic: Validate turn, suit rules, evaluate trick
    Logic-->>Hub: Return updated GameState
    Hub->>San: Sanitize GameState per player
    San-->>Hub: Return player-specific scrubbed states
    Hub->>WP: Fan-Out sanitized state to room players
    WP->>Player: Send JSON frame: GAME_STATE
```

---

## 🛠️ Tech Stack

### Backend
- **Language**: [Go (Golang) 1.25+](https://go.dev/)
- **HTTP Routing & Middleware**: [`go-chi/chi/v5`](https://github.com/go-chi/chi) with CORS, Logger, Recoverer, and Timeout middlewares
- **WebSocket Engine**: [`gorilla/websocket`](https://github.com/gorilla/websocket)
- **Database ORM & Driver**: [`gorm.io/gorm`](https://gorm.io/) with [`gorm.io/driver/postgres`](https://github.com/go-gorm/postgres) (using `jackc/pgx/v5`)
- **Authentication**: [`golang-jwt/jwt/v5`](https://github.com/golang-jwt/jwt) and [`golang.org/x/crypto/bcrypt`](https://pkg.go.dev/golang.org/x/crypto/bcrypt)
- **Environment Management**: [`joho/godotenv`](https://github.com/joho/godotenv)

### Frontend
- **Framework**: [Next.js 16](https://nextjs.org/) (App Router, Server Components)
- **Library**: [React 19](https://react.dev/)
- **Language**: [TypeScript 5](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) & [DaisyUI 5](https://daisyui.com/)
- **Animations**: [Framer Motion 13](https://www.framer.com/motion/)
- **Icons**: [Lucide React](https://lucide.dev/)

### DevOps & Infrastructure
- **Containerization**: [Docker](https://www.docker.com/) & [Docker Compose](https://docs.docker.com/compose/)
- **Database**: PostgreSQL 15 Alpine
- **Cloud / Hosting**: Azure Linux VM (Ubuntu) + Azure Container Registry (ACR)
- **CI/CD**: GitHub Actions (Automated unit tests, multi-stage Docker build, and SSH-based VM deployment)

---

## 📂 Project Structure

```text
JUDGEMENT-GAME/
├── .github/
│   └── workflows/
│       ├── backend-ci.yml       # Go unit tests & build validation
│       ├── frontend-ci.yml      # Next.js build & ESLint pipeline
│       └── deploy-azure.yml     # Automated Docker build & VM deployment
├── backend/
│   ├── cmd/
│   │   └── api/
│   │       └── main.go          # Application entrypoint & dependency injection
│   ├── internal/
│   │   ├── auth/                # User authentication (Handler, Service, Repository)
│   │   ├── config/              # Typed environment variable loader
│   │   ├── database/            # GORM database connector & auto-migrations
│   │   ├── game/                # Core domain: deck, rules, card logic, AI bots
│   │   ├── lobby/               # Matchmaking rooms and player associations
│   │   ├── middleware/          # JWT HTTP authentication context middleware
│   │   ├── models/              # Relational models (User, Lobby, LobbyPlayer)
│   │   └── ws/                  # Real-time WebSocket Hub, client pumps, events
│   ├── Dockerfile               # Production multi-stage Go build
│   └── go.mod
├── frontend/
│   ├── src/
│   │   ├── app/                 # Next.js App Router pages (login, dashboard, game)
│   │   ├── components/          # Reusable UI (PlayingCard, Confetti, ParticleBackground)
│   │   └── lib/                 # REST client, WebSocket client wrapper, TypeScript types
│   ├── package.json
│   └── tailwind.config.ts
├── scripts/
│   └── setup-vm.sh              # Ubuntu VM provisioning (Docker, Swap, Firewall)
├── docker-compose.yml           # Local PostgreSQL container service
└── README.md
```

---

## 🚀 Quick Start

### Prerequisites
Make sure you have the following installed locally:
- [Go 1.25+](https://go.dev/dl/)
- [Node.js 20+](https://nodejs.org/) & `npm`
- [Docker & Docker Compose](https://www.docker.com/)

---

### 1. Clone the Repository
```bash
git clone https://github.com/vedantbladers/JUDGEMENT-GAME.git
cd JUDGEMENT-GAME
```

---

### 2. Start PostgreSQL with Docker
Start the database service mapped to port `5433`:
```bash
docker compose up -d
```

---

### 3. Setup & Run the Backend

1. Navigate to the backend folder:
   ```bash
   cd backend
   ```
2. Create your `.env` configuration:
   ```bash
   cp .env.example .env
   ```
   *(Ensure `DB_URL` points to `postgres://judgement_user:judgement_password@localhost:5433/judgement_db?sslmode=disable`)*

3. Download dependencies and run the server:
   ```bash
   go mod download
   go run cmd/api/main.go
   ```
   *The backend API will start on `http://localhost:8080`.*

---

### 4. Setup & Run the Frontend

1. Open a new terminal and navigate to `frontend`:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create your `.env.local` file:
   ```bash
   cat <<EOF > .env.local
   NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1
   NEXT_PUBLIC_WS_URL=ws://localhost:8080/api/v1/lobbies
   EOF
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```
   *Open [http://localhost:3000](http://localhost:3000) in your browser.*

---

## 📡 API & WebSocket Protocol

### REST API Endpoints

| Method | Endpoint | Auth | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/health` | No | Server health status check |
| `POST` | `/api/v1/auth/register` | No | Register a new user account |
| `POST` | `/api/v1/auth/login` | No | Authenticate user & receive JWT |
| `POST` | `/api/v1/lobbies` | Bearer Token | Create a new game lobby |
| `GET` | `/api/v1/lobbies` | Bearer Token | List all available public lobbies |
| `POST` | `/api/v1/lobbies/join` | Bearer Token | Join a lobby using a 6-digit code |
| `GET` | `/api/v1/lobbies/{id}/ws`| Bearer Token | Upgrade connection to full-duplex WebSocket |

### WebSocket Event Protocol

All real-time communications use a standardized JSON wrapper:
```json
{
  "type": "EVENT_TYPE",
  "payload": { ... }
}
```

| Event Type | Direction | Payload Description |
| :--- | :--- | :--- |
| `START_GAME` | Client ➔ Server | Host triggers game initiation |
| `ADD_BOT` | Client ➔ Server | Adds an AI bot to fill an empty lobby seat |
| `PLACE_BID` | Client ➔ Server | `{ "bid": 3 }` — Submits player bid for round |
| `PLAY_CARD` | Client ➔ Server | `{ "suit": "SPADES", "rank": "A" }` — Plays card to trick |
| `GAME_STATE` | Server ➔ Client | Full sanitized game snapshot (Hands, Round, CurrentTrick) |
| `ERROR` | Server ➔ Client | Detailed error message for invalid plays or actions |

---

## 🧪 Testing

The game logic and AI components feature extensive unit test coverage.

### Run Backend Unit Tests
```bash
cd backend
go test -v ./internal/game/...
```
Test cases validate:
- 52-card deck composition and Fisher-Yates shuffle randomness.
- Dealer bidding constraint validation.
- Trick-taking rank comparison across trump and off-suit plays.
- AI bot bidding estimations and suit-following decision logic.

### Lint & Build Frontend
```bash
cd frontend
npm run lint
npm run build
```

---

## 🚢 Deployment & CI/CD

The repository includes a production-grade automated deployment pipeline:

```mermaid
flowchart LR
    GitPush["Git Push (main)"] --> GHA["GitHub Actions"]
    GHA --> Tests["Run Go Tests & Linters"]
    Tests --> DockerBuild["Build Multi-Stage Docker Image"]
    DockerBuild --> ACR["Push to Azure Container Registry"]
    ACR --> Deploy["SSH to Azure Linux VM"]
    Deploy --> DockerRun["Pull & Run Docker Container"]
```

1. **GitHub Actions Workflows**:
   - [`backend-ci.yml`](.github/workflows/backend-ci.yml): Validates backend builds and executes test suites.
   - [`frontend-ci.yml`](.github/workflows/frontend-ci.yml): Verifies TypeScript compilation and Next.js builds.
   - [`deploy-azure.yml`](.github/workflows/deploy-azure.yml): Builds the container image, publishes to Azure Container Registry (ACR), and safely updates the running container on an Azure VM via SSH.
2. **VM Provisioning**:
   - Use [`scripts/setup-vm.sh`](scripts/setup-vm.sh) to bootstrap a fresh Ubuntu VM with Docker, UFW firewall configurations, and swap memory allocations.

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

<div align="center">
  <sub>Built with ❤️ by <a href="https://github.com/vedantbladers">vedantbladers</a></sub>
</div>
