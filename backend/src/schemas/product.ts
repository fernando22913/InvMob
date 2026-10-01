import { z } from "zod";
import {
  decimalNonNegative,
  nonNegativeIntDefaultZero,
  optionalPositiveInt,
} from "./shared";

export const productCreateSchema = z.object({
  name: z.string().min(1).max(255),
  sku: z.string().min(1).max(100),
  description: z.string().nullish(),
  category_id: optionalPositiveInt,
  unit_id: optionalPositiveInt,
  purchase_price: decimalNonNegative.default("0.00"),
  sale_price: decimalNonNegative.default("0.00"),
  min_stock: nonNegativeIntDefaultZero,
  is_active: z.boolean().default(true),
});

export const productUpdateSchema = z.object({
  name: z.string().min(1).max(255).nullish(),
  sku: z.string().min(1).max(100).nullish(),
  description: z.string().nullish(),
  category_id: optionalPositiveInt,
  unit_id: optionalPositiveInt,
  purchase_price: decimalNonNegative.nullish(),
  sale_price: decimalNonNegative.nullish(),
  min_stock: z.number().int().min(0).nullish(),
  is_active: z.boolean().nullish(),
});

export type ProductCreate = z.infer<typeof productCreateSchema>;
export type ProductUpdate = z.infer<typeof productUpdateSchema>;
