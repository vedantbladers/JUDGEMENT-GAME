const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1";

async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = typeof window !== "undefined" ? localStorage.getItem("jwt_token") : null;

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

  let data: (Record<string, unknown> & { error?: { message?: string } }) | null = null;
  const contentType = res.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    try {
      data = await res.json();
    } catch {
      data = null;
    }
  } else {
    try {
      const text = await res.text();
      data = { error: { message: text.trim() } };
    } catch {
      data = null;
    }
  }

  if (!res.ok) {
    if (res.status === 401) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("jwt_token");
        localStorage.removeItem("user_id");
        localStorage.removeItem("username");
        localStorage.removeItem("is_guest");
      }
      throw new Error(data?.error?.message || "Session expired. Please log in again.");
    }
    throw new Error(data?.error?.message || "Something went wrong");
  }

  return data as T;
}

// --- Auth APIs ---

export interface UserProfile {
  id: number;
  username: string;
  email?: string;
  wins?: number;
  losses?: number;
  is_guest?: boolean;
}

export interface AuthResponse {
  user: UserProfile;
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

export async function guestLogin(username: string): Promise<AuthResponse> {
  return apiFetch<AuthResponse>("/auth/guest", {
    method: "POST",
    body: JSON.stringify({ username }),
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
