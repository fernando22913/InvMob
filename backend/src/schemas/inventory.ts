import { z } from "zod";

export const adjustmentCreateSchema = z.object({
  product_id: z.number().int().gt(0),
  warehouse_id: z.number().int().gt(0),
  quantity: z.number().int(),
  notes: z.string().nullish(),
});

export const stockQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  size: z.coerce.number().int().min(1).max(100).default(20),
  product_id: z.coerce.number().int().optional(),
  warehouse_id: z.coerce.number().int().optional(),
});

export const movementsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  size: z.coerce.number().int().min(1).max(100).default(20),
  product_id: z.coerce.number().int().optional(),
  warehouse_id: z.coerce.number().int().optional(),
  movement_type: z.string().optional(),
});

export type AdjustmentCreate = z.infer<typeof adjustmentCreateSchema>;
export type StockQuery = z.infer<typeof stockQuerySchema>;
export type MovementsQuery = z.infer<typeof movementsQuerySchema>;
