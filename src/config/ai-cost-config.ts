

export const EXCHANGE_RATE = 16.6; 





export interface AIModelConfig {
    name: string;
    provider: string;
    description: string;
    costPerInputToken?: number;
    costPerOutputToken?: number;
    costPerTask?: number;
    costPer1000Chars?: number;
    bestFor?: string;
    voices?: string[];
}





export const AI_MODELS: Record<string, AIModelConfig> = {
    
    
    
    
    
    "claude-sonnet-4-6": {
        name: "Claude Sonnet 4.6",
        provider: "anthropic",
        description: "Deep research drafts, voice calibration, policy briefs",
        costPerInputToken: 0.000003,   
        costPerOutputToken: 0.000015,  
        bestFor: "Full research drafts, voice calibration, policy briefs",
        voices: [],
    },
    
    
    "claude-haiku-4-5": {
        name: "Claude Haiku 4.5",
        provider: "anthropic",
        description: "Fast, simple tasks — routing, tagging, extraction",
        costPerInputToken: 0.000001,   
        costPerOutputToken: 0.000005,  
        bestFor: "Routing, sorting, simple extraction (background tasks)",
        voices: [],
    },

    
    
    
    
    
    "gpt-4o": {
        name: "GPT-4o",
        provider: "openai",
        description: "Structured summaries, classification, reliable outputs",
        costPerInputToken: 0.000005,   
        costPerOutputToken: 0.000015,  
        bestFor: "Summaries, classification, quick rewrites",
        voices: ["alloy", "echo", "fable", "onyx", "nova", "shimmer"],
    },
    
    
    "gpt-4o-mini": {
        name: "GPT-4o Mini",
        provider: "openai",
        description: "Fast, cost-effective for simple tasks",
        costPerInputToken: 0.00000015,  
        costPerOutputToken: 0.0000006,  
        bestFor: "Simple, high-volume tasks",
        voices: ["alloy", "echo", "fable", "onyx", "nova", "shimmer"],
    },

    
    
    
    "google-gemini-flash": {
        name: "Google Gemini Flash",
        provider: "google",
        description: "High-volume batch work at very low cost",
        costPerInputToken: 0.00000035, 
        costPerOutputToken: 0.00000105, 
        bestFor: "Bulk processing only",
        voices: [],
    },
    "google-gemini-pro": {
        name: "Google Gemini Pro",
        provider: "google",
        description: "Balanced performance for general tasks",
        costPerInputToken: 0.00000125, 
        costPerOutputToken: 0.000005, 
        bestFor: "General purpose tasks",
        voices: [],
    },

    
    
    
    "tts-1": {
        name: "OpenAI TTS-1",
        provider: "openai",
        description: "Standard text-to-speech",
        costPer1000Chars: 0.015, 
        bestFor: "Standard quality TTS",
        voices: ["alloy", "echo", "fable", "onyx", "nova", "shimmer"],
    },
    "tts-1-hd": {
        name: "OpenAI TTS-1-HD",
        provider: "openai",
        description: "High definition text-to-speech",
        costPer1000Chars: 0.030, 
        bestFor: "High quality TTS",
        voices: ["alloy", "echo", "fable", "onyx", "nova", "shimmer"],
    },
};





export const SMART_ROUTER_MATRIX = {
    
    "policy-brief": {
        recommended: ["claude-sonnet-4-6"],
        description: "Full research drafts, policy briefs"
    },
    "impact-report": {
        recommended: ["claude-sonnet-4-6"],
        description: "Full research drafts, impact reports"
    },
    "speech": {
        recommended: ["claude-sonnet-4-6", "gpt-4o"],
        description: "Voice calibration, speeches"
    },
    "summary": {
        recommended: ["gpt-4o", "gpt-4o-mini"],
        description: "Summaries, quick rewrites"
    },
    "press-release": {
        recommended: ["gpt-4o", "claude-sonnet-4-6"],
        description: "Structured summaries, classification"
    },
    "blog-post": {
        recommended: ["gpt-4o", "claude-sonnet-4-6"],
        description: "Quick rewrites, blog posts"
    },
    "op-ed": {
        recommended: ["claude-sonnet-4-6", "gpt-4o"],
        description: "Full research drafts, op-eds"
    },
    "media-story": {
        recommended: ["gpt-4o", "claude-sonnet-4-6"],
        description: "Quick rewrites, media stories"
    },
    "routing": {
        recommended: ["claude-haiku-4-5"],
        description: "Routing, sorting, simple extraction"
    },
    "bulk-processing": {
        recommended: ["google-gemini-flash", "claude-haiku-4-5"],
        description: "High-volume batch work, background tasks"
    },
};






export const getModelConfig = (model: string): AIModelConfig | null => {
    return AI_MODELS[model] || null;
};


export const calculateDraftCost = (
    model: string,
    inputTokens: number,
    outputTokens: number
): { usd: number; zar: number } => {
    const modelConfig = getModelConfig(model);

    
    
    
    const rates = modelConfig || { costPerInputToken: 0.000003, costPerOutputToken: 0.000015 };

    const inputCost = inputTokens * (rates.costPerInputToken || 0);
    const outputCost = outputTokens * (rates.costPerOutputToken || 0);
    const totalUSD = inputCost + outputCost;

    return {
        usd: totalUSD,          
        zar: totalUSD * EXCHANGE_RATE,
    };
};


export const calculateSpeechCost = (
    model: string,
    charCount: number
): { usd: number; zar: number } => {
    const modelConfig = getModelConfig(model);
    if (!modelConfig || !modelConfig.costPer1000Chars) {
        return { usd: 0, zar: 0 };
    }

    const totalUSD = (charCount / 1000) * modelConfig.costPer1000Chars;

    return {
        usd: parseFloat(totalUSD.toFixed(6)),
        zar: parseFloat((totalUSD * EXCHANGE_RATE).toFixed(2)),
    };
};


export const getCostPerTask = (model: string): { usd: number; zar: number } => {
    const modelConfig = getModelConfig(model);
    if (!modelConfig) {
        return { usd: 0, zar: 0 };
    }

    const costPerTask = modelConfig.costPerTask || 0;

    return {
        usd: parseFloat(costPerTask.toFixed(4)),
        zar: parseFloat((costPerTask * EXCHANGE_RATE).toFixed(2)),
    };
};


export const getModelRecommendations = (type: string): string[] => {
    const recommendations: Record<string, string[]> = {
        'policy-brief': ['claude-sonnet-4-6'],
        'impact-report': ['claude-sonnet-4-6'],
        'speech': ['claude-sonnet-4-6', 'gpt-4o'],
        'summary': ['gpt-4o', 'gpt-4o-mini'],
        'press-release': ['gpt-4o', 'claude-sonnet-4-6'],
        'blog-post': ['gpt-4o', 'claude-sonnet-4-6'],
        'op-ed': ['claude-sonnet-4-6', 'gpt-4o'],
        'media-story': ['gpt-4o', 'claude-sonnet-4-6'],
        'bulk-processing': ['google-gemini-flash', 'claude-haiku-4-5'],
    };

    return recommendations[type] || ['gpt-4o', 'claude-sonnet-4-6'];
};


export const getVoicesForModel = (model: string): string[] => {
    const modelConfig = getModelConfig(model);
    return modelConfig?.voices || [];
};


export const modelExists = (model: string): boolean => {
    return !!AI_MODELS[model];
};





export const MODEL_MAPPING = {
    writing: {
        complex: ['claude-sonnet-4-6'],
        balanced: ['gpt-4o', 'claude-sonnet-4-6'],
        simple: ['gpt-4o-mini', 'claude-haiku-4-5'],
        bulk: ['google-gemini-flash', 'claude-haiku-4-5'],
    },
    speech: {
        highQuality: ['claude-sonnet-4-6', 'gpt-4o'],
        standard: ['gpt-4o', 'claude-sonnet-4-6'],
        fast: ['gpt-4o-mini', 'claude-haiku-4-5'],
    },
};

export default {
    AI_MODELS,
    EXCHANGE_RATE,
    SMART_ROUTER_MATRIX,
    getModelConfig,
    calculateDraftCost,
    calculateSpeechCost,
    getCostPerTask,
    getModelRecommendations,
    getVoicesForModel,
    modelExists,
    MODEL_MAPPING,
};