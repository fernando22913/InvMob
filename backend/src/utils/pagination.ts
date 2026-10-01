import { PoolClient, QueryResultRow } from "pg";
import { z } from "zod";

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  size: z.coerce.number().int().min(1).max(100).default(20),
});

export const searchSchema = paginationSchema.extend({
  search: z.string().max(255).optional(),
});

export type PaginationQuery = z.infer<typeof paginationSchema>;
export type SearchQuery = z.infer<typeof searchSchema>;

export interface PaginateOptions {
  selectSql: string;
  countSql: string;
  params: unknown[];
  page: number;
  size: number;
}

/**
 * Runs the count query and the windowed select, returning the exact envelope
 * used by the FastAPI service: { items, total, page, size, pages }.
 */
export async function paginate<T extends QueryResultRow>(
  client: PoolClient,
  opts: PaginateOptions
): Promise<Paginated<T>> {
  const { selectSql, countSql, params, page, size } = opts;

  const countResult = await client.query<{ count: number }>(countSql, params);
  const total = Number(countResult.rows[0]?.count ?? 0);

  const offset = (page - 1) * size;
  const selectResult = await client.query<T>(
    `${selectSql} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, size, offset]
  );

  const pages = size > 0 ? Math.ceil(total / size) : 0;
  return { items: selectResult.rows, total, page, size, pages };
}
