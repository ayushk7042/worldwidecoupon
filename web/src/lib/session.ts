/**
 * Client-side token storage.
 *
 * The API also sets an httpOnly cookie on sign-in, which is what protects the
 * session properly. This mirror exists because the browser will not attach
 * that cookie when the API lives on a different site in some deployments, so
 * the Bearer header is the reliable path. The cookie stays authoritative; this
 * is a fallback, and clearing it is part of signing out.
 */

const ADMIN_KEY = "wwc.admin.token";
const SHOPPER_KEY = "wwc.shopper.token";

type Scope = "admin" | "shopper";

const keyFor = (scope: Scope) => (scope === "admin" ? ADMIN_KEY : SHOPPER_KEY);

export function readToken(scope: Scope): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(keyFor(scope));
  } catch {
    // Private mode and some embedded browsers throw on localStorage access.
    return null;
  }
}

export function writeToken(scope: Scope, token: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(keyFor(scope), token);
  } catch {
    /* the cookie still carries the session */
  }
}

export function clearToken(scope: Scope): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(keyFor(scope));
  } catch {
    /* nothing to do */
  }
}
