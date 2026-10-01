import { NextFunction, Request, Response } from "express";
import { decodeAccessToken } from "../utils/security";
import { asyncHandler, httpError } from "../utils/http";
import { AuthUser, findUserWithRolesById } from "../services/userService";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

function unauthorized(detail: string) {
  return httpError(401, detail, { "WWW-Authenticate": "Bearer" });
}

export const getCurrentUser = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction) => {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
      return next(unauthorized("Not authenticated"));
    }

    const token = header.slice("Bearer ".length).trim();
    const payload = decodeAccessToken(token);
    if (!payload || payload.sub === undefined) {
      return next(unauthorized("Invalid or expired token"));
    }

    const userId = Number(payload.sub);
    if (!Number.isInteger(userId)) {
      return next(unauthorized("Invalid token payload"));
    }

    const user = await findUserWithRolesById(userId);
    if (!user || !user.is_active) {
      return next(unauthorized("User not found or inactive"));
    }

    req.user = user;
    next();
  }
);
