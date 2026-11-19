const crypto = require("node:crypto");
const express = require("express");
const config = require("./config");
const log = require("./log");
const chaos = require("./chaos");
const { ping } = require("./db");
const { validateTransfer } = require("./validate");
const { createTransfer, getTransfer, getAccount } = require("./transfers");

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function requestLogger(req, res, next) {
  const started = process.hrtime.bigint();
  req.id = req.get("x-request-id") || crypto.randomUUID();
  res.set("x-request-id", req.id);
  res.on("finish", () => {
    if (req.path === "/healthz" || req.path === "/readyz") return;
    log.info("request", {
      request_id: req.id,
      method: req.method,
      route: req.route ? req.baseUrl + req.route.path : req.path,
      status: res.statusCode,
      duration_ms: Number(process.hrtime.bigint() - started) / 1e6,
    });
  });
  next();
}

function buildPublicApp({ isShuttingDown }) {
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "16kb" }));
  app.use(requestLogger);

  // Liveness: the process is up. Never checks the database, so a DB outage
  // doesn't make Kubernetes restart every pod.
  app.get("/healthz", (req, res) => res.json({ status: "ok" }));

  // Readiness: can this pod serve traffic right now?
  app.get("/readyz", async (req, res) => {
    if (isShuttingDown()) return res.status(503).json({ status: "shutting down" });
    try {
      await ping();
      res.json({ status: "ready" });
    } catch (err) {
      log.warn("readiness check failed", { error: err.message });
      res.status(503).json({ status: "not ready", reason: "database unreachable" });
    }
  });

  app.post("/transfers", async (req, res, next) => {
    try {
      const input = validateTransfer(req.body, config);

      if (config.chaosEnabled && chaos.state.errorRate > 0 && Math.random() < chaos.state.errorRate) {
        return res.status(503).json({ error: "service unavailable (chaos)" });
      }

      const transfer = await createTransfer(input);

      // Chaos: the money has moved and the DB connection is released, but the
      // response is slow to reach the client, like a network blip or failover.
      if (config.chaosEnabled && chaos.state.postCommitDelayMs > 0) {
        await chaos.sleep(chaos.state.postCommitDelayMs);
      }

      log.info("transfer completed", {
        request_id: req.id,
        transfer_id: transfer.id,
        client_reference: transfer.clientReference,
        amount_pence: transfer.amountPence,
      });
      res.status(201).json(transfer);
    } catch (err) {
      next(err);
    }
  });

  app.get("/transfers/:id", async (req, res, next) => {
    try {
      if (!UUID.test(req.params.id)) return res.status(400).json({ error: "invalid transfer id" });
      const transfer = await getTransfer(req.params.id);
      if (!transfer) return res.status(404).json({ error: "transfer not found" });
      res.json(transfer);
    } catch (err) {
      next(err);
    }
  });

  app.get("/accounts/:accountNumber", async (req, res, next) => {
    try {
      const account = await getAccount(req.params.accountNumber);
      if (!account) return res.status(404).json({ error: "account not found" });
      res.json(account);
    } catch (err) {
      next(err);
    }
  });

  app.use((req, res) => res.status(404).json({ error: "not found" }));

  // Errors with a status are expected (bad input, insufficient funds).
  // Anything else is a server fault: log it and return 500 without internals.
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err.type === "entity.parse.failed") return res.status(400).json({ error: "invalid JSON" });
    if (err.status && err.status < 500) return res.status(err.status).json({ error: err.message });
    log.error("unhandled error", { request_id: req.id, error: err.message, code: err.code });
    res.status(500).json({ error: "internal server error", request_id: req.id });
  });

  return app;
}

function buildAdminApp() {
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "4kb" }));

  app.get("/admin/chaos", (req, res) => res.json({ enabled: config.chaosEnabled, ...chaos.snapshot() }));

  app.post("/admin/chaos", (req, res) => {
    if (!config.chaosEnabled) return res.status(403).json({ error: "chaos disabled (CHAOS_ENABLED=false)" });
    try {
      const state = chaos.set(req.body || {});
      log.warn("chaos settings changed", state);
      res.json(state);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post("/admin/chaos/reset", (req, res) => {
    const state = chaos.reset();
    log.warn("chaos settings reset", state);
    res.json(state);
  });

  return app;
}

module.exports = { buildPublicApp, buildAdminApp };
