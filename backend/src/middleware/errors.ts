import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { ApiError } from "../utils/http";

interface PgError {
  code?: string;
  detail?: string;
}

/** PostgreSQL integrity error codes (unique, FK, not-null, check). */
function isIntegrityError(err: unknown): err is PgError {
  const code = (err as PgError)?.code;
  return typeof code === "string" && code.startsWith("23");
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({ detail: "Not Found" });
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (res.headersSent) return;

  if (err instanceof ZodError) {
    res.status(422).json({
      detail: err.issues.map((issue) => ({
        loc: ["body", ...issue.path.map((p) => String(p))],
        msg: issue.message,
        type: issue.code,
      })),
    });
    return;
  }

  if (err instanceof ApiError) {
    if (err.headers) {
      for (const [key, value] of Object.entries(err.headers)) {
        res.setHeader(key, value);
      }
    }
    res.status(err.status).json({ detail: err.detail });
    return;
  }

  if ((err as { type?: string })?.type === "entity.parse.failed") {
    res.status(422).json({ detail: "Invalid JSON body" });
    return;
  }

  if (isIntegrityError(err)) {
    res
      .status(409)
      .json({ detail: "Conflicting resource: it is already in use" });
    return;
  }

  // eslint-disable-next-line no-console
  console.error("Unhandled error:", err);
  res.status(500).json({ detail: "Internal server error" });
}
