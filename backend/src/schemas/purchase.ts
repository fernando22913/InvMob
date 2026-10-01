import { z } from "zod";
import { decimalNonNegative } from "./shared";

export const purchaseItemCreateSchema = z.object({
  product_id: z.number().int().gt(0),
  quantity: z.number().int().gt(0),
  unit_price: decimalNonNegative,
});

export const purchaseCreateSchema = z.object({
  supplier_id: z.number().int().gt(0).nullish(),
  warehouse_id: z.number().int().gt(0).nullish(),
  reference_number: z.string().max(100).nullish(),
  notes: z.string().nullish(),
  items: z.array(purchaseItemCreateSchema).min(1),
});

export type PurchaseItemCreate = z.infer<typeof purchaseItemCreateSchema>;
export type PurchaseCreate = z.infer<typeof purchaseCreateSchema>;
