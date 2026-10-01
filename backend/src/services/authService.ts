import { query } from "../db";
import { createAccessToken, verifyPassword } from "../utils/security";

export interface AuthUser {
  id: number;
  email: string;
  password_hash: string;
  full_name: string;
  is_active: boolean;
}

export async function authenticateUser(
  email: string,
  password: string
): Promise<AuthUser | null> {
  const result = await query<AuthUser>(
    `SELECT id, email, password_hash, full_name, is_active
       FROM users
      WHERE email = $1`,
    [email]
  );
  const user = result.rows[0];
  if (!user || !verifyPassword(password, user.password_hash)) {
    return null;
  }
  return user;
}

export function generateToken(userId: number): string {
  return createAccessToken({ sub: String(userId) });
}
