// services/ai/aiGenerateService.ts
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { 
    AI_MODELS, 
    calculateDraftCost,
    EXCHANGE_RATE 
} from "../../config/ai-cost-config";

// ✅ Initialize clients conditionally
let openai: OpenAI | null = null;
let anthropic: Anthropic | null = null;

// Initialize OpenAI if API key is available
if (process.env.OPENAI_API_KEY) {
    try {
        openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        console.log("✅ OpenAI client initialized");
    } catch (error) {
        console.warn("⚠️ Failed to initialize OpenAI client");
    }
} else {
    console.warn("⚠️ OPENAI_API_KEY not set. OpenAI services will not be available.");
}

// Initialize Anthropic if API key is available
if (process.env.ANTHROPIC_API_KEY) {
    try {
        anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
        console.log("✅ Anthropic client initialized");
    } catch (error) {
        console.warn("⚠️ Failed to initialize Anthropic client");
    }
} else {
    console.warn("⚠️ ANTHROPIC_API_KEY not set. Claude services will not be available.");
}

// ✅ Check if any AI service is available
const isAIEnabled = !!(openai || anthropic);

interface GenerateParams {
    title: string;
    type: string;
    tone: string;
    includeOutline: boolean;
    fileContent: string;
    userId: string;
    preferredModel?: 'openai' | 'anthropic'; // Optional: force a specific provider
}

interface GenerateResult {
    content: string;
    outline?: string;
    wordCount: number;
    tokensUsed: {
        input: number;
        output: number;
        total: number;
    };
    modelUsed: string;
    provider: 'openai' | 'anthropic';
    costEstimate: {
        usd: number;
        zar: number;
    };
    generatedAt: string;
}

// ============================================
// PROMPT GENERATORS
// ============================================

const getSystemPrompt = (type: string, tone: string): string => {
    const toneInstructions: Record<string, string> = {
        formal: "Write in a formal, academic tone. Use precise language, avoid contractions, and maintain a professional register.",
        authoritative: "Write with authority and confidence. Use declarative statements and demonstrate deep expertise.",
        accessible: "Write in clear, accessible language. Avoid jargon and explain complex concepts simply.",
        persuasive: "Write persuasively. Use rhetorical devices and compelling arguments.",
        neutral: "Write in a balanced, neutral tone. Present information objectively.",
    };

    const typeInstructions: Record<string, string> = {
        'policy-brief': 'Create a structured policy brief with: 1) Executive Summary, 2) Key Findings, 3) Policy Recommendations, 4) Evidence Base, 5) Conclusion.',
        'op-ed': 'Write a compelling op-ed with: 1) Strong opening hook, 2) Clear argument, 3) Evidence and examples, 4) Call to action.',
        'impact-report': 'Create an impact report with: 1) Executive Summary, 2) Key Achievements, 3) Data and Metrics, 4) Case Studies, 5) Future Outlook.',
        'speech': 'Write a speech with: 1) Opening remarks, 2) Main message, 3) Supporting points, 4) Inspiring conclusion.',
        'press-release': 'Write a press release with: 1) Headline, 2) Lead paragraph, 3) Body with key details, 4) Quote, 5) Boilerplate.',
        'summary': 'Create a concise summary highlighting the key points and findings.',
        'media-story': 'Write a compelling media story suitable for news or blog publication.',
        'blog-post': 'Write a blog post with: 1) Engaging title, 2) Introduction, 3) Key points, 4) Conclusion, 5) Call to action.',
    };

    return `You are Magalela's Narrative Engine, an expert institutional communication assistant.
Your task is to transform research and data into high-quality institutional content.

${toneInstructions[tone] || toneInstructions.neutral}

${typeInstructions[type] || 'Generate appropriate content based on the source.'}

Important guidelines:
1. Always base content on the provided source material
2. Cite specific findings and data points from the source
3. Maintain academic integrity while making content accessible
4. Do not add information not supported by the source
5. Structure content clearly with appropriate headings
6. Output must be publication-ready and professional
7. Use markdown formatting for headings and structure`;
};

const getUserPrompt = (content: string, title: string, type: string, includeOutline: boolean): string => {
    let prompt = `Title: ${title}\n\nSource Material:\n${content}\n\n`;
    prompt += `Please generate a ${type} based on the source material provided.`;

    if (includeOutline) {
        prompt += ' Please also provide a detailed outline at the beginning of the response.';
    }

    return prompt;
};

// ============================================
// GENERATE WITH OPENAI
// ============================================

const generateWithOpenAI = async (
    content: string,
    title: string,
    type: string,
    tone: string,
    includeOutline: boolean
) => {
    if (!openai) {
        throw new Error("OpenAI client is not available. Please set OPENAI_API_KEY.");
    }

    const systemPrompt = getSystemPrompt(type, tone);
    const userPrompt = getUserPrompt(content, title, type, includeOutline);

    const response = await openai.chat.completions.create({
        model: "gpt-4o",
        max_tokens: 4000,
        temperature: 0.7,
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
        ],
    });

    const result = response.choices[0]?.message?.content || "";
    const usage = response.usage || { prompt_tokens: 0, completion_tokens: 0 };

    return {
        content: result,
        inputTokens: usage.prompt_tokens || 0,
        outputTokens: usage.completion_tokens || 0,
    };
};

// ============================================
// GENERATE WITH CLAUDE
// ============================================

const generateWithClaude = async (
    content: string,
    title: string,
    type: string,
    tone: string,
    includeOutline: boolean
) => {
    if (!anthropic) {
        throw new Error("Anthropic client is not available. Please set ANTHROPIC_API_KEY.");
    }

    const systemPrompt = getSystemPrompt(type, tone);
    const userPrompt = getUserPrompt(content, title, type, includeOutline);

    const response = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 4000,
        temperature: 0.7,
        system: systemPrompt,
        messages: [
            { role: "user", content: userPrompt },
        ],
    });

    const result = response.content[0]?.type === "text" ? response.content[0].text : "";
    return {
        content: result,
        inputTokens: response.usage?.input_tokens || 0,
        outputTokens: response.usage?.output_tokens || 0,
    };
};

// ============================================
// MAIN GENERATION FUNCTION (HYBRID)
// ============================================

export const aiGenerateService = async (params: GenerateParams): Promise<GenerateResult> => {
    const { title, type, tone, includeOutline, fileContent, preferredModel } = params;

    // Check if any AI service is available
    if (!isAIEnabled) {
        throw new Error(
            "No AI service is configured. Please set either OPENAI_API_KEY or ANTHROPIC_API_KEY in your .env file."
        );
    }

    let provider: 'openai' | 'anthropic';
    let modelUsed: string;
    let content: string = "";
    let inputTokens: number = 0;
    let outputTokens: number = 0;

    try {
        // Determine which AI to use
        // Priority: preferredModel > available services
        if (preferredModel === 'openai' && openai) {
            provider = 'openai';
            modelUsed = 'gpt-4o';
            const result = await generateWithOpenAI(fileContent, title, type, tone, includeOutline);
            content = result.content;
            inputTokens = result.inputTokens;
            outputTokens = result.outputTokens;
        } else if (preferredModel === 'anthropic' && anthropic) {
            provider = 'anthropic';
            modelUsed = 'claude-3-5-sonnet-20241022';
            const result = await generateWithClaude(fileContent, title, type, tone, includeOutline);
            content = result.content;
            inputTokens = result.inputTokens;
            outputTokens = result.outputTokens;
        } else if (openai) {
            // Fallback to OpenAI if available
            provider = 'openai';
            modelUsed = 'gpt-4o';
            const result = await generateWithOpenAI(fileContent, title, type, tone, includeOutline);
            content = result.content;
            inputTokens = result.inputTokens;
            outputTokens = result.outputTokens;
        } else if (anthropic) {
            // Fallback to Claude if OpenAI not available
            provider = 'anthropic';
            modelUsed = 'claude-3-5-sonnet-20241022';
            const result = await generateWithClaude(fileContent, title, type, tone, includeOutline);
            content = result.content;
            inputTokens = result.inputTokens;
            outputTokens = result.outputTokens;
        } else {
            throw new Error("No AI service available. Please check your API keys.");
        }

        // Extract outline if requested
        let outline: string | undefined;
        if (includeOutline && content) {
            outline = extractOutline(content);
        }

        const wordCount = content.split(/\s+/).length;

        // Calculate cost
        const cost = calculateDraftCost(modelUsed, inputTokens, outputTokens);

        return {
            content,
            outline,
            wordCount,
            tokensUsed: {
                input: inputTokens,
                output: outputTokens,
                total: inputTokens + outputTokens,
            },
            modelUsed,
            provider,
            costEstimate: cost,
            generatedAt: new Date().toISOString(),
        };

    } catch (error: any) {
        console.error("AI generation error:", error);
        throw new Error(error.message || "Failed to generate content");
    }
};

// ============================================
// HELPER FUNCTIONS
// ============================================

const extractOutline = (content: string): string | undefined => {
    const lines = content.split('\n');
    const outlineLines: string[] = [];
    let collecting = false;

    for (const line of lines) {
        if (line.match(/^\s*(Outline|Table of Contents|Overview|Structure):/i)) {
            collecting = true;
            outlineLines.push(line.trim());
            continue;
        }
        if (collecting) {
            if (line.trim() === '' && outlineLines.length > 1) break;
            if (line.match(/^#{1,3}\s+/)) break;
            outlineLines.push(line.trim());
        }
        if (!collecting && (line.match(/^\s*[\d.]+[\)]?\s+/) || line.match(/^[\s-]+/))) {
            outlineLines.push(line.trim());
        }
    }

    return outlineLines.length > 0 ? outlineLines.join('\n') : undefined;
};

// ============================================
// EXPORT UTILITY FUNCTIONS
// ============================================

export const getAvailableProviders = (): string[] => {
    const providers: string[] = [];
    if (openai) providers.push('openai');
    if (anthropic) providers.push('anthropic');
    return providers;
};

export const isAIReady = (): boolean => {
    return !!(openai || anthropic);
};