
import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockReq, mockRes } from "../setup/express";
import { errorResponseHandler } from "src/lib/errors/error-response-handler";

vi.mock("src/services/user/user");
vi.mock("src/services/admin/admin-service");
vi.mock("src/services/admin/invoice/invoice");
vi.mock("src/services/admin/invoice/quote");
vi.mock("src/services/admin/schedule/schedule");
vi.mock("src/services/ai/aiService");
vi.mock("src/services/ai/aiSpeechService");
vi.mock("src/services/ai/aiGenerateService");
vi.mock("src/services/ai/aiGenerateSpeechService");
vi.mock("src/services/payfast/payfast");
vi.mock("src/services/payfast/creditproduct");
vi.mock("src/services/payfast/invoiceproduct");
vi.mock("src/utils/payfast.utils");
vi.mock("src/utils/mails/mail");

const serviceModules = import.meta.glob("../../src/services/**/*.ts", { eager: true });
const controllerModules = import.meta.glob("../../src/controllers/**/*.ts", { eager: true });

const handlers: [string, (req: any, res: any, next?: any) => any][] = [];
for (const [file, mod] of Object.entries(controllerModules)) {
  for (const [name, fn] of Object.entries(mod as any)) {
    if (typeof fn === "function") handlers.push([`${file.replace("../../src/controllers/", "")} › ${name}`, fn as any]);
  }
}

const allServiceFns = () => {
  const fns: any[] = [];
  for (const mod of Object.values(serviceModules)) for (const v of Object.values(mod as any)) if (vi.isMockFunction(v)) fns.push(v);
  return fns;
};

const makeReq = () => mockReq({
  body: { email: "a@b.com", password: "password123", name: "Ann", title: "T", id: "1" },
  params: { id: "507f1f77bcf86cd799439011", orderId: "ORD-1", orderNumber: "ORD-1", productId: "1", email: "a@b.com" },
  query: { page: "1", limit: "10" },
  headers: { authorization: "Bearer x" },
  currentUser: "507f1f77bcf86cd799439011",
  user: { id: "507f1f77bcf86cd799439011" },
  rawBody: "a=b",
  file: undefined,
});


const DIRECT_DB = new Set(["payfast/payfast.ts › getUserOrders", "payfast/payfast.ts › downloadProduct", "payfast/payfast.ts › cancelOrder"]);

const responded = (res: any) => ["status", "json", "send", "redirect", "download"].some((k) => res[k].mock.calls.length > 0);

beforeEach(() => {
  for (const fn of allServiceFns()) fn.mockReset();
});

it("discovers a meaningful number of handlers", () => expect(handlers.length).toBeGreaterThan(40));

describe.each(handlers)("%s", (name, handler) => {
  it("responds exactly once and never throws when the service succeeds", async () => {
    if (DIRECT_DB.has(name)) return;
    for (const fn of allServiceFns()) fn.mockResolvedValue({ success: true, data: [], message: "ok", url: "http://x" });
    const res = mockRes();
    await expect(Promise.resolve(handler(makeReq(), res, vi.fn()))).resolves.not.toThrow();
    expect(responded(res)).toBe(true);
    if (res.status.mock.calls.length) {
      const code = res.status.mock.calls[0][0];
      expect(code, "status code").toBeGreaterThanOrEqual(200);
      expect(code).toBeLessThan(500);
    }
    expect(res.json.mock.calls.length + res.send.mock.calls.length + res.redirect.mock.calls.length + res.download.mock.calls.length).toBeLessThanOrEqual(1);
  });

  it("maps a service error (code + message) to the HTTP response", async () => {
    for (const fn of allServiceFns()) fn.mockImplementation(async () => errorResponseHandler("boom-message", 418, mockRes()));
    const res = mockRes();
    const req = makeReq();
    await expect(Promise.resolve(handler(req, res, vi.fn()))).resolves.not.toThrow();
    expect(responded(res)).toBe(true);

    const serviceWasCalled = allServiceFns().some((f) => f.mock.calls.length > 0);
    if (serviceWasCalled) {
      const sent = res.status.mock.calls[0]?.[0];
      
      expect(sent === undefined || sent >= 400, `status was ${sent}`).toBe(true);
      const body = res.json.mock.calls[0]?.[0] ?? res.send.mock.calls[0]?.[0];
      if (body && typeof body === "object") expect(body.success).toBe(false);
    }
  });
});
