// Applies sql/*.sql files in name order, once each, tracked in schema_migrations.
// Seed files (*_seed_dev.sql) only run when SEED_DEV_DATA=true.
const fs = require("node:fs");
const path = require("node:path");
const { pool } = require("./db");
const log = require("./log");

async function main() {
  const dir = path.join(__dirname, "..", "sql");
  const seed = process.env.SEED_DEV_DATA === "true";
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .filter((f) => seed || !f.includes("_seed_dev"))
    .sort();

  await pool.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    filename TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`);

  for (const file of files) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      // Advisory lock stops two migration jobs running at once.
      await client.query("SELECT pg_advisory_xact_lock(424242)");
      const { rowCount } = await client.query("SELECT 1 FROM schema_migrations WHERE filename = $1", [file]);
      if (rowCount > 0) {
        await client.query("COMMIT");
        continue;
      }
      await client.query(fs.readFileSync(path.join(dir, file), "utf8"));
      await client.query("INSERT INTO schema_migrations (filename) VALUES ($1)", [file]);
      await client.query("COMMIT");
      log.info("migration applied", { file });
    } catch (err) {
      await client.query("ROLLBACK").catch(() => {});
      throw new Error(`migration ${file} failed: ${err.message}`);
    } finally {
      client.release();
    }
  }
  await pool.end();
}

main().catch((err) => {
  log.error("migration failed", { error: err.message });
  process.exit(1);
});
