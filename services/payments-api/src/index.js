const config = require("./config");
const log = require("./log");
const { pool } = require("./db");
const { buildPublicApp, buildAdminApp } = require("./app");

let shuttingDown = false;

const publicServer = buildPublicApp({ isShuttingDown: () => shuttingDown }).listen(config.port, () => {
  log.info("payments-api listening", { port: config.port, chaos_enabled: config.chaosEnabled });
});

const adminServer = buildAdminApp().listen(config.adminPort, () => {
  log.info("admin listening", { port: config.adminPort });
});

// Graceful shutdown: on SIGTERM, fail readiness so Kubernetes stops sending traffic,
// let in-flight transfers finish, then close the database pool.
async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  log.info("shutting down", { signal });

  const force = setTimeout(() => {
    log.error("forced exit after grace period");
    process.exit(1);
  }, config.shutdownGraceMs);
  force.unref();

  adminServer.close();
  publicServer.close(async () => {
    await pool.end();
    log.info("shutdown complete");
    process.exit(0);
  });
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
