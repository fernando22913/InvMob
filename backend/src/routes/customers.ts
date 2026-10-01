import { Router } from "express";
import { withTransaction } from "../db";
import { asyncHandler, httpError } from "../utils/http";
import { parseOrThrow, pathId } from "../utils/params";
import { searchSchema } from "../utils/pagination";
import { customerCreateSchema, customerUpdateSchema } from "../schemas/customer";
import * as service from "../services/customerService";

export const customersRouter = Router();

customersRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const q = parseOrThrow(searchSchema, req.query, "query");
    const result = await withTransaction((client) =>
      service.listCustomers(client, q.page, q.size, q.search)
    );
    res.json(result);
  })
);

customersRouter.get(
  "/:customer_id",
  asyncHandler(async (req, res) => {
    const id = pathId(req, "customer_id");
    const row = await withTransaction((client) =>
      service.getCustomer(client, id)
    );
    if (!row) throw httpError(404, "Customer not found");
    res.json(row);
  })
);

customersRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = parseOrThrow(customerCreateSchema, req.body, "body");
    const row = await withTransaction((client) =>
      service.createCustomer(client, data)
    );
    res.status(201).json(row);
  })
);

customersRouter.put(
  "/:customer_id",
  asyncHandler(async (req, res) => {
    const id = pathId(req, "customer_id");
    const data = parseOrThrow(customerUpdateSchema, req.body, "body");
    const row = await withTransaction((client) =>
      service.updateCustomer(client, id, data)
    );
    if (!row) throw httpError(404, "Customer not found");
    res.json(row);
  })
);

customersRouter.delete(
  "/:customer_id",
  asyncHandler(async (req, res) => {
    const id = pathId(req, "customer_id");
    const ok = await withTransaction((client) =>
      service.deleteCustomer(client, id)
    );
    if (!ok) throw httpError(404, "Customer not found");
    res.json({ detail: "Customer deactivated" });
  })
);
