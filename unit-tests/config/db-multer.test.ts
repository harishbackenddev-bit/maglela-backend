import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import mongoose from "mongoose";
import express from "express";
import request from "supertest";
import fs from "fs";
import connectDB from "src/config/db";
import { deleteFile } from "src/config/multer";
import { uploadProfile, uploadDocument } from "src/config/multerConfig";

describe("connectDB", () => {
  let exit: any;
  beforeEach(() => { exit = vi.spyOn(process, "exit").mockImplementation((() => undefined) as any); });
  afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); process.env.MONGO_URL = "mongodb://localhost:27017/test"; });

  it("connects with MONGO_URL", async () => {
    const c = vi.spyOn(mongoose, "connect").mockResolvedValue(mongoose as any);
    await connectDB();
    await Promise.resolve();
    expect(c).toHaveBeenCalledWith("mongodb://localhost:27017/test");
    expect(exit).not.toHaveBeenCalled();
  });
  it("exits when MONGO_URL is missing", async () => {
    delete process.env.MONGO_URL;
    vi.spyOn(mongoose, "connect").mockResolvedValue(mongoose as any);
    await connectDB();
    // NOTE: process.exit is mocked here, so code after it still runs; in production the process stops.
    expect(exit).toHaveBeenCalledWith(1);
  });
  it("retries every 5s and exits after 5 failed attempts", async () => {
    vi.useFakeTimers();
    const c = vi.spyOn(mongoose, "connect").mockRejectedValue(new Error("down"));
    await connectDB();
    for (let i = 0; i < 5; i++) await vi.advanceTimersByTimeAsync(5000);
    expect(c).toHaveBeenCalledTimes(5);
    expect(exit).toHaveBeenCalledWith(1);
  });
});

describe("deleteFile", () => {
  it("calls fs.unlink and tolerates errors", () => {
    const unlink = vi.spyOn(fs, "unlink").mockImplementation(((_p: any, cb: any) => cb(new Error("nope"))) as any);
    expect(() => deleteFile("/tmp/x")).not.toThrow();
    expect(unlink).toHaveBeenCalledWith("/tmp/x", expect.any(Function));
    unlink.mockRestore();
  });
});

describe("multerConfig upload filters", () => {
  const app = express();
  app.post("/profile", uploadProfile.single("f"), (req, res) => res.json({ ok: true, name: req.file?.filename }));
  app.post("/doc", uploadDocument.single("f"), (req, res) => res.json({ ok: true }));
  app.use((err: any, _req: any, res: any, _next: any) => res.status(400).json({ ok: false, message: err.message }));

  const uploaded: string[] = [];
  afterEach(() => { uploaded.splice(0).forEach((f) => fs.rmSync(f, { force: true })); });

  it("profile accepts a png", async () => {
    const r = await request(app).post("/profile").attach("f", Buffer.from("x"), { filename: "a.png", contentType: "image/png" });
    expect(r.status).toBe(200);
    expect(r.body.name).toMatch(/^profile-\d+-\d+\.png$/);
    uploaded.push("public/uploads/profiles/" + r.body.name);
  });
  it("profile rejects a non-image", async () => {
    const r = await request(app).post("/profile").attach("f", Buffer.from("x"), { filename: "a.pdf", contentType: "application/pdf" });
    expect(r.status).toBe(400);
    expect(r.body.message).toBe("Only image files are allowed!");
  });
  it("profile rejects a file over 5MB", async () => {
    const r = await request(app).post("/profile").attach("f", Buffer.alloc(5 * 1024 * 1024 + 10), { filename: "big.png", contentType: "image/png" });
    expect(r.status).toBe(400);
    expect(r.body.message).toMatch(/File too large/i);
  });
});
