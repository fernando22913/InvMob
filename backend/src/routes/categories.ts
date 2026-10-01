import { Router } from "express";
import { withTransaction } from "../db";
import { asyncHandler, httpError } from "../utils/http";
import { parseOrThrow, pathId } from "../utils/params";
import { searchSchema } from "../utils/pagination";
import { categoryCreateSchema, categoryUpdateSchema } from "../schemas/category";
import * as service from "../services/categoryService";

export const categoriesRouter = Router();

categoriesRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const q = parseOrThrow(searchSchema, req.query, "query");
    const result = await withTransaction((client) =>
      service.listCategories(client, q.page, q.size, q.search)
    );
    res.json(result);
  })
);

categoriesRouter.get(
  "/:category_id",
  asyncHandler(async (req, res) => {
    const id = pathId(req, "category_id");
    const row = await withTransaction((client) =>
      service.getCategory(client, id)
    );
    if (!row) throw httpError(404, "Category not found");
    res.json(row);
  })
);

categoriesRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = parseOrThrow(categoryCreateSchema, req.body, "body");
    const row = await withTransaction((client) =>
      service.createCategory(client, data)
    );
    res.status(201).json(row);
  })
);

categoriesRouter.put(
  "/:category_id",
  asyncHandler(async (req, res) => {
    const id = pathId(req, "category_id");
    const data = parseOrThrow(categoryUpdateSchema, req.body, "body");
    const row = await withTransaction((client) =>
      service.updateCategory(client, id, data)
    );
    if (!row) throw httpError(404, "Category not found");
    res.json(row);
  })
);

categoriesRouter.delete(
  "/:category_id",
  asyncHandler(async (req, res) => {
    const id = pathId(req, "category_id");
    const ok = await withTransaction((client) =>
      service.deleteCategory(client, id)
    );
    if (!ok) throw httpError(404, "Category not found");
    res.json({ detail: "Category deleted" });
  })
);
