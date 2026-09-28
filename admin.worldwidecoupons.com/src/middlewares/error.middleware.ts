import type { ErrorRequestHandler, RequestHandler } from "express";
import { MongoServerError } from "mongodb";
import mongoose from "mongoose";
import multer from "multer";
import { ZodError } from "zod";
import { isProduction } from "../config/env.js";
import { ApiError } from "../utils/ApiError.js";
import { sendFail } from "../utils/response.js";

export const notFoundHandler: RequestHandler = (req, res) =>
  sendFail(res, 404, `No route matches ${req.method} ${req.originalUrl}`);

interface Normalised {
  status: number;
  message: string;
  details?: unknown;
  /** A 500 means we broke something; everything else is the caller's input. */
  isBug: boolean;
}

function normalise(error: unknown): Normalised {
  if (error instanceof ApiError) {
    return {
      status: error.statusCode,
      message: error.message,
      details: error.details,
      isBug: error.statusCode >= 500,
    };
  }

  if (error instanceof ZodError) {
    return {
      status: 400,
      message: "Some fields need attention",
      details: error.issues.map((issue) => ({
        field: issue.path.join(".") || "(root)",
        message: issue.message,
      })),
      isBug: false,
    };
  }

  if (error instanceof multer.MulterError) {
    const message =
      error.code === "LIMIT_FILE_SIZE"
        ? "That file is larger than the 25 MB limit"
        : error.message;
    return { status: 400, message, isBug: false };
  }

  if (error instanceof mongoose.Error.ValidationError) {
    return {
      status: 400,
      message: "Some fields need attention",
      details: Object.values(error.errors).map((issue) => ({
        field: issue.path,
        message: issue.message,
      })),
      isBug: false,
    };
  }

  if (error instanceof mongoose.Error.CastError) {
    return { status: 400, message: `"${error.value}" is not a valid ${error.path}`, isBug: false };
  }

  if (error instanceof MongoServerError && error.code === 11000) {
    const field = Object.keys(error.keyPattern ?? {})[0] ?? "value";
    return { status: 409, message: `That ${field} is already taken`, isBug: false };
  }

  const message =
    error instanceof Error ? error.message : "Something went wrong on our side";

  return { status: 500, message, isBug: true };
}

export const errorHandler: ErrorRequestHandler = (error, req, res, next) => {
  if (res.headersSent) return next(error);

  const { status, message, details, isBug } = normalise(error);

  if (isBug) {
    console.error(`❌ ${req.method} ${req.originalUrl}`, error);
  }

  // A stack trace or a raw driver message is a gift to an attacker.
  const safeMessage =
    isBug && isProduction ? "Something went wrong on our side" : message;

  sendFail(res, status, safeMessage, isProduction ? details : details ?? undefined);
};
