import { describe, it, expect, vi, afterEach } from "vitest";
import crypto from "crypto";
import {
  generateSignature, generateITNSignature, generateITNSignatureFromRaw, generateCheckoutSignature,
  CHECKOUT_SIGNATURE_FIELD_ORDER, generateOrderNumber, generateTransactionId,
  preparePayFastData, preparePayFastDataCREDIT, preparePayFastDataInvoice,
  validateITN, getOrderStatusDisplay, getPaymentStatusDisplay, formatOrderResponse,
} from "src/utils/payfast.utils";
import { PAYFAST_CONFIG } from "src/config/payfast.config";

const md5 = (s: string) => crypto.createHash("md5").update(s).digest("hex");

describe("generateSignature", () => {
  it("md5s url-encoded key=value pairs ('+' for spaces) in the supplied order", () => {
    const sig = generateSignature({ b: "hello world", a: "x&y" }, ["a", "b"], false);
    expect(sig).toBe(md5("a=x%26y&b=hello+world"));
  });
  it("checkout mode drops empty / null / undefined values and the signature field", () => {
    const sig = generateSignature({ a: "1", b: "", c: null, d: undefined, signature: "zzz" }, ["a", "b", "c", "d"], false);
    expect(sig).toBe(md5("a=1"));
  });
  it("ITN mode keeps empty values and as-received order", () => {
    const sig = generateSignature({ z: "1", a: "", signature: "zzz" }, undefined, true);
    expect(sig).toBe(md5("z=1&a="));
  });
  it("trims values", () => expect(generateSignature({ a: "  1  " }, ["a"])).toBe(md5("a=1")));
  it("appends keys not in fieldOrder after the ordered ones", () => {
    expect(generateSignature({ extra: "e", a: "1" }, ["a"])).toBe(md5("a=1&extra=e"));
  });
  it("is deterministic", () => expect(generateSignature({ a: "1" })).toBe(generateSignature({ a: "1" })));
});

describe("generateITNSignature / FromRaw / Checkout", () => {
  it("ITN signature from an object equals the one from the equivalent raw body", () => {
    const raw = "m_payment_id=PF-1&payment_status=COMPLETE&item_name=My+Item&signature=abc";
    const obj = { m_payment_id: "PF-1", payment_status: "COMPLETE", item_name: "My Item", signature: "abc" };
    expect(generateITNSignatureFromRaw(raw)).toBe(generateITNSignature(obj));
    expect(generateITNSignatureFromRaw(raw)).toBe(md5("m_payment_id=PF-1&payment_status=COMPLETE&item_name=My+Item"));
  });
  it("checkout signature follows CHECKOUT_SIGNATURE_FIELD_ORDER regardless of key order", () => {
    const a = generateCheckoutSignature({ amount: "10.00", merchant_id: "1", merchant_key: "k" });
    const b = generateCheckoutSignature({ merchant_key: "k", merchant_id: "1", amount: "10.00" });
    expect(a).toBe(b);
    expect(a).toBe(md5("merchant_id=1&merchant_key=k&amount=10.00"));
  });
  it("field order list starts with merchant_id and has no duplicates", () => {
    expect(CHECKOUT_SIGNATURE_FIELD_ORDER[0]).toBe("merchant_id");
    expect(new Set(CHECKOUT_SIGNATURE_FIELD_ORDER).size).toBe(CHECKOUT_SIGNATURE_FIELD_ORDER.length);
  });
});

describe("id generators", () => {
  it("order number format", () => expect(generateOrderNumber()).toMatch(/^ORD-[a-z0-9]+-[A-Z0-9]{1,4}$/));
  it("transaction id format", () => expect(generateTransactionId()).toMatch(/^PF-[a-z0-9]+-[A-Z0-9]{1,6}$/));
  it("generates different values", () => {
    const set = new Set(Array.from({ length: 50 }, generateTransactionId));
    expect(set.size).toBeGreaterThan(40);
  });
});

describe.each([
  ["preparePayFastData", preparePayFastData, "digital-toolkit", "Digital Toolkit Order ORD-1"],
  ["preparePayFastDataCREDIT", preparePayFastDataCREDIT, "credit-plan", "Credit plan ORD-1"],
  ["preparePayFastDataInvoice", preparePayFastDataInvoice, "credit-plan", "Invoice Number - ORD-1"],
] as const)("%s", (_n, fn, custom3, itemName) => {
  const params = { amount: 99.5, email: "a@b.com", firstName: "A", lastName: "B", orderNumber: "ORD-1", transactionId: "PF-1", items: [{ title: "One" }, { title: "Two" }] };
  it("builds the PayFast payload", () => {
    const d = fn(params);
    expect(d.amount).toBe("99.50");
    expect(d.email_address).toBe("a@b.com");
    expect(d.confirmation_address).toBe("a@b.com");
    expect(d.m_payment_id).toBe("PF-1");
    expect(d.custom_str1).toBe("ORD-1");
    expect(d.custom_str2).toBe("PF-1");
    expect(d.custom_str3).toBe(custom3);
    expect(d.item_name).toBe(itemName);
    expect(d.item_description).toBe("One, Two");
    expect(d.return_url).toContain("orderId=ORD-1");
  });
  it("defaults the description to 'Digital Products'", () => expect(fn({ ...params, items: undefined }).item_description).toBe("Digital Products"));
  it("adds a valid signature that matches the rest of the payload", () => {
    const d = fn(params);
    const { signature, ...rest } = d;
    expect(signature).toBe(generateCheckoutSignature(rest));
  });
});

describe("validateITN", () => {
  afterEach(() => vi.unstubAllGlobals());
  it("true when PayFast replies VALID, posting to the validate url", async () => {
    const f = vi.fn().mockResolvedValue({ text: async () => "VALID" });
    vi.stubGlobal("fetch", f);
    expect(await validateITN({ a: "1", b: "", c: null })).toBe(true);
    expect(f).toHaveBeenCalledWith(PAYFAST_CONFIG.validateUrl, expect.objectContaining({ method: "POST" }));
    const body = f.mock.calls[0][1].body as URLSearchParams;
    expect(body.get("a")).toBe("1");
    expect(body.has("b")).toBe(false);
  });
  it("false when PayFast replies INVALID", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ text: async () => "INVALID" }));
    expect(await validateITN({ a: "1" })).toBe(false);
  });
  it("false when the request throws", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));
    expect(await validateITN({ a: "1" })).toBe(false);
  });
});

describe("status helpers", () => {
  it.each([["pending", "Pending Payment"], ["paid", "Paid"], ["failed", "Payment Failed"], ["cancelled", "Cancelled"], ["completed", "Completed"], ["weird", "weird"]])("order %s -> %s", (i, o) => expect(getOrderStatusDisplay(i)).toBe(o));
  it.each([["pending", "Pending"], ["partial", "Partial Payment"], ["completed", "Paid in Full"], ["failed", "Payment Failed"], ["refunded", "Refunded"], ["x", "x"]])("payment %s -> %s", (i, o) => expect(getPaymentStatusDisplay(i)).toBe(o));
});

describe("formatOrderResponse", () => {
  const order = { _id: "1", orderNumber: "ORD", items: [], totalAmount: 10, taxAmount: 1, status: "paid", billingInfo: {}, downloadLinks: ["l1"], createdAt: "c", updatedAt: "u" };
  it("exposes download links only for paid orders", () => {
    expect(formatOrderResponse(order).downloadLinks).toEqual(["l1"]);
    expect(formatOrderResponse({ ...order, status: "pending" }).downloadLinks).toEqual([]);
  });
  it("maps fields and adds statusDisplay", () => {
    const r = formatOrderResponse(order);
    expect(r.id).toBe("1");
    expect(r.statusDisplay).toBe("Paid");
  });
});
