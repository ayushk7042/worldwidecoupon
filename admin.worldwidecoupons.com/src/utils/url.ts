import { env } from "../config/env.js";

/** Accepts `example.com/x` as readily as a full URL; returns null when hopeless. */
export function normalizeUrl(input: unknown): string | null {
  const raw = String(input ?? "").trim();
  if (!raw) return null;

  const candidate = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;

  try {
    const url = new URL(candidate);
    if (!url.hostname.includes(".")) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function hostnameOf(input: unknown): string | null {
  const url = normalizeUrl(input);
  if (!url) return null;

  try {
    return new URL(url).hostname.replace(/^www\d*\./i, "").toLowerCase();
  } catch {
    return null;
  }
}

/** `https://www.macys.com/x?y` → `https://www.macys.com` */
export function originOf(input: unknown): string | null {
  const url = normalizeUrl(input);
  if (!url) return null;

  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

/**
 * Appends tracking to an affiliate link without clobbering a query string the
 * network already needs (`?irclickid=...` and friends are load-bearing).
 */
export function withTracking(base: unknown, params?: string | null): string {
  const url = normalizeUrl(base);
  if (!url) return "";

  const extra = (params ?? env.DEFAULT_TRACKING_PARAMS).trim();
  if (!extra) return url;

  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}${extra.replace(/^[?&]+/, "")}`;
}

/** Best-effort brand logo for a store we only know by domain. */
/**
 * Brand artwork for a domain.
 *
 * `LOGO_SERVICE` may be a template containing `{domain}` — needed by services
 * that take the domain as a query parameter — or a plain prefix, which keeps
 * the older `https://host/domain.com` style working.
 */
export function logoForDomain(domain: string | null): string | null {
  if (!domain) return null;

  const service = env.LOGO_SERVICE.trim();
  if (service.includes("{domain}")) return service.replace(/\{domain\}/g, domain);

  return `${service.replace(/\/+$/, "")}/${domain}`;
}

export function absoluteSiteUrl(path: string): string {
  const base = env.SITE_URL.replace(/\/+$/, "");
  return `${base}/${String(path ?? "").replace(/^\/+/, "")}`;
}
