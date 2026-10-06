import { z } from "zod";

/** Decimal >= 0, accepting a JSON number or numeric string. */
export const decimalNonNegative = z
  .union([z.string(), z.number()])
  .refine((value) => {
    const n = Number(value);
    return Number.isFinite(n) && n >= 0;
  }, "Input should be greater than or equal to 0");

/** int > 0, nullable/optional. */
export const optionalPositiveInt = z
  .number()
  .int()
  .gt(0)
  .nullish();

/** int >= 0 with a default, used by create schemas. */
export const nonNegativeIntDefaultZero = z
  .number()
  .int()
  .min(0)
  .default(0);

/** Empty string becomes null. */
export const emptyStringToNull = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((v) => (v === "" ? null : v), schema);
