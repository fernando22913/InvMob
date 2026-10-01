import { PoolClient } from "pg";
import { query } from "../db";
import { Paginated, paginate } from "../utils/pagination";
import { buildUpdate } from "../utils/crud";
import { hashPassword } from "../utils/security";
import { RoleCreate, UserCreate, UserUpdate } from "../schemas/user";

export type RoleRow = {
  id: number;
  name: string;
  description: string | null;
  created_at: Date;
};

export type AuthUser = {
  id: number;
  email: string;
  full_name: string;
  is_active: boolean;
  roles: RoleRow[];
};

export type UserWithRoles = AuthUser & {
  created_at: Date;
  updated_at: Date;
};

const USER_COLS = "id, email, full_name, is_active, created_at, updated_at";
const ROLE_COLS = "id, name, description, created_at";

/** Pool-based lookup used by the auth middleware. */
export async function findUserWithRolesById(
  id: number
): Promise<AuthUser | null> {
  const userResult = await query<{
    id: number;
    email: string;
    full_name: string;
    is_active: boolean;
  }>(`SELECT id, email, full_name, is_active FROM users WHERE id = $1`, [id]);
  const user = userResult.rows[0];
  if (!user) return null;

  const rolesResult = await query<RoleRow>(
    `SELECT r.id, r.name, r.description, r.created_at
       FROM roles r
       JOIN user_roles ur ON ur.role_id = r.id
      WHERE ur.user_id = $1
      ORDER BY r.id`,
    [id]
  );

  return { ...user, roles: rolesResult.rows };
}

async function attachRoles(
  client: PoolClient,
  users: UserWithRoles[]
): Promise<UserWithRoles[]> {
  if (users.length === 0) return users;
  const ids = users.map((u) => u.id);
  const result = await client.query<RoleRow & { user_id: number }>(
    `SELECT ur.user_id, r.id, r.name, r.description, r.created_at
       FROM user_roles ur
       JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = ANY($1::int[])
      ORDER BY r.id`,
    [ids]
  );
  const byUser = new Map<number, RoleRow[]>();
  for (const row of result.rows) {
    const list = byUser.get(row.user_id) ?? [];
    list.push({
      id: row.id,
      name: row.name,
      description: row.description,
      created_at: row.created_at,
    });
    byUser.set(row.user_id, list);
  }
  return users.map((u) => ({ ...u, roles: byUser.get(u.id) ?? [] }));
}

export async function listUsers(
  client: PoolClient,
  page: number,
  size: number,
  search?: string
): Promise<Paginated<UserWithRoles>> {
  const params: unknown[] = [];
  let where = "";
  if (search) {
    params.push(`%${search}%`);
    where = "WHERE full_name ILIKE $1 OR email ILIKE $1";
  }
  const result = await paginate<UserWithRoles>(client, {
    selectSql: `SELECT ${USER_COLS} FROM users ${where} ORDER BY id`,
    countSql: `SELECT count(*)::int AS count FROM users ${where}`,
    params,
    page,
    size,
  });
  result.items = await attachRoles(client, result.items);
  return result;
}

export async function getUser(
  client: PoolClient,
  id: number
): Promise<UserWithRoles | null> {
  const result = await client.query<UserWithRoles>(
    `SELECT ${USER_COLS} FROM users WHERE id = $1`,
    [id]
  );
  const user = result.rows[0];
  if (!user) return null;
  const [withRoles] = await attachRoles(client, [{ ...user, roles: [] }]);
  return withRoles;
}

export async function getUserByEmail(
  client: PoolClient,
  email: string
): Promise<{ id: number } | null> {
  const result = await client.query<{ id: number }>(
    "SELECT id FROM users WHERE email = $1",
    [email]
  );
  return result.rows[0] ?? null;
}

export async function createUser(
  client: PoolClient,
  data: UserCreate
): Promise<UserWithRoles> {
  const inserted = await client.query<{ id: number }>(
    `INSERT INTO users
       (email, password_hash, full_name, is_active, created_at, updated_at)
     VALUES ($1, $2, $3, $4, now(), now())
     RETURNING id`,
    [
      data.email,
      hashPassword(data.password),
      data.full_name,
      data.is_active,
    ]
  );
  const userId = inserted.rows[0].id;

  if (data.role_ids.length > 0) {
    await client.query(
      `INSERT INTO user_roles (user_id, role_id)
       SELECT $1, id FROM roles WHERE id = ANY($2::int[])`,
      [userId, data.role_ids]
    );
  }

  return (await getUser(client, userId)) as UserWithRoles;
}

export async function updateUser(
  client: PoolClient,
  id: number,
  fields: UserUpdate
): Promise<UserWithRoles | null> {
  const existing = await getUser(client, id);
  if (!existing) return null;

  const scalar: Record<string, unknown> = {};
  for (const key of ["email", "full_name", "is_active"] as const) {
    const value = fields[key];
    if (value !== undefined && value !== null) scalar[key] = value;
  }
  if (fields.password) scalar.password_hash = hashPassword(fields.password);

  if (Object.keys(scalar).length > 0) {
    const update = buildUpdate(
      "users",
      id,
      scalar,
      ["email", "full_name", "is_active", "password_hash"],
      true
    );
    if (update) await client.query(update.text, update.params);
  }

  if (fields.role_ids !== undefined && fields.role_ids !== null) {
    await client.query("DELETE FROM user_roles WHERE user_id = $1", [id]);
    if (fields.role_ids.length > 0) {
      await client.query(
        `INSERT INTO user_roles (user_id, role_id)
         SELECT $1, id FROM roles WHERE id = ANY($2::int[])`,
        [id, fields.role_ids]
      );
    }
  }

  return getUser(client, id);
}

export async function deleteUser(
  client: PoolClient,
  id: number
): Promise<boolean> {
  const result = await client.query(
    `UPDATE users SET is_active = false, updated_at = now()
      WHERE id = $1 RETURNING id`,
    [id]
  );
  return (result.rowCount ?? 0) > 0;
}

export async function listRoles(client: PoolClient): Promise<RoleRow[]> {
  const result = await client.query<RoleRow>(
    `SELECT ${ROLE_COLS} FROM roles ORDER BY id`
  );
  return result.rows;
}

export async function createRole(
  client: PoolClient,
  data: RoleCreate
): Promise<RoleRow> {
  const result = await client.query<RoleRow>(
    `INSERT INTO roles (name, description, created_at)
     VALUES ($1, $2, now())
     RETURNING ${ROLE_COLS}`,
    [data.name, data.description ?? null]
  );
  return result.rows[0];
}
