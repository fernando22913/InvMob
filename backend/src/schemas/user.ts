import { z } from "zod";

export const roleCreateSchema = z.object({
  name: z.string().min(1).max(50),
  description: z.string().nullish(),
});

export const userCreateSchema = z.object({
  email: z.string().email(),
  full_name: z.string().min(1).max(255),
  is_active: z.boolean().default(true),
  password: z.string().min(8).max(128),
  role_ids: z.array(z.number().int()).default([]),
});

export const userUpdateSchema = z.object({
  email: z.string().email().nullish(),
  full_name: z.string().min(1).max(255).nullish(),
  is_active: z.boolean().nullish(),
  password: z.string().min(8).max(128).nullish(),
  role_ids: z.array(z.number().int()).nullish(),
});

export type RoleCreate = z.infer<typeof roleCreateSchema>;
export type UserCreate = z.infer<typeof userCreateSchema>;
export type UserUpdate = z.infer<typeof userUpdateSchema>;
