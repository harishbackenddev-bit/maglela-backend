import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockReq, mockRes } from "../setup/express";

vi.mock("src/utils/mails/orders/orderconfirmation", () => ({
  sendOrderConfirmationEmail: vi.fn().mockResolvedValue({}),
  sendAdminOrderNotification: vi.fn().mockResolvedValue({}),
}));

import { orderModel } from "src/models/orders/order-schema";
import { sendOrderConfirmationEmail, sendAdminOrderNotification } from "src/utils/mails/orders/orderconfirmation";
import { generateCheckoutSignature, generateITNSignature } from "src/utils/payfast.utils";
import { initiatePaymentService, handlePayfastNotificationService } from "src/services/payfast/payfast";

const res = mockRes();
const errOf = async (p: Promise<any>) => { try { await p; } catch (e: any) { return JSON.parse(e.message); } throw new Error("did not throw"); };

const billing = { firstName: "Ann", lastName: "Lee", email: "ann@x.com", city: "CT", postalCode: "8000", country: "ZA" };
const items = [{ productId: "1", title: "Playbook", price: 100, quantity: 2 }];
const payload = (over: any = {}) => ({ userEmail: "ann@x.com", billingInfo: billing, items, ...over });

beforeEach(() => {
  vi.restoreAllMocks();
  vi.mocked(sendOrderConfirmationEmail).mockClear();
  vi.mocked(sendAdminOrderNotification).mockClear();
});

describe("initiatePaymentService", () => {
  const stubSave = () => vi.spyOn(orderModel.prototype, "save").mockImplementation(async function (this: any) { return this; });

  it.each([
    ["userEmail", { userEmail: undefined }], ["billingInfo", { billingInfo: undefined }], ["items", { items: undefined }], ["empty items", { items: [] }],
  ])("400 when %s is missing", async (_n, over) => {
    expect(await errOf(initiatePaymentService(payload(over), mockReq(), res))).toMatchObject({ code: 400 });
  });

  it("creates a pending order with 15% VAT and returns the PayFast form data", async () => {
    stubSave();
    const r: any = await initiatePaymentService(payload(), mockReq(), res);
    expect(r.success).toBe(true);
    expect(r.paymentUrl).toContain("payfast.co.za");
    expect(r.orderNumber).toMatch(/^ORD-/);
    expect(r.transactionId).toMatch(/^PF-/);
    // subtotal 200 + 15% = 230
    expect(r.paymentData.amount).toBe("230.00");
    expect(r.paymentData.custom_str1).toBe(r.orderNumber);
    expect(r.paymentData.m_payment_id).toBe(r.transactionId);
    const { signature, ...rest } = r.paymentData;
    expect(signature).toBe(generateCheckoutSignature(rest));
  });

  it("saves the order as pending/payfast with computed totals", async () => {
    const save = stubSave();
    await initiatePaymentService(payload(), mockReq(), res);
    const doc: any = save.mock.instances[0];
    expect(doc.status).toBe("pending");
    expect(doc.paymentMethod).toBe("payfast");
    expect(doc.taxAmount).toBe(30);
    expect(doc.totalAmount).toBe(230);
    expect(doc.items[0]).toMatchObject({ productId: "1", subtotal: 200 });
  });

  it("guests get the product-PDF mapping, 'Bearer' callers get the toolkit mapping", async () => {
    const save = stubSave();
    await initiatePaymentService(payload(), mockReq(), res);
    expect((save.mock.instances[0] as any).items[0].fileUrl).toMatch(/^\/uploads\/pdfs\//);
    await initiatePaymentService(payload(), mockReq({ headers: { authorization: "Bearer abc" } }), res);
    expect((save.mock.instances[1] as any).items[0].fileUrl).toMatch(/^\/uploads\/toolkits\//);
  });

  it("unknown products fall back to a default file name", async () => {
    const save = stubSave();
    await initiatePaymentService(payload({ items: [{ productId: "999", title: "Custom", price: 1, quantity: 1 }] }), mockReq(), res);
    expect((save.mock.instances[0] as any).items[0]).toMatchObject({ fileUrl: "/uploads/pdfs/999-default.pdf", fileName: "Custom.pdf" });
  });

  it("returns {success:false} (does not throw) when the DB save fails", async () => {
    vi.spyOn(orderModel.prototype, "save").mockRejectedValue(new Error("db down"));
    expect(await initiatePaymentService(payload(), mockReq(), res)).toEqual({ success: false, message: "db down" });
  });

  it.fails("SECURITY: price comes from the server, not the client (price: 0.01 must not be accepted)", async () => {
    const save = stubSave();
    const r: any = await initiatePaymentService(payload({ items: [{ productId: "1", title: "Playbook", price: 0.01, quantity: 1 }] }), mockReq(), res);
    expect(Number(r.paymentData.amount)).toBeGreaterThan(1);
    expect((save.mock.instances[0] as any).items[0].price).not.toBe(0.01);
  });

  it.fails("SECURITY: a bogus 'Bearer x' header must not be treated as an authenticated user", async () => {
    const save = stubSave();
    await initiatePaymentService(payload(), mockReq({ headers: { authorization: "Bearer not-a-real-jwt" } }), res);
    expect((save.mock.instances[0] as any).items[0].fileUrl).toMatch(/^\/uploads\/pdfs\//);
  });
});

describe("handlePayfastNotificationService", () => {
  const order = (over: any = {}) => ({
    _id: "oid", orderNumber: "ORD-1", totalAmount: 230, billingInfo: billing,
    items: [{ productId: "1", title: "Playbook", price: 100, quantity: 2, subtotal: 200, fileUrl: "/uploads/pdfs/a.pdf", fileName: "a.pdf" }], ...over,
  });
  const itn = (over: any = {}) => ({ payment_status: "COMPLETE", m_payment_id: "PF-1", pf_payment_id: "999", amount_gross: "230.00", custom_str1: "ORD-1", ...over });

  it("looks the order up by transactionId OR orderNumber", async () => {
    const find = vi.spyOn(orderModel, "findOne").mockResolvedValue(null as any);
    expect(await handlePayfastNotificationService(itn(), res)).toEqual({ success: false, message: "Order not found." });
    expect(find).toHaveBeenCalledWith({ $or: [{ transactionId: "PF-1" }, { orderNumber: "ORD-1" }] });
  });

  it("COMPLETE: marks the order paid, creates 7-day download links and sends both emails", async () => {
    vi.spyOn(orderModel, "findOne").mockResolvedValue(order() as any);
    const upd = vi.spyOn(orderModel, "findByIdAndUpdate").mockResolvedValue({} as any);
    const r = await handlePayfastNotificationService(itn(), res);
    expect(r).toEqual({ success: true, message: "Payment notification processed successfully." });
    const [id, set, opts] = upd.mock.calls[0] as any;
    expect(id).toBe("oid");
    expect(set).toMatchObject({ status: "paid", "payfast.paymentId": "999", "payfast.transactionId": "PF-1", "payfast.status": "COMPLETE" });
    expect(set.downloadLinks).toHaveLength(1);
    expect(set.downloadLinks[0]).toMatchObject({ productId: "1", link: "/uploads/pdfs/a.pdf", fileName: "a.pdf" });
    const days = (set.downloadLinks[0].expiresAt.getTime() - Date.now()) / 864e5;
    expect(days).toBeGreaterThan(6.99);
    expect(days).toBeLessThanOrEqual(7);
    expect(opts).toEqual({ new: true });
    expect(sendOrderConfirmationEmail).toHaveBeenCalledWith(expect.objectContaining({ to: "ann@x.com", name: "Ann Lee", orderNumber: "ORD-1", totalAmount: "R230.00" }));
    expect(sendAdminOrderNotification).toHaveBeenCalledWith(expect.objectContaining({ orderNumber: "ORD-1", transactionId: "PF-1" }));
  });

  it("COMPLETE still succeeds when the confirmation email fails", async () => {
    vi.spyOn(orderModel, "findOne").mockResolvedValue(order() as any);
    vi.spyOn(orderModel, "findByIdAndUpdate").mockResolvedValue({} as any);
    vi.mocked(sendOrderConfirmationEmail).mockRejectedValueOnce(new Error("smtp"));
    expect((await handlePayfastNotificationService(itn(), res)).success).toBe(true);
    expect(sendAdminOrderNotification).toHaveBeenCalled();
  });

  it("COMPLETE without a billing email skips the customer email only", async () => {
    vi.spyOn(orderModel, "findOne").mockResolvedValue(order({ billingInfo: { firstName: "A", lastName: "B" } }) as any);
    vi.spyOn(orderModel, "findByIdAndUpdate").mockResolvedValue({} as any);
    await handlePayfastNotificationService(itn(), res);
    expect(sendOrderConfirmationEmail).not.toHaveBeenCalled();
    expect(sendAdminOrderNotification).toHaveBeenCalledWith(expect.objectContaining({ email: "N/A" }));
  });

  it("PENDING keeps the order pending", async () => {
    vi.spyOn(orderModel, "findOne").mockResolvedValue(order() as any);
    const upd = vi.spyOn(orderModel, "findByIdAndUpdate").mockResolvedValue({} as any);
    await handlePayfastNotificationService(itn({ payment_status: "PENDING" }), res);
    expect(upd.mock.calls[0][1]).toEqual({ status: "pending", "payfast.status": "PENDING" });
    expect(sendOrderConfirmationEmail).not.toHaveBeenCalled();
  });

  it.each(["FAILED", "CANCELLED"])("%s marks the order failed", async (status) => {
    vi.spyOn(orderModel, "findOne").mockResolvedValue(order() as any);
    const upd = vi.spyOn(orderModel, "findByIdAndUpdate").mockResolvedValue({} as any);
    await handlePayfastNotificationService(itn({ payment_status: status }), res);
    expect(upd.mock.calls[0][1]).toEqual({ status: "failed", "payfast.status": status });
  });

  it("returns {success:false} when the DB throws", async () => {
    vi.spyOn(orderModel, "findOne").mockRejectedValue(new Error("db"));
    expect(await handlePayfastNotificationService(itn(), res)).toEqual({ success: false, message: "db" });
  });

  // ---- SECURITY: none of these protections exist today (validateITN / generateITNSignature are never called) ----
  it.fails("SECURITY: rejects a COMPLETE notification with a missing/forged signature", async () => {
    vi.spyOn(orderModel, "findOne").mockResolvedValue(order() as any);
    const upd = vi.spyOn(orderModel, "findByIdAndUpdate").mockResolvedValue({} as any);
    const forged = itn({ signature: "deadbeef" });
    const r = await handlePayfastNotificationService(forged, res);
    expect(r.success).toBe(false);
    expect(upd).not.toHaveBeenCalled();
  });
  it.fails("SECURITY: rejects a notification whose amount_gross differs from the order total", async () => {
    vi.spyOn(orderModel, "findOne").mockResolvedValue(order() as any);
    const upd = vi.spyOn(orderModel, "findByIdAndUpdate").mockResolvedValue({} as any);
    const { signature: _s, ...rest } = itn({ amount_gross: "1.00" }) as any;
    const r = await handlePayfastNotificationService({ ...rest, signature: generateITNSignature(rest) }, res);
    expect(r.success).toBe(false);
    expect(upd).not.toHaveBeenCalled();
  });
  it.fails("SECURITY: a replayed COMPLETE notification does not re-send emails / re-issue links", async () => {
    vi.spyOn(orderModel, "findOne").mockResolvedValue(order({ status: "paid" }) as any);
    const upd = vi.spyOn(orderModel, "findByIdAndUpdate").mockResolvedValue({} as any);
    await handlePayfastNotificationService(itn(), res);
    expect(upd).not.toHaveBeenCalled();
    expect(sendOrderConfirmationEmail).not.toHaveBeenCalled();
  });
});
