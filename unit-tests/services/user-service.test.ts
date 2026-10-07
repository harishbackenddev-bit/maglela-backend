import { describe, it, expect, vi, beforeEach } from "vitest";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { mockRes } from "../setup/express";

vi.mock("src/utils/mails/mail", () => ({ sendPasswordResetEmail: vi.fn().mockResolvedValue({}), sendSupportEmailToAdmin: vi.fn().mockResolvedValue({}) }));
vi.mock("src/utils/mails/token");
vi.mock("src/utils/sms/sms");

import { usersModel } from "src/models/user/user-schema";
import { adminModel } from "src/models/admin/admin-schema";
import { sendPasswordResetEmail } from "src/utils/mails/mail";
import { signupService, loginService, userdataServive, forgotPasswordService, verifyPasswordResetService } from "src/services/user/user";

const res = mockRes();
const errOf = async (p: Promise<any>) => { try { await p; } catch (e: any) { return JSON.parse(e.message); } throw new Error("did not throw"); };
const chain = (doc: any) => ({ select: vi.fn().mockResolvedValue(doc) });
const userDoc = (over: any = {}) => new usersModel({ name: "Ann", email: "ann@x.com", password: bcrypt.hashSync("password1", 4), ...over });

beforeEach(() => { vi.restoreAllMocks(); vi.mocked(sendPasswordResetEmail).mockClear(); });

describe("signupService", () => {
  const stubSave = () => vi.spyOn(usersModel.prototype, "save").mockImplementation(async function (this: any) { return this; });

  it("rejects an email that already exists (case/space-insensitive lookup)", async () => {
    const find = vi.spyOn(usersModel, "findOne").mockResolvedValue({ _id: "1" } as any);
    const e = await errOf(signupService({ email: "  ANN@X.com ", password: "password1", name: "Ann" }, res));
    expect(e).toMatchObject({ code: 400, message: "Email already exists" });
    expect(find).toHaveBeenCalledWith({ email: "ann@x.com" });
  });
  it("creates the user with a hashed password, normalized email and 3-digit identifier", async () => {
    vi.spyOn(usersModel, "findOne").mockResolvedValue(null as any);
    stubSave();
    const r: any = await signupService({ email: " Ann@X.com ", password: "password1", name: "Ann" }, res);
    expect(r.success).toBe(true);
    expect(r.user.email).toBe("ann@x.com");
    expect(r.user.password).not.toBe("password1");
    expect(bcrypt.compareSync("password1", r.user.password)).toBe(true);
    expect(r.user.identifier).toMatch(/^\d{3}$/);
  });
  it("returns a 7-day JWT with id/email", async () => {
    vi.spyOn(usersModel, "findOne").mockResolvedValue(null as any);
    stubSave();
    const r: any = await signupService({ email: "a@b.com", password: "password1", name: "A" }, res);
    const d: any = jwt.verify(r.token, process.env.JWT_SECRET!);
    expect(d.email).toBe("a@b.com");
    expect(d.id).toBeTruthy();
    expect(d.exp - d.iat).toBe(7 * 24 * 3600);
  });
  it.fails("does not leak the password hash in the response", async () => {
    vi.spyOn(usersModel, "findOne").mockResolvedValue(null as any);
    stubSave();
    const r: any = await signupService({ email: "a@b.com", password: "password1", name: "A" }, res);
    expect(r.user.password).toBeUndefined();
  });
  it.fails("ignores client-supplied privileged fields (role / credits / plan)", async () => {
    vi.spyOn(usersModel, "findOne").mockResolvedValue(null as any);
    stubSave();
    const r: any = await signupService({ email: "a@b.com", password: "password1", name: "A", role: "admin", credits: 99999, plan: "enterprise" }, res);
    expect(r.user.role).toBe("user");
    expect(r.user.credits).toBe(0);
    expect(r.user.plan).toBe("free");
  });
});

describe("loginService", () => {
  it("404 when neither a user nor an admin exists", async () => {
    vi.spyOn(usersModel, "findOne").mockReturnValue(chain(null) as any);
    vi.spyOn(adminModel, "findOne").mockReturnValue(chain(null) as any);
    expect(await errOf(loginService({ email: "x@y.com", password: "p" }, res))).toMatchObject({ code: 404, message: "User not found" });
  });
  it("401 on a wrong password", async () => {
    vi.spyOn(usersModel, "findOne").mockReturnValue(chain(userDoc()) as any);
    expect(await errOf(loginService({ email: "ann@x.com", password: "wrong" }, res))).toMatchObject({ code: 401, message: "Invalid password" });
  });
  it("logs a user in: token has role=user and the password is stripped", async () => {
    vi.spyOn(usersModel, "findOne").mockReturnValue(chain(userDoc()) as any);
    const r: any = await loginService({ email: " ANN@x.com ", password: "password1" }, res);
    expect(r.success).toBe(true);
    expect(r.data.password).toBeUndefined();
    expect(r.data.role).toBe("user");
    expect((jwt.verify(r.token, process.env.JWT_SECRET!) as any).role).toBe("user");
  });
  it("falls back to the admin collection and sets role=admin", async () => {
    vi.spyOn(usersModel, "findOne").mockReturnValue(chain(null) as any);
    const admin = new adminModel({ name: "Boss", email: "boss@x.com", password: bcrypt.hashSync("adminpass1", 4) });
    vi.spyOn(adminModel, "findOne").mockReturnValue(chain(admin) as any);
    const r: any = await loginService({ email: "boss@x.com", password: "adminpass1" }, res);
    expect(r.data.role).toBe("admin");
    expect((jwt.verify(r.token, process.env.JWT_SECRET!) as any).role).toBe("admin");
  });
});

describe("userdataServive", () => {
  it("returns the user", async () => {
    vi.spyOn(usersModel, "findById").mockResolvedValue({ _id: "1" } as any);
    expect(await userdataServive({ userId: "1" }, res)).toMatchObject({ success: true, data: { _id: "1" } });
  });
  it("falls back to admin", async () => {
    vi.spyOn(usersModel, "findById").mockResolvedValue(null as any);
    vi.spyOn(adminModel, "findById").mockResolvedValue({ _id: "a" } as any);
    expect(await userdataServive({ userId: "a" }, res)).toMatchObject({ data: { _id: "a" } });
  });
  it("404 when nobody matches", async () => {
    vi.spyOn(usersModel, "findById").mockResolvedValue(null as any);
    vi.spyOn(adminModel, "findById").mockResolvedValue(null as any);
    expect(await errOf(userdataServive({ userId: "x" }, res))).toMatchObject({ code: 404 });
  });
});

describe("forgotPasswordService", () => {
  it("404 for an unknown email", async () => {
    vi.spyOn(usersModel, "findOne").mockResolvedValue(null as any);
    expect(await errOf(forgotPasswordService({ email: "no@x.com" }, res))).toMatchObject({ code: 404 });
    expect(sendPasswordResetEmail).not.toHaveBeenCalled();
  });
  it("emails a reset link carrying a valid 1h JWT", async () => {
    vi.spyOn(usersModel, "findOne").mockResolvedValue({ _id: "u1" } as any);
    const r = await forgotPasswordService({ email: "Ann@X.com" }, res);
    expect(r).toEqual({ success: true, message: "Password reset link sent successfully" });
    const [to, link] = vi.mocked(sendPasswordResetEmail).mock.calls[0];
    expect(to).toBe("Ann@X.com");
    expect(link).toMatch(/^http:\/\/localhost:5173\/reset-password\?token=/);
    const token = link.split("token=")[1];
    const d: any = jwt.verify(token, process.env.JWT_SECRET!);
    expect(d.id).toBe("u1");
    expect(d.exp - d.iat).toBe(3600);
  });
});

describe("verifyPasswordResetService", () => {
  const token = (id = "u1", opts: any = { expiresIn: "1h" }) => jwt.sign({ id }, process.env.JWT_SECRET!, opts);
  const call = (payload: any) => errOf(verifyPasswordResetService(payload, res));

  
  it("current behaviour: validation errors are re-wrapped as 500 (bug)", async () => {
    const e = await call({});
    expect(e.code).toBe(500);
    expect(JSON.parse(e.message)).toMatchObject({ code: 400, message: "Token and new password are required" });
  });

  it.fails("requires token and newPassword", async () => expect(await call({})).toMatchObject({ code: 400, message: "Token and new password are required" }));
  it.fails("rejects mismatching passwords", async () => expect(await call({ token: token(), newPassword: "password1", confirmPassword: "password2" })).toMatchObject({ message: "Passwords do not match" }));
  it.fails("rejects short passwords", async () => expect(await call({ token: token(), newPassword: "short", confirmPassword: "short" })).toMatchObject({ message: "Password must be at least 8 characters" }));
  it.fails("rejects an expired token", async () => expect(await call({ token: token("u1", { expiresIn: -5 }), newPassword: "password1", confirmPassword: "password1" })).toMatchObject({ code: 400, message: /^Reset link has expired/ }));
  it.fails("rejects a garbage token", async () => expect(await call({ token: "garbage", newPassword: "password1", confirmPassword: "password1" })).toMatchObject({ code: 400, message: /^Invalid reset link/ }));
  it.fails("404 when the user from the token is gone", async () => {
    vi.spyOn(usersModel, "findById").mockResolvedValue(null as any);
    expect(await call({ token: token(), newPassword: "password1", confirmPassword: "password1" })).toMatchObject({ code: 404 });
  });
  it("saves a bcrypt hash of the new password", async () => {
    const user: any = { password: "old", save: vi.fn().mockResolvedValue(undefined) };
    vi.spyOn(usersModel, "findById").mockResolvedValue(user);
    const r: any = await verifyPasswordResetService({ token: token(), newPassword: "password1", confirmPassword: "password1" }, res);
    expect(r.success).toBe(true);
    expect(user.save).toHaveBeenCalled();
    expect(bcrypt.compareSync("password1", user.password)).toBe(true);
  });
});
