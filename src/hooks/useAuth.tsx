import { useState, useEffect } from "react";
import { getMe, getToken, clearAuth } from "@/lib/auth";

export interface User {
  id: number;
  nickname: string;
  role: "user" | "admin";
  avatar?: string;
  phone?: string;
  gender?: "male" | "female" | "other";
  bio?: string;
}

export interface AuthState {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
}

export function useAuth(): AuthState {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      setLoading(true);
      const userData = getMe();
      setUser(userData);
    } catch (error) {
      console.error("Failed to load user:", error);
      clearAuth();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    user,
    loading,
    isAuthenticated: !!user,
  };
}