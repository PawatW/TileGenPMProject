"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export interface User {
  id: string;
  username: string;
  name: string;
}

interface StoredUser {
  name: string;
  password: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  register: (username: string, name: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const USERS_KEY = "pm_users_v1";
const SESSION_KEY = "pm_session_v1";

function getStoredUsers(): Record<string, StoredUser> {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveStoredUsers(users: Record<string, StoredUser>) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Seed demo account
    const users = getStoredUsers();
    if (!users["demo"]) {
      users["demo"] = { name: "Demo User", password: "demo123" };
      saveStoredUsers(users);
    }

    // Restore session
    try {
      const session = localStorage.getItem(SESSION_KEY);
      if (session) {
        const { username } = JSON.parse(session);
        const stored = getStoredUsers()[username];
        if (stored) {
          setUser({ id: username, username, name: stored.name });
        }
      }
    } catch {
      // ignore
    }
    setIsLoading(false);
  }, []);

  const login = async (
    username: string,
    password: string
  ): Promise<{ ok: boolean; error?: string }> => {
    const users = getStoredUsers();
    const stored = users[username.trim().toLowerCase()];
    if (!stored) return { ok: false, error: "ไม่พบชื่อผู้ใช้นี้" };
    if (stored.password !== password) return { ok: false, error: "รหัสผ่านไม่ถูกต้อง" };
    const userData: User = { id: username, username: username.trim().toLowerCase(), name: stored.name };
    setUser(userData);
    localStorage.setItem(SESSION_KEY, JSON.stringify({ username: userData.username }));
    return { ok: true };
  };

  const register = async (
    username: string,
    name: string,
    password: string
  ): Promise<{ ok: boolean; error?: string }> => {
    const id = username.trim().toLowerCase();
    if (!id) return { ok: false, error: "กรุณาระบุชื่อผู้ใช้" };
    if (!name.trim()) return { ok: false, error: "กรุณาระบุชื่อ-นามสกุล" };
    if (password.length < 4) return { ok: false, error: "รหัสผ่านต้องมีอย่างน้อย 4 ตัวอักษร" };
    const users = getStoredUsers();
    if (users[id]) return { ok: false, error: "ชื่อผู้ใช้นี้มีอยู่แล้ว" };
    users[id] = { name: name.trim(), password };
    saveStoredUsers(users);
    const userData: User = { id, username: id, name: name.trim() };
    setUser(userData);
    localStorage.setItem(SESSION_KEY, JSON.stringify({ username: id }));
    return { ok: true };
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(SESSION_KEY);
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
