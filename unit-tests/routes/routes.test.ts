import { describe, it, expect } from "vitest";
import express from "express";
import request from "supertest";
import { admin, user, ai } from "src/routes/index";

type R = { method: string; path: string; handlers: string[] };
const list = (router: any): R[] =>
  router.stack.filter((l: any) => l.route).flatMap((l: any) =>
    Object.keys(l.route.methods).map((m) => ({ method: m.toUpperCase(), path: l.route.path, handlers: l.route.stack.map((s: any) => s.name) }))
  );

const routers: Record<string, any> = { admin, user, ai };
const key = (r: R) => `${r.method} ${r.path}`;

describe("route tables", () => {
  const expected: Record<string, string[]> = {
    admin: ["GET /experts", "POST /experts", "PATCH /experts/:id", "DELETE /experts/:id", "GET /dashboard", "GET /users", "PATCH /users/:id", "DELETE /users/:id",
      "GET /clients", "POST /clients", "GET /plans", "POST /plans", "GET /subscription-plans", "GET /quotes", "POST /quotes", "POST /quotes/draft", "PATCH /quotes/:id/send",
      "GET /invoices", "POST /invoices", "POST /invoices/draft", "PATCH /invoices/:id/send", "PATCH /invoices/:id/status", "GET /events", "POST /events", "GET /availability", "POST /availability"],
    user: ["GET /me", "POST /register", "POST /login", "PATCH /forgot-password", "GET /dashboard", "PATCH /update-profile", "POST /change-password", "POST /two-factor",
      "GET /projects", "POST /projects", "POST /upload-document", "GET /ai-writing", "DELETE /ai-writing/:id", "GET /ai-speech", "DELETE /ai-speech/:id",
      "POST /create-order", "POST /payfast/notify", "GET /download/:orderNumber/:productId", "POST /credit/create-order", "POST /credit/payfast/notify", "POST /invoices/create-payment", "POST /invoice/payfast/notify"],
    ai: ["POST /ai-writing/generate", "GET /ai-writing/cost-estimates", "POST /ai-writing/claude", "POST /ai-writing/openai", "POST /ai-speech/generate", "GET /ai-speech/cost-estimates", "POST /ai-speech/claude", "POST /ai-speech/openai"],
  };
  for (const [name, keys] of Object.entries(expected)) {
    it.each(keys)(`${name}: %s is registered`, (k) => {
      expect(list(routers[name]).map(key)).toContain(k);
    });
  }
  it("no route is registered twice with the same method+path in a router (ignoring chained .route())", () => {
    for (const [name, r] of Object.entries(routers)) {
      const seen = new Map<string, number>();
      for (const route of list(r)) seen.set(key(route), (seen.get(key(route)) ?? 0) + 1);
      const dupes = [...seen].filter(([, n]) => n > 1).map(([k]) => k);
      expect(dupes, `${name} duplicates`).toEqual([]);
    }
  });
});


const INTENTIONALLY_PUBLIC: Record<string, string[]> = {
  admin: ["GET /experts", "POST /experts", "GET /plans", "POST /plans", "GET /subscription-plans", "POST /subscription-plans"], 
  user: ["POST /register", "POST /login", "PATCH /forgot-password", "GET /credit-plans",
    "POST /payfast/notify", "POST /credit/payfast/notify", "POST /invoice/payfast/notify", 
    "POST /create-order", "GET /payments/status/:orderId", "GET /orders/:orderId", "GET /download/:orderNumber/:productId", 
    "GET /credit/payments/status/:orderId", "GET /credit/orders/:orderId", "GET /invoices/orders/:orderId"],
  ai: [],
};
const KNOWN_GAPS: Record<string, string[]> = {
  admin: ["GET /workshops", "GET /projects", "GET /users", "GET /all-availabilities", "GET /invoices", "POST /invoices", "POST /invoices/draft",
    "PATCH /invoices/:id/send", "PATCH /invoices/:id/status", "GET /invoices/:id", "PUT /invoices/:id", "DELETE /invoices/:id"],
  user: ["POST /update-profile-pic", "PATCH /orders/:orderId/cancel"],
  ai: [],
};

describe("auth coverage", () => {
  for (const [name, router] of Object.entries(routers)) {
    for (const r of list(router)) {
      const k = key(r);
      if (INTENTIONALLY_PUBLIC[name].includes(k)) continue;
      const gap = KNOWN_GAPS[name].includes(k);
      (gap ? it.fails : it)(`${name}: ${k} requires checkAuth${gap ? " (KNOWN GAP - route is unauthenticated)" : ""}`, () => {
        expect(r.handlers).toContain("checkAuth");
      });
    }
  }
});

describe("admin role enforcement", () => {
  
  
  it.fails("admin router uses an admin-role check on its routes", () => {
    const names = list(admin).flatMap((r) => r.handlers);
    expect(names.some((n) => /admin.?role/i.test(n))).toBe(true);
  });
});

describe("HTTP behaviour (no token => 401, handler never reached)", () => {
  const app = express();
  app.use(express.json());
  app.use("/admin", admin);
  app.use("/user", user);
  app.use("/ai", ai);

  const protectedRoutes: [string, R][] = [];
  for (const [name, router] of Object.entries(routers)) {
    for (const r of list(router)) {
      
      if (r.handlers[0] === "checkAuth" || (r.handlers.includes("checkAuth") && !["getExperts", "getPlans", "getSubscriptionPlans", "getAllClient", "getworkshop"].includes(r.handlers[0]) && r.handlers[0] === "checkAuth"))
        protectedRoutes.push([name, r]);
    }
  }
  it("covers a meaningful number of protected routes", () => expect(protectedRoutes.length).toBeGreaterThan(60));

  it.each(protectedRoutes.map(([n, r]) => [`${n} ${key(r)}`, n, r] as const))("%s -> 401 without a token", async (_l, n, r) => {
    const url = `/${n}${r.path.replace(/:[A-Za-z]+/g, "1")}`;
    const res = await (request(app) as any)[r.method.toLowerCase()](url).send({});
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ success: false, message: "Unauthorized token missing" });
  });

  it("an invalid token is rejected with 401", async () => {
    const res = await request(app).get("/user/me").set("Authorization", "Bearer garbage");
    expect(res.status).toBe(401);
    expect(res.body.message).toBe("Unauthorized token invalid or expired");
  });
});
