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

---

### 💡 Interview Tip:
If an interviewer asks *"What was the most challenging bug you faced?"*, talk about **Bug #3 (The Cumulative Scoring Bug)**. It shows that you understand how in-memory state management works in Go, how pointers and maps behave, and how WebSocket event loops manage state transitions!
