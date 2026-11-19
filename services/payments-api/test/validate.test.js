const test = require("node:test");
const assert = require("node:assert/strict");
const { validateTransfer } = require("../src/validate");

const limits = { maxTransferPence: 500000 };
const valid = { fromAccount: "DF-00000001", toAccount: "DF-00000002", amountPence: 1250 };

test("accepts a valid transfer and defaults currency to GBP", () => {
  const out = validateTransfer(valid, limits);
  assert.equal(out.currency, "GBP");
  assert.equal(out.clientReference, null);
});

test("rejects non-integer, zero, negative and string amounts", () => {
  for (const amountPence of [12.5, 0, -100, "100", NaN, null]) {
    assert.throws(() => validateTransfer({ ...valid, amountPence }, limits), /positive whole number/);
  }
});

test("rejects amounts over the limit", () => {
  assert.throws(() => validateTransfer({ ...valid, amountPence: 500001 }, limits), /exceeds the limit/);
});

test("rejects transfers to the same account", () => {
  assert.throws(() => validateTransfer({ ...valid, toAccount: valid.fromAccount }, limits), /same account/);
});

test("rejects malformed account numbers", () => {
  assert.throws(() => validateTransfer({ ...valid, fromAccount: "12345" }, limits), /fromAccount/);
});

test("rejects unsupported currency", () => {
  assert.throws(() => validateTransfer({ ...valid, currency: "USD" }, limits), /only GBP/);
});

test("rejects unsafe client references", () => {
  assert.throws(() => validateTransfer({ ...valid, clientReference: "has spaces" }, limits), /clientReference/);
});
