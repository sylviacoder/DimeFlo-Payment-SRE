// Fault injection for reliability tests. Only active when CHAOS_ENABLED=true and only
// controllable from the admin port, which is never exposed outside the cluster.
const state = {
  // Delay added AFTER the transfer commits and BEFORE the response is sent.
  // Simulates a slow network or a failover that drops the response: the money has moved,
  // but the client times out and retries. This is how duplicates happen in real systems.
  postCommitDelayMs: 0,
  // Fraction of transfer requests that fail with 503 before touching the database.
  errorRate: 0,
};

function snapshot() {
  return { ...state };
}

function set(updates) {
  if (updates.postCommitDelayMs !== undefined) {
    const ms = Number(updates.postCommitDelayMs);
    if (!Number.isInteger(ms) || ms < 0 || ms > 60000) throw new Error("postCommitDelayMs must be 0-60000");
    state.postCommitDelayMs = ms;
  }
  if (updates.errorRate !== undefined) {
    const rate = Number(updates.errorRate);
    if (Number.isNaN(rate) || rate < 0 || rate > 1) throw new Error("errorRate must be between 0 and 1");
    state.errorRate = rate;
  }
  return snapshot();
}

function reset() {
  state.postCommitDelayMs = 0;
  state.errorRate = 0;
  return snapshot();
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

module.exports = { state, snapshot, set, reset, sleep };
