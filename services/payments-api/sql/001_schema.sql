-- DimeFlo core schema: accounts, transfers and a double-entry ledger.

CREATE TABLE IF NOT EXISTS accounts (
  id             BIGSERIAL PRIMARY KEY,
  account_number TEXT        NOT NULL UNIQUE,
  holder_name    TEXT        NOT NULL,
  currency       CHAR(3)     NOT NULL DEFAULT 'GBP',
  balance_pence  BIGINT      NOT NULL CHECK (balance_pence >= 0),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS transfers (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Reference the client sends with each payment. Stored but NOT unique yet:
  -- that gap is what lets a retried request create a duplicate transfer (SRE-104).
  -- SRE-105 turns this into an enforced idempotency key.
  client_reference TEXT,
  from_account_id  BIGINT      NOT NULL REFERENCES accounts(id),
  to_account_id    BIGINT      NOT NULL REFERENCES accounts(id),
  amount_pence     BIGINT      NOT NULL CHECK (amount_pence > 0),
  currency         CHAR(3)     NOT NULL,
  status           TEXT        NOT NULL DEFAULT 'completed',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (from_account_id <> to_account_id)
);

CREATE INDEX IF NOT EXISTS transfers_client_reference_idx ON transfers (client_reference);
CREATE INDEX IF NOT EXISTS transfers_created_at_idx ON transfers (created_at);

-- Every transfer writes exactly two entries: a debit and a matching credit.
-- The sum of all entries for a transfer must be zero; the reconciler checks this.
CREATE TABLE IF NOT EXISTS ledger_entries (
  id           BIGSERIAL   PRIMARY KEY,
  transfer_id  UUID        NOT NULL REFERENCES transfers(id),
  account_id   BIGINT      NOT NULL REFERENCES accounts(id),
  amount_pence BIGINT      NOT NULL CHECK (amount_pence <> 0), -- negative = debit
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ledger_entries_account_idx ON ledger_entries (account_id);
CREATE INDEX IF NOT EXISTS ledger_entries_transfer_idx ON ledger_entries (transfer_id);
