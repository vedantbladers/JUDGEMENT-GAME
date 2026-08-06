import { WSEvent, GameState, ErrorPayload, PlayerNotification } from "./types";

const WS_BASE_URL = "ws://localhost:8080/api/v1/lobbies";

const MAX_RECONNECT_ATTEMPTS = 5;
const BASE_RECONNECT_DELAY = 1000; // 1 second

export function connectToLobby(
  lobbyId: string,
  onStateUpdate: (state: GameState) => void,
  onError: (message: string) => void,
  onOpen?: () => void,
  onClose?: () => void,
  onPlayerJoined?: (notification: PlayerNotification) => void,
  onPlayerLeft?: (notification: PlayerNotification) => void
): WebSocket {
  const token = localStorage.getItem("jwt_token");
  const username = localStorage.getItem("username") || "Player";

  let reconnectAttempts = 0;
  let currentWs: WebSocket;

  function connect(): WebSocket {
    const ws = new WebSocket(
      `${WS_BASE_URL}/${lobbyId}/ws?token=${token}&username=${encodeURIComponent(username)}`
    );

    ws.onopen = () => {
      console.log(`[WS] Connected to lobby ${lobbyId}`);
      reconnectAttempts = 0; // Reset on successful connection
      onOpen?.();
    };

    ws.onmessage = (event: MessageEvent) => {
      try {
        const wsEvent: WSEvent = JSON.parse(event.data);

        switch (wsEvent.type) {
          case "STATE_UPDATE":
            onStateUpdate(wsEvent.payload as GameState);
            break;
          case "ERROR":
            onError((wsEvent.payload as ErrorPayload).message);
            break;
          case "PLAYER_JOINED":
            onPlayerJoined?.(wsEvent.payload as PlayerNotification);
            break;
          case "PLAYER_LEFT":
            onPlayerLeft?.(wsEvent.payload as PlayerNotification);
            break;
          default:
            console.log("[WS] Unknown event:", wsEvent.type);
        }
      } catch (e) {
        console.error("[WS] Failed to parse message:", e);
      }
    };

    ws.onclose = (event) => {
      console.log("[WS] Disconnected", event.code, event.reason);
      onClose?.();

      // Auto-reconnect with exponential backoff (skip if intentionally closed)
      if (event.code !== 1000 && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        const delay = BASE_RECONNECT_DELAY * Math.pow(2, reconnectAttempts);
        reconnectAttempts++;
        console.log(`[WS] Reconnecting in ${delay}ms (attempt ${reconnectAttempts})...`);
        setTimeout(() => {
          currentWs = connect();
        }, delay);
      }
    };

    ws.onerror = (error) => {
      console.error("[WS] Error:", error);
    };

    return ws;
  }

  currentWs = connect();
  return currentWs;
}

// Helper to send typed events to the server
export function sendEvent(ws: WebSocket, event: WSEvent): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(event));
  }
}
