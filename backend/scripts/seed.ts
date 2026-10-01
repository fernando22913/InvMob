import { PoolClient } from "pg";
import { config } from "../src/config";
import { closePool, withTransaction } from "../src/db";
import { hashPassword } from "../src/utils/security";

const ROLES: Record<string, string> = {
  admin: "Administrator with full access",
  operator: "Operator with limited access",
};

/** Idempotent per role name: creates only the roles that are missing. */
async function ensureRoles(client: PoolClient): Promise<Record<string, number>> {
  const existing = await client.query<{ id: number; name: string }>(
    "SELECT id, name FROM roles"
  );
  const roles: Record<string, number> = {};
  for (const row of existing.rows) roles[row.name] = row.id;

  const created: string[] = [];
  for (const [name, description] of Object.entries(ROLES)) {
    if (roles[name] !== undefined) continue;
    const result = await client.query<{ id: number }>(
      `INSERT INTO roles (name, description, created_at)
       VALUES ($1, $2, now())
       RETURNING id`,
      [name, description]
    );
    roles[name] = result.rows[0].id;
    created.push(name);
  }

  if (created.length > 0) {
    console.log(`Roles created: ${created.join(", ")}`);
  } else {
    console.log("Roles already exist, skipping...");
  }
  return roles;
}

/** Create the first admin, or heal an existing user that lost its role. */
async function ensureAdmin(
  client: PoolClient,
  adminRoleId: number
): Promise<void> {
  const result = await client.query<{ id: number }>(
    "SELECT id FROM users WHERE email = $1",
    [config.FIRST_ADMIN_EMAIL]
  );

  let userId: number;
  if (result.rowCount === 0) {
    const inserted = await client.query<{ id: number }>(
      `INSERT INTO users
         (email, password_hash, full_name, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, true, now(), now())
       RETURNING id`,
      [
        config.FIRST_ADMIN_EMAIL,
        hashPassword(config.FIRST_ADMIN_PASSWORD),
        config.FIRST_ADMIN_NAME,
      ]
    );
    userId = inserted.rows[0].id;
    console.log(`Admin user created: ${config.FIRST_ADMIN_EMAIL}`);
  } else {
    userId = result.rows[0].id;
  }

  const link = await client.query(
    "SELECT 1 FROM user_roles WHERE user_id = $1 AND role_id = $2",
    [userId, adminRoleId]
  );
  if (link.rowCount === 0) {
    await client.query(
      "INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)",
      [userId, adminRoleId]
    );
    console.log(`Admin role attached: ${config.FIRST_ADMIN_EMAIL}`);
  } else {
    console.log("Admin user already exists, skipping...");
  }
}

async function seed(): Promise<void> {
  await withTransaction(async (client) => {
    const roles = await ensureRoles(client);

    if (!config.FIRST_ADMIN_EMAIL || !config.FIRST_ADMIN_PASSWORD) {
      console.log(
        "Skipping admin creation: set FIRST_ADMIN_EMAIL and " +
          "FIRST_ADMIN_PASSWORD in backend/.env to provision the first admin."
      );
      return;
    }

    await ensureAdmin(client, roles.admin);
  });

  console.log("Seed completed successfully!");
}

seed()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => {
    void closePool();
  });
