import { Router } from "express";
import { withTransaction } from "../db";
import { asyncHandler, httpError } from "../utils/http";
import { parseOrThrow, pathId } from "../utils/params";
import { searchSchema } from "../utils/pagination";
import { supplierCreateSchema, supplierUpdateSchema } from "../schemas/supplier";
import * as service from "../services/supplierService";

export const suppliersRouter = Router();

suppliersRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const q = parseOrThrow(searchSchema, req.query, "query");
    const result = await withTransaction((client) =>
      service.listSuppliers(client, q.page, q.size, q.search)
    );
    res.json(result);
  })
);

suppliersRouter.get(
  "/:supplier_id",
  asyncHandler(async (req, res) => {
    const id = pathId(req, "supplier_id");
    const row = await withTransaction((client) =>
      service.getSupplier(client, id)
    );
    if (!row) throw httpError(404, "Supplier not found");
    res.json(row);
  })
);

suppliersRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = parseOrThrow(supplierCreateSchema, req.body, "body");
    const row = await withTransaction(async (client) => {
      const existing = await service.getSupplierByTaxId(client, data.tax_id);
      if (existing) {
        throw httpError(409, "A supplier with this RUT already exists");
      }
      return service.createSupplier(client, data);
    });
    res.status(201).json(row);
  })
);

suppliersRouter.put(
  "/:supplier_id",
  asyncHandler(async (req, res) => {
    const id = pathId(req, "supplier_id");
    const data = parseOrThrow(supplierUpdateSchema, req.body, "body");
    const row = await withTransaction(async (client) => {
      if (data.tax_id) {
        const existing = await service.getSupplierByTaxId(
          client,
          data.tax_id,
          id
        );
        if (existing) {
          throw httpError(409, "A supplier with this RUT already exists");
        }
      }
      return service.updateSupplier(client, id, data);
    });
    if (!row) throw httpError(404, "Supplier not found");
    res.json(row);
  })
);

suppliersRouter.delete(
  "/:supplier_id",
  asyncHandler(async (req, res) => {
    const id = pathId(req, "supplier_id");
    const ok = await withTransaction((client) =>
      service.deleteSupplier(client, id)
    );
    if (!ok) throw httpError(404, "Supplier not found");
    res.json({ detail: "Supplier deactivated" });
  })
);
