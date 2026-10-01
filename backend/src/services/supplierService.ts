import { PoolClient } from "pg";
import { Paginated, paginate } from "../utils/pagination";
import { buildUpdate } from "../utils/crud";
import { SupplierCreate, SupplierUpdate } from "../schemas/supplier";

export type SupplierRow = {
  id: number;
  name: string;
  contact_name: string;
  email: string;
  phone: string;
  address: string | null;
  tax_id: string;
  is_active: boolean;
  created_at: Date;
};

const COLS =
  "id, name, contact_name, email, phone, address, tax_id, is_active, created_at";

export async function listSuppliers(
  client: PoolClient,
  page: number,
  size: number,
  search?: string
): Promise<Paginated<SupplierRow>> {
  const params: unknown[] = [];
  let where = "";
  if (search) {
    params.push(`%${search}%`);
    where = "WHERE name ILIKE $1";
  }
  return paginate<SupplierRow>(client, {
    selectSql: `SELECT ${COLS} FROM suppliers ${where} ORDER BY id`,
    countSql: `SELECT count(*)::int AS count FROM suppliers ${where}`,
    params,
    page,
    size,
  });
}

export async function getSupplier(
  client: PoolClient,
  id: number
): Promise<SupplierRow | null> {
  const result = await client.query<SupplierRow>(
    `SELECT ${COLS} FROM suppliers WHERE id = $1`,
    [id]
  );
  return result.rows[0] ?? null;
}

export async function getSupplierByTaxId(
  client: PoolClient,
  taxId: string,
  excludeId?: number
): Promise<SupplierRow | null> {
  const result = await client.query<SupplierRow>(
    `SELECT ${COLS} FROM suppliers
      WHERE tax_id = $1 AND ($2::int IS NULL OR id <> $2)`,
    [taxId, excludeId ?? null]
  );
  return result.rows[0] ?? null;
}

export async function createSupplier(
  client: PoolClient,
  data: SupplierCreate
): Promise<SupplierRow> {
  const result = await client.query<SupplierRow>(
    `INSERT INTO suppliers
       (name, contact_name, email, phone, address, tax_id, is_active, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, now())
     RETURNING ${COLS}`,
    [
      data.name,
      data.contact_name,
      data.email,
      data.phone,
      data.address ?? null,
      data.tax_id,
      data.is_active,
    ]
  );
  return result.rows[0];
}

export async function updateSupplier(
  client: PoolClient,
  id: number,
  fields: SupplierUpdate
): Promise<SupplierRow | null> {
  const update = buildUpdate(
    "suppliers",
    id,
    fields as Record<string, unknown>,
    ["name", "contact_name", "email", "phone", "address", "tax_id", "is_active"]
  );
  if (!update) return getSupplier(client, id);
  const result = await client.query<SupplierRow>(update.text, update.params);
  return result.rows[0] ?? null;
}

export async function deleteSupplier(
  client: PoolClient,
  id: number
): Promise<boolean> {
  const result = await client.query(
    `UPDATE suppliers SET is_active = false WHERE id = $1 RETURNING id`,
    [id]
  );
  return (result.rowCount ?? 0) > 0;
}
