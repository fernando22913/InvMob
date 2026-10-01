import { PoolClient } from "pg";
import { Paginated, paginate } from "../utils/pagination";
import { buildUpdate } from "../utils/crud";
import { WarehouseCreate, WarehouseUpdate } from "../schemas/warehouse";

export type WarehouseRow = {
  id: number;
  name: string;
  address: string | null;
  is_active: boolean;
  created_at: Date;
};

const COLS = "id, name, address, is_active, created_at";

export async function listWarehouses(
  client: PoolClient,
  page: number,
  size: number,
  search?: string
): Promise<Paginated<WarehouseRow>> {
  const params: unknown[] = [];
  let where = "";
  if (search) {
    params.push(`%${search}%`);
    where = "WHERE name ILIKE $1";
  }
  return paginate<WarehouseRow>(client, {
    selectSql: `SELECT ${COLS} FROM warehouses ${where} ORDER BY id`,
    countSql: `SELECT count(*)::int AS count FROM warehouses ${where}`,
    params,
    page,
    size,
  });
}

export async function getWarehouse(
  client: PoolClient,
  id: number
): Promise<WarehouseRow | null> {
  const result = await client.query<WarehouseRow>(
    `SELECT ${COLS} FROM warehouses WHERE id = $1`,
    [id]
  );
  return result.rows[0] ?? null;
}

export async function createWarehouse(
  client: PoolClient,
  data: WarehouseCreate
): Promise<WarehouseRow> {
  const result = await client.query<WarehouseRow>(
    `INSERT INTO warehouses (name, address, is_active, created_at)
     VALUES ($1, $2, $3, now())
     RETURNING ${COLS}`,
    [data.name, data.address ?? null, data.is_active]
  );
  return result.rows[0];
}

export async function updateWarehouse(
  client: PoolClient,
  id: number,
  fields: WarehouseUpdate
): Promise<WarehouseRow | null> {
  const update = buildUpdate(
    "warehouses",
    id,
    fields as Record<string, unknown>,
    ["name", "address", "is_active"]
  );
  if (!update) return getWarehouse(client, id);
  const result = await client.query<WarehouseRow>(update.text, update.params);
  return result.rows[0] ?? null;
}

export async function deleteWarehouse(
  client: PoolClient,
  id: number
): Promise<boolean> {
  const result = await client.query(
    `UPDATE warehouses SET is_active = false WHERE id = $1 RETURNING id`,
    [id]
  );
  return (result.rowCount ?? 0) > 0;
}
