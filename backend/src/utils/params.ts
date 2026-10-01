import { Request } from "express";
import { z, ZodTypeAny } from "zod";
import { ApiError } from "./http";

/** Parse and return a path parameter, mirroring FastAPI's 422 on a bad int. */
export function pathId(req: Request, name: string): number {
  const raw = req.params[name];
  const value = Number(raw);
  if (!Number.isInteger(value)) {
    throw new ApiError(422, [
      {
        loc: ["path", name],
        msg: "Input should be a valid integer, unable to parse string as an integer",
        type: "int_parsing",
      },
    ]);
  }
  return value;
}

/** Parse request data with a zod schema, producing FastAPI-style 422 details. */
export function parseOrThrow<S extends ZodTypeAny>(
  schema: S,
  data: unknown,
  location: "body" | "query"
): z.output<S> {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new ApiError(
      422,
      result.error.issues.map((issue) => ({
        loc: [location, ...issue.path.map((p) => String(p))],
        msg: issue.message,
        type: issue.code,
      }))
    );
  }
  return result.data;
}
