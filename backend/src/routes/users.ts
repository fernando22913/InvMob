import { Router } from "express";
import { withTransaction } from "../db";
import { asyncHandler, httpError } from "../utils/http";
import { parseOrThrow, pathId } from "../utils/params";
import { searchSchema } from "../utils/pagination";
import {
  roleCreateSchema,
  userCreateSchema,
  userUpdateSchema,
} from "../schemas/user";
import * as service from "../services/userService";

export const usersRouter = Router();

usersRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const q = parseOrThrow(searchSchema, req.query, "query");
    const result = await withTransaction((client) =>
      service.listUsers(client, q.page, q.size, q.search)
    );
    res.json(result);
  })
);

usersRouter.get(
  "/:user_id",
  asyncHandler(async (req, res) => {
    const id = pathId(req, "user_id");
    const row = await withTransaction((client) => service.getUser(client, id));
    if (!row) throw httpError(404, "User not found");
    res.json(row);
  })
);

usersRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = parseOrThrow(userCreateSchema, req.body, "body");
    const row = await withTransaction(async (client) => {
      const existing = await service.getUserByEmail(client, data.email);
      if (existing) throw httpError(409, "Email already registered");
      return service.createUser(client, data);
    });
    res.status(201).json(row);
  })
);

usersRouter.put(
  "/:user_id",
  asyncHandler(async (req, res) => {
    const id = pathId(req, "user_id");
    const data = parseOrThrow(userUpdateSchema, req.body, "body");
    const row = await withTransaction((client) =>
      service.updateUser(client, id, data)
    );
    if (!row) throw httpError(404, "User not found");
    res.json(row);
  })
);

usersRouter.delete(
  "/:user_id",
  asyncHandler(async (req, res) => {
    const id = pathId(req, "user_id");
    const ok = await withTransaction((client) => service.deleteUser(client, id));
    if (!ok) throw httpError(404, "User not found");
    res.json({ detail: "User deactivated" });
  })
);

export const rolesRouter = Router();

rolesRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const rows = await withTransaction((client) => service.listRoles(client));
    res.json(rows);
  })
);

rolesRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = parseOrThrow(roleCreateSchema, req.body, "body");
    const row = await withTransaction((client) =>
      service.createRole(client, data)
    );
    res.status(201).json(row);
  })
);
