import pg from "pg";

/**
 * Read-oriented Neon client for sandbox research scripts.
 * Prefer SELECT-only queries. Connection string comes from sandbox env.
 */
export function getDatabaseUrl(): string {
  const url =
    process.env.NEON_DATABASE_URL?.trim() ||
    process.env.DATABASE_URL?.trim() ||
    "";
  if (!url) {
    throw new Error(
      "NEON_DATABASE_URL / DATABASE_URL is not set in the sandbox environment.",
    );
  }
  return url;
}

export function createPool(): pg.Pool {
  return new pg.Pool({
    connectionString: getDatabaseUrl(),
    // Research sessions are short; keep the pool small.
    max: 2,
    ssl: { rejectUnauthorized: true },
  });
}

export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(
  sql: string,
  params: unknown[] = [],
): Promise<pg.QueryResult<T>> {
  const pool = createPool();
  try {
    return await pool.query<T>(sql, params);
  } finally {
    await pool.end();
  }
}
