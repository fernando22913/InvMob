import { Router } from "express";
import { withTransaction } from "../db";
import { asyncHandler, httpError } from "../utils/http";
import { parseOrThrow, pathId } from "../utils/params";
import { searchSchema } from "../utils/pagination";
import { productCreateSchema, productUpdateSchema } from "../schemas/product";
import * as service from "../services/productService";

export const productsRouter = Router();

productsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const q = parseOrThrow(searchSchema, req.query, "query");
    const result = await withTransaction((client) =>
      service.listProducts(client, q.page, q.size, q.search)
    );
    res.json(result);
  })
);

productsRouter.get(
  "/:product_id",
  asyncHandler(async (req, res) => {
    const id = pathId(req, "product_id");
    const row = await withTransaction((client) =>
      service.getProduct(client, id)
    );
    if (!row) throw httpError(404, "Product not found");
    res.json(row);
  })
);

productsRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = parseOrThrow(productCreateSchema, req.body, "body");
    const row = await withTransaction(async (client) => {
      const existing = await service.getProductBySku(client, data.sku);
      if (existing) throw httpError(409, "SKU already exists");
      return service.createProduct(client, data);
    });
    res.status(201).json(row);
  })
);

productsRouter.put(
  "/:product_id",
  asyncHandler(async (req, res) => {
    const id = pathId(req, "product_id");
    const data = parseOrThrow(productUpdateSchema, req.body, "body");
    const row = await withTransaction((client) =>
      service.updateProduct(client, id, data)
    );
    if (!row) throw httpError(404, "Product not found");
    res.json(row);
  })
);

productsRouter.delete(
  "/:product_id",
  asyncHandler(async (req, res) => {
    const id = pathId(req, "product_id");
    const ok = await withTransaction((client) =>
      service.deleteProduct(client, id)
    );
    if (!ok) throw httpError(404, "Product not found");
    res.json({ detail: "Product deactivated" });
  })
);
