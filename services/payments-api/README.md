# payments-api

Moves money between DimeFlo accounts. Every transfer is one database transaction that updates both balances and writes a double-entry ledger (a debit and a matching credit).

> **Known gap (deliberate):** `POST /transfers` records the client's `clientReference` but does not enforce it. A client that retries after a timeout applies the same payment twice. This is the incident in SRE-104; SRE-105 fixes it with an idempotency key.

## API

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/transfers` | Create a transfer |
| `GET` | `/transfers/:id` | Look up a transfer |
| `GET` | `/accounts/:accountNumber` | Account balance |
| `GET` | `/healthz` | Liveness (process is up, no DB check) |
| `GET` | `/readyz` | Readiness (DB reachable, not shutting down) |

```bash
curl -X POST localhost:8080/transfers -H 'content-type: application/json' \
  -d '{"fromAccount":"DF-00000001","toAccount":"DF-00000002","amountPence":2500,"clientReference":"pay-001"}'
```

Amounts are whole pence (`2500` = GBP 25.00). Limit: GBP 5,000 per transfer.

## Design choices

- **No deadlocks:** both accounts are locked in a fixed order, so A→B and B→A at the same moment can't block each other. Tested with 400 opposite concurrent transfers.
- **Liveness never checks the database**, so a DB outage takes pods out of rotation without restarting them all.
- **Graceful shutdown:** on SIGTERM the pod fails readiness, finishes in-flight transfers, then exits.
- **Chaos controls live on a separate admin port (9090)** that the Kubernetes Service never exposes.

## Run locally

From the repo root:

```bash
docker compose up --build
curl localhost:8080/readyz
```

Tests: `npm test` in this folder.

## Reproduce the duplicate-transfer incident

```bash
# 1. Slow the response down after the money has moved (client will time out at 1s)
curl -X POST localhost:9090/admin/chaos -H 'content-type: application/json' -d '{"postCommitDelayMs":1500}'

# 2. Send payments with retries
k6 run -e BASE_URL=http://localhost:8080 -e DURATION=30s chaos/load/transfers-with-retries.js

# 3. Count the damage
docker compose exec -T postgres psql -U dimeflo -d dimeflo < chaos/queries/duplicate-transfers.sql

# 4. Reset
curl -X POST localhost:9090/admin/chaos/reset
```

First local run: 100 payments, each applied 3 times (original plus 2 retries): **200 extra transfers**. The ledger stayed balanced and no money was created. It moved more than once.

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` / `ADMIN_PORT` | 8080 / 9090 | Public and admin ports |
| `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, `PGPASSWORD` | | Database connection |
| `PGSSLMODE` | | `require` in AWS |
| `PG_POOL_MAX` | 10 | Connection pool size |
| `PG_STATEMENT_TIMEOUT_MS` | 5000 | Kill slow queries |
| `CHAOS_ENABLED` | false | Allow fault injection |
| `MAX_TRANSFER_PENCE` | 500000 | Per-transfer limit |
| `SEED_DEV_DATA` | false | Migration also loads 20 test accounts |
