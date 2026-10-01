import { PoolClient } from "pg";
import { Paginated, paginate } from "../utils/pagination";
import { httpError } from "../utils/http";
import { formatCents, multiplyCents } from "../utils/money";
import { getOrCreateStockRow } from "./inventoryService";
import { PurchaseCreate } from "../schemas/purchase";

export type PurchaseItemRow = {
  id: number;
  product_id: number | null;
  quantity: number;
  unit_price: string;
  subtotal: string;
};

export type PurchaseRow = {
  id: number;
  supplier_id: number | null;
  warehouse_id: number | null;
  reference_number: string | null;
  total_amount: string;
  notes: string | null;
  status: string;
  created_by: number | null;
  created_at: Date;
  updated_at: Date;
  items: PurchaseItemRow[];
};

const PURCHASE_COLS =
  "id, supplier_id, warehouse_id, reference_number, total_amount, notes, " +
  "status, created_by, created_at, updated_at";
const ITEM_COLS = "id, product_id, quantity, unit_price, subtotal";

async function attachItems(
  client: PoolClient,
  purchases: PurchaseRow[]
): Promise<PurchaseRow[]> {
  if (purchases.length === 0) return purchases;
  const ids = purchases.map((p) => p.id);
  const result = await client.query<PurchaseItemRow & { purchase_id: number }>(
    `SELECT ${ITEM_COLS}, purchase_id
       FROM purchase_items
      WHERE purchase_id = ANY($1::int[])
      ORDER BY id`,
    [ids]
  );
  const byPurchase = new Map<number, PurchaseItemRow[]>();
  for (const row of result.rows) {
    const list = byPurchase.get(row.purchase_id) ?? [];
    list.push({
      id: row.id,
      product_id: row.product_id,
      quantity: row.quantity,
      unit_price: row.unit_price,
      subtotal: row.subtotal,
    });
    byPurchase.set(row.purchase_id, list);
  }
  return purchases.map((p) => ({ ...p, items: byPurchase.get(p.id) ?? [] }));
}

export async function createPurchase(
  client: PoolClient,
  userId: number,
  data: PurchaseCreate
): Promise<PurchaseRow> {
  if (!data.items || data.items.length === 0) {
    throw httpError(400, "At least one item is required");
  }
  for (const item of data.items) {
    if (item.quantity <= 0) {
      throw httpError(400, "Purchase item quantity must be greater than 0");
    }
  }

  let totalCents = 0n;
  const itemsWithSubtotal = data.items.map((item) => {
    const subtotalCents = multiplyCents(item.quantity, item.unit_price);
    totalCents += subtotalCents;
    return { item, subtotal: formatCents(subtotalCents) };
  });

  const purchaseResult = await client.query<PurchaseRow>(
    `INSERT INTO purchases
       (supplier_id, warehouse_id, reference_number, total_amount, notes,
        status, created_by, created_at, updated_at)
     VALUES ($1, $2, $3, $4::numeric, $5, $6::orderstatus, $7, now(), now())
     RETURNING ${PURCHASE_COLS}`,
    [
      data.supplier_id ?? null,
      data.warehouse_id ?? null,
      data.reference_number ?? null,
      formatCents(totalCents),
      data.notes ?? null,
      "confirmed",
      userId,
    ]
  );
  const purchase = purchaseResult.rows[0];

  const items: PurchaseItemRow[] = [];
  for (const { item, subtotal } of itemsWithSubtotal) {
    const result = await client.query<PurchaseItemRow>(
      `INSERT INTO purchase_items
         (purchase_id, product_id, quantity, unit_price, subtotal)
       VALUES ($1, $2, $3, $4::numeric, $5::numeric)
       RETURNING ${ITEM_COLS}`,
      [purchase.id, item.product_id, item.quantity, String(item.unit_price), subtotal]
    );
    items.push(result.rows[0]);
  }

  if (purchase.warehouse_id) {
    const sorted = [...data.items].sort(
      (a, b) => a.product_id - b.product_id
    );
    for (const item of sorted) {
      const stockRow = await getOrCreateStockRow(
        client,
        item.product_id,
        purchase.warehouse_id,
        true
      );
      const stockBefore = stockRow.quantity;
      const stockAfter = stockBefore + item.quantity;

      await client.query(
        `UPDATE product_warehouses
            SET quantity = $1, updated_at = now()
          WHERE id = $2`,
        [stockAfter, stockRow.id]
      );

      await client.query(
        `INSERT INTO inventory_movements
           (product_id, warehouse_id, movement_type, quantity, stock_before,
            stock_after, reference_type, reference_id, notes, created_by, created_at)
         VALUES ($1, $2, $3::movementtype, $4, $5, $6, $7, $8, $9, $10, now())`,
        [
          item.product_id,
          purchase.warehouse_id,
          "purchase",
          item.quantity,
          stockBefore,
          stockAfter,
          "purchase",
          purchase.id,
          `Purchase #${purchase.id}`,
          userId,
        ]
      );
    }
  }

  return { ...purchase, items };
}

export async function listPurchases(
  client: PoolClient,
  page: number,
  size: number
): Promise<Paginated<PurchaseRow>> {
  const result = await paginate<PurchaseRow>(client, {
    selectSql: `SELECT ${PURCHASE_COLS} FROM purchases ORDER BY id DESC`,
    countSql: "SELECT count(*)::int AS count FROM purchases",
    params: [],
    page,
    size,
  });
  result.items = await attachItems(client, result.items);
  return result;
}

export async function getPurchase(
  client: PoolClient,
  id: number
): Promise<PurchaseRow | null> {
  const result = await client.query<PurchaseRow>(
    `SELECT ${PURCHASE_COLS} FROM purchases WHERE id = $1`,
    [id]
  );
  const purchase = result.rows[0];
  if (!purchase) return null;
  const [withItems] = await attachItems(client, [{ ...purchase, items: [] }]);
  return withItems;
}
