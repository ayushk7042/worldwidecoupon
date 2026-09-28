import type { Response } from "express";

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
  hasMore: boolean;
}

export interface ApiSuccess<T> {
  success: true;
  message?: string;
  data: T;
  pagination?: Pagination;
  meta?: Record<string, unknown>;
}

export interface ApiFailure {
  success: false;
  message: string;
  details?: unknown;
}

export function sendOk<T>(
  res: Response,
  data: T,
  extra: { message?: string; pagination?: Pagination; meta?: Record<string, unknown>; status?: number } = {}
): Response {
  const { status = 200, ...rest } = extra;
  const body: ApiSuccess<T> = { success: true, data, ...rest };
  return res.status(status).json(body);
}

export function sendCreated<T>(res: Response, data: T, message = "Created"): Response {
  return sendOk(res, data, { status: 201, message });
}

export function sendFail(
  res: Response,
  status: number,
  message: string,
  details?: unknown
): Response {
  const body: ApiFailure = { success: false, message };
  if (details !== undefined) body.details = details;
  return res.status(status).json(body);
}

/** Turns page/limit query values into a safe skip/limit pair. */
export function paginate(
  pageInput: unknown,
  limitInput: unknown,
  { defaultLimit = 20, maxLimit = 100 } = {}
): { page: number; limit: number; skip: number } {
  const page = Math.max(1, Math.floor(Number(pageInput) || 1));
  const raw = Math.floor(Number(limitInput) || defaultLimit);
  const limit = Math.min(Math.max(raw, 1), maxLimit);

  return { page, limit, skip: (page - 1) * limit };
}

export function buildPagination(
  page: number,
  limit: number,
  total: number,
  returned: number
): Pagination {
  return {
    page,
    limit,
    total,
    pages: Math.max(1, Math.ceil(total / limit)),
    hasMore: (page - 1) * limit + returned < total,
  };
}
