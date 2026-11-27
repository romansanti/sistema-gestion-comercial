import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

const databaseUrl =
  process.env.DATABASE_URL ||
  process.env.TURSO_DATABASE_URL ||
  "file:local.db";
const isLocalDatabase = databaseUrl.startsWith("file:");
const authToken =
  process.env.DATABASE_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN;

const client = createClient({
  url: databaseUrl,
  ...(!isLocalDatabase && authToken ? { authToken } : {}),
});

export const db = drizzle(client, { schema });
