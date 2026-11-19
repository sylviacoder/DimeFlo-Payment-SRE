// k6 load test: sends transfers the way a real payment client does,
// with a timeout and automatic retries. Each logical payment has one clientReference,
// reused on every retry, so duplicates can be counted afterwards.
//
// Run:  k6 run -e BASE_URL=http://localhost:8080 chaos/load/transfers-with-retries.js
// Then: psql ... -f chaos/queries/duplicate-transfers.sql

import http from "k6/http";
import { check } from "k6";
import { Counter } from "k6/metrics";

const BASE_URL = __ENV.BASE_URL || "http://localhost:8080";
const TIMEOUT = __ENV.CLIENT_TIMEOUT || "1s";
const MAX_RETRIES = Number(__ENV.MAX_RETRIES || 2);
const ACCOUNTS = 20;

const retries = new Counter("transfer_retries");
const gaveUp = new Counter("transfer_gave_up");

export const options = {
  scenarios: {
    payments: {
      executor: "constant-arrival-rate",
      rate: Number(__ENV.RATE || 20), // payments per second
      timeUnit: "1s",
      duration: __ENV.DURATION || "2m",
      preAllocatedVUs: 50,
      maxVUs: 200,
    },
  },
  thresholds: {
    // Mirrors the latency SLO: 99% of transfers under 300 ms.
    "http_req_duration{name:create_transfer}": ["p(99)<300"],
  },
};

function account(n) {
  return "DF-" + String(n).padStart(8, "0");
}

export default function () {
  const from = 1 + Math.floor(Math.random() * ACCOUNTS);
  let to = 1 + Math.floor(Math.random() * ACCOUNTS);
  if (to === from) to = (to % ACCOUNTS) + 1;

  const clientReference = `k6-${__VU}-${__ITER}-${Date.now()}`;
  const body = JSON.stringify({
    fromAccount: account(from),
    toAccount: account(to),
    amountPence: 100 + Math.floor(Math.random() * 900),
    clientReference,
  });
  const params = {
    headers: { "Content-Type": "application/json" },
    timeout: TIMEOUT,
    tags: { name: "create_transfer" },
  };

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const res = http.post(`${BASE_URL}/transfers`, body, params);
    // status 0 = timeout or connection error. Retry those and 5xx, like most HTTP clients.
    const retryable = res.status === 0 || res.status >= 500;
    if (!retryable) {
      check(res, { "transfer accepted": (r) => r.status === 201 });
      return;
    }
    if (attempt < MAX_RETRIES) retries.add(1);
  }
  gaveUp.add(1);
}
