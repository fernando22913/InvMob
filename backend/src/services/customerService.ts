import { PoolClient } from "pg";
import { Paginated, paginate } from "../utils/pagination";
import { buildUpdate } from "../utils/crud";
import { CustomerCreate, CustomerUpdate } from "../schemas/customer";

export type CustomerRow = {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  tax_id: string | null;
  is_active: boolean;
  created_at: Date;
};

const COLS =
  "id, name, email, phone, address, tax_id, is_active, created_at";

export async function listCustomers(
  client: PoolClient,
  page: number,
  size: number,
  search?: string
): Promise<Paginated<CustomerRow>> {
  const params: unknown[] = [];
  let where = "";
  if (search) {
    params.push(`%${search}%`);
    where = "WHERE name ILIKE $1";
  }
  return paginate<CustomerRow>(client, {
    selectSql: `SELECT ${COLS} FROM customers ${where} ORDER BY id`,
    countSql: `SELECT count(*)::int AS count FROM customers ${where}`,
    params,
    page,
    size,
  });
}

export async function getCustomer(
  client: PoolClient,
  id: number
): Promise<CustomerRow | null> {
  const result = await client.query<CustomerRow>(
    `SELECT ${COLS} FROM customers WHERE id = $1`,
    [id]
  );
  return result.rows[0] ?? null;
}

export async function createCustomer(
  client: PoolClient,
  data: CustomerCreate
): Promise<CustomerRow> {
  const result = await client.query<CustomerRow>(
    `INSERT INTO customers
       (name, email, phone, address, tax_id, is_active, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, now())
     RETURNING ${COLS}`,
    [
      data.name,
      data.email ?? null,
      data.phone ?? null,
      data.address ?? null,
      data.tax_id ?? null,
      data.is_active,
    ]
  );
  return result.rows[0];
}

export async function updateCustomer(
  client: PoolClient,
  id: number,
  fields: CustomerUpdate
): Promise<CustomerRow | null> {
  const update = buildUpdate(
    "customers",
    id,
    fields as Record<string, unknown>,
    ["name", "email", "phone", "address", "tax_id", "is_active"]
  );
  if (!update) return getCustomer(client, id);
  const result = await client.query<CustomerRow>(update.text, update.params);
  return result.rows[0] ?? null;
}

export async function deleteCustomer(
  client: PoolClient,
  id: number
): Promise<boolean> {
  const result = await client.query(
    `UPDATE customers SET is_active = false WHERE id = $1 RETURNING id`,
    [id]
  );
  return (result.rowCount ?? 0) > 0;
}
