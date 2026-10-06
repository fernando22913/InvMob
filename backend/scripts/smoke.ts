/**
 * End-to-end smoke test for the Inventario API.
 *
 * Exercises: login, auth/admin enforcement, CRUD, pagination envelope, unique
 * SKU (409), purchase (stock up + movement), sale (stock down + movement),
 * duplicate-line aggregation, and insufficient-stock rollback (stock unchanged,
 * no sale, no movement).
 *
 * Usage: npm run smoke   (server must be running on :8000)
 */

const BASE = process.env.SMOKE_BASE_URL ?? "http://localhost:8000/api";
const ADMIN_EMAIL = process.env.SMOKE_ADMIN_EMAIL ?? "";
const ADMIN_PASSWORD = process.env.SMOKE_ADMIN_PASSWORD ?? "";

const RUN = Date.now().toString(36).toUpperCase();

let passed = 0;
let failed = 0;

function check(condition: boolean, label: string, extra?: unknown): void {
  if (condition) {
    passed += 1;
    console.log(`  PASS  ${label}`);
  } else {
    failed += 1;
    console.log(`  FAIL  ${label}`);
    if (extra !== undefined) {
      console.log("        " + JSON.stringify(extra));
    }
  }
}

interface ApiResponse {
  status: number;
  body: any;
}

async function request(
  method: string,
  path: string,
  options: { token?: string; body?: unknown } = {}
): Promise<ApiResponse> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (options.token) headers.Authorization = `Bearer ${options.token}`;
  const response = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const text = await response.text();
  let body: any = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { status: response.status, body };
}

async function main(): Promise<void> {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    throw new Error(
      "Set SMOKE_ADMIN_EMAIL and SMOKE_ADMIN_PASSWORD (the credentials of a " +
        "seeded admin) before running the smoke test."
    );
  }
  console.log(`Smoke run ${RUN} against ${BASE}\n`);

  // --- health / auth -------------------------------------------------------
  console.log("Health & auth");
  const health = await request("GET", "/health");
  check(health.status === 200 && health.body?.status === "ok", "GET /health = 200");

  const noAuth = await request("GET", "/products");
  check(noAuth.status === 401, "GET /products without token = 401", noAuth);

  const badLogin = await request("POST", "/auth/login", {
    body: { email: ADMIN_EMAIL, password: "definitely-wrong" },
  });
  check(badLogin.status === 401, "login with wrong password = 401", badLogin);

  const login = await request("POST", "/auth/login", {
    body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  });
  const token: string | undefined = login.body?.access_token;
  check(login.status === 200 && !!token, "admin login = 200 + token", login);
  if (!token) throw new Error("Cannot continue without a token");

  // --- reference data ------------------------------------------------------
  console.log("\nReference CRUD");
  const category = await request("POST", "/categories", {
    token,
    body: { name: `SMOKE ${RUN} CATEGORY` },
  });
  check(category.status === 201 && category.body?.id > 0, "create category = 201", category);
  const categoryId = category.body?.id;

  const unit = await request("POST", "/units", {
    token,
    body: { name: `SMOKE ${RUN} UNIT`, symbol: `s${RUN.slice(-6)}` },
  });
  check(unit.status === 201 && unit.body?.id > 0, "create unit = 201", unit);
  const unitId = unit.body?.id;

  const warehouse = await request("POST", "/warehouses", {
    token,
    body: { name: `SMOKE ${RUN} WAREHOUSE` },
  });
  check(warehouse.status === 201 && warehouse.body?.id > 0, "create warehouse = 201", warehouse);
  const warehouseId = warehouse.body?.id;

  const warehouse404 = await request("GET", "/warehouses/999999999", { token });
  check(warehouse404.status === 404, "GET missing warehouse = 404", warehouse404);

  // --- product CRUD --------------------------------------------------------
  console.log("\nProduct CRUD");
  const sku = `SMOKE-${RUN}`;
  const product = await request("POST", "/products", {
    token,
    body: {
      name: `SMOKE ${RUN} PRODUCT`,
      sku,
      category_id: categoryId,
      unit_id: unitId,
      purchase_price: "5.00",
      sale_price: "8.00",
      min_stock: 2,
    },
  });
  check(product.status === 201 && product.body?.sku === sku, "create product = 201", product);
  check(
    typeof product.body?.purchase_price === "string",
    "numeric serialized as string (purchase_price)",
    product.body?.purchase_price
  );
  const productId = product.body?.id;

  const duplicate = await request("POST", "/products", {
    token,
    body: { name: "dup", sku },
  });
  check(duplicate.status === 409, "duplicate SKU = 409", duplicate);

  const invalidProduct = await request("POST", "/products", {
    token,
    body: { name: "", sku: "" },
  });
  check(invalidProduct.status === 422, "invalid product payload = 422", invalidProduct);

  const listing = await request("GET", `/products?search=${sku}&page=1&size=5`, { token });
  check(listing.status === 200, "GET /products search = 200", listing);
  check(
    listing.body?.items?.length === 1 &&
      listing.body?.total === 1 &&
      listing.body?.page === 1 &&
      listing.body?.size === 5 &&
      listing.body?.pages === 1,
    "pagination envelope {items,total,page,size,pages}",
    listing.body
  );

  const badPage = await request("GET", "/products?page=0", { token });
  check(badPage.status === 422, "page=0 = 422", badPage);

  const updated = await request("PUT", `/products/${productId}`, {
    token,
    body: { sale_price: "9.50", min_stock: 4 },
  });
  check(
    updated.status === 200 &&
      updated.body?.sale_price === "9.50" &&
      updated.body?.min_stock === 4,
    "update product = 200",
    updated
  );

  // --- purchase ------------------------------------------------------------
  console.log("\nPurchase -> stock up + movement");
  const purchase = await request("POST", "/purchases", {
    token,
    body: {
      warehouse_id: warehouseId,
      reference_number: `SMOKE-PO-${RUN}`,
      items: [{ product_id: productId, quantity: 10, unit_price: "5.00" }],
    },
  });
  check(
    purchase.status === 201 &&
      purchase.body?.status === "confirmed" &&
      purchase.body?.total_amount === "50.00" &&
      purchase.body?.items?.[0]?.subtotal === "50.00",
    "create purchase = 201 (total 50.00)",
    purchase
  );

  const stockAfterPurchase = await request(
    "GET",
    `/inventory/stock?product_id=${productId}&warehouse_id=${warehouseId}`,
    { token }
  );
  check(
    stockAfterPurchase.body?.items?.[0]?.quantity === 10,
    "stock after purchase = 10",
    stockAfterPurchase.body
  );

  const purchaseMovements = await request(
    "GET",
    `/inventory/movements?product_id=${productId}&warehouse_id=${warehouseId}&movement_type=purchase`,
    { token }
  );
  const purchaseMovement = purchaseMovements.body?.items?.[0];
  check(
    purchaseMovement?.quantity === 10 &&
      purchaseMovement?.stock_before === 0 &&
      purchaseMovement?.stock_after === 10 &&
      purchaseMovement?.reference_type === "purchase",
    "purchase movement (+10, 0 -> 10, audited)",
    purchaseMovement
  );

  // --- sale (success) ------------------------------------------------------
  console.log("\nSale -> stock down + movement");
  const sale = await request("POST", "/sales", {
    token,
    body: {
      warehouse_id: warehouseId,
      items: [{ product_id: productId, quantity: 4, unit_price: "9.50" }],
    },
  });
  check(
    sale.status === 201 && sale.body?.total_amount === "38.00",
    "create sale = 201 (total 38.00)",
    sale
  );

  const stockAfterSale = await request(
    "GET",
    `/inventory/stock?product_id=${productId}&warehouse_id=${warehouseId}`,
    { token }
  );
  check(
    stockAfterSale.body?.items?.[0]?.quantity === 6,
    "stock after sale = 6",
    stockAfterSale.body
  );

  const saleMovements = await request(
    "GET",
    `/inventory/movements?product_id=${productId}&movement_type=sale`,
    { token }
  );
  const saleMovement = saleMovements.body?.items?.[0];
  check(
    saleMovement?.quantity === -4 &&
      saleMovement?.stock_before === 10 &&
      saleMovement?.stock_after === 6 &&
      saleMovement?.reference_type === "sale",
    "sale movement (-4, 10 -> 6, audited)",
    saleMovement
  );

  // --- sale aggregation (duplicate lines) ----------------------------------
  console.log("\nSale duplicate-line aggregation");
  const aggregated = await request("POST", "/sales", {
    token,
    body: {
      warehouse_id: warehouseId,
      items: [
        { product_id: productId, quantity: 2, unit_price: "1.00" },
        { product_id: productId, quantity: 3, unit_price: "1.00" },
      ],
    },
  });
  check(
    aggregated.status === 201 && aggregated.body?.total_amount === "5.00",
    "aggregated sale = 201 (5 units)",
    aggregated
  );
  const stockAfterAgg = await request(
    "GET",
    `/inventory/stock?product_id=${productId}&warehouse_id=${warehouseId}`,
    { token }
  );
  check(
    stockAfterAgg.body?.items?.[0]?.quantity === 1,
    "stock after aggregated sale = 1",
    stockAfterAgg.body
  );

  // --- insufficient stock: full rollback -----------------------------------
  console.log("\nInsufficient stock -> 400 + full rollback");
  const salesBefore = await request("GET", "/sales?size=100", { token });
  const movementsBefore = await request(
    "GET",
    `/inventory/movements?product_id=${productId}&size=100`,
    { token }
  );

  const oversell = await request("POST", "/sales", {
    token,
    body: {
      warehouse_id: warehouseId,
      items: [{ product_id: productId, quantity: 7, unit_price: "1.00" }],
    },
  });
  check(
    oversell.status === 400 && /Insufficient stock/.test(String(oversell.body?.detail)),
    "oversell sale = 400 with detail",
    oversell
  );

  const stockAfterOversell = await request(
    "GET",
    `/inventory/stock?product_id=${productId}&warehouse_id=${warehouseId}`,
    { token }
  );
  check(
    stockAfterOversell.body?.items?.[0]?.quantity === 1,
    "stock unchanged after rejected sale (rollback)",
    stockAfterOversell.body
  );

  const salesAfter = await request("GET", "/sales?size=100", { token });
  const movementsAfter = await request(
    "GET",
    `/inventory/movements?product_id=${productId}&size=100`,
    { token }
  );
  check(
    salesAfter.body?.total === salesBefore.body?.total,
    "no sale row persisted on rollback",
    { before: salesBefore.body?.total, after: salesAfter.body?.total }
  );
  check(
    movementsAfter.body?.total === movementsBefore.body?.total,
    "no movement persisted on rollback",
    { before: movementsBefore.body?.total, after: movementsAfter.body?.total }
  );

  // --- adjustment ----------------------------------------------------------
  console.log("\nManual adjustment");
  const adjustment = await request("POST", "/inventory/adjustments", {
    token,
    body: { product_id: productId, warehouse_id: warehouseId, quantity: 9 },
  });
  check(
    adjustment.status === 201 && adjustment.body?.new_quantity === 10,
    "adjustment +9 -> new_quantity 10",
    adjustment
  );
  const negativeAdjustment = await request("POST", "/inventory/adjustments", {
    token,
    body: { product_id: productId, warehouse_id: warehouseId, quantity: -999 },
  });
  check(
    negativeAdjustment.status === 400,
    "adjustment below zero = 400 (rollback)",
    negativeAdjustment
  );

  // --- users / roles (admin-only) ------------------------------------------
  console.log("\nUsers & roles (admin-only)");
  const roles = await request("GET", "/roles", { token });
  check(
    roles.status === 200 &&
      Array.isArray(roles.body) &&
      roles.body.some((r: any) => r.name === "admin"),
    "GET /roles (admin) = 200",
    roles
  );
  const operatorRoleId = roles.body?.find((r: any) => r.name === "operator")?.id;

  const operatorEmail = `smoke-operator-${RUN}@example.com`;
  const operator = await request("POST", "/users", {
    token,
    body: {
      email: operatorEmail,
      full_name: `SMOKE Operator ${RUN}`,
      password: "operator-pass-123",
      role_ids: operatorRoleId ? [operatorRoleId] : [],
    },
  });
  check(
    operator.status === 201 && operator.body?.password_hash === undefined,
    "create operator (admin) = 201, no password_hash",
    operator
  );
  const operatorId = operator.body?.id;

  const operatorLogin = await request("POST", "/auth/login", {
    body: { email: operatorEmail, password: "operator-pass-123" },
  });
  const operatorToken: string | undefined = operatorLogin.body?.access_token;
  check(operatorLogin.status === 200 && !!operatorToken, "operator login = 200");

  if (operatorToken) {
    const forbidden = await request("GET", "/users", { token: operatorToken });
    check(forbidden.status === 403, "operator on /users = 403", forbidden);
    const allowed = await request("GET", "/products?size=1", { token: operatorToken });
    check(allowed.status === 200, "operator on /products = 200", allowed);
  }

  // --- cleanup -------------------------------------------------------------
  console.log("\nCleanup");
  if (operatorId) {
    const del = await request("DELETE", `/users/${operatorId}`, { token });
    check(del.status === 200, "deactivate smoke operator", del);
  }
  if (productId) await request("DELETE", `/products/${productId}`, { token });
  if (categoryId) await request("DELETE", `/categories/${categoryId}`, { token });
  if (unitId) await request("DELETE", `/units/${unitId}`, { token });
  if (warehouseId) await request("DELETE", `/warehouses/${warehouseId}`, { token });
  console.log("  (purchase/sale/movement audit rows are intentionally retained)");

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
