import { migrate } from "drizzle-orm/libsql/migrator";
import { db } from "./index";

async function main() {
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.info("Migraciones aplicadas correctamente.");
}

main().catch((error: unknown) => {
  console.error("Error aplicando migraciones:", error);
  process.exitCode = 1;
});
