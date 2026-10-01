import { z } from "zod";

export const supplierCreateSchema = z.object({
  name: z.string().min(1).max(255),
  contact_name: z.string().min(1).max(255),
  email: z.string().email(),
  phone: z.string().min(1).max(50),
  address: z.string().nullish(),
  tax_id: z.string().min(1).max(100),
  is_active: z.boolean().default(true),
});

export const supplierUpdateSchema = z.object({
  name: z.string().min(1).max(255).nullish(),
  contact_name: z.string().min(1).max(255).nullish(),
  email: z.string().email().nullish(),
  phone: z.string().min(1).max(50).nullish(),
  address: z.string().nullish(),
  tax_id: z.string().min(1).max(100).nullish(),
  is_active: z.boolean().nullish(),
});

export type SupplierCreate = z.infer<typeof supplierCreateSchema>;
export type SupplierUpdate = z.infer<typeof supplierUpdateSchema>;
