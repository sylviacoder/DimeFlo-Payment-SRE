function int(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  const value = Number.parseInt(raw, 10);
  if (Number.isNaN(value)) throw new Error(`${name} must be an integer, got "${raw}"`);
  return value;
}

module.exports = {
  port: int("PORT", 8080),
  // Admin port serves chaos controls. It is never exposed by the Kubernetes Service or ingress;
  // reach it only with: kubectl port-forward deploy/payments-api 9090:9090
  adminPort: int("ADMIN_PORT", 9090),
  chaosEnabled: process.env.CHAOS_ENABLED === "true",
  maxTransferPence: int("MAX_TRANSFER_PENCE", 500000), // GBP 5,000
  db: {
    host: process.env.PGHOST || "localhost",
    port: int("PGPORT", 5432),
    database: process.env.PGDATABASE || "dimeflo",
    user: process.env.PGUSER || "dimeflo",
    password: process.env.PGPASSWORD,
    ssl: process.env.PGSSLMODE === "require" ? { rejectUnauthorized: false } : undefined,
    max: int("PG_POOL_MAX", 10),
    connectionTimeoutMillis: int("PG_CONNECT_TIMEOUT_MS", 2000),
    statement_timeout: int("PG_STATEMENT_TIMEOUT_MS", 5000),
  },
  shutdownGraceMs: int("SHUTDOWN_GRACE_MS", 10000),
};
