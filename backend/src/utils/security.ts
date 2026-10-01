import * as bcrypt from "bcryptjs";
import * as jwt from "jsonwebtoken";
import { config } from "../config";

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 12);
}

export function verifyPassword(plain: string, hashed: string): boolean {
  try {
    return bcrypt.compareSync(plain, hashed);
  } catch {
    return false;
  }
}

export interface TokenPayload extends jwt.JwtPayload {
  sub?: string;
}

export function createAccessToken(data: Record<string, unknown>): string {
  return jwt.sign(data, config.SECRET_KEY, {
    algorithm: "HS256",
    expiresIn: config.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
  });
}

export function decodeAccessToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, config.SECRET_KEY, {
      algorithms: ["HS256"],
    }) as TokenPayload;
  } catch {
    return null;
  }
}
