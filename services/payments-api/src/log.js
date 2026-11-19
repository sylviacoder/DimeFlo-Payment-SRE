// Structured JSON logs, one line per event, so Datadog can parse them without extra config.
function write(level, msg, fields = {}) {
  const line = { ts: new Date().toISOString(), level, service: "payments-api", msg, ...fields };
  const out = level === "error" ? process.stderr : process.stdout;
  out.write(JSON.stringify(line) + "\n");
}

module.exports = {
  info: (msg, fields) => write("info", msg, fields),
  warn: (msg, fields) => write("warn", msg, fields),
  error: (msg, fields) => write("error", msg, fields),
};
