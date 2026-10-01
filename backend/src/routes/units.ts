import { Router } from "express";
import { withTransaction } from "../db";
import { asyncHandler, httpError } from "../utils/http";
import { parseOrThrow, pathId } from "../utils/params";
import { searchSchema } from "../utils/pagination";
import { unitCreateSchema } from "../schemas/unit";
import * as service from "../services/unitService";

export const unitsRouter = Router();

unitsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const q = parseOrThrow(searchSchema, req.query, "query");
    const result = await withTransaction((client) =>
      service.listUnits(client, q.page, q.size, q.search)
    );
    res.json(result);
  })
);

unitsRouter.get(
  "/:unit_id",
  asyncHandler(async (req, res) => {
    const id = pathId(req, "unit_id");
    const row = await withTransaction((client) => service.getUnit(client, id));
    if (!row) throw httpError(404, "Unit not found");
    res.json(row);
  })
);

unitsRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = parseOrThrow(unitCreateSchema, req.body, "body");
    const row = await withTransaction((client) =>
      service.createUnit(client, data)
    );
    res.status(201).json(row);
  })
);

unitsRouter.delete(
  "/:unit_id",
  asyncHandler(async (req, res) => {
    const id = pathId(req, "unit_id");
    const ok = await withTransaction((client) => service.deleteUnit(client, id));
    if (!ok) throw httpError(404, "Unit not found");
    res.json({ detail: "Unit deleted" });
  })
);
