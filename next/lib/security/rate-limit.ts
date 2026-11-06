interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();
const MAX_STORE_SIZE = 10_000;

const READ_LIMIT = 120;
const READ_WINDOW_MS = 60_000;

const WRITE_LIMIT = 30;
const WRITE_WINDOW_MS = 60_000;

const UPLOAD_LIMIT = 10;
const UPLOAD_WINDOW_MS = 5 * 60_000;

const LOGIN_LIMIT = 10;
const LOGIN_WINDOW_MS = 5 * 60_000;

function normalizeIp(ip: string): string {
  if (!ip) return "127.0.0.1";
  const parts = ip.split(",").map((s) => s.trim()).filter(Boolean);
  return parts[parts.length - 1] || "127.0.0.1";
}

function getKey(userId: string, ip: string, category: string): string {
  const identifier = userId || normalizeIp(ip);
  return `${identifier}:${category}`;
}

function checkLimit(key: string, limit: number, windowMs: number): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();

  // Periodic cleanup if map grows too large
  if (store.size > MAX_STORE_SIZE) {
    for (const [k, v] of store.entries()) {
      if (now >= v.resetAt) {
        store.delete(k);
      }
    }
    if (store.size > MAX_STORE_SIZE) {
      const oldestKey = store.keys().next().value;
      if (oldestKey) store.delete(oldestKey);
    }
  }

  let entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + windowMs };
    store.set(key, entry);
  }

  entry.count += 1;
  const remaining = Math.max(0, limit - entry.count);
  const allowed = entry.count <= limit;

  return { allowed, remaining, resetAt: entry.resetAt };
}

export function checkGeneralRateLimit(ip: string): { allowed: boolean; remaining: number; resetAt: number } {
  return checkReadRateLimit("", ip);
}

export function checkReadRateLimit(userId: string, ip: string): { allowed: boolean; remaining: number; resetAt: number } {
  const key = getKey(userId, ip, "read");
  return checkLimit(key, READ_LIMIT, READ_WINDOW_MS);
}

export function checkWriteRateLimit(userId: string, ip: string): { allowed: boolean; remaining: number; resetAt: number } {
  const key = getKey(userId, ip, "write");
  return checkLimit(key, WRITE_LIMIT, WRITE_WINDOW_MS);
}

export function checkUploadRateLimit(userId: string, ip: string): { allowed: boolean; remaining: number; resetAt: number } {
  const key = getKey(userId, ip, "upload");
  return checkLimit(key, UPLOAD_LIMIT, UPLOAD_WINDOW_MS);
}

export function checkLoginRateLimit(ip: string): { allowed: boolean; remaining: number; resetAt: number } {
  const key = getKey("", ip, "login");
  return checkLimit(key, LOGIN_LIMIT, LOGIN_WINDOW_MS);
}

export type RateLimitCategory = "read" | "write" | "upload";

export function checkApiRateLimit(
  userId: string,
  ip: string,
  category: RateLimitCategory,
): { allowed: boolean; remaining: number; resetAt: number } {
  switch (category) {
    case "read":
      return checkReadRateLimit(userId, ip);
    case "write":
      return checkWriteRateLimit(userId, ip);
    case "upload":
      return checkUploadRateLimit(userId, ip);
  }
}

export function checkOfficersRateLimit(
  userId: string,
  ip: string,
  category: RateLimitCategory,
): { allowed: boolean; remaining: number; resetAt: number } {
  return checkApiRateLimit(userId, ip, category);
}

export function rateLimitErrorResponse(resetAt: number) {
  return {
    success: false,
    error: "تم تجاوز الحد المسموح من الطلبات. حاول مرة أخرى لاحقًا.",
    retryAfter: Math.ceil((resetAt - Date.now()) / 1000),
  };
}
