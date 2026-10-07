import { describe, it, expect } from "vitest";
import { errorResponseHandler, errorParser, checkMulter } from "src/lib/errors/error-response-handler";
import multer from "multer";
import { mockRes } from "../setup/express";
import { vi } from "vitest";

describe("errorResponseHandler", () => {
  it("throws an Error whose message is JSON with success/message/code", () => {
    try {
      errorResponseHandler("Not found", 404, mockRes());
      expect.unreachable();
    } catch (e: any) {
      expect(JSON.parse(e.message)).toEqual({ success: false, message: "Not found", code: 404 });
    }
  });
  it("defaults the code to 500", () => {
    try { errorResponseHandler("boom", undefined, mockRes()); } catch (e: any) {
      expect(JSON.parse(e.message).code).toBe(500);
    }
  });
});

describe("errorParser", () => {
  it("round-trips an errorResponseHandler error", () => {
    try { errorResponseHandler("Bad", 400, mockRes()); } catch (e) {
      expect(errorParser(e)).toEqual({ success: false, message: "Bad", code: 400 });
    }
  });
  it("falls back to 500 for a non-JSON error message", () => {
    expect(errorParser(new Error("plain"))).toEqual({ code: 500, message: "An unexpected error occurred in parser" });
  });
});

describe("checkMulter", () => {
  it("responds 400 for a MulterError", () => {
    const res = mockRes(); const next = vi.fn();
    checkMulter(new multer.MulterError("LIMIT_FILE_SIZE"), {}, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
    expect(next).not.toHaveBeenCalled();
  });
  it("calls next for other errors", () => {
    const res = mockRes(); const next = vi.fn();
    checkMulter(new Error("x"), {}, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});
