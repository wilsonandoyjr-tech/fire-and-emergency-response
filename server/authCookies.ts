import type { Request } from "express";
import jwt from "jsonwebtoken";

export const COOKIE_NAME = "auth_token";

export type AuthTokenPayload = {
  userId: number;
  role: "fire" | "medical" | "pulis" | "admin" | "user";
  name: string;
  email: string;
  phone: string;
};

function getJwtSecret(): string | null {
  const secret = process.env.AUTH_JWT_SECRET;
  if (!secret && process.env.NODE_ENV !== "production") {
    return "fire-alert-local-dev-secret";
  }
  if (!secret) return null;
  return secret;
}


export function signAuthToken(payload: AuthTokenPayload) {
  const secret = getJwtSecret();
  if (!secret) {
    throw new Error("AUTH_JWT_SECRET is not set in server environment");
  }
  // 7 days
  return jwt.sign(payload, secret, { expiresIn: "7d" });
}


export function verifyAuthToken(token: string): AuthTokenPayload | null {
  try {
    const secret = getJwtSecret();
    if (!secret) return null;

    const decoded = jwt.verify(token, secret);
    return decoded ? (decoded as unknown as AuthTokenPayload) : null;
  } catch {
    return null;
  }
}


export function getTokenFromRequest(req: Request): string | null {
  const raw = req.cookies?.[COOKIE_NAME];
  if (typeof raw !== "string" || !raw) return null;
  return raw;
}

function isRequestSecure(req: Request) {
  // Trust common proxy headers first.
  const xfp = req.headers["x-forwarded-proto"];
  if (typeof xfp === "string") {
    return xfp.split(",")[0].trim().toLowerCase() === "https";
  }

  // Fallbacks for direct usage.
  return Boolean((req as any).secure) || req.protocol === "https";
}

export function clearAuthCookie(
  res: import("express").Response,
  req: Request,
) {
  const secure = isRequestSecure(req);

  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    sameSite: secure ? "none" : "lax",
    secure,
    path: "/",
  });
}

export function setAuthCookie(
  res: import("express").Response,
  req: Request,
  token: string,
) {
  const secure = isRequestSecure(req);

  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: secure ? "none" : "lax",
    secure,
    path: "/",
    // browser should not keep it forever; JWT handles expiry too
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}



