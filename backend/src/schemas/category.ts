import { z } from "zod";
import { optionalPositiveInt } from "./shared";

export const categoryCreateSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().nullish(),
  parent_id: optionalPositiveInt,
});

export const categoryUpdateSchema = z.object({
  name: z.string().min(1).max(255).nullish(),
  description: z.string().nullish(),
  parent_id: optionalPositiveInt,
});

export type CategoryCreate = z.infer<typeof categoryCreateSchema>;
export type CategoryUpdate = z.infer<typeof categoryUpdateSchema>;
