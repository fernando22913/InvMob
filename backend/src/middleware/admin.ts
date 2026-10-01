import { NextFunction, Request, Response } from "express";
import { httpError } from "../utils/http";

export function requireAdmin(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const isAdmin = req.user?.roles.some((role) => role.name === "admin");
  if (!isAdmin) {
    next(httpError(403, "Administrator role required"));
    return;
  }
  next();
}
