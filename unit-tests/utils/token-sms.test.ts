import { describe, it, expect, vi, beforeEach } from "vitest";

const { model, create } = vi.hoisted(() => {
  const save = vi.fn();

  const model: any = vi.fn().mockImplementation(function (doc: any) {
    return {
      ...doc,
      save: save.mockResolvedValue({
        ...doc,
        _id: "new",
      }),
    };
  });

  model.findOne = vi.fn();
  model.findByIdAndDelete = vi.fn();

  return { model, create: vi.fn() };
});

vi.mock("src/models/password-token-schema", () => ({
  passwordResetTokenModel: model,
}));

vi.mock("../../src/models/password-token-schema", () => ({
  passwordResetTokenModel: model,
}));

vi.mock("twilio", () => ({
  default: vi.fn(() => ({
    messages: { create },
  })),
}));

import {
  generatePasswordResetToken,
  getPasswordResetTokenByToken,
  generatePasswordResetTokenByPhone,
} from "src/utils/mails/token";

import { generatePasswordResetTokenByPhoneWithTwilio } from "src/utils/sms/sms";

beforeEach(() => {
  model.findOne.mockReset();
  model.findByIdAndDelete.mockReset();
  create.mockReset();
});

describe("generatePasswordResetToken", () => {
  it("creates a 6-digit numeric token that expires in ~1 hour", async () => {
    model.findOne.mockResolvedValue(null);

    const r: any = await generatePasswordResetToken("a@b.com");

    expect(r.email).toBe("a@b.com");

    expect(r.token).toMatch(/^\d{6}$/);

    const diff = new Date(r.expires).getTime() - Date.now();

    expect(diff).toBeGreaterThan(59 * 60 * 1000);

    expect(diff).toBeLessThanOrEqual(60 * 60 * 1000);

    expect(model.findByIdAndDelete).not.toHaveBeenCalled();
  });

  it("deletes an existing token for the same email first", async () => {
    model.findOne.mockResolvedValue({ _id: "old" });

    await generatePasswordResetToken("a@b.com");

    expect(model.findByIdAndDelete).toHaveBeenCalledWith("old");
  });
});

describe("getPasswordResetTokenByToken", () => {
  it("returns the stored token", async () => {
    model.findOne.mockResolvedValue({ token: "123456" });

    expect(await getPasswordResetTokenByToken("123456")).toEqual({
      token: "123456",
    });

    expect(model.findOne).toHaveBeenCalledWith({
      token: "123456",
    });
  });

  it("returns null if the lookup throws", async () => {
    model.findOne.mockRejectedValue(new Error("db"));

    expect(await getPasswordResetTokenByToken("1")).toBeNull();
  });
});

describe("generatePasswordResetTokenByPhone", () => {
  it("stores the phone number and replaces an older token", async () => {
    model.findOne.mockResolvedValue({ _id: "old" });

    const r: any = await generatePasswordResetTokenByPhone("+27123");

    expect(model.findOne).toHaveBeenCalledWith({
      phoneNumber: "+27123",
    });

    expect(model.findByIdAndDelete).toHaveBeenCalledWith("old");

    expect(r.phoneNumber).toBe("+27123");

    expect(r.token).toMatch(/^\d{6}$/);
  });
});

describe("generatePasswordResetTokenByPhoneWithTwilio", () => {
  it("sends an SMS containing the generated token", async () => {
    model.findOne.mockResolvedValue(null);

    create.mockResolvedValue({ sid: "SM1" });

    const r = await generatePasswordResetTokenByPhoneWithTwilio(
      "+27123",
      "ignored"
    );

    expect(r).toEqual({
      success: true,
      message: "Password reset token sent via SMS",
    });

    const body = create.mock.calls[0][0];

    expect(body.to).toBe("+27123");

    expect(body.body).toMatch(/token is: \d{6}\./);
  });

  it("returns success:false when Twilio fails", async () => {
    model.findOne.mockResolvedValue(null);

    create.mockRejectedValue(new Error("twilio"));

    const r: any = await generatePasswordResetTokenByPhoneWithTwilio(
      "+27123",
      "x"
    );

    expect(r.success).toBe(false);

    expect(r.message).toBe(
      "Failed to send password reset token via SMS"
    );
  });
});