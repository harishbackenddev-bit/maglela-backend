import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import request from "supertest";

let app: any;
let startServer: any;

vi.mock("src/config/db", () => ({
  default: vi.fn(),
}));

beforeAll(async () => {
  const module = await import("src/app");

  app = module.app;
  startServer = module.startServer;
});

afterAll(() => {
  vi.restoreAllMocks();
});

describe("app.ts", () => {
  it("starts listening once", () => {
    const listen = vi
      .spyOn(app, "listen")
      .mockImplementation(function (this: any) {
        return {} as any;
      });

    startServer();

    expect(listen).toHaveBeenCalledTimes(1);

    listen.mockRestore();
  });

  it("GET / returns the entry-point text", async () => {
    const res = await request(app).get("/");

    expect(res.status).toBe(200);
    expect(res.text).toContain("Hello world entry point");
  });

  it("CORS allows the Vite dev origin with credentials", async () => {
    const res = await request(app)
      .get("/")
      .set("Origin", "http://localhost:5173");

    expect(res.headers["access-control-allow-origin"])
      .toBe("http://localhost:5173");

    expect(res.headers["access-control-allow-credentials"])
      .toBe("true");
  });

  it("CORS does not echo an unknown origin", async () => {
    const res = await request(app)
      .get("/")
      .set("Origin", "https://evil.example");

    expect(res.headers["access-control-allow-origin"])
      .toBeUndefined();
  });

  it("answers CORS preflight with the allowed methods", async () => {
    const res = await request(app)
      .options("/api/auth/login")
      .set("Origin", "http://localhost:5173")
      .set("Access-Control-Request-Method", "POST");

    expect(res.status).toBe(204);

    expect(res.headers["access-control-allow-methods"])
      .toContain("PATCH");
  });

  it("unknown route -> 404", async () => {
    const res = await request(app).get("/nope");

    expect(res.status).toBe(404);
  });

  it("protected API route without a token -> 401", async () => {
    const res = await request(app).get("/api/auth/me");

    expect(res.status).toBe(401);
  });

  it("the same user router is reachable under /api/user and /api/toolkit", async () => {
    const userRes = await request(app).get("/api/user/me");
    const toolkitRes = await request(app).get("/api/toolkit/me");

    expect(userRes.status).toBe(401);
    expect(toolkitRes.status).toBe(401);
  });

  it("admin router is mounted at /api/admin", async () => {
    const res = await request(app).get("/api/admin/dashboard");

    expect(res.status).toBe(401);
  });

  it("malformed JSON goes through the error handler as {success:false,message}", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .set("Content-Type", "application/json")
      .send("{bad json");

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(typeof res.body.message).toBe("string");
  });
});