# Backend System Architecture: Judgement Card Game

*This document outlines the complete backend system architecture, concurrency model, and data flows for the Judgement multiplayer card game. It is formatted to be easily parsed by AI system design tools (like Eraser.io) or for onboarding new developers.*

---

## 1. High-Level Overview
The backend is a **Go (Golang)** application utilizing a Clean Architecture approach. It acts as a hybrid server, processing both **stateless HTTP requests** (for authentication and matchmaking) and **stateful, full-duplex WebSockets** (for real-time, low-latency game events).

## 2. Technology Stack
* **Language**: Go 1.26.5
* **HTTP Router**: `go-chi/chi/v5`
* **WebSocket Engine**: `gorilla/websocket`
* **Database**: PostgreSQL 15 (Dockerized)
* **ORM**: `gorm.io/gorm`
* **Authentication**: `golang-jwt/jwt/v5` & `bcrypt`

---

## 3. Core Components & Concurrency Model

### A. The Stateless HTTP API (The Front Desk)
Handles standard CRUD operations before a game starts.
* **Flow**: `Client` -> `Chi Router` -> `AuthMiddleware` -> `Handler` -> `Service` -> `Repository` -> `PostgreSQL`.
* **Concurrency**: Go implicitly spawns a lightweight goroutine for every incoming HTTP request. Once the DB query finishes and the response is sent, the thread is garbage collected.

### B. The WebSocket Upgrader (The Bridge)
Handles the transition from matchmaking to real-time gameplay.
* **Flow**: Clients hit `GET /api/v1/lobbies/{lobbyID}/ws` with their JWT token. The Gorilla Upgrader intercepts the request, validates the token, and keeps the TCP connection permanently open.

### C. Per-Client Goroutines (Memory Isolation)
For every connected user, the server spawns exactly **two permanent goroutines**:
1. `readPump()`: A continuous `for` loop that blocks on `conn.ReadMessage()`. When it receives a JSON action from the user, it unmarshals it and pushes it into the central Hub.
2. `writePump()`: A continuous `select` loop that acts as an output buffer, pulling JSON strings from a channel and writing them to the user's socket.

### D. The Central Hub (The Traffic Cop / Multiplexer)
The Hub is a singleton struct that manages the global state of all active lobbies.
* **The Problem**: If two players play a card at the exact same millisecond, concurrent mutations to the game state memory would cause race conditions and crash the server.
* **The Solution**: All `readPump` threads **"Fan-In"** to a single Go Channel (`Hub.Actions`). The Hub runs a single, sequential event loop. It processes one card play at a time, completely eliminating the need for complex `sync.Mutex` locks.

### E. The Pure Game Engine (The Rulebook)
A completely isolated domain package (`internal/game`) that knows nothing about HTTP or WebSockets. It contains pure Go structs (`GameState`, `Card`, `Deck`) and pure functions (`PlaceBid`, `PlayCard`, `EvaluateTrick`).

### F. State Sanitization & Fan-Out (Anti-Cheat)
Once the Hub mutates the `GameState`, it must broadcast the new state to the players.
* **Anti-Cheat**: Before broadcasting, the Hub clones the `GameState` and explicitly deletes all opponents' hands from the memory map. This guarantees that if a player inspects their WebSocket network traffic (via DevTools), they only see their own cards.
* **Fan-Out**: The Hub looks up the specific `LobbyID`, grabs all clients at that table, and pushes the sanitized JSON into their `writePump` channels simultaneously.

---

## 4. Graphviz / Eraser.io Architecture Diagram
*You can supply this DOT code to Eraser.io to generate a detailed component diagram.*

```dot
digraph JudgementCardGameBackend {
    // Graph Settings
    rankdir=TB;
    splines=ortho;
    nodesep=0.8;
    ranksep=1.2;
    fontname="Inter, Helvetica, Arial, sans-serif";
    bgcolor="#f8f9fa";
    
    // Default Node & Edge Styles
    node [shape=box, style="filled,rounded", fontname="Inter", color="#ced4da", penwidth=1.5];
    edge [fontname="Inter", fontsize=10, fontcolor="#495057", color="#adb5bd", penwidth=1.5];

    // ----------------------------------------------------
    // EXTERNAL ACTORS
    // ----------------------------------------------------
    subgraph cluster_clients {
        label="CLIENT LAYER";
        style="filled,rounded";
        color="#e9ecef";
        fillcolor="#e9ecef";
        fontcolor="#495057";
        fontname="Inter-Bold";
        
        Player1 [label="Player 1\nBrowser", shape=ellipse, fillcolor="#4dabf7", fontcolor="white", color="#228be6"];
        Player2 [label="Player 2\nBrowser", shape=ellipse, fillcolor="#4dabf7", fontcolor="white", color="#228be6"];
    }

    Postgres [label=<<table border="0" cellborder="1" cellspacing="0" cellpadding="4">
        <tr><td bgcolor="#fcc419" colspan="2"><font color="white"><b>PostgreSQL (Docker)</b></font></td></tr>
        <tr><td><b>Table</b></td><td>users</td></tr>
        <tr><td><b>Table</b></td><td>lobbies</td></tr>
        <tr><td><b>Table</b></td><td>lobby_players</td></tr>
        </table>>, shape=none, margin=0];

    // ----------------------------------------------------
    // REST API LAYER (STATELESS)
    // ----------------------------------------------------
    subgraph cluster_rest {
        label="STATELESS HTTP API (go-chi)";
        style="filled,rounded";
        color="#d3f9d8";
        fillcolor="#ebfbee";
        fontcolor="#2b8a3e";
        fontname="Inter-Bold";

        AuthMiddleware [label="AuthMiddleware\n(Validates JWT)", fillcolor="#b2f2bb", fontcolor="#2b8a3e", color="#8ce99a"];
        AuthModule [label="Auth Module\n(Handler -> Service -> Repo)", fillcolor="#b2f2bb", fontcolor="#2b8a3e", color="#8ce99a"];
        LobbyModule [label="Lobby Module\n(Handler -> Service -> Repo)", fillcolor="#b2f2bb", fontcolor="#2b8a3e", color="#8ce99a"];
    }

    // ----------------------------------------------------
    // WEBSOCKET HUB (STATEFUL)
    // ----------------------------------------------------
    subgraph cluster_ws {
        label="WEBSOCKET ENGINE (Gorilla)";
        style="filled,rounded";
        color="#ffe3e3";
        fillcolor="#fff5f5";
        fontcolor="#c92a2a";
        fontname="Inter-Bold";

        WSUpgrader [label="WS Upgrader", fillcolor="#ffc9c9", fontcolor="#c92a2a", color="#ffa8a8", shape=cds];
        
        // Detailed Client Node using Record Shape
        ClientRoutines [label="{ Client Routines | { go readPump() | go writePump() } | { Inbound JSON | Outbound JSON } }", shape=record, fillcolor="#ffc9c9", fontcolor="#c92a2a", color="#ffa8a8"];
        
        // The core Hub
        Hub [label="{ Central Hub | { Lobbies Map | Games Map } | { Register Ch | Unregister Ch | Actions Ch } }", shape=record, fillcolor="#fa5252", fontcolor="white", color="#e03131"];
        
        Sanitizer [label="State Sanitizer\n(Anti-Cheat Filters Hands)", fillcolor="#ff8787", fontcolor="white", color="#fa5252", shape=hexagon];
    }

    // ----------------------------------------------------
    // CORE GAME LOGIC (PURE DOMAIN)
    // ----------------------------------------------------
    subgraph cluster_game {
        label="GAME DOMAIN (Pure Go)";
        style="filled,rounded";
        color="#e5dbff";
        fillcolor="#f3f0ff";
        fontcolor="#6741d9";
        fontname="Inter-Bold";

        GameState [label="game.GameState\n(Memory Struct)", fillcolor="#b197fc", fontcolor="white", color="#9775fa"];
        DeckEngine [label="Deck Engine\n(Fisher-Yates Shuffle)", fillcolor="#d0bfff", fontcolor="#5f3dc4", color="#b197fc"];
        LogicEngine [label="Rules Engine\n(Must Follow Suit,\nCalculate Winners)", fillcolor="#d0bfff", fontcolor="#5f3dc4", color="#b197fc"];
    }

    // ----------------------------------------------------
    // EDGES / CONNECTIONS
    // ----------------------------------------------------
    
    // HTTP Flow
    Player1 -> AuthModule [label="POST /register"];
    AuthModule -> Postgres [label="GORM Insert", style=dashed];
    
    Player1 -> AuthMiddleware [label="Bearer JWT"];
    AuthMiddleware -> LobbyModule [label="Context: UserID"];
    LobbyModule -> Postgres [label="GORM Insert", style=dashed];

    // WebSocket Upgrade
    Player1 -> WSUpgrader [label="GET /ws\n(Connection Kept Alive)", color="#339af0"];
    Player2 -> WSUpgrader [label="GET /ws", color="#339af0"];
    WSUpgrader -> ClientRoutines [label="Upgrades TCP"];
    
    // Channel Flow
    ClientRoutines -> Hub [label="JSON Event sent to\nHub.Actions Channel", color="#fa5252", penwidth=2];
    
    // Game Integration
    Hub -> GameState [label="Calls PlaceBid()\nCalls PlayCard()", color="#845ef7", penwidth=2];
    GameState -> LogicEngine [label="Validates Move"];
    GameState -> DeckEngine [label="Deals Cards (StartRound)"];
    
    // Return Flow (Anti-Cheat)
    GameState -> Hub [label="Returns Updated State", color="#845ef7"];
    Hub -> Sanitizer [label="Passes Raw State", color="#fa5252"];
    Sanitizer -> ClientRoutines [label="Sends Filtered State\nto writePump()", color="#fa5252", penwidth=2];
    
    // Output to Clients
    ClientRoutines -> Player1 [label="STATE_UPDATE JSON", color="#339af0"];
    ClientRoutines -> Player2 [label="STATE_UPDATE JSON", color="#339af0"];
}
```
