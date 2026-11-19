const ACCOUNT_NUMBER = /^DF-\d{8}$/;
const CLIENT_REFERENCE = /^[A-Za-z0-9._:-]{1,64}$/;

class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.status = 400;
  }
}

function validateTransfer(body, { maxTransferPence }) {
  if (!body || typeof body !== "object") throw new ValidationError("body must be a JSON object");

  const { fromAccount, toAccount, amountPence, currency = "GBP", clientReference } = body;

  if (typeof fromAccount !== "string" || !ACCOUNT_NUMBER.test(fromAccount)) {
    throw new ValidationError("fromAccount must look like DF-00000001");
  }
  if (typeof toAccount !== "string" || !ACCOUNT_NUMBER.test(toAccount)) {
    throw new ValidationError("toAccount must look like DF-00000001");
  }
  if (fromAccount === toAccount) throw new ValidationError("cannot transfer to the same account");

  if (!Number.isSafeInteger(amountPence) || amountPence <= 0) {
    throw new ValidationError("amountPence must be a positive whole number");
  }
  if (amountPence > maxTransferPence) {
    throw new ValidationError(`amountPence exceeds the limit of ${maxTransferPence}`);
  }
  if (currency !== "GBP") throw new ValidationError("only GBP is supported");

  if (clientReference !== undefined && (typeof clientReference !== "string" || !CLIENT_REFERENCE.test(clientReference))) {
    throw new ValidationError("clientReference must be 1-64 characters: letters, digits, . _ : -");
  }

  return { fromAccount, toAccount, amountPence, currency, clientReference: clientReference ?? null };
}

module.exports = { validateTransfer, ValidationError };
