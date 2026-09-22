import type { ApiEnvelope, ApiFailure, Pagination } from "./types";

/**
 * One fetch wrapper for the whole app.
 *
 * Server components and the browser need different base URLs — the server can
 * talk to the API over the internal network, the browser cannot — so the base
 * is resolved per call rather than baked in at module load.
 */
const SERVER_BASE = process.env.API_URL ?? "http://localhost:4000/api";
const BROWSER_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

const isServer = typeof window === "undefined";

export const apiBase = (): string => (isServer ? SERVER_BASE : BROWSER_BASE);

export class ApiError extends Error {
  readonly status: number;
  readonly details?: { field: string; message: string }[];

  constructor(status: number, message: string, details?: { field: string; message: string }[]) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }

  /** The first field-level message, for showing next to an input. */
  fieldError(field: string): string | undefined {
    return this.details?.find((issue) => issue.field === field)?.message;
  }
}

export interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  /** Query string values; `undefined` and `""` are dropped. */
  query?: Record<string, unknown>;
  /** Bearer token for admin/shopper calls made from a server component. */
  token?: string | null;
  /** Seconds. Omitted means "no cache" — right for anything behind auth. */
  revalidate?: number | false;
  tags?: string[];
}

export function buildQuery(params: Record<string, unknown> = {}): string {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    if (Array.isArray(value)) {
      if (value.length) search.set(key, value.join(","));
      continue;
    }
    search.set(key, String(value));
  }

  const query = search.toString();
  return query ? `?${query}` : "";
}

/** The full envelope, for callers that need `pagination` or `meta`. */
export async function apiRaw<T>(
  path: string,
  options: RequestOptions = {}
): Promise<ApiEnvelope<T>> {
  const { body, query, token, revalidate, tags, headers, ...rest } = options;

  const url = `${apiBase()}${path}${buildQuery(query)}`;

  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;

  const finalHeaders: Record<string, string> = {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...((headers as Record<string, string>) ?? {}),
  };

  if (token) finalHeaders.Authorization = `Bearer ${token}`;

  // Next augments the global `RequestInit` with its own `next` field, so no
  // intersection type is needed — and adding one conflicts with it.
  const init: RequestInit = {
    ...rest,
    headers: finalHeaders,
    // The cookie carries the session when the browser calls the API directly.
    credentials: "include",
  };

  if (body !== undefined) {
    init.body = isFormData ? (body as FormData) : JSON.stringify(body);
  }

  if (isServer) {
    if (revalidate === false || revalidate === undefined) {
      init.cache = "no-store";
    } else {
      init.next = { revalidate, ...(tags ? { tags } : {}) };
    }
  }

  let response: Response;

  try {
    response = await fetch(url, init);
  } catch (error) {
    // A dead API should read as "we are down", not as a cryptic fetch failure.
    throw new ApiError(
      503,
      `Could not reach the API at ${apiBase()}. Is the backend running?`,
      error instanceof Error ? [{ field: "network", message: error.message }] : undefined
    );
  }

  const text = await response.text();

  let payload: unknown = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      throw new ApiError(response.status, `Unexpected response from ${path}`);
    }
  }

  if (!response.ok || (payload as ApiFailure)?.success === false) {
    const failure = payload as ApiFailure | null;
    throw new ApiError(
      response.status,
      failure?.message ?? `Request failed (${response.status})`,
      failure?.details
    );
  }

  return payload as ApiEnvelope<T>;
}

/** Just the `data`, which is what almost every caller wants. */
export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const envelope = await apiRaw<T>(path, options);
  return envelope.data;
}

export interface Paged<T> {
  items: T[];
  pagination: Pagination;
  meta?: Record<string, unknown>;
}

export async function apiPaged<T>(
  path: string,
  options: RequestOptions = {}
): Promise<Paged<T>> {
  const envelope = await apiRaw<T[]>(path, options);

  return {
    items: envelope.data ?? [],
    pagination:
      envelope.pagination ??
      { page: 1, limit: envelope.data?.length ?? 0, total: envelope.data?.length ?? 0, pages: 1, hasMore: false },
    meta: envelope.meta,
  };
}

/**
 * For server components rendering public pages that must not explode when the
 * API hiccups — a missing rail is better than a 500 on the homepage.
 */
export async function apiSafe<T>(
  path: string,
  fallback: T,
  options: RequestOptions = {}
): Promise<T> {
  try {
    return await api<T>(path, options);
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[api] ${path} failed:`, (error as Error).message);
    }
    return fallback;
  }
}
