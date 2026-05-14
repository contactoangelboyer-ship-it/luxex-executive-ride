import { useState, useEffect } from "react";

export type UserRole = "passenger" | "driver";

export interface AuthUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role: UserRole;
  createdAt: string;
}

const STORAGE_KEY = "luxex_user";
const USERS_KEY = "luxex_users_db";

function getUsers(): Record<string, AuthUser & { passwordHash: string }> {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function saveUsers(users: Record<string, AuthUser & { passwordHash: string }>) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return String(Math.abs(hash));
}

export function registerUser(data: {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  role: UserRole;
}): AuthUser {
  const users = getUsers();
  const emailKey = data.email.toLowerCase();
  if (users[emailKey]) throw new Error("An account with this email already exists.");
  const user: AuthUser & { passwordHash: string } = {
    id: `u_${Date.now()}`,
    firstName: data.firstName,
    lastName: data.lastName,
    email: data.email,
    phone: data.phone,
    role: data.role,
    createdAt: new Date().toISOString(),
    passwordHash: simpleHash(data.password),
  };
  users[emailKey] = user;
  saveUsers(users);
  const { passwordHash: _, ...authUser } = user;
  return authUser;
}

export function loginUser(email: string, password: string): AuthUser {
  const users = getUsers();
  const user = users[email.toLowerCase()];
  if (!user) throw new Error("No account found with that email.");
  if (user.passwordHash !== simpleHash(password)) throw new Error("Incorrect password.");
  const { passwordHash: _, ...authUser } = user;
  return authUser;
}

export function getCurrentUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setCurrentUser(user: AuthUser | null) {
  if (user) localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  else localStorage.removeItem(STORAGE_KEY);
}

export function logoutUser() {
  localStorage.removeItem(STORAGE_KEY);
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(() => getCurrentUser());

  const login = (u: AuthUser) => {
    setCurrentUser(u);
    setUser(u);
  };

  const logout = () => {
    logoutUser();
    setUser(null);
  };

  const refresh = () => setUser(getCurrentUser());

  return { user, login, logout, refresh };
}
