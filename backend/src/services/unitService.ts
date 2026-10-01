import { PoolClient } from "pg";
import { Paginated, paginate } from "../utils/pagination";
import { UnitCreate } from "../schemas/unit";

export type UnitRow = {
  id: number;
  name: string;
  symbol: string;
  created_at: Date;
};

const COLS = "id, name, symbol, created_at";

export async function listUnits(
  client: PoolClient,
  page: number,
  size: number,
  search?: string
): Promise<Paginated<UnitRow>> {
  const params: unknown[] = [];
  let where = "";
  if (search) {
    params.push(`%${search}%`);
    where = "WHERE name ILIKE $1";
  }
  return paginate<UnitRow>(client, {
    selectSql: `SELECT ${COLS} FROM units ${where} ORDER BY id`,
    countSql: `SELECT count(*)::int AS count FROM units ${where}`,
    params,
    page,
    size,
  });
}

export async function getUnit(
  client: PoolClient,
  id: number
): Promise<UnitRow | null> {
  const result = await client.query<UnitRow>(
    `SELECT ${COLS} FROM units WHERE id = $1`,
    [id]
  );
  return result.rows[0] ?? null;
}

export async function createUnit(
  client: PoolClient,
  data: UnitCreate
): Promise<UnitRow> {
  const result = await client.query<UnitRow>(
    `INSERT INTO units (name, symbol, created_at)
     VALUES ($1, $2, now())
     RETURNING ${COLS}`,
    [data.name, data.symbol]
  );
  return result.rows[0];
}

export async function deleteUnit(
  client: PoolClient,
  id: number
): Promise<boolean> {
  const result = await client.query("DELETE FROM units WHERE id = $1", [id]);
  return (result.rowCount ?? 0) > 0;
}
