import { z } from "zod";

export const unitCreateSchema = z.object({
  name: z.string().min(1).max(100),
  symbol: z.string().min(1).max(20),
});

export type UnitCreate = z.infer<typeof unitCreateSchema>;
