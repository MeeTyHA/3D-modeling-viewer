import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";

export const SESSION_COOKIE = "directtrack_admin_session";
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
  };
}

function getSecret() {
  return process.env.AUTH_SECRET ?? "directtrack-dev-secret-change-in-production";
}

function sign(payload: string) {
  return createHmac("sha256", getSecret()).update(payload).digest("hex");
}

function createToken(username: string) {
  const expires = Date.now() + SESSION_TTL_MS;
  const nonce = randomBytes(8).toString("hex");
  const body = `${username}:${expires}:${nonce}`;
  return `${body}.${sign(body)}`;
}

function verifyToken(token: string): string | null {
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;
  const expected = sign(body);
  try {
    const sigBuf = Buffer.from(signature, "hex");
    const expBuf = Buffer.from(expected, "hex");
    if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
      return null;
    }
  } catch {
    return null;
  }
  const [username, expiresStr] = body.split(":");
  const expires = Number(expiresStr);
  if (!username || !expires || Date.now() > expires) return null;
  return username;
}

export function validateCredentials(username: string, password: string) {
  const adminUser = process.env.ADMIN_USERNAME ?? "admin";
  const adminPass = process.env.ADMIN_PASSWORD ?? "directtrack2024";
  return username === adminUser && password === adminPass;
}

export async function createSession(username: string) {
  const token = createToken(username);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    ...sessionCookieOptions(),
    maxAge: SESSION_TTL_MS / 1000,
  });
}

export function clearSessionOnResponse(response: NextResponse) {
  const options = sessionCookieOptions();
  response.cookies.delete({ name: SESSION_COOKIE, path: options.path });
  response.cookies.set(SESSION_COOKIE, "", {
    ...options,
    maxAge: 0,
    expires: new Date(0),
  });
}

export async function destroySession() {
  const cookieStore = await cookies();
  const options = sessionCookieOptions();
  cookieStore.delete({ name: SESSION_COOKIE, path: options.path });
  cookieStore.set(SESSION_COOKIE, "", {
    ...options,
    maxAge: 0,
    expires: new Date(0),
  });
}

export async function getSessionUser(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function requireAdmin() {
  const user = await getSessionUser();
  if (!user) {
    throw new Error("UNAUTHORIZED");
  }
  return user;
}
