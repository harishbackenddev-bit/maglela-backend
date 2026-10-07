import { describe, it, expect } from "vitest";
import * as cost from "src/config/ai-cost-config";
import * as speech from "src/config/ai-speech-config";
import { PAYFAST_CONFIG, CREDIT_PAYFAST_CONFIG, INVOICE_PAYFAST_CONFIG } from "src/config/payfast.config";

describe("ai-cost-config", () => {
  it("EXCHANGE_RATE is 16.6", () => expect(cost.EXCHANGE_RATE).toBe(16.6));
  it("every model has a name and provider", () => {
    for (const [k, m] of Object.entries(cost.AI_MODELS)) {
      expect(m.name, k).toBeTruthy();
      expect(m.provider, k).toBeTruthy();
    }
  });
  it("getModelConfig / modelExists", () => {
    expect(cost.getModelConfig("claude-sonnet-4-6")?.provider).toBe("anthropic");
    expect(cost.getModelConfig("nope")).toBeNull();
    expect(cost.modelExists("claude-sonnet-4-6")).toBe(true);
    expect(cost.modelExists("nope")).toBe(false);
  });
  it("calculateDraftCost multiplies tokens by per-token rate and converts to ZAR", () => {
    const r = cost.calculateDraftCost("claude-sonnet-4-6", 1000, 500);
    expect(r.usd).toBeCloseTo(1000 * 0.000003 + 500 * 0.000015, 10);
    expect(r.zar).toBeCloseTo(r.usd * 16.6, 10);
  });
  it("calculateDraftCost falls back to Sonnet rates for unknown models", () => {
    expect(cost.calculateDraftCost("unknown", 1000, 1000).usd).toBeCloseTo(0.018, 10);
  });
  it("calculateDraftCost is zero for zero tokens", () => expect(cost.calculateDraftCost("claude-sonnet-4-6", 0, 0)).toEqual({ usd: 0, zar: 0 }));
  it("calculateSpeechCost returns 0 for unknown model / model without per-char price", () => {
    expect(cost.calculateSpeechCost("unknown", 1000)).toEqual({ usd: 0, zar: 0 });
    expect(cost.calculateSpeechCost("claude-sonnet-4-6", 1000)).toEqual({ usd: 0, zar: 0 });
  });
  it("calculateSpeechCost for a per-1000-chars model", () => {
    const entry = Object.entries(cost.AI_MODELS).find(([, m]) => m.costPer1000Chars);
    if (!entry) return;
    const [name, m] = entry;
    expect(cost.calculateSpeechCost(name, 2000).usd).toBeCloseTo(2 * (m.costPer1000Chars as number), 5);
  });
  it("getCostPerTask handles unknown model", () => expect(cost.getCostPerTask("nope")).toEqual({ usd: 0, zar: 0 }));
  it("getModelRecommendations known + default", () => {
    expect(cost.getModelRecommendations("policy-brief")).toEqual(["claude-sonnet-4-6"]);
    expect(cost.getModelRecommendations("anything")).toEqual(["gpt-4o", "claude-sonnet-4-6"]);
  });
  it("every recommended model exists in AI_MODELS", () => {
    for (const t of ["policy-brief", "impact-report", "speech", "summary", "press-release", "blog-post", "op-ed", "media-story", "bulk-processing"]) {
      for (const m of cost.getModelRecommendations(t)) expect(cost.modelExists(m), `${t} -> ${m}`).toBe(true);
    }
  });
  it("MODEL_MAPPING only references existing models", () => {
    for (const group of Object.values(cost.MODEL_MAPPING)) for (const list of Object.values(group)) for (const m of list) expect(cost.modelExists(m), m).toBe(true);
  });
  it("getVoicesForModel returns [] for unknown", () => expect(cost.getVoicesForModel("nope")).toEqual([]));
  it("default export bundles the helpers", () => expect(cost.default.calculateDraftCost).toBe(cost.calculateDraftCost));
});

describe("ai-speech-config", () => {
  it("supported providers", () => {
    expect(speech.getSupportedProviders()).toEqual(["openai", "anthropic"]);
    expect(speech.isProviderSupported("openai")).toBe(true);
    expect(speech.isProviderSupported("elevenlabs")).toBe(false);
  });
  it("getVoices returns [] for unknown provider", () => expect(speech.getVoices("nope")).toEqual([]));
  it("getModelsByProvider / getModel null on miss", () => {
    expect(speech.getModelsByProvider("nope")).toBeNull();
    expect(speech.getModel("openai", "nope")).toBeNull();
  });
  it("calculateSpeechCost is 0 for unknown model and scales for known ones", () => {
    expect(speech.calculateSpeechCost("nope", 1000)).toEqual({ usd: 0, zar: 0 });
    for (const [provider, models] of Object.entries(speech.SPEECH_MODELS)) {
      for (const name of Object.keys(models)) {
        const a = speech.calculateSpeechCost(name, 1_000_000);
        const b = speech.calculateSpeechCost(name, 2_000_000);
        expect(b.usd, `${provider}/${name}`).toBeCloseTo(a.usd * 2, 3);
      }
    }
  });
});

describe("payfast.config", () => {
  it("test mode uses the sandbox urls", () => {
    expect(PAYFAST_CONFIG.mode).toBe("test");
    expect(PAYFAST_CONFIG.paymentUrl).toBe("https://sandbox.payfast.co.za/eng/process");
    expect(PAYFAST_CONFIG.validateUrl).toBe("https://sandbox.payfast.co.za/eng/query/validate");
  });
  it("live mode switches urls", () => {
    const live = Object.create(PAYFAST_CONFIG, { mode: { value: "live" } });
    expect(live.paymentUrl).toBe("https://www.payfast.co.za/eng/process");
    expect(live.validateUrl).toBe("https://www.payfast.co.za/eng/query/validate");
  });
  it.each([["credit", CREDIT_PAYFAST_CONFIG], ["invoice", INVOICE_PAYFAST_CONFIG]])("%s config has merchant + return/cancel/notify urls", (_n, c) => {
    expect(c.merchantId).toBeTruthy();
    expect(c.merchantKey).toBeTruthy();
    expect(c.returnUrl).toMatch(/^https?:\/\
    expect(c.cancelUrl).toMatch(/^https?:\/\
    expect(c.notifyUrl).toMatch(/^https?:\/\
  });
  it("credit/invoice urls are built from FRONTEND_URL / BASE_URL", () => {
    expect(CREDIT_PAYFAST_CONFIG.returnUrl).toBe("http://localhost:5173/user/credit-success");
    expect(CREDIT_PAYFAST_CONFIG.notifyUrl).toBe("http://localhost:8000/api/user/credit/payfast/notify");
    expect(INVOICE_PAYFAST_CONFIG.cancelUrl).toBe("http://localhost:5173/user/invoice-cancelled");
  });
});
