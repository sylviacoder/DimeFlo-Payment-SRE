const { Pool } = require("pg");
const config = require("./config");
const log = require("./log");

const pool = new Pool(config.db);

// An idle client losing its connection (e.g. during an RDS failover) emits an error on the pool.
// Without this handler the process crashes.
pool.on("error", (err) => {
  log.error("idle database client error", { error: err.message });
});

async function ping() {
  await pool.query("SELECT 1");
}

module.exports = { pool, ping };
