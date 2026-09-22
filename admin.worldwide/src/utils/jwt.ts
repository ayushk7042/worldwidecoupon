import jwt, { type SignOptions } from "jsonwebtoken";
import { env } from "../config/env.js";
import { ApiError } from "./ApiError.js";

/**
 * Admin and shopper tokens are signed with the same secret, so `kind` is the
 * only thing preventing a shopper token from unlocking the CMS. Every verify
 * path checks it.
 */
export type TokenKind = "admin" | "site";

export interface TokenPayload {
  id: string;
  kind: TokenKind;
}

export function signToken(payload: TokenPayload): string {
  const expiresIn = (payload.kind === "admin"
    ? env.JWT_EXPIRE
    : env.SITE_JWT_EXPIRE) as SignOptions["expiresIn"];

  return jwt.sign(payload, env.JWT_SECRET, { expiresIn });
}

export function verifyToken(token: string, kind: TokenKind): TokenPayload {
  let decoded: unknown;

  try {
    decoded = jwt.verify(token, env.JWT_SECRET);
  } catch {
    throw ApiError.unauthorized("Your session has expired — please sign in again");
  }

  const payload = decoded as Partial<TokenPayload> | null;

  if (!payload?.id || payload.kind !== kind) {
    throw ApiError.unauthorized("Invalid session");
  }

  return { id: String(payload.id), kind };
}

/** Bearer header first, then the cookie the admin panel sets. */
export function readToken(
  headers: Record<string, unknown>,
  cookies: Record<string, unknown> | undefined,
  cookieName: string
): string | null {
  const header = String(headers.authorization ?? "");
  const bearer = header.startsWith("Bearer ") ? header.slice(7).trim() : "";

  if (bearer) return bearer;

  const cookie = cookies?.[cookieName];
  return cookie ? String(cookie) : null;
}
