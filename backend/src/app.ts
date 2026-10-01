import express, { Express } from "express";
import cors from "cors";
import { config, corsOrigins } from "./config";
import { authRouter } from "./routes/auth";
import { usersRouter, rolesRouter } from "./routes/users";
import { categoriesRouter } from "./routes/categories";
import { unitsRouter } from "./routes/units";
import { suppliersRouter } from "./routes/suppliers";
import { customersRouter } from "./routes/customers";
import { warehousesRouter } from "./routes/warehouses";
import { productsRouter } from "./routes/products";
import { inventoryRouter } from "./routes/inventory";
import { purchasesRouter } from "./routes/purchases";
import { salesRouter } from "./routes/sales";
import { getCurrentUser } from "./middleware/auth";
import { requireAdmin } from "./middleware/admin";
import { errorHandler, notFoundHandler } from "./middleware/errors";

export function createApp(): Express {
  const app = express();

  app.use(
    cors({
      origin: corsOrigins(),
      credentials: true,
      methods: ["*"],
      allowedHeaders: ["*"],
    })
  );

  app.use(express.json());

  const health = (_req: express.Request, res: express.Response) => {
    res.json({ status: "ok", version: config.APP_VERSION });
  };
  app.get("/health", health);
  app.get("/api/health", health);

  // Public auth endpoint.
  app.use("/api/auth", authRouter);

  // Admin-only areas.
  app.use("/api/users", getCurrentUser, requireAdmin, usersRouter);
  app.use("/api/roles", getCurrentUser, requireAdmin, rolesRouter);

  // Authenticated areas.
  app.use("/api/categories", getCurrentUser, categoriesRouter);
  app.use("/api/units", getCurrentUser, unitsRouter);
  app.use("/api/suppliers", getCurrentUser, suppliersRouter);
  app.use("/api/customers", getCurrentUser, customersRouter);
  app.use("/api/warehouses", getCurrentUser, warehousesRouter);
  app.use("/api/products", getCurrentUser, productsRouter);
  app.use("/api/inventory", getCurrentUser, inventoryRouter);
  app.use("/api/purchases", getCurrentUser, purchasesRouter);
  app.use("/api/sales", getCurrentUser, salesRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
