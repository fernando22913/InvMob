import { PoolClient } from "pg";
import { Paginated, paginate } from "../utils/pagination";
import { httpError } from "../utils/http";
import { formatCents, multiplyCents } from "../utils/money";
import { getOrCreateStockRow, StockRow } from "./inventoryService";
import { SaleCreate } from "../schemas/sale";

export type SaleItemRow = {
  id: number;
  product_id: number | null;
  quantity: number;
  unit_price: string;
  subtotal: string;
};

export type SaleRow = {
  id: number;
  customer_id: number | null;
  warehouse_id: number | null;
  reference_number: string | null;
  total_amount: string;
  notes: string | null;
  status: string;
  created_by: number | null;
  created_at: Date;
  updated_at: Date;
  items: SaleItemRow[];
};

const SALE_COLS =
  "id, customer_id, warehouse_id, reference_number, total_amount, notes, " +
  "status, created_by, created_at, updated_at";
const ITEM_COLS = "id, product_id, quantity, unit_price, subtotal";

async function attachItems(
  client: PoolClient,
  sales: SaleRow[]
): Promise<SaleRow[]> {
  if (sales.length === 0) return sales;
  const ids = sales.map((s) => s.id);
  const result = await client.query<SaleItemRow & { sale_id: number }>(
    `SELECT ${ITEM_COLS}, sale_id
       FROM sale_items
      WHERE sale_id = ANY($1::int[])
      ORDER BY id`,
    [ids]
  );
  const bySale = new Map<number, SaleItemRow[]>();
  for (const row of result.rows) {
    const list = bySale.get(row.sale_id) ?? [];
    list.push({
      id: row.id,
      product_id: row.product_id,
      quantity: row.quantity,
      unit_price: row.unit_price,
      subtotal: row.subtotal,
    });
    bySale.set(row.sale_id, list);
  }
  return sales.map((s) => ({ ...s, items: bySale.get(s.id) ?? [] }));
}

export async function createSale(
  client: PoolClient,
  userId: number,
  data: SaleCreate
): Promise<SaleRow> {
  if (!data.warehouse_id) {
    throw httpError(400, "Warehouse is required");
  }
  if (!data.items || data.items.length === 0) {
    throw httpError(400, "At least one item is required");
  }
  for (const item of data.items) {
    if (item.quantity <= 0) {
      throw httpError(400, "Sale item quantity must be greater than 0");
    }
  }

  const requested = new Map<number, number>();
  for (const item of data.items) {
    requested.set(
      item.product_id,
      (requested.get(item.product_id) ?? 0) + item.quantity
    );
  }

  const stockRows = new Map<number, StockRow>();
  const productIds = [...requested.keys()].sort((a, b) => a - b);
  for (const productId of productIds) {
    const stockRow = await getOrCreateStockRow(
      client,
      productId,
      data.warehouse_id,
      true
    );
    const needed = requested.get(productId) as number;
    if (stockRow.quantity < needed) {
      throw httpError(
        400,
        `Insufficient stock for product ${productId}: ` +
          `available ${stockRow.quantity}, requested ${needed}`
      );
    }
    stockRows.set(productId, stockRow);
  }

  let totalCents = 0n;
  const itemsWithSubtotal = data.items.map((item) => {
    const subtotalCents = multiplyCents(item.quantity, item.unit_price);
    totalCents += subtotalCents;
    return { item, subtotal: formatCents(subtotalCents) };
  });

  const saleResult = await client.query<SaleRow>(
    `INSERT INTO sales
       (customer_id, warehouse_id, reference_number, total_amount, notes,
        status, created_by, created_at, updated_at)
     VALUES ($1, $2, $3, $4::numeric, $5, $6::orderstatus, $7, now(), now())
     RETURNING ${SALE_COLS}`,
    [
      data.customer_id ?? null,
      data.warehouse_id ?? null,
      data.reference_number ?? null,
      formatCents(totalCents),
      data.notes ?? null,
      "confirmed",
      userId,
    ]
  );
  const sale = saleResult.rows[0];

  const items: SaleItemRow[] = [];
  for (const { item, subtotal } of itemsWithSubtotal) {
    const result = await client.query<SaleItemRow>(
      `INSERT INTO sale_items
         (sale_id, product_id, quantity, unit_price, subtotal)
       VALUES ($1, $2, $3, $4::numeric, $5::numeric)
       RETURNING ${ITEM_COLS}`,
      [sale.id, item.product_id, item.quantity, String(item.unit_price), subtotal]
    );
    items.push(result.rows[0]);
  }

  for (const item of data.items) {
    const stockRow = stockRows.get(item.product_id) as StockRow;
    const stockBefore = stockRow.quantity;
    const stockAfter = stockBefore - item.quantity;

    await client.query(
      `UPDATE product_warehouses
          SET quantity = $1, updated_at = now()
        WHERE id = $2`,
      [stockAfter, stockRow.id]
    );
    stockRow.quantity = stockAfter;

    await client.query(
      `INSERT INTO inventory_movements
         (product_id, warehouse_id, movement_type, quantity, stock_before,
          stock_after, reference_type, reference_id, notes, created_by, created_at)
       VALUES ($1, $2, $3::movementtype, $4, $5, $6, $7, $8, $9, $10, now())`,
      [
        item.product_id,
        sale.warehouse_id,
        "sale",
        -item.quantity,
        stockBefore,
        stockAfter,
        "sale",
        sale.id,
        `Sale #${sale.id}`,
        userId,
      ]
    );
  }

  return { ...sale, items };
}

export async function listSales(
  client: PoolClient,
  page: number,
  size: number
): Promise<Paginated<SaleRow>> {
  const result = await paginate<SaleRow>(client, {
    selectSql: `SELECT ${SALE_COLS} FROM sales ORDER BY id DESC`,
    countSql: "SELECT count(*)::int AS count FROM sales",
    params: [],
    page,
    size,
  });
  result.items = await attachItems(client, result.items);
  return result;
}

export async function getSale(
  client: PoolClient,
  id: number
): Promise<SaleRow | null> {
  const result = await client.query<SaleRow>(
    `SELECT ${SALE_COLS} FROM sales WHERE id = $1`,
    [id]
  );
  const sale = result.rows[0];
  if (!sale) return null;
  const [withItems] = await attachItems(client, [{ ...sale, items: [] }]);
  return withItems;
}
