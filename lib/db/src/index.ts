import { drizzle } from "drizzle-orm/node-postgres";
  import pg from "pg";
  import * as schema from "./schema";

  const { Pool } = pg;

  let db: ReturnType<typeof drizzle>;
  let pool: pg.Pool | null = null;

  if (process.env.DATABASE_URL) {
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
    // Suppress unhandled 'error' events from background pool connection failures
    // (e.g. when the DB host is unreachable at cold start in serverless envs)
    pool.on("error", (_err) => { /* ignore background pool errors */ });
    db = drizzle(pool, { schema });
  } else {
    db = null as unknown as ReturnType<typeof drizzle>;
  }

  export { pool, db };
  export * from "./schema";
  