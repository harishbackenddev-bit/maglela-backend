import { describe, it, expect } from "vitest";
import { httpStatusCode, creditCounts, yearlyCreditCounts, priceIdsMap } from "src/lib/constant";

describe("httpStatusCode", () => {
  it.each([
    ["OK", 200], ["CREATED", 201], ["NO_CONTENT", 204], ["BAD_REQUEST", 400], ["UNAUTHORIZED", 401],
    ["PAYMENT_REQUIRED", 402], ["FORBIDDEN", 403], ["NOT_FOUND", 404], ["GONE", 410],
    ["INTERNAL_SERVER_ERROR", 500], ["SERVICE_UNAVAILABLE", 503],
  ])("%s = %i", (k, v) => expect((httpStatusCode as any)[k]).toBe(v));
});

describe("plan credits", () => {
  it("monthly credit counts", () => expect(creditCounts).toEqual({ free: 24, intro: 90, pro: 180 }));
  it("yearly credits are 12x the monthly credits", () => {
    expect(yearlyCreditCounts.intro).toBe(creditCounts.intro * 12);
    expect(yearlyCreditCounts.pro).toBe(creditCounts.pro * 12);
  });
  it("price id maps expose the same plan keys", () => expect(Object.keys(priceIdsMap)).toEqual(["free", "intro", "pro"]));
});
