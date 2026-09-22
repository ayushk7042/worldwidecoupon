import type { RequestHandler } from "express";
import { ZodError, type ZodTypeAny } from "zod";
import { ApiError } from "../utils/ApiError.js";

interface Schemas {
  body?: ZodTypeAny;
  query?: ZodTypeAny;
  params?: ZodTypeAny;
}

const formatIssues = (error: ZodError) =>
  error.issues.map((issue) => ({
    field: issue.path.join(".") || "(root)",
    message: issue.message,
  }));

/**
 * Parses and replaces `req.body` / `req.query` / `req.params` with the typed,
 * coerced result. Controllers downstream can therefore trust their input and
 * skip defensive `String(x ?? "")` casts everywhere.
 *
 * Express 5 makes `req.query` a getter, so the parsed value is stashed on
 * `res.locals.query` as well as assigned through `Object.defineProperty`.
 */
export const validate =
  (schemas: Schemas): RequestHandler =>
  (req, res, next) => {
    try {
      if (schemas.params) {
        req.params = schemas.params.parse(req.params) as typeof req.params;
      }

      if (schemas.query) {
        const parsed = schemas.query.parse(req.query) as Record<string, unknown>;
        res.locals.query = parsed;
        Object.defineProperty(req, "query", {
          value: parsed,
          writable: true,
          configurable: true,
          enumerable: true,
        });
      }

      if (schemas.body) {
        req.body = schemas.body.parse(req.body ?? {});
      }

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return next(
          ApiError.badRequest("Some fields need attention", formatIssues(error))
        );
      }
      next(error);
    }
  };

/** Typed accessor for the validated query, which Express 5 will not let us mutate cleanly. */
export function validatedQuery<T>(res: { locals: Record<string, unknown> }): T {
  return res.locals.query as T;
}
