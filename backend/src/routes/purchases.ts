import { Router } from "express";
import { withTransaction } from "../db";
import { asyncHandler, httpError } from "../utils/http";
import { parseOrThrow, pathId } from "../utils/params";
import { paginationSchema } from "../utils/pagination";
import { purchaseCreateSchema } from "../schemas/purchase";
import * as service from "../services/purchaseService";

export const purchasesRouter = Router();

purchasesRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const q = parseOrThrow(paginationSchema, req.query, "query");
    const result = await withTransaction((client) =>
      service.listPurchases(client, q.page, q.size)
    );
    res.json(result);
  })
);

purchasesRouter.get(
  "/:purchase_id",
  asyncHandler(async (req, res) => {
    const id = pathId(req, "purchase_id");
    const row = await withTransaction((client) =>
      service.getPurchase(client, id)
    );
    if (!row) throw httpError(404, "Purchase not found");
    res.json(row);
  })
);

purchasesRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = parseOrThrow(purchaseCreateSchema, req.body, "body");
    const userId = req.user?.id;
    if (!userId) throw httpError(401, "Not authenticated");

    const row = await withTransaction((client) =>
      service.createPurchase(client, userId, data)
    );
    res.status(201).json(row);
  })
);
