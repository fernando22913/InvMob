import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(128),
});

export type LoginRequest = z.infer<typeof loginSchema>;

export interface TokenResponse {
  access_token: string;
  token_type: string;
}
