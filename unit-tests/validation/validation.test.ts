import { describe, it, expect } from "vitest";
import { ZodError } from "zod";
import { adminUserLoginSchema, sendNotificationToUserSchema } from "src/validation/admin-user";
import { clientSignupSchema, clientEditSchema, passswordResetSchema, requestTextToVideoSchema, requestAudioToVideoSchema, requestVideoTranslationSchema } from "src/validation/client-user";
import { aiGenerateSchema, aiCostEstimateSchema } from "src/validation/ai-validation";
import { aiSpeechGenerateSchema, audioTranscriptionSchema } from "src/validation/ai-speech-validation";
import { formatZodErrors } from "src/validation/format-zod-errors";

describe("adminUserLoginSchema", () => {
  it("accepts valid input", () => expect(adminUserLoginSchema.safeParse({ email: "a@b.com", password: "x" }).success).toBe(true));
  it("rejects bad email", () => expect(adminUserLoginSchema.safeParse({ email: "nope", password: "x" }).success).toBe(false));
  it("rejects extra keys (strict)", () => expect(adminUserLoginSchema.safeParse({ email: "a@b.com", password: "x", role: "admin" }).success).toBe(false));
});

describe("sendNotificationToUserSchema", () => {
  it("accepts title+message", () => expect(sendNotificationToUserSchema.safeParse({ title: "t", message: "m" }).success).toBe(true));
  it("accepts ids", () => expect(sendNotificationToUserSchema.safeParse({ title: "t", message: "m", ids: ["1"] }).success).toBe(true));
  it("rejects empty ids array", () => expect(sendNotificationToUserSchema.safeParse({ title: "t", message: "m", ids: [] }).success).toBe(false));
  it("rejects empty title", () => expect(sendNotificationToUserSchema.safeParse({ title: "", message: "m" }).success).toBe(false));
});

describe("clientSignupSchema", () => {
  const ok = { email: "a@b.com", password: "12345678", name: "Ann" };
  it("accepts valid input and defaults accountType to individual", () => {
    const r = clientSignupSchema.parse(ok);
    expect(r.accountType).toBe("individual");
  });
  it("rejects short password", () => expect(clientSignupSchema.safeParse({ ...ok, password: "1234567" }).success).toBe(false));
  it("rejects bad accountType", () => expect(clientSignupSchema.safeParse({ ...ok, accountType: "admin" }).success).toBe(false));
  it("rejects unknown keys", () => expect(clientSignupSchema.safeParse({ ...ok, role: "admin" }).success).toBe(false));
});

describe("clientEditSchema", () => {
  it("allows an empty object (partial)", () => expect(clientEditSchema.safeParse({}).success).toBe(true));
  it("allows a single field", () => expect(clientEditSchema.safeParse({ city: "Cape Town" }).success).toBe(true));
  it("rejects empty strings", () => expect(clientEditSchema.safeParse({ city: "" }).success).toBe(false));
  it("rejects unknown keys", () => expect(clientEditSchema.safeParse({ role: "x" }).success).toBe(false));
});

describe("passswordResetSchema", () => {
  it("accepts different passwords", () => expect(passswordResetSchema.safeParse({ currentPassword: "a", newPassword: "b" }).success).toBe(true));
  it("rejects identical passwords with a message on newPassword", () => {
    const r = passswordResetSchema.safeParse({ currentPassword: "a", newPassword: "a" });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0].path).toEqual(["newPassword"]);
  });
});

describe("video request schemas", () => {
  it("text-to-video valid", () => expect(requestTextToVideoSchema.safeParse({ text: "t", projectAvatar: "a", textLanguage: "en", preferredVoice: "v", subtitles: true }).success).toBe(true));
  it("text-to-video requires subtitles boolean", () => expect(requestTextToVideoSchema.safeParse({ text: "t", projectAvatar: "a", textLanguage: "en", preferredVoice: "v" }).success).toBe(false));
  it("audio-to-video valid", () => expect(requestAudioToVideoSchema.safeParse({ audio: "a", audioLength: 5, projectAvatar: "p", subtitles: false }).success).toBe(true));
  it("audio-to-video rejects audioLength < 1", () => expect(requestAudioToVideoSchema.safeParse({ audio: "a", audioLength: 0, projectAvatar: "p", subtitles: false }).success).toBe(false));
  it("video translation valid", () => expect(requestVideoTranslationSchema.safeParse({ video: "v", preferredVoice: "x", projectAvatar: "p", subtitles: true, videoLength: 3, originalText: "o", translatedText: "t" }).success).toBe(true));
  it("video translation missing fields", () => expect(requestVideoTranslationSchema.safeParse({ video: "v" }).success).toBe(false));
});

describe("aiGenerateSchema", () => {
  it("applies defaults (tone=neutral, includeOutline=false)", () => {
    const r = aiGenerateSchema.parse({ title: "T", type: "op-ed" });
    expect(r.tone).toBe("neutral");
    expect(r.includeOutline).toBe(false);
  });
  it.each([["true", true], ["1", true], ["false", false], ["0", false], [true, true]])("includeOutline %j -> %j", (input, out) => {
    expect(aiGenerateSchema.parse({ title: "T", type: "speech", includeOutline: input }).includeOutline).toBe(out);
  });
  it("rejects unknown type", () => expect(aiGenerateSchema.safeParse({ title: "T", type: "poem" }).success).toBe(false));
  it("rejects empty and too-long title", () => {
    expect(aiGenerateSchema.safeParse({ title: "", type: "op-ed" }).success).toBe(false);
    expect(aiGenerateSchema.safeParse({ title: "x".repeat(201), type: "op-ed" }).success).toBe(false);
  });
  it("rejects unknown tone", () => expect(aiGenerateSchema.safeParse({ title: "T", type: "op-ed", tone: "angry" }).success).toBe(false));
});

describe("aiCostEstimateSchema", () => {
  it("defaults to 50 users / 20 drafts when missing or non-numeric", () => {
    expect(aiCostEstimateSchema.parse({})).toEqual({ users: 50, draftsPerUser: 20 });
    expect(aiCostEstimateSchema.parse({ users: "abc", draftsPerUser: "x" })).toEqual({ users: 50, draftsPerUser: 20 });
  });
  it("parses numeric strings", () => expect(aiCostEstimateSchema.parse({ users: "10", draftsPerUser: "3" })).toEqual({ users: 10, draftsPerUser: 3 }));
});

describe("aiSpeechGenerateSchema", () => {
  it("requires title >= 3 chars", () => {
    expect(aiSpeechGenerateSchema.safeParse({ title: "ab" }).success).toBe(false);
    expect(aiSpeechGenerateSchema.safeParse({ title: "abc" }).success).toBe(true);
  });
  it("defaults metrics to '0' and accepts number or string", () => {
    const r = aiSpeechGenerateSchema.parse({ title: "Speech", clarity: 7 });
    expect(r.authority).toBe("0");
    expect(r.clarity).toBe(7);
  });
});

describe("audioTranscriptionSchema", () => {
  it("requires a file", () => expect(audioTranscriptionSchema.safeParse({}).success).toBe(false));
  it("defaults language to en", () => expect(audioTranscriptionSchema.parse({ file: { name: "a.mp3" } }).language).toBe("en"));
});

describe("formatZodErrors", () => {
  it("maps issues to {name, message} with dotted paths", () => {
    const r = clientSignupSchema.safeParse({ email: "bad", password: "1", name: "" });
    expect(r.success).toBe(false);
    if (!r.success) {
      const out = formatZodErrors(r.error as ZodError);
      expect(out).toEqual(expect.arrayContaining([
        expect.objectContaining({ name: "email" }),
        expect.objectContaining({ name: "password", message: "Password must be at least 8 characters" }),
        expect.objectContaining({ name: "name", message: "Name is required" }),
      ]));
    }
  });
});
