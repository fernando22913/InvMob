import { Pool, PoolClient, QueryResult, QueryResultRow } from "pg";
import { connectionString } from "./config";

export const pool = new Pool({
  connectionString: connectionString(),
  // pg returns NUMERIC as string by default (serialization parity with FastAPI).
  // Timestamps become JS Date -> ISO strings on JSON.stringify.
});

export function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  return pool.query<T>(text, params);
}

/**
 * Run `fn` inside a single transaction. Commits on success, rolls back on any
 * thrown error. Mirrors the FastAPI session (BEGIN ... COMMIT / ROLLBACK)
 * behaviour used by every stock-changing operation.
 */
export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    try {
      await client.query("ROLLBACK");
    } catch {
      // ignore rollback failures, surface the original error
    }
    throw err;
  } finally {
    client.release();
  }
}

export async function closePool(): Promise<void> {
  await pool.end();
}
