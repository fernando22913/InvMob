import { z } from "zod";
import { decimalNonNegative } from "./shared";

export const saleItemCreateSchema = z.object({
  product_id: z.number().int().gt(0),
  quantity: z.number().int().gt(0),
  unit_price: decimalNonNegative,
});

export const saleCreateSchema = z.object({
  customer_id: z.number().int().gt(0).nullish(),
  warehouse_id: z.number().int().gt(0).nullish(),
  reference_number: z.string().max(100).nullish(),
  notes: z.string().nullish(),
  items: z.array(saleItemCreateSchema).min(1),
});

export type SaleItemCreate = z.infer<typeof saleItemCreateSchema>;
export type SaleCreate = z.infer<typeof saleCreateSchema>;
