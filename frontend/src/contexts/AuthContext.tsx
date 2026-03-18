"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import {
  apiLogin,
  apiRegister,
  apiGetMe,
  setToken,
  clearToken,
  getToken,
} from "@/lib/api";

export interface User {
  id: string;
  username: string;
  name: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  register: (username: string, name: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session from stored JWT on mount
  useEffect(() => {
    const restore = async () => {
      if (getToken()) {
        const me = await apiGetMe();
        if (me) setUser(me);
        else clearToken();
      }
      setIsLoading(false);
    };
    restore();
  }, []);

  const login = async (
    username: string,
    password: string
  ): Promise<{ ok: boolean; error?: string }> => {
    try {
      const { token, user: u } = await apiLogin(username, password);
      setToken(token);
      setUser(u);
      return { ok: true };
    } catch (err: unknown) {
      return { ok: false, error: (err as Error).message };
    }
  };

  const register = async (
    username: string,
    name: string,
    password: string
  ): Promise<{ ok: boolean; error?: string }> => {
    try {
      const { token, user: u } = await apiRegister(username, name, password);
      setToken(token);
      setUser(u);
      return { ok: true };
    } catch (err: unknown) {
      return { ok: false, error: (err as Error).message };
    }
  };

  const logout = () => {
    setUser(null);
    clearToken();
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
