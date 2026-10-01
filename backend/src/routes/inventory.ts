import { Router } from "express";
import { withTransaction } from "../db";
import { asyncHandler, httpError } from "../utils/http";
import { parseOrThrow } from "../utils/params";
import {
  adjustmentCreateSchema,
  movementsQuerySchema,
  stockQuerySchema,
} from "../schemas/inventory";
import * as service from "../services/inventoryService";

export const inventoryRouter = Router();

inventoryRouter.get(
  "/stock",
  asyncHandler(async (req, res) => {
    const q = parseOrThrow(stockQuerySchema, req.query, "query");
    const result = await withTransaction((client) =>
      service.listStock(client, q.product_id, q.warehouse_id, q.page, q.size)
    );
    res.json(result);
  })
);

inventoryRouter.get(
  "/movements",
  asyncHandler(async (req, res) => {
    const q = parseOrThrow(movementsQuerySchema, req.query, "query");
    const result = await withTransaction((client) =>
      service.listMovements(
        client,
        {
          productId: q.product_id,
          warehouseId: q.warehouse_id,
          movementType: q.movement_type,
        },
        q.page,
        q.size
      )
    );
    res.json(result);
  })
);

inventoryRouter.post(
  "/adjustments",
  asyncHandler(async (req, res) => {
    const data = parseOrThrow(adjustmentCreateSchema, req.body, "body");
    const userId = req.user?.id;
    if (!userId) throw httpError(401, "Not authenticated");

    const stockRow = await withTransaction((client) =>
      service.adjustStock(client, data, userId)
    );
    res
      .status(201)
      .json({ detail: "Adjustment applied", new_quantity: stockRow.quantity });
  })
);
