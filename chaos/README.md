# chaos

- `experiments/` failure injection (database failover, pod kill)
- `load/transfers-with-retries.js` k6 load test that retries like a real payment client
- `queries/duplicate-transfers.sql` correctness checks to run after every test

Results go in the matching incident ticket, not in git.
