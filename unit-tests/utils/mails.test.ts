import { describe, it, expect, vi, beforeEach } from "vitest";

const { sendMail } = vi.hoisted(() => ({ sendMail: vi.fn() }));
vi.mock("nodemailer", () => {
  const createTransport = vi.fn(() => ({ sendMail, verify: vi.fn() }));
  return { default: { createTransport }, createTransport };
});

import { sendPasswordResetEmail, sendContactMailToAdmin, sendLatestUpdatesEmail, sendSupportEmailToAdmin } from "src/utils/mails/mail";
import { sendOrderConfirmationEmail, sendAdminOrderNotification } from "src/utils/mails/orders/orderconfirmation";
import { sendInvoiceEmail, sendQuoteEmail } from "src/utils/mails/invoiceemail";
import { sendQuoteEmail as sendQuoteEmail2, sendInvoiceEmail as stubInvoice } from "src/utils/mails/quoteemail";

beforeEach(() => { sendMail.mockReset(); sendMail.mockResolvedValue({ messageId: "id-1" }); });

describe("mail.ts", () => {
  it("sendPasswordResetEmail sends to the user with the link in the html", async () => {
    const info = await sendPasswordResetEmail("u@x.com", "https://app/reset?t=1");
    expect(info).toEqual({ messageId: "id-1" });
    const arg = sendMail.mock.calls[0][0];
    expect(arg.to).toBe("u@x.com");
    expect(arg.subject).toBe("Reset Your Password");
    expect(arg.html).toContain("https://app/reset?t=1");
  });
  it("sendPasswordResetEmail throws a friendly error when sending fails", async () => {
    sendMail.mockRejectedValueOnce(new Error("smtp down"));
    await expect(sendPasswordResetEmail("u@x.com", "l")).rejects.toThrow("Failed to send password reset email");
  });
  it("sendContactMailToAdmin includes the payload", async () => {
    await sendContactMailToAdmin({ name: "Ann", email: "a@b.com", message: "Hello there", phoneNumber: "123" });
    const arg = sendMail.mock.calls[0][0];
    expect(arg.subject).toBe("Contact Us | New Message");
    expect(arg.html).toContain("Ann");
    expect(arg.html).toContain("Hello there");
  });
  it("sendContactMailToAdmin throws on failure", async () => {
    sendMail.mockRejectedValueOnce(new Error("x"));
    await expect(sendContactMailToAdmin({ name: "a", email: "b", message: "c", phoneNumber: "d" })).rejects.toThrow("Failed to send contact email");
  });
  it("sendLatestUpdatesEmail uses the title as subject", async () => {
    await sendLatestUpdatesEmail("u@x.com", "News!", "Body text");
    const arg = sendMail.mock.calls[0][0];
    expect(arg.subject).toBe("News!");
    expect(arg.to).toBe("u@x.com");
    expect(arg.html).toContain("Body text");
  });
  it("sendLatestUpdatesEmail throws on failure", async () => {
    sendMail.mockRejectedValueOnce(new Error("x"));
    await expect(sendLatestUpdatesEmail("a", "b", "c")).rejects.toThrow("Failed to send update email");
  });
  it("sendSupportEmailToAdmin sets replyTo and subject", async () => {
    await sendSupportEmailToAdmin({ name: "Ann", email: "a@b.com", subject: "Help", message: "m" });
    const arg = sendMail.mock.calls[0][0];
    expect(arg.replyTo).toBe("a@b.com");
    expect(arg.subject).toBe("Support Request: Help");
    expect(arg.to).toBe("support@magalela.com");
  });
  it("sendSupportEmailToAdmin throws on failure", async () => {
    sendMail.mockRejectedValueOnce(new Error("x"));
    await expect(sendSupportEmailToAdmin({ name: "a", email: "b", subject: "c", message: "d" })).rejects.toThrow("Failed to send support email");
  });
});

describe("orderconfirmation.ts", () => {
  const items = [{ productId: "1", title: "Playbook", price: 99.5, quantity: 2, subtotal: 199 }];
  it("sendOrderConfirmationEmail has order number in subject and links/prices in body", async () => {
    await sendOrderConfirmationEmail({ to: "u@x.com", name: "Ann", orderNumber: "ORD-9", items, totalAmount: "199.00", downloadLinks: [{ productId: "1", link: "/uploads/pdfs/a.pdf", expiresAt: new Date() }] });
    const arg = sendMail.mock.calls[0][0];
    expect(arg.to).toBe("u@x.com");
    expect(arg.subject).toBe("Order Confirmation #ORD-9");
    expect(arg.html).toContain("Playbook");
    expect(arg.html).toContain("R99.50");
    expect(arg.html).toContain("/uploads/pdfs/a.pdf");
  });
  it("sendAdminOrderNotification mentions order + transaction", async () => {
    await sendAdminOrderNotification({ orderNumber: "ORD-9", name: "Ann", email: "a@b.com", items, totalAmount: "199.00", transactionId: "PF-1" });
    const arg = sendMail.mock.calls[0][0];
    expect(arg.subject).toBe("New Order #ORD-9 - Payment Confirmed");
    expect(arg.html).toContain("PF-1");
  });
});

describe("invoice / quote emails", () => {
  const items = [{ description: "Design", quantity: 2, rate: 100, lineTotal: 200 }];
  it("sendInvoiceEmail sends to the client", async () => {
    await sendInvoiceEmail({ to: "c@x.com", clientName: "Client", invoiceNumber: "INV-1", amount: 200, taxAmount: 30, totalAmount: 230, dueDate: new Date("2026-01-01"), items });
    const arg = sendMail.mock.calls[0][0];
    expect(arg.to).toBe("c@x.com");
    expect(JSON.stringify(arg)).toContain("INV-1");
  });
  it("sendQuoteEmail sends to the client", async () => {
    await sendQuoteEmail({ to: "c@x.com", clientName: "Client", quoteNumber: "Q-1", amount: 200, taxAmount: 30, totalAmount: 230, validUntil: new Date("2026-01-01"), items });
    expect(sendMail.mock.calls[0][0].to).toBe("c@x.com");
    expect(JSON.stringify(sendMail.mock.calls[0][0])).toContain("Q-1");
  });
  it("quoteemail.sendQuoteEmail sends to the client", async () => {
    await sendQuoteEmail2({ to: "c@x.com", clientName: "Client", quoteNumber: "Q-2", amount: 200, validUntil: new Date("2026-01-01"), items });
    expect(sendMail).toHaveBeenCalledOnce();
  });
  it("quoteemail.sendInvoiceEmail is an empty stub that sends nothing", async () => {
    await stubInvoice({ to: "c", clientName: "x", invoiceNumber: "1", amount: 1, dueDate: new Date(), items });
    expect(sendMail).not.toHaveBeenCalled();
  });
});
