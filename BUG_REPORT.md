# Judgement Card Game: Bug Report & Challenges Faced

*A log of technical challenges, bugs, and architectural fixes encountered while building the Judgement Card Game (Go + Next.js). Use this document as a reference for technical interviews to discuss problem-solving skills, debugging, and system architecture.*

---

## 1. The CORS & Hardcoded Environment Bug
**Symptom:** When deploying the Next.js frontend to Vercel and the Go backend to Render, the browser threw a `Failed to fetch` error during login and registration.
**Root Cause:** 
- The frontend was hardcoded to send requests to `http://localhost:8080`, which obviously failed on the live Vercel site. 
- The Go backend's CORS (Cross-Origin Resource Sharing) middleware was strictly allowing `localhost`, blocking the Vercel domain from making requests.
**Resolution:** 
- Configured the frontend to use `process.env.NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_WS_URL`.
- Modified the Go backend to accept a `FRONTEND_URL` environment variable and injected it into the Gin CORS middleware `AllowedOrigins`.

## 2. The Render "Cold Start" Spin-down Issue (DevOps)
**Symptom:** After leaving the game idle for 15+ minutes, the next time a user tried to log in, the API request would hang for 50+ seconds before responding.
**Root Cause:** Render's free tier automatically spins down web services after 15 minutes of inactivity to save resources, causing massive "cold start" delays when waking back up.
**Resolution:** 
- Engineered a lightweight `/health` endpoint in the Go backend that returned a `200 OK` status.
- Set up a scheduled cron job (via `cron-job.org`) to ping the `/health` endpoint every 10 minutes. This successfully tricked the Render service into staying awake 24/7, eliminating cold starts entirely.

## 3. The Cumulative Scoring / State Overwrite Bug (WebSocket/Game Logic)
**Symptom:** After a round of cards finished, clicking "Play Next Round" caused all player scores to reset to zero instead of keeping a running total.
**Root Cause:** In the WebSocket hub (`hub.go`), the `EventStartGame` listener was blindly calling `game.NewGame()` every time the host started a new round. This completely destroyed the in-memory `GameState` struct and re-initialized it, erasing the `Scores` map.
**Resolution:** 
- Refactored the game initialization logic to check if a `GameState` pointer already existed for that lobby ID. 
- If it existed, the server reused the existing state (preserving the `Scores` map) and only cleared round-specific maps (like `Bids`, `TricksWon`, and `Hands`).

## 4. UI Scaling / REM Sizing Issue (Frontend)
**Symptom:** The game's UI felt cramped and too small on standard 1080p desktop monitors, requiring users to manually zoom their browser to 125%.
**Root Cause:** Tailwind CSS relies heavily on `rem` (root em) units for paddings, margins, and typography, which defaults to the browser's 16px base size, making complex layouts feel tiny.
**Resolution:** 
- Instead of manually rewriting hundreds of Tailwind classes (`p-4` to `p-6`, etc.), I applied `style={{ fontSize: "125%" }}` to the root `<html>` tag in the Next.js `layout.tsx`. 
- Because Tailwind is built on `rem` sizing, this instantly and perfectly scaled the entire application architecture up by 125% without breaking the responsive mobile grid.

## 5. CI/CD GitHub Actions Security Block (DevOps)
**Symptom:** When pushing the `.github/workflows` folder to set up automated testing and builds, Git rejected the push with a `[remote rejected]` error stating the Personal Access Token lacked scope.
**Root Cause:** GitHub inherently blocks modifications to the `.github/workflows` folder as a security measure to prevent stolen standard tokens from injecting malicious deployment scripts.
**Resolution:** 
- Upgraded the GitHub Personal Access Token permissions via the developer settings to explicitly grant the `workflow` scope, successfully deploying the CI/CD pipelines.

## 6. The Guest Access & Hybrid Auth Architecture (System Design & UX)
**Challenge:** Mandatory email/password registration created high friction for casual players receiving a lobby link, leading to user dropoff. However, removing accounts entirely would prevent dedicated players from tracking their win/loss history.
**Design Constraints:**
- Guest players needed instant 1-click access without clogging the PostgreSQL database with temporary account rows.
- Returning guests shouldn't have to re-type their nickname on every visit.
- Registered users needed persistent win/loss stat tracking displayed on their home page.
- Username uniqueness validation to prevent guests from impersonating registered users or duplicating active nicknames in a room.
- Direct "Play as Guest" escape hatch on the Sign Up/Login page.
**Resolution:**
- Architected a **Hybrid Authentication Model**:
  1. **Guest Mode:** Guest nicknames are saved in `localStorage` for 1-click returning convenience. Backend issues temporary session tokens with `is_guest: true`.
  2. **Registered Users:** Authenticated via permanent JWT tokens. Win/loss stats are updated in PostgreSQL after every match and displayed on the user's home page (`Wins`, `Losses`, `Win Rate`).
  3. **Seamless Shared Lobbies:** Guests and registered players sit at the exact same game table and play together without distinction during matches.
  4. **Conversion Prompts:** Added a top header status indicator and a post-game banner (*"Enjoyed your match? Sign up to save your win/loss stats!"*) to convert guests to registered users without forcing them.

## 7. Cross-Site WebSocket Hijacking (CSWSH) & Strict Origin Checks (Security)
**Symptom:** The WebSocket upgrader was configured with `CheckOrigin: func(r *http.Request) bool { return true }`, exposing the application to Cross-Site WebSocket Hijacking (CSWSH) where malicious third-party websites could silently open sockets to join games on behalf of logged-in players.
**Root Cause:** Permissive development-time origin defaults were never replaced with an allowlist validator.
**Resolution:** 
- Built an `isAllowedOrigin` verification function in `backend/internal/ws/handler.go` that inspects the HTTP `Origin` header.
- Restricted connections to approved hostnames (`localhost:3000`, `127.0.0.1:3000`, `localhost:8080`, and the production `FRONTEND_URL` environment variable), rejecting untrusted origins with an HTTP 403 Forbidden.

## 8. The Go Channel Double-Close Panic Race Condition (Concurrency & Reliability)
**Symptom:** Under unstable network connections or rapid player disconnects, the Go backend service would intermittently crash with a fatal runtime error: `panic: close of closed channel`.
**Root Cause:** In `backend/internal/ws/hub.go`, `client.Send` was closed during unregistration. If a concurrent broadcast operation encountered a write error or blocked channel on the same client, it would attempt to close `client.Send` a second time, triggering Go's fatal double-channel-close panic.
**Resolution:** 
- Thread-safely encapsulated channel teardown inside a `CloseSend()` method on the `Client` struct using Go's `sync.Once`.
- Guaranteed that `close(c.Send)` can only ever be executed exactly once, regardless of whether a disconnection or a broadcast write failure triggers the cleanup first.

## 9. Predictable Guest IDs & Input Buffer Memory Exhaustion DoS (Security & Defense)
**Symptom:** Guest user IDs were generated using predictable timestamps (`time.Now().UnixNano()`), making user session IDs guessable. Furthermore, JSON endpoints lacked payload size limits, creating a Denial of Service (DoS) memory exhaustion vulnerability.
**Root Cause:** Sequential system clocks are non-cryptographic, and standard `json.NewDecoder(r.Body)` reads unbounded input streams into heap memory.
**Resolution:** 
- Replaced timestamp IDs with cryptographically secure negative random integers using Go's `crypto/rand` package.
- Wrapped JSON request body reading in `backend/internal/auth/handler.go` and `lobby/handler.go` with `http.MaxBytesReader(w, r.Body, 1048576)` (1 MB hard cap).
- Enforced strict alphanumeric bounds and length validations on usernames (2–20 chars) and passwords (6–72 chars).

## 10. Intelligent Heuristic Bot AI Engine Without "AI Slop" (Game AI Architecture)
**Challenge:** Solo players and small groups needed intelligent, competitive bot opponents to fill tables. Relying on external LLM APIs ("AI slop") would introduce unacceptable latency (1–3s per turn), recurring API costs, and non-deterministic invalid moves.
**Design & Mechanics:**
- **Predictive Bidding Heuristics:** Designed `CalculateBid` in `backend/internal/game/ai.go` to compute expected tricks by evaluating high-card honor values (Aces, Kings, Queens), side-suit singletons/voids, and trump suit volume. Supports distinct bot personas: **Atlas** (conservative), **Nova** (aggressive), and **Sage** (balanced).
- **Rule-Bound Tactical Card Play:** Designed `ChooseCardToPlay` to strictly isolate legal moves (`getLegalCards`). When a bot needs tricks, it leads control cards or ruffs with lowest winning trumps. When its bid quota is met, it ducks tricks and sloughs off dangerous high cards to prevent breaking its forecast.
- **Natural Deliberation:** Integrated an asynchronous 800ms human-like thinking delay into `hub.go` using goroutine timers so bot turns feel responsive yet natural rather than robotic or instant.

## 11. Eradicating Casino/Gambling Aesthetics in Favor of a Tactical Arena (UI/UX)
**Symptom:** The game looked and felt like a tacky online gambling site due to dark emerald felt (`#091410`, `#1b5e20`), heavy 12px brown wood borders (`.casino-table`), roulette-style elements, and DaisyUI's `luxury` theme.
**Root Cause:** Early prototypes borrowed traditional poker/casino design tropes rather than styling Judgement as a modern competitive card strategy game.
**Resolution:** 
- Replaced green felt and wooden borders with a modern **Dark Obsidian & Cyan Tactical Arena** design system (`globals.css`, `ParticleBackground.tsx`).
- Engineered `.card-arena` featuring deep slate radial lighting (`#151d2f` -> `#0c121e` -> `#070a12`), subtle tabletop dot-matrix texture, and crisp border lighting.
- Redesigned playing cards with high-contrast faces, smooth 3D hover elevation, and a clean crown indicator for active trump cards.
- Modernized all companion pages (Lobby, Rules, Login, Register, About) into cohesive glassmorphic tactical command screens.

---

### 💡 Interview Tips:
- **For Backend & Concurrency:** Talk about **Bug #8 (The Channel Double-Close Panic)**. Explaining how `sync.Once` prevents race condition crashes across concurrent goroutines (`readPump`, `writePump`, and `hub.broadcast`) demonstrates real-world Go systems mastery.
- **For Security & Architecture:** Talk about **Bug #7 (CSWSH & Origin Validation)** and **Bug #9 (Memory Exhaustion DoS)**. Discussing why WebSockets require strict origin checks and how `http.MaxBytesReader` prevents memory exhaustion shows deep production readiness.
- **For Game & Product Engineering:** Discuss **Challenge #10 (Heuristic Bot AI)**. Explaining why a deterministic, rule-bound heuristic state engine was chosen over latency-heavy LLMs shows practical product thinking and algorithmic discipline.


