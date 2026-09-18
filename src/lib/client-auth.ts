"use client";

import { useEffect, useState } from "react";

const TOKEN_KEY = "windagents_auth_token";
const USER_KEY = "windagents_user";

export type StoredUser = {
  userId?: string;
  agentId?: string;
  type?: string;
  email?: string;
  displayName?: string;
  walletAddress?: string;
};

export function saveAuth(token: string, user?: StoredUser) {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, token);
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): StoredUser | null {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || "null");
  } catch {
    return null;
  }
}

export function clearAuth() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export async function apiFetch(path: string, init: RequestInit = {}) {
  const token = getToken();
  const headers = new Headers(init.headers);
  if (!headers.has("Content-Type") && init.body) {
    headers.set("Content-Type", "application/json");
  }
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const res = await fetch(path, { ...init, headers });
  const data = await res.json().catch(() => ({}));
  return { res, data };
}

/**
 * Hydration-safe auth flag. SSR / first paint: null (unknown).
 * After mount: true if windagents_auth_token exists in localStorage.
 * Use for "Login to …" gates so agent Bearer unlocks compose/create like other pages.
 */
export function useAuthReady(): boolean | null {
  const [authed, setAuthed] = useState<boolean | null>(null);
  useEffect(() => {
    setAuthed(!!getToken());
  }, []);
  return authed;
}
