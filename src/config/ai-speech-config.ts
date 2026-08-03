// config/ai-speech-config.ts

interface SpeechModel {
  name: string;
  description: string;
  voices: string[];
  costPer1000Chars?: number;
  costPerMillionChars?: number;
}

type SpeechProvider = Record<string, SpeechModel>;

export const SPEECH_MODELS: Record<string, SpeechProvider> = {
  openai: {
    "tts-1": {
      name: "TTS-1",
      description: "Standard text-to-speech",
      costPer1000Chars: 0.015,
      voices: ["alloy", "echo", "fable", "onyx", "nova", "shimmer"],
    },
    "tts-1-hd": {
      name: "TTS-1-HD",
      description: "High definition text-to-speech",
      costPer1000Chars: 0.03,
      voices: ["alloy", "echo", "fable", "onyx", "nova", "shimmer"],
    },
  },

  google: {
    standard: {
      name: "Standard",
      description: "Standard neural voices",
      costPerMillionChars: 4.0,
      voices: [
        "en-US-Neural2-A",
        "en-US-Neural2-C",
        "en-US-Neural2-D",
      ],
    },

    studio: {
      name: "Studio",
      description: "Studio quality voices",
      costPerMillionChars: 16.0,
      voices: [
        "en-US-Studio-O",
        "en-US-Studio-M",
        "en-US-Studio-Q",
      ],
    },
  },

  elevenlabs: {
    eleven_turbo_v2: {
      name: "Eleven Turbo v2",
      description: "Fast, high-quality TTS",
      costPer1000Chars: 0.02,
      voices: ["Sarah", "Daniel", "Lisa", "James"],
    },

    eleven_multilingual_v2: {
      name: "Eleven Multilingual v2",
      description: "High-quality multilingual TTS",
      costPer1000Chars: 0.03,
      voices: [
        "Sarah",
        "Daniel",
        "Lisa",
        "James",
        "Emma",
        "Oliver",
      ],
    },
  },
};

export const EXCHANGE_RATE = 16.6;

export const calculateSpeechCost = (
  model: string,
  charCount: number
): { usd: number; zar: number } => {
  let costPerUnit = 0;

  for (const [, models] of Object.entries(SPEECH_MODELS)) {
    const modelConfig = models[model];

    if (modelConfig) {
      if (modelConfig.costPerMillionChars !== undefined) {
        costPerUnit = modelConfig.costPerMillionChars / 1_000_000;
      } else if (modelConfig.costPer1000Chars !== undefined) {
        costPerUnit = modelConfig.costPer1000Chars / 1000;
      }

      break;
    }
  }

  const usd = Number((charCount * costPerUnit).toFixed(4));
  const zar = Number((usd * EXCHANGE_RATE).toFixed(2));

  return {
    usd,
    zar,
  };
};

export const getVoices = (provider: string): string[] => {
  const models = SPEECH_MODELS[provider];

  if (!models) {
    return [];
  }

  const firstModel = Object.values(models)[0];

  return firstModel?.voices ?? [];
};

export const getModelsByProvider = (
  provider: string
): SpeechProvider | null => {
  return SPEECH_MODELS[provider] ?? null;
};

export const getModel = (
  provider: string,
  model: string
): SpeechModel | null => {
  return SPEECH_MODELS[provider]?.[model] ?? null;
};