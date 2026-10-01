import { z } from "zod";

export const warehouseCreateSchema = z.object({
  name: z.string().min(1).max(255),
  address: z.string().nullish(),
  is_active: z.boolean().default(true),
});

export const warehouseUpdateSchema = z.object({
  name: z.string().min(1).max(255).nullish(),
  address: z.string().nullish(),
  is_active: z.boolean().nullish(),
});

export type WarehouseCreate = z.infer<typeof warehouseCreateSchema>;
export type WarehouseUpdate = z.infer<typeof warehouseUpdateSchema>;
