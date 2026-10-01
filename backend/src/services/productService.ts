import { PoolClient } from "pg";
import { Paginated, paginate } from "../utils/pagination";
import { buildUpdate } from "../utils/crud";
import { ProductCreate, ProductUpdate } from "../schemas/product";

export type ProductRow = {
  id: number;
  name: string;
  sku: string;
  description: string | null;
  category_id: number | null;
  unit_id: number | null;
  purchase_price: string;
  sale_price: string;
  min_stock: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
};

const COLS =
  "id, name, sku, description, category_id, unit_id, purchase_price, " +
  "sale_price, min_stock, is_active, created_at, updated_at";

export async function listProducts(
  client: PoolClient,
  page: number,
  size: number,
  search?: string
): Promise<Paginated<ProductRow>> {
  const params: unknown[] = [];
  let where = "";
  if (search) {
    params.push(`%${search}%`);
    where = "WHERE name ILIKE $1 OR sku ILIKE $1";
  }
  return paginate<ProductRow>(client, {
    selectSql: `SELECT ${COLS} FROM products ${where} ORDER BY id`,
    countSql: `SELECT count(*)::int AS count FROM products ${where}`,
    params,
    page,
    size,
  });
}

export async function getProduct(
  client: PoolClient,
  id: number
): Promise<ProductRow | null> {
  const result = await client.query<ProductRow>(
    `SELECT ${COLS} FROM products WHERE id = $1`,
    [id]
  );
  return result.rows[0] ?? null;
}

export async function getProductBySku(
  client: PoolClient,
  sku: string
): Promise<ProductRow | null> {
  const result = await client.query<ProductRow>(
    `SELECT ${COLS} FROM products WHERE sku = $1`,
    [sku]
  );
  return result.rows[0] ?? null;
}

export async function createProduct(
  client: PoolClient,
  data: ProductCreate
): Promise<ProductRow> {
  const result = await client.query<ProductRow>(
    `INSERT INTO products
       (name, sku, description, category_id, unit_id, purchase_price,
        sale_price, min_stock, is_active, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, now(), now())
     RETURNING ${COLS}`,
    [
      data.name,
      data.sku,
      data.description ?? null,
      data.category_id ?? null,
      data.unit_id ?? null,
      data.purchase_price,
      data.sale_price,
      data.min_stock,
      data.is_active,
    ]
  );
  return result.rows[0];
}

export async function updateProduct(
  client: PoolClient,
  id: number,
  fields: ProductUpdate
): Promise<ProductRow | null> {
  const update = buildUpdate(
    "products",
    id,
    fields as Record<string, unknown>,
    [
      "name",
      "sku",
      "description",
      "category_id",
      "unit_id",
      "purchase_price",
      "sale_price",
      "min_stock",
      "is_active",
    ],
    true
  );
  if (!update) return getProduct(client, id);
  const result = await client.query<ProductRow>(update.text, update.params);
  return result.rows[0] ?? null;
}

export async function deleteProduct(
  client: PoolClient,
  id: number
): Promise<boolean> {
  const result = await client.query(
    `UPDATE products SET is_active = false, updated_at = now()
      WHERE id = $1 RETURNING id`,
    [id]
  );
  return (result.rowCount ?? 0) > 0;
}
