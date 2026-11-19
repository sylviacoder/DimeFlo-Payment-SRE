-- Dev/test data only. 20 accounts with GBP 10,000.00 each.
INSERT INTO accounts (account_number, holder_name, balance_pence)
SELECT 'DF-' || lpad(n::text, 8, '0'), 'Test Customer ' || n, 1000000
FROM generate_series(1, 20) AS n
ON CONFLICT (account_number) DO NOTHING;
