import { describe, it, expect, vi } from "vitest";
import jwt from "jsonwebtoken";
import { checkAuth } from "src/middleware/check-auth";
import { mockReq, mockRes } from "../setup/express";

const sign = (payload: object, opts: jwt.SignOptions = {}) => jwt.sign(payload, process.env.JWT_SECRET as string, opts);

describe("checkAuth", () => {
  it("401 when the Authorization header is missing", async () => {
    const res = mockRes(); const next = vi.fn();
    await checkAuth(mockReq(), res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ success: false, message: "Unauthorized token missing" });
    expect(next).not.toHaveBeenCalled();
  });
  it("401 when the header has no token part", async () => {
    const res = mockRes(); const next = vi.fn();
    await checkAuth(mockReq({ headers: { authorization: "Bearer" } }), res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
  it("401 for a malformed token", async () => {
    const res = mockRes(); const next = vi.fn();
    await checkAuth(mockReq({ headers: { authorization: "Bearer not.a.jwt" } }), res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ success: false, message: "Unauthorized token invalid or expired" });
  });
  it("401 for a token signed with a different secret", async () => {
    const res = mockRes(); const next = vi.fn();
    const bad = jwt.sign({ id: "1" }, "other-secret");
    await checkAuth(mockReq({ headers: { authorization: `Bearer ${bad}` } }), res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
  it("401 for an expired token", async () => {
    const res = mockRes(); const next = vi.fn();
    const expired = sign({ id: "1" }, { expiresIn: -10 });
    await checkAuth(mockReq({ headers: { authorization: `Bearer ${expired}` } }), res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });
  it("sets req.currentUser and calls next for a valid token", async () => {
    const res = mockRes(); const next = vi.fn();
    const req = mockReq({ headers: { authorization: `Bearer ${sign({ id: "user-123" })}` } });
    await checkAuth(req, res, next);
    expect(req.currentUser).toBe("user-123");
    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });
});
