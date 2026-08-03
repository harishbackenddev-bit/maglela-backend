// services/ai/aiGenerateService.ts
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { 
    getModelConfig,
    calculateDraftCost,
    EXCHANGE_RATE,
    getModelRecommendations,
    MODEL_MAPPING,
    modelExists
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
        anthropic = new Anthropic({ 
            apiKey: process.env.ANTHROPIC_API_KEY,
            defaultHeaders: {
                'anthropic-version': '2023-06-01'
            }
        });
        console.log("✅ Anthropic client initialized");
    } catch (error) {
        console.warn("⚠️ Failed to initialize Anthropic client");
    }
} else {
    console.warn("⚠️ ANTHROPIC_API_KEY not set. Claude services will not be available.");
}

// ✅ Check if any AI service is available
const isAIEnabled = !!(openai || anthropic);

// ============================================
// ✅ LATEST MODEL NAMES (March 2026)
// ============================================

const ANTHROPIC_MODELS = {
    CLAUDE_SONNET_4_6: "claude-sonnet-4-6",
    CLAUDE_OPUS_4_8: "claude-opus-4-8"
};

const OPENAI_MODELS = {
    GPT_4O: "gpt-4o",
    GPT_4O_MINI: "gpt-4o-mini",
};

// ============================================
// SMART ROUTER - Decides which AI to use
// ============================================

interface RouterDecision {
    provider: 'openai' | 'anthropic';
    model: string;
    reason: string;
    confidence: number;
}

const smartRouter = (params: {
    type: string;
    tone: string;
    fileContent: string;
    title: string;
    includeOutline: boolean;
    preferredModel?: 'openai' | 'anthropic';
    isBulk?: boolean;
}): RouterDecision => {
    const { type, tone, fileContent, title, includeOutline, preferredModel, isBulk } = params;

    // ✅ If user explicitly prefers a model, use it
    if (preferredModel === 'openai' && openai) {
        return {
            provider: 'openai',
            model: OPENAI_MODELS.GPT_4O,
            reason: 'User explicitly requested OpenAI',
            confidence: 100
        };
    }
    if (preferredModel === 'anthropic' && anthropic) {
        return {
            provider: 'anthropic',
            model: ANTHROPIC_MODELS.CLAUDE_SONNET_4_6,
            reason: 'User explicitly requested Claude',
            confidence: 100
        };
    }

    // ✅ Check content characteristics
    const contentLength = fileContent.length;
    const hasComplexTerms = /(research|analysis|framework|methodology|policy|strategy|implementation|evaluation|assessment|recommendation)/i.test(fileContent);
    const hasTechnicalContent = /(algorithm|model|data|dataset|statistical|correlation|regression|hypothesis|variable|parameter)/i.test(fileContent);
    const hasData = /\d+%|\d+\.\d+|\d+,\d+|\$[\d,]+|[0-9]{4}/.test(fileContent);

    // ✅ Determine document type
    const complexTypes = ['policy-brief', 'impact-report', 'research-paper', 'speech'];
    const simpleTypes = ['summary', 'press-release', 'blog-post', 'media-story'];
    const isComplexType = complexTypes.includes(type);
    const isSimpleType = simpleTypes.includes(type);

    // ✅ Scoring - Initialize variables
    let claudeScore = 0;
    let openaiScore = 0;

    // Claude Sonnet 4.6 - Best for complex, high-quality content
    if (isComplexType) {
        claudeScore += 35;
    }
    if (contentLength > 5000) {
        claudeScore += 20;
    }
    if (hasComplexTerms) {
        claudeScore += 15;
    }
    if (hasTechnicalContent) {
        claudeScore += 15;
    }
    if (tone === 'authoritative' || tone === 'formal') {
        claudeScore += 10;
    }
    if (includeOutline) {
        claudeScore += 10;
    }
    if (type === 'speech') {
        claudeScore += 20;
    }
    if (type === 'policy-brief') {
        claudeScore += 25;
    }
    if (type === 'impact-report') {
        claudeScore += 20;
    }

    // GPT-4o - Best for summaries, structured tasks
    if (isSimpleType) {
        openaiScore += 30;
    }
    if (contentLength < 3000) {
        openaiScore += 20;
    }
    if (type === 'summary') {
        openaiScore += 30;
    }
    if (type === 'press-release') {
        openaiScore += 20;
    }
    if (tone === 'neutral' || tone === 'accessible') {
        openaiScore += 10;
    }
    if (!hasComplexTerms) {
        openaiScore += 15;
    }
    if (hasData && !hasTechnicalContent) {
        openaiScore += 10;
    }
    if (type === 'media-story') {
        openaiScore += 15;
    }
    if (type === 'blog-post') {
        openaiScore += 15;
    }

    // ✅ Bulk processing - Use cheapest models
    if (isBulk) {
        return {
            provider: 'openai',
            model: OPENAI_MODELS.GPT_4O_MINI,
            reason: 'Bulk processing - using cost-effective model',
            confidence: 90
        };
    }

    // ✅ Check availability
    if (!anthropic) claudeScore = -1;
    if (!openai) openaiScore = -1;

    // ✅ Decision
    if (claudeScore > openaiScore && anthropic) {
        let model = ANTHROPIC_MODELS.CLAUDE_SONNET_4_6;
        let reason = `Claude Sonnet 4.6 better suited for ${type} (score: ${claudeScore})`;
        
        if (contentLength > 10000 || type === 'policy-brief' || type === 'impact-report') {
            model = ANTHROPIC_MODELS.CLAUDE_OPUS_4_8;
            reason = `Claude Opus 4.8 better for complex ${type} (score: ${claudeScore})`;
        }
        
        // ✅ Check if model exists
        if (!modelExists(model)) {
            model = ANTHROPIC_MODELS.CLAUDE_SONNET_4_6;
            reason = `Fallback to Claude Sonnet 4.6 (${model} not available)`;
        }
        
        return {
            provider: 'anthropic',
            model: model,
            reason: reason,
            confidence: Math.min(Math.round((claudeScore / (claudeScore + openaiScore)) * 100), 95)
        };
    } else if (openaiScore > claudeScore && openai) {
        let model = OPENAI_MODELS.GPT_4O;
        let reason = `GPT-4o better suited for ${type} (score: ${openaiScore})`;
        
        if (isBulk || contentLength < 1000) {
            model = OPENAI_MODELS.GPT_4O_MINI;
            reason = `GPT-4o Mini better for simple ${type} (score: ${openaiScore})`;
        }
        
        return {
            provider: 'openai',
            model: model,
            reason: reason,
            confidence: Math.min(Math.round((openaiScore / (claudeScore + openaiScore)) * 100), 95)
        };
    } else if (openai) {
        return {
            provider: 'openai',
            model: OPENAI_MODELS.GPT_4O,
            reason: 'OpenAI selected as fallback',
            confidence: 70
        };
    } else if (anthropic) {
        return {
            provider: 'anthropic',
            model: ANTHROPIC_MODELS.CLAUDE_SONNET_4_6,
            reason: 'Claude Sonnet 4.6 selected as fallback',
            confidence: 70
        };
    } else {
        throw new Error("No AI service available. Please check your API keys.");
    }
};

// ============================================
// INTERFACES
// ============================================

interface GenerateParams {
    title: string;
    type: string;
    tone: string;
    includeOutline: boolean;
    fileContent: string;
    userId: string;
    preferredModel?: 'openai' | 'anthropic';
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
    routerDecision?: {
        provider: string;
        model: string;
        reason: string;
        confidence: number;
    };
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
// GENERATE WITH CLAUDE (Updated - No temperature)
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

    try {
        // ✅ Try with latest Sonnet 4.6 first
        const response = await anthropic.messages.create({
            model: ANTHROPIC_MODELS.CLAUDE_SONNET_4_6,
            max_tokens: 4000,
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

    } catch (error: any) {
        console.error("Claude API Error:", error);
        
        // ✅ Try fallback models
        const fallbackModels = [
            ANTHROPIC_MODELS.CLAUDE_OPUS_4_8,
        ];
        
        for (const fallbackModel of fallbackModels) {
            // ✅ Check if model exists
            if (!modelExists(fallbackModel)) continue;
            
            try {
                console.log(`⚠️ Trying fallback model: ${fallbackModel}`);
                const fallbackResponse = await anthropic.messages.create({
                    model: fallbackModel,
                    max_tokens: 4000,
                    system: systemPrompt,
                    messages: [
                        { role: "user", content: userPrompt },
                    ],
                });
                const fallbackResult = fallbackResponse.content[0]?.type === "text" ? fallbackResponse.content[0].text : "";
                if (fallbackResult) {
                    console.log(`✅ Fallback successful with model: ${fallbackModel}`);
                    return {
                        content: fallbackResult,
                        inputTokens: fallbackResponse.usage?.input_tokens || 0,
                        outputTokens: fallbackResponse.usage?.output_tokens || 0,
                    };
                }
            } catch (fallbackError) {
                console.error(`❌ Fallback with ${fallbackModel} failed:`, fallbackError);
            }
        }
        
        if (error.status === 401) {
            throw new Error("Invalid Anthropic API key. Please check your ANTHROPIC_API_KEY.");
        }
        throw new Error(error.message || "Failed to generate content with Claude");
    }
};

// ============================================
// MAIN GENERATION FUNCTION (WITH SMART ROUTER)
// ============================================

export const aiGenerateService = async (params: GenerateParams): Promise<GenerateResult> => {
    const { title, type, tone, includeOutline, fileContent, preferredModel } = params;

    // Check if any AI service is available
    if (!isAIEnabled) {
        throw new Error(
            "No AI service is configured. Please set either OPENAI_API_KEY or ANTHROPIC_API_KEY in your .env file."
        );
    }

    // ✅ SMART ROUTER DECISION
    const routerDecision = smartRouter({
        type,
        tone,
        fileContent,
        title,
        includeOutline,
        preferredModel
    });

    console.log("🤖 Smart Router Decision:", routerDecision);

    let provider: 'openai' | 'anthropic';
    let modelUsed: string;
    let content: string = "";
    let inputTokens: number = 0;
    let outputTokens: number = 0;

    try {
        // ✅ Use the router decision
        if (routerDecision.provider === 'openai' && openai) {
            provider = 'openai';
            modelUsed = routerDecision.model;
            const result = await generateWithOpenAI(fileContent, title, type, tone, includeOutline);
            content = result.content;
            inputTokens = result.inputTokens;
            outputTokens = result.outputTokens;
        } else if (routerDecision.provider === 'anthropic' && anthropic) {
            provider = 'anthropic';
            modelUsed = routerDecision.model;
            const result = await generateWithClaude(fileContent, title, type, tone, includeOutline);
            content = result.content;
            inputTokens = result.inputTokens;
            outputTokens = result.outputTokens;
        } else if (openai) {
            // Fallback to OpenAI
            provider = 'openai';
            modelUsed = OPENAI_MODELS.GPT_4O;
            const result = await generateWithOpenAI(fileContent, title, type, tone, includeOutline);
            content = result.content;
            inputTokens = result.inputTokens;
            outputTokens = result.outputTokens;
        } else if (anthropic) {
            // Fallback to Claude
            provider = 'anthropic';
            modelUsed = ANTHROPIC_MODELS.CLAUDE_SONNET_4_6;
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
            routerDecision: {
                provider: routerDecision.provider,
                model: routerDecision.model,
                reason: routerDecision.reason,
                confidence: routerDecision.confidence
            }
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

// ✅ Export smart router for testing
export { smartRouter };