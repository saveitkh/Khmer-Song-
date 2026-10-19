import test from "node:test";
import assert from "node:assert/strict";
import { getUser, creditBalance, deductCredits, refundCredits, resetStore } from "../store.js";

const TG = { id: 42, first_name: "Test" };

test("fresh user receives the one-time starting-credit grant", () => {
  resetStore();
  const u = getUser(TG);
  assert.equal(creditBalance(u), 1200);
  // Reading the same user again must not re-grant.
  assert.equal(creditBalance(getUser(TG)), 1200);
});

test("deductCredits lowers the derived balance", () => {
  resetStore();
  const u = getUser(TG);
  deductCredits(u, 150, "job:song");
  assert.equal(creditBalance(u), 1050);
});

test("deductCredits beyond balance throws and leaves the balance intact", () => {
  resetStore();
  const u = getUser(TG);
  deductCredits(u, 1200, "job:song"); // drain to zero
  assert.equal(creditBalance(u), 0);
  assert.throws(() => deductCredits(u, 1, "job:song"), (e) => e.code === "insufficient_credits");
  assert.equal(creditBalance(u), 0, "failed deduction must not change the balance");
});

test("refundCredits restores a failed job's cost", () => {
  resetStore();
  const u = getUser(TG);
  deductCredits(u, 150, "job:song", "job_x");
  assert.equal(creditBalance(u), 1050);
  refundCredits(u, 150, "refund:song", "job_x");
  assert.equal(creditBalance(u), 1200);
});

test("balance is purely the sum of ledger deltas (never stored)", () => {
  resetStore();
  const u = getUser(TG);
  deductCredits(u, 10, "a");
  deductCredits(u, 20, "b");
  refundCredits(u, 5, "c");
  const expected = u.ledger.reduce((s, e) => s + e.delta, 0);
  assert.equal(creditBalance(u), expected);
});
