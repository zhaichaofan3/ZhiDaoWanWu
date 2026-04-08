const TOKEN_KEY = "secondhand_token";
const ME_KEY = "secondhand_me";

export type AuthRole = "user" | "admin";

export type Me = {
  id: number;
  nickname: string;
  avatar?: string;
  phone?: string;
  gender?: "male" | "female" | "other";
  bio?: string;
  role: AuthRole;
};

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string) {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // ignore
  }
}

export function clearAuth() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(ME_KEY);
  } catch {
    // ignore
  }
}

export function setMe(me: Me) {
  try {
    localStorage.setItem(ME_KEY, JSON.stringify(me));
  } catch {
    // ignore
  }
}

export function getMe(): Me | null {
  try {
    const raw = localStorage.getItem(ME_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Me;
  } catch {
    return null;
  }
}

