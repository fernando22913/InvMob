import { PoolClient } from "pg";
import { Paginated, paginate } from "../utils/pagination";
import { buildUpdate } from "../utils/crud";
import { CategoryCreate, CategoryUpdate } from "../schemas/category";

export type CategoryRow = {
  id: number;
  name: string;
  description: string | null;
  parent_id: number | null;
  created_at: Date;
};

const COLS = "id, name, description, parent_id, created_at";

export async function listCategories(
  client: PoolClient,
  page: number,
  size: number,
  search?: string
): Promise<Paginated<CategoryRow>> {
  const params: unknown[] = [];
  let where = "";
  if (search) {
    params.push(`%${search}%`);
    where = "WHERE name ILIKE $1";
  }
  return paginate<CategoryRow>(client, {
    selectSql: `SELECT ${COLS} FROM categories ${where} ORDER BY id`,
    countSql: `SELECT count(*)::int AS count FROM categories ${where}`,
    params,
    page,
    size,
  });
}

export async function getCategory(
  client: PoolClient,
  id: number
): Promise<CategoryRow | null> {
  const result = await client.query<CategoryRow>(
    `SELECT ${COLS} FROM categories WHERE id = $1`,
    [id]
  );
  return result.rows[0] ?? null;
}

export async function createCategory(
  client: PoolClient,
  data: CategoryCreate
): Promise<CategoryRow> {
  const result = await client.query<CategoryRow>(
    `INSERT INTO categories (name, description, parent_id, created_at)
     VALUES ($1, $2, $3, now())
     RETURNING ${COLS}`,
    [data.name, data.description ?? null, data.parent_id ?? null]
  );
  return result.rows[0];
}

export async function updateCategory(
  client: PoolClient,
  id: number,
  fields: CategoryUpdate
): Promise<CategoryRow | null> {
  const update = buildUpdate(
    "categories",
    id,
    fields as Record<string, unknown>,
    ["name", "description", "parent_id"]
  );
  if (!update) return getCategory(client, id);
  const result = await client.query<CategoryRow>(update.text, update.params);
  return result.rows[0] ?? null;
}

export async function deleteCategory(
  client: PoolClient,
  id: number
): Promise<boolean> {
  const result = await client.query("DELETE FROM categories WHERE id = $1", [id]);
  return (result.rowCount ?? 0) > 0;
}
