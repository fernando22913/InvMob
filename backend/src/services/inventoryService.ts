import { PoolClient } from "pg";
import { Paginated, paginate } from "../utils/pagination";
import { httpError } from "../utils/http";
import { AdjustmentCreate } from "../schemas/inventory";

export type StockRow = {
  id: number;
  product_id: number;
  warehouse_id: number;
  quantity: number;
  minimum_stock: number;
  created_at: Date;
  updated_at: Date;
};

export type MovementRow = {
  id: number;
  product_id: number | null;
  warehouse_id: number | null;
  to_warehouse_id: number | null;
  movement_type: string;
  quantity: number;
  stock_before: number;
  stock_after: number;
  reference_type: string | null;
  reference_id: number | null;
  notes: string | null;
  created_by: number | null;
  created_at: Date;
};

const STOCK_COLS =
  "id, product_id, warehouse_id, quantity, minimum_stock, created_at, updated_at";
const MOVEMENT_COLS =
  "id, product_id, warehouse_id, to_warehouse_id, movement_type, quantity, " +
  "stock_before, stock_after, reference_type, reference_id, notes, created_by, created_at";

export async function listStock(
  client: PoolClient,
  productId: number | undefined,
  warehouseId: number | undefined,
  page: number,
  size: number
): Promise<Paginated<StockRow>> {
  const params: unknown[] = [];
  const conditions: string[] = [];
  if (productId !== undefined) {
    params.push(productId);
    conditions.push(`product_id = $${params.length}`);
  }
  if (warehouseId !== undefined) {
    params.push(warehouseId);
    conditions.push(`warehouse_id = $${params.length}`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  return paginate<StockRow>(client, {
    selectSql: `SELECT ${STOCK_COLS} FROM product_warehouses ${where} ORDER BY id`,
    countSql: `SELECT count(*)::int AS count FROM product_warehouses ${where}`,
    params,
    page,
    size,
  });
}

export async function listMovements(
  client: PoolClient,
  filters: {
    productId?: number;
    warehouseId?: number;
    movementType?: string;
  },
  page: number,
  size: number
): Promise<Paginated<MovementRow>> {
  const params: unknown[] = [];
  const conditions: string[] = [];
  if (filters.productId !== undefined) {
    params.push(filters.productId);
    conditions.push(`product_id = $${params.length}`);
  }
  if (filters.warehouseId !== undefined) {
    params.push(filters.warehouseId);
    conditions.push(`warehouse_id = $${params.length}`);
  }
  if (filters.movementType !== undefined) {
    params.push(filters.movementType);
    conditions.push(`movement_type = $${params.length}::movementtype`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  return paginate<MovementRow>(client, {
    selectSql: `SELECT ${MOVEMENT_COLS} FROM inventory_movements ${where} ORDER BY id DESC`,
    countSql: `SELECT count(*)::int AS count FROM inventory_movements ${where}`,
    params,
    page,
    size,
  });
}

async function selectStockRow(
  client: PoolClient,
  productId: number,
  warehouseId: number,
  forUpdate: boolean
): Promise<StockRow | null> {
  const result = await client.query<StockRow>(
    `SELECT ${STOCK_COLS} FROM product_warehouses
      WHERE product_id = $1 AND warehouse_id = $2${
        forUpdate ? " FOR UPDATE" : ""
      }`,
    [productId, warehouseId]
  );
  return result.rows[0] ?? null;
}

/**
 * Locate or create the stock row. `forUpdate` adds the row-level lock used by
 * every stock-changing operation (SELECT ... FOR UPDATE).
 */
export async function getOrCreateStockRow(
  client: PoolClient,
  productId: number,
  warehouseId: number,
  forUpdate: boolean
): Promise<StockRow> {
  const existing = await selectStockRow(
    client,
    productId,
    warehouseId,
    forUpdate
  );
  if (existing) return existing;

  const inserted = await client.query<StockRow>(
    `INSERT INTO product_warehouses
       (product_id, warehouse_id, quantity, minimum_stock, created_at, updated_at)
     VALUES ($1, $2, 0, 0, now(), now())
     RETURNING ${STOCK_COLS}`,
    [productId, warehouseId]
  );
  return inserted.rows[0];
}

export async function adjustStock(
  client: PoolClient,
  data: AdjustmentCreate,
  userId: number
): Promise<StockRow> {
  const stockRow = await getOrCreateStockRow(
    client,
    data.product_id,
    data.warehouse_id,
    true
  );
  const stockBefore = stockRow.quantity;
  const stockAfter = stockBefore + data.quantity;

  if (stockAfter < 0) {
    throw httpError(
      400,
      `Insufficient stock for adjustment: current stock ${stockBefore}, ` +
        `adjustment ${data.quantity} would result in ${stockAfter}`
    );
  }

  const updated = await client.query<StockRow>(
    `UPDATE product_warehouses
        SET quantity = $1, updated_at = now()
      WHERE id = $2
      RETURNING ${STOCK_COLS}`,
    [stockAfter, stockRow.id]
  );

  await client.query(
    `INSERT INTO inventory_movements
       (product_id, warehouse_id, movement_type, quantity, stock_before,
        stock_after, notes, created_by, created_at)
     VALUES ($1, $2, $3::movementtype, $4, $5, $6, $7, $8, now())`,
    [
      data.product_id,
      data.warehouse_id,
      "adjustment",
      data.quantity,
      stockBefore,
      stockAfter,
      data.notes ?? "Manual adjustment",
      userId,
    ]
  );

  return updated.rows[0];
}
