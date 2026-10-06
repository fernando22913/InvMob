/**
 * Build a dynamic UPDATE from only the provided, non-null fields.
 *
 * Returns null when there is nothing to update; callers then return the current
 * row unchanged.
 */
export function buildUpdate(
  table: string,
  id: number,
  fields: Record<string, unknown>,
  allowed: string[],
  touchUpdatedAt = false
): { text: string; params: unknown[] } | null {
  const sets: string[] = [];
  const params: unknown[] = [];

  for (const key of allowed) {
    const value = fields[key];
    if (value === undefined || value === null) continue;
    params.push(value);
    sets.push(`${key} = $${params.length}`);
  }

  if (sets.length === 0) return null;

  if (touchUpdatedAt) sets.push("updated_at = now()");

  params.push(id);
  return {
    text: `UPDATE ${table} SET ${sets.join(", ")} WHERE id = $${
      params.length
    } RETURNING *`,
    params,
  };
}
