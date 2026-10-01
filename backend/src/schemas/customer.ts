import { z } from "zod";
import { emptyStringToNull } from "./shared";

const email = emptyStringToNull(z.string().email().nullable());

export const customerCreateSchema = z.object({
  name: z.string().min(1).max(255),
  email: email.optional(),
  phone: z.string().max(50).nullish(),
  address: z.string().nullish(),
  tax_id: z.string().max(100).nullish(),
  is_active: z.boolean().default(true),
});

export const customerUpdateSchema = z.object({
  name: z.string().min(1).max(255).nullish(),
  email: email.optional(),
  phone: z.string().max(50).nullish(),
  address: z.string().nullish(),
  tax_id: z.string().max(100).nullish(),
  is_active: z.boolean().nullish(),
});

export type CustomerCreate = z.infer<typeof customerCreateSchema>;
export type CustomerUpdate = z.infer<typeof customerUpdateSchema>;
