const { pool } = require("./db");

class TransferError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// Moves money between two accounts in one database transaction.
//
// KNOWN GAP (deliberate, see SRE-104): clientReference is recorded but not enforced.
// If the client retries after a timeout, the same payment is applied twice.
// SRE-105 fixes this with an idempotency key.
async function createTransfer({ fromAccount, toAccount, amountPence, currency, clientReference }) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Lock both accounts in a fixed order (by account number) so two opposite
    // transfers (A->B and B->A) can't deadlock waiting on each other.
    const { rows } = await client.query(
      `SELECT id, account_number, balance_pence, currency
         FROM accounts
        WHERE account_number = ANY($1::text[])
        ORDER BY account_number
          FOR UPDATE`,
      [[fromAccount, toAccount]]
    );

    const from = rows.find((r) => r.account_number === fromAccount);
    const to = rows.find((r) => r.account_number === toAccount);
    if (!from) throw new TransferError(404, "fromAccount not found");
    if (!to) throw new TransferError(404, "toAccount not found");
    if (from.currency !== currency || to.currency !== currency) {
      throw new TransferError(422, "currency mismatch");
    }
    if (BigInt(from.balance_pence) < BigInt(amountPence)) {
      throw new TransferError(422, "insufficient funds");
    }

    const { rows: [transfer] } = await client.query(
      `INSERT INTO transfers (client_reference, from_account_id, to_account_id, amount_pence, currency)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, created_at`,
      [clientReference, from.id, to.id, amountPence, currency]
    );

    await client.query("UPDATE accounts SET balance_pence = balance_pence - $1 WHERE id = $2", [amountPence, from.id]);
    await client.query("UPDATE accounts SET balance_pence = balance_pence + $1 WHERE id = $2", [amountPence, to.id]);
    await client.query(
      `INSERT INTO ledger_entries (transfer_id, account_id, amount_pence)
       VALUES ($1, $2, $3), ($1, $4, $5)`,
      [transfer.id, from.id, -amountPence, to.id, amountPence]
    );

    await client.query("COMMIT");

    return {
      id: transfer.id,
      fromAccount,
      toAccount,
      amountPence,
      currency,
      clientReference,
      status: "completed",
      createdAt: transfer.created_at,
    };
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

async function getTransfer(id) {
  const { rows } = await pool.query(
    `SELECT t.id, fa.account_number AS from_account, ta.account_number AS to_account,
            t.amount_pence, t.currency, t.client_reference, t.status, t.created_at
       FROM transfers t
       JOIN accounts fa ON fa.id = t.from_account_id
       JOIN accounts ta ON ta.id = t.to_account_id
      WHERE t.id = $1`,
    [id]
  );
  const t = rows[0];
  if (!t) return null;
  return { ...t, amount_pence: Number(t.amount_pence) };
}

async function getAccount(accountNumber) {
  const { rows } = await pool.query(
    "SELECT account_number, holder_name, currency, balance_pence FROM accounts WHERE account_number = $1",
    [accountNumber]
  );
  const a = rows[0];
  if (!a) return null;
  // BIGINT comes back from pg as a string; balances fit safely in a JS number.
  return { ...a, balance_pence: Number(a.balance_pence) };
}

module.exports = { createTransfer, getTransfer, getAccount, TransferError };
