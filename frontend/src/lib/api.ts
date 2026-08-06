const API_BASE_URL = "http://localhost:8080/api/v1";

// Generic fetch wrapper that auto-injects the JWT token
async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem("jwt_token");

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.error?.message || "Something went wrong");
  }

  return data as T;
}

// --- Auth APIs ---

interface AuthResponse {
  user: {
    id: number;
    username: string;
    email: string;
  };
  token: string;
}

export async function registerUser(
  username: string,
  email: string,
  password: string
): Promise<AuthResponse> {
  return apiFetch<AuthResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify({ username, email, password }),
  });
}

export async function loginUser(
  email: string,
  password: string
): Promise<AuthResponse> {
  return apiFetch<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

// --- Lobby APIs ---

interface LobbyResponse {
  lobby: {
    id: string;
    host_id: number;
    status: string;
    max_players: number;
  };
  players: {
    id: number;
    username: string;
    email: string;
  }[];
}

export async function createLobby(
  maxPlayers: number
): Promise<LobbyResponse> {
  return apiFetch<LobbyResponse>("/lobbies/create", {
    method: "POST",
    body: JSON.stringify({ max_players: maxPlayers }),
  });
}

export async function joinLobby(
  lobbyCode: string
): Promise<LobbyResponse> {
  return apiFetch<LobbyResponse>(`/lobbies/${lobbyCode}/join`, {
    method: "POST",
  });
}
