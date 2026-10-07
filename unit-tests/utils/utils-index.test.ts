import { describe, it, expect, vi } from "vitest";
import { checkValidAdminRole, queryBuilder } from "src/utils/index";
import { mockReq, mockRes } from "../setup/express";

describe("checkValidAdminRole", () => {
  it("403 when role header is not admin", () => {
    const res = mockRes(); const next = vi.fn();
    checkValidAdminRole(mockReq({ headers: { role: "user" } }), res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ success: false, message: "Invalid role" });
    expect(next).not.toHaveBeenCalled();
  });
  it("403 when role header is missing", () => {
    const res = mockRes(); const next = vi.fn();
    checkValidAdminRole(mockReq(), res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });
  it("calls next for admin", () => {
    const res = mockRes(); const next = vi.fn();
    checkValidAdminRole(mockReq({ headers: { role: "admin" } }), res, next);
    expect(next).toHaveBeenCalled();
  });
});

describe("queryBuilder", () => {
  it("returns empty query/sort for an empty payload", () => {
    expect(queryBuilder({})).toEqual({ query: {}, sort: {} });
  });
  it("builds a case-insensitive $or regex over the default 'name' key", () => {
    expect(queryBuilder({ description: "ann" }).query).toEqual({ $or: [{ name: { $regex: "ann", $options: "i" } }] });
  });
  it("searches across custom keys", () => {
    const { query } = queryBuilder({ description: "x" }, ["name", "email"]);
    expect((query as any).$or).toHaveLength(2);
    expect((query as any).$or[1]).toEqual({ email: { $regex: "x", $options: "i" } });
  });
  it("sorts asc=1 and anything else=-1", () => {
    expect(queryBuilder({ order: "asc", orderColumn: "createdAt" }).sort).toEqual({ createdAt: 1 });
    expect(queryBuilder({ order: "desc", orderColumn: "createdAt" }).sort).toEqual({ createdAt: -1 });
  });
  it("ignores sort when only one of order/orderColumn is given", () => {
    expect(queryBuilder({ order: "asc" }).sort).toEqual({});
    expect(queryBuilder({ orderColumn: "name" }).sort).toEqual({});
  });
});
