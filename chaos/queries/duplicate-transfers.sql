-- Correctness checks to run after a load or chaos test.

-- 1. Duplicate transfers: the same client payment applied more than once.
--    Must be zero. Anything else breaks the correctness SLO.
SELECT count(*)                       AS payments_duplicated,
       coalesce(sum(copies - 1), 0)   AS extra_transfers,
       coalesce(sum(extra_pence), 0)  AS extra_pence_moved
FROM (
  SELECT client_reference,
         count(*)                                   AS copies,
         sum(amount_pence) - min(amount_pence)      AS extra_pence
  FROM transfers
  WHERE client_reference IS NOT NULL
  GROUP BY client_reference
  HAVING count(*) > 1
) d;

-- 2. Ledger balance: every transfer's entries must sum to zero.
SELECT count(*) AS unbalanced_transfers
FROM (
  SELECT transfer_id FROM ledger_entries GROUP BY transfer_id HAVING sum(amount_pence) <> 0
) u;

-- 3. Money conservation: total balances never change, money only moves.
--    Compare with 20 accounts x 1,000,000 pence = 20,000,000 for seeded dev data.
SELECT sum(balance_pence) AS total_balance_pence FROM accounts;
