import { NextFunction, Request, RequestHandler, Response } from "express";

export class ApiError extends Error {
  status: number;
  detail: unknown;
  headers?: Record<string, string>;

  constructor(
    status: number,
    detail: unknown,
    headers?: Record<string, string>
  ) {
    super(typeof detail === "string" ? detail : "API error");
    this.status = status;
    this.detail = detail;
    this.headers = headers;
  }
}

export function httpError(
  status: number,
  detail: unknown,
  headers?: Record<string, string>
): ApiError {
  return new ApiError(status, detail, headers);
}

/**
 * Wrap an async route handler so rejected promises reach the Express error
 * middleware (Express 4 does not do this automatically).
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}
