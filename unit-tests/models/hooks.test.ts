import { describe, it, expect, vi } from "vitest";
import mongoose from "mongoose";
import { runPreSave } from "./helpers";
import { InvoiceModel } from "src/models/invoice/invoice-schema";
import { QuoteModel } from "src/models/invoice/quote-schema";
import { orderModel } from "src/models/orders/order-schema";
import { planOrderModel } from "src/models/orders/plan_orders";
import { aiContentModel } from "src/models/aiContentModel/aiContentModel";
import { clientsModel } from "src/models/user/client-schema";

const oid = () => new mongoose.Types.ObjectId();
const future = new Date(Date.now() + 7 * 864e5);
const past = new Date(Date.now() - 7 * 864e5);

const invoiceBase = (over: any = {}) => ({
  invoiceNumber: "INV-2026-0001", clientInfo: { clientName: "Acme", email: "A@B.com" }, dueDate: future,
  createdBy: "admin", createdByEmail: "admin@x.com",
  items: [{ itemNumber: 1, description: "Design", quantity: 2, rate: 100 }], ...over,
});

describe("Invoice model", () => {
  it("lowercases the client email", () => expect(new InvoiceModel(invoiceBase()).clientInfo.email).toBe("a@b.com"));
  it("pre-save calculates line totals, 15% default tax and grand total", async () => {
    const doc: any = new InvoiceModel(invoiceBase());
    await runPreSave(doc);
    expect(doc.items[0].lineTotal).toBe(200);
    expect(doc.subtotal).toBe(200);
    expect(doc.taxTotal).toBe(30);
    expect(doc.grandTotal).toBe(230);
  });
  it("pre-save sums several items", async () => {
    const doc: any = new InvoiceModel(invoiceBase({ items: [
      { itemNumber: 1, description: "A", quantity: 1, rate: 100 },
      { itemNumber: 2, description: "B", quantity: 3, rate: 50 },
    ] }));
    await runPreSave(doc);
    expect(doc.subtotal).toBe(250);
    expect(doc.taxTotal).toBeCloseTo(37.5);
    expect(doc.grandTotal).toBeCloseTo(287.5);
  });
  it("pre-save flips a past-due 'sent' invoice to overdue", async () => {
    const doc: any = new InvoiceModel(invoiceBase({ dueDate: past, status: "sent" }));
    await runPreSave(doc);
    expect(doc.status).toBe("overdue");
  });
  it("pre-save does not mark a past-due draft/paid invoice overdue", async () => {
    for (const status of ["draft", "paid"]) {
      const doc: any = new InvoiceModel(invoiceBase({ dueDate: past, status }));
      await runPreSave(doc);
      expect(doc.status).toBe(status);
    }
  });
  it("rejects negative quantity / rate", () => {
    const err = new InvoiceModel(invoiceBase({ items: [{ itemNumber: 1, description: "x", quantity: -1, rate: -5 }] })).validateSync();
    expect(err).toBeDefined();
  });
  it("rejects an unknown service type", () => {
    const err = new InvoiceModel(invoiceBase({ items: [{ itemNumber: 1, description: "x", quantity: 1, rate: 1, serviceType: "Magic" }] })).validateSync();
    expect(err).toBeDefined();
  });
  it("generateInvoiceNumber starts at 0001 when nothing exists this year", async () => {
    const year = new Date().getFullYear();
    const spy = vi.spyOn(InvoiceModel, "findOne").mockReturnValue({ sort: async () => null } as any);
    expect(await (InvoiceModel as any).generateInvoiceNumber()).toBe(`INV-${year}-0001`);
    spy.mockRestore();
  });
  it("generateInvoiceNumber increments the last number and zero-pads", async () => {
    const year = new Date().getFullYear();
    const spy = vi.spyOn(InvoiceModel, "findOne").mockReturnValue({ sort: async () => ({ invoiceNumber: `INV-${year}-0041` }) } as any);
    expect(await (InvoiceModel as any).generateInvoiceNumber()).toBe(`INV-${year}-0042`);
    spy.mockRestore();
  });
  it("sendInvoice / markAsViewed / markAsPaid update status + timestamps and save", async () => {
    const doc: any = new InvoiceModel(invoiceBase());
    doc.save = vi.fn().mockResolvedValue(doc);
    await doc.markAsViewed();           // draft -> unchanged
    expect(doc.status).toBe("draft");
    await doc.sendInvoice();
    expect(doc.status).toBe("sent");
    expect(doc.sentAt).toBeInstanceOf(Date);
    await doc.markAsViewed();
    expect(doc.status).toBe("viewed");
    expect(doc.viewedAt).toBeInstanceOf(Date);
    await doc.markAsPaid();
    expect(doc.status).toBe("paid");
    expect(doc.paidAt).toBeInstanceOf(Date);
    expect(doc.save).toHaveBeenCalledTimes(4);
  });
});

describe("Quote model", () => {
  const quote = (over: any = {}) => ({
    quoteNumber: "Q-2026-0001", clientInfo: { clientName: "Acme", email: "a@b.com" }, validUntil: future,
    createdBy: "admin", createdByEmail: "a@x.com", items: [{ itemNumber: 1, description: "Work", quantity: 4, rate: 25 }], ...over,
  });
  it("pre-save calculates totals with 15% tax", async () => {
    const doc: any = new QuoteModel(quote());
    await runPreSave(doc);
    expect(doc.subtotal).toBe(100);
    expect(doc.taxTotal).toBe(15);
    expect(doc.grandTotal).toBe(115);
  });
  it("statuses include invoiced", () => expect(new QuoteModel(quote({ status: "invoiced" })).validateSync()?.errors.status).toBeUndefined());
});

describe("Order model", () => {
  const order = (over: any = {}) => ({
    userEmail: "u@x.com", totalAmount: 10,
    billingInfo: { firstName: "A", lastName: "B", email: "a@b.com", city: "CT", postalCode: "8000", country: "ZA" }, ...over,
  });
  it("pre-save generates an ORD- order number when missing", async () => {
    const doc: any = new orderModel(order({ orderNumber: undefined }));
    doc.orderNumber = undefined;
    // orderNumber is required so validation fails first; run the hook function directly
    const fn = doc.$__schema.s.hooks._pres.get("save").find((h: any) => h.fn.toString().includes("ORD-")).fn;
    fn.call(doc, () => {});
    expect(doc.orderNumber).toMatch(/^ORD-[a-z0-9]+-[A-Z0-9]+$/);
  });
  it("keeps an existing order number", async () => {
    const doc: any = new orderModel(order({ orderNumber: "ORD-KEEP" }));
    await runPreSave(doc);
    expect(doc.orderNumber).toBe("ORD-KEEP");
  });
});

describe("PlanOrder model", () => {
  const plan = (over: any = {}) => ({
    orderNumber: "PLN-1", userEmail: "U@X.com ", planId: "p1", planName: "Pro", planType: "pro", credits: 100, price: 50, billingCycle: "monthly",
    subtotal: 50, totalAmount: 57.5, billingInfo: { firstName: "A", lastName: "B", email: "a@b.com" },
    creditDetails: { creditsPurchased: 100, usedCredits: 30 }, ...over,
  });
  it("lowercases and trims email", () => expect(new planOrderModel(plan()).userEmail).toBe("u@x.com"));
  it("pre-save computes remaining credits", async () => {
    const doc: any = new planOrderModel(plan());
    await runPreSave(doc);
    expect(doc.creditDetails.remainingCredits).toBe(70);
  });
  it("virtuals reflect status and totals", () => {
    const paid: any = new planOrderModel(plan({ status: "paid" }));
    expect(paid.isPaid).toBe(true);
    expect(paid.isPending).toBe(false);
    expect(paid.isCancelled).toBe(false);
    const pending: any = new planOrderModel(plan());
    expect(pending.isPending).toBe(true);
    expect(paid.formattedTotal).toMatch(/57[.,]50/);
  });
  it("rejects negative credits / price and bad plan type / billing cycle", () => {
    const err = new planOrderModel(plan({ credits: -1, price: -1, planType: "gold", billingCycle: "weekly" })).validateSync();
    expect(Object.keys(err!.errors)).toEqual(expect.arrayContaining(["credits", "price", "planType", "billingCycle"]));
  });
  it("findOneAndUpdate hook records status history and paid timestamp", () => {
    const hook = (planOrderModel.schema as any).s.hooks._pres.get("findOneAndUpdate").find((h: any) => String(h.fn).includes("statusHistory")).fn;
    const update: any = { status: "paid" };
    hook.call({ getUpdate: () => update }, () => {});
    expect(update.$push.statusHistory).toMatchObject({ status: "paid", note: "Status changed to paid" });
    expect(update.paidAt).toBeInstanceOf(Date);
    const cancelled: any = { status: "cancelled", note: "custom" };
    hook.call({ getUpdate: () => cancelled }, () => {});
    expect(cancelled.cancelledAt).toBeInstanceOf(Date);
    expect(cancelled.$push.statusHistory.note).toBe("custom");
    const refunded: any = { status: "refunded" };
    hook.call({ getUpdate: () => refunded }, () => {});
    expect(refunded.refundedAt).toBeInstanceOf(Date);
  });
});

describe("AIContent model", () => {
  const content = (contentType: string) => ({ userId: "1", contentType, title: "T", content: "C" });
  it("pre-save adds an AIW- identifier for writing", async () => {
    const doc: any = new aiContentModel(content("writing"));
    await runPreSave(doc);
    expect(doc.identifier).toMatch(/^AIW-[A-Z0-9]+-[A-Z0-9]+$/);
  });
  it("pre-save adds an AIS- identifier for speech", async () => {
    const doc: any = new aiContentModel(content("speech"));
    await runPreSave(doc);
    expect(doc.identifier).toMatch(/^AIS-/);
  });
  it("keeps an existing identifier", async () => {
    const doc: any = new aiContentModel({ ...content("writing"), identifier: "MINE" });
    await runPreSave(doc);
    expect(doc.identifier).toBe("MINE");
  });
  it("defaults status Pending, provider openai, model gpt-4o", () => {
    const d: any = new aiContentModel(content("writing"));
    expect([d.status, d.provider, d.aiModel]).toEqual(["Pending", "openai", "gpt-4o"]);
  });
});

describe("Client model", () => {
  const client = (over: any = {}) => ({ name: " Acme ", email: " ACME@X.com ", createdBy: oid(), ...over });
  it("trims name and lowercases/trims email", () => {
    const c: any = new clientsModel(client());
    expect([c.name, c.email]).toEqual(["Acme", "acme@x.com"]);
  });
  it("virtuals mirror projects / lifetimeValue", () => {
    const c: any = new clientsModel(client({ projects: 3, lifetimeValue: 500 }));
    expect(c.totalProjects).toBe(3);
    expect(c.totalLifetimeValue).toBe(500);
  });
  it("rejects negative projects and bad retainerType", () => {
    const err = new clientsModel(client({ projects: -1, retainerType: "weekly" })).validateSync();
    expect(Object.keys(err!.errors)).toEqual(expect.arrayContaining(["projects", "retainerType"]));
  });
  it("instance methods update fields and save", async () => {
    const c: any = new clientsModel(client());
    c.save = vi.fn().mockResolvedValue(c);
    await c.updateProjects(7);
    await c.updateLifetimeValue(900);
    await c.toggleStatus();
    expect([c.projects, c.lifetimeValue, c.isActive]).toEqual([7, 900, false]);
    expect(c.save).toHaveBeenCalledTimes(3);
  });
  it("statics delegate to find() with the right filter", () => {
    const find = vi.spyOn(clientsModel, "find").mockReturnValue("q" as any);
    const id = oid();
    expect((clientsModel as any).findActiveClients()).toBe("q");
    expect(find).toHaveBeenLastCalledWith({ isActive: true });
    (clientsModel as any).findByManager(id);
    expect(find).toHaveBeenLastCalledWith({ managedBy: id });
    (clientsModel as any).findByCreator(id);
    expect(find).toHaveBeenLastCalledWith({ createdBy: id });
    find.mockRestore();
  });
});
