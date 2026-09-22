/**
 * The only error type controllers should throw on purpose.
 *
 * Anything else that reaches the error middleware is treated as a bug and
 * reported as a 500 with a generic message, so an accidental `TypeError`
 * never leaks a stack trace or a Mongo query to the client.
 */
export class ApiError extends Error {
  readonly statusCode: number;
  readonly details?: unknown;
  readonly expose = true;

  constructor(statusCode: number, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.details = details;
    Error.captureStackTrace?.(this, ApiError);
  }

  static badRequest(message = "Bad request", details?: unknown): ApiError {
    return new ApiError(400, message, details);
  }

  static unauthorized(message = "Please sign in"): ApiError {
    return new ApiError(401, message);
  }

  static forbidden(message = "You do not have access to this"): ApiError {
    return new ApiError(403, message);
  }

  static notFound(message = "Not found"): ApiError {
    return new ApiError(404, message);
  }

  static conflict(message = "Already exists"): ApiError {
    return new ApiError(409, message);
  }

  static tooMany(message = "Too many requests"): ApiError {
    return new ApiError(429, message);
  }

  static internal(message = "Something went wrong"): ApiError {
    return new ApiError(500, message);
  }
}

export const isApiError = (error: unknown): error is ApiError =>
  error instanceof ApiError;
