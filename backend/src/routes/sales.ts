import { Router } from "express";
import { withTransaction } from "../db";
import { asyncHandler, httpError } from "../utils/http";
import { parseOrThrow, pathId } from "../utils/params";
import { paginationSchema } from "../utils/pagination";
import { saleCreateSchema } from "../schemas/sale";
import * as service from "../services/saleService";

export const salesRouter = Router();

salesRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const q = parseOrThrow(paginationSchema, req.query, "query");
    const result = await withTransaction((client) =>
      service.listSales(client, q.page, q.size)
    );
    res.json(result);
  })
);

salesRouter.get(
  "/:sale_id",
  asyncHandler(async (req, res) => {
    const id = pathId(req, "sale_id");
    const row = await withTransaction((client) => service.getSale(client, id));
    if (!row) throw httpError(404, "Sale not found");
    res.json(row);
  })
);

salesRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = parseOrThrow(saleCreateSchema, req.body, "body");
    const userId = req.user?.id;
    if (!userId) throw httpError(401, "Not authenticated");

    const row = await withTransaction((client) =>
      service.createSale(client, userId, data)
    );
    res.status(201).json(row);
  })
);
