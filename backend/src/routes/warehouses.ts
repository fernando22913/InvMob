import { Router } from "express";
import { withTransaction } from "../db";
import { asyncHandler, httpError } from "../utils/http";
import { parseOrThrow, pathId } from "../utils/params";
import { searchSchema } from "../utils/pagination";
import {
  warehouseCreateSchema,
  warehouseUpdateSchema,
} from "../schemas/warehouse";
import * as service from "../services/warehouseService";

export const warehousesRouter = Router();

warehousesRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const q = parseOrThrow(searchSchema, req.query, "query");
    const result = await withTransaction((client) =>
      service.listWarehouses(client, q.page, q.size, q.search)
    );
    res.json(result);
  })
);

warehousesRouter.get(
  "/:warehouse_id",
  asyncHandler(async (req, res) => {
    const id = pathId(req, "warehouse_id");
    const row = await withTransaction((client) =>
      service.getWarehouse(client, id)
    );
    if (!row) throw httpError(404, "Warehouse not found");
    res.json(row);
  })
);

warehousesRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = parseOrThrow(warehouseCreateSchema, req.body, "body");
    const row = await withTransaction((client) =>
      service.createWarehouse(client, data)
    );
    res.status(201).json(row);
  })
);

warehousesRouter.put(
  "/:warehouse_id",
  asyncHandler(async (req, res) => {
    const id = pathId(req, "warehouse_id");
    const data = parseOrThrow(warehouseUpdateSchema, req.body, "body");
    const row = await withTransaction((client) =>
      service.updateWarehouse(client, id, data)
    );
    if (!row) throw httpError(404, "Warehouse not found");
    res.json(row);
  })
);

warehousesRouter.delete(
  "/:warehouse_id",
  asyncHandler(async (req, res) => {
    const id = pathId(req, "warehouse_id");
    const ok = await withTransaction((client) =>
      service.deleteWarehouse(client, id)
    );
    if (!ok) throw httpError(404, "Warehouse not found");
    res.json({ detail: "Warehouse deactivated" });
  })
);
