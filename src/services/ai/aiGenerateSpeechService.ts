// services/ai/speech/aiGenerateSpeechService.ts
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { calculateSpeechCost, isProviderSupported } from "../../config/ai-speech-config";
import { calculateDraftCost, modelExists as checkModelExists } from "../../config/ai-cost-config";

// ============================================
// INITIALIZE CLIENTS
// ============================================

let openai: OpenAI | null = null;
let anthropic: Anthropic | null = null;

// Initialize OpenAI
if (process.env.OPENAI_API_KEY) {
    try {
        openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        console.log("✅ OpenAI Speech client initialized");
    } catch (error) {
        console.warn("⚠️ Failed to initialize OpenAI Speech client");
    }
} else {
    console.warn("⚠️ OPENAI_API_KEY not set. OpenAI speech services will not be available.");
}

// Initialize Anthropic (Claude)
if (process.env.ANTHROPIC_API_KEY) {
    try {
        anthropic = new Anthropic({
            apiKey: process.env.ANTHROPIC_API_KEY,
            defaultHeaders: {
                'anthropic-version': '2023-06-01'
            }
        });
        console.log("✅ Anthropic (Claude) client initialized");
    } catch (error) {
        console.warn("⚠️ Failed to initialize Anthropic client");
    }
} else {
    console.warn("⚠️ ANTHROPIC_API_KEY not set. Claude services will not be available.");
}

// Check if any AI service is available
const isSpeechEnabled = !!(openai || anthropic);

// ============================================
// ✅ MODEL NAMES
// ============================================

const ANTHROPIC_MODELS = {
    CLAUDE_SONNET_4_6: "claude-sonnet-4-6",
    CLAUDE_OPUS_4_8: "claude-opus-4-8",
};

const OPENAI_MODELS = {
    GPT_4O: "gpt-4o",
    GPT_4O_MINI: "gpt-4o-mini",
};

// ============================================
// ✅ SMART ROUTER
// ============================================

interface RouterDecision {
    provider: 'openai' | 'anthropic';
    model: string;
    reason: string;
    confidence: number;
}

const smartRouter = (params: {
    title: string;
    authority: number;
    clarity: number;
    academicRigor: number;
    accessibility: number;
    narrativeDepth: number;
    fileContent?: string;
    recordingDuration?: string | number;
    preferredProvider?: 'openai' | 'anthropic';
    isBulk?: boolean;
}): RouterDecision => {
    const {
        authority,
        clarity,
        academicRigor,
        accessibility,
        narrativeDepth,
        fileContent,
        recordingDuration,
        preferredProvider,
        isBulk
    } = params;

    // ✅ Check if preferred provider is supported
    if (preferredProvider && !isProviderSupported(preferredProvider)) {
        console.warn(`⚠️ Provider ${preferredProvider} is not supported. Falling back to auto-selection.`);
    }

    // ✅ User explicitly requested OpenAI
    if (preferredProvider === 'openai' && openai) {
        return {
            provider: 'openai',
            model: OPENAI_MODELS.GPT_4O,
            reason: 'User explicitly requested OpenAI',
            confidence: 100
        };
    }

    // ✅ User explicitly requested Anthropic (Claude)
    if (preferredProvider === 'anthropic' && anthropic) {
        return {
            provider: 'anthropic',
            model: ANTHROPIC_MODELS.CLAUDE_SONNET_4_6,
            reason: 'User explicitly requested Claude',
            confidence: 100
        };
    }

    // ✅ Bulk processing
    if (isBulk) {
        return {
            provider: 'openai',
            model: OPENAI_MODELS.GPT_4O_MINI,
            reason: 'Bulk processing - using cost-effective model',
            confidence: 90
        };
    }

    // ✅ Auto-selection logic
    let claudeScore = 0;
    let openaiScore = 0;

    // Claude - Best for narrative, authoritative speech
    if (authority > 70) claudeScore += 20;
    if (narrativeDepth > 70) claudeScore += 30;
    if (academicRigor > 70) claudeScore += 20;
    if (fileContent && fileContent.length > 5000) claudeScore += 15;
    if (recordingDuration && Number(recordingDuration) > 120) claudeScore += 15;

    // OpenAI - Best for clarity and accessibility
    if (clarity > 70) openaiScore += 30;
    if (accessibility > 70) openaiScore += 20;
    if (authority < 50 && clarity > 70) openaiScore += 20;
    if (!fileContent || fileContent.length < 2000) openaiScore += 15;
    if (recordingDuration && Number(recordingDuration) < 60) openaiScore += 15;

    if (authority > 60 && narrativeDepth > 60) claudeScore += 15;
    if (clarity > 80 && accessibility > 80) openaiScore += 20;
    if (academicRigor > 60 && authority > 60) claudeScore += 15;

    if (!anthropic) claudeScore = -1;
    if (!openai) openaiScore = -1;

    // ✅ Decision
    if (claudeScore > openaiScore && anthropic) {
        let model = ANTHROPIC_MODELS.CLAUDE_SONNET_4_6;
        let reason = `Claude Sonnet 4.6 better for speech (Authority=${authority}, Narrative=${narrativeDepth})`;

        if (academicRigor > 80 || authority > 80 || (fileContent && fileContent.length > 10000)) {
            model = ANTHROPIC_MODELS.CLAUDE_OPUS_4_8;
            reason = `Claude Opus 4.8 better for complex speech`;
        }

        if (!checkModelExists(model)) {
            model = ANTHROPIC_MODELS.CLAUDE_SONNET_4_6;
            reason = `Fallback to Claude Sonnet 4.6`;
        }

        return {
            provider: 'anthropic',
            model: model,
            reason: reason,
            confidence: Math.min(Math.round((claudeScore / (claudeScore + openaiScore)) * 100), 95)
        };
    } else if (openaiScore > claudeScore && openai) {
        let model = OPENAI_MODELS.GPT_4O;
        let reason = `GPT-4o better for speech (Clarity=${clarity}, Accessibility=${accessibility})`;

        if (isBulk || !fileContent || fileContent.length < 1000) {
            model = OPENAI_MODELS.GPT_4O_MINI;
            reason = `GPT-4o Mini for simple speech`;
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
            reason: 'Claude selected as fallback',
            confidence: 70
        };
    } else {
        throw new Error("No AI service available. Please check your API keys.");
    }
};

// ============================================
// INTERFACES
// ============================================

interface SpeechParams {
    title: string;
    authority: number;
    clarity: number;
    academicRigor: number;
    accessibility: number;
    narrativeDepth: number;
    fileContent?: string;
    file?: any;
    audio?: string;
    recordingDuration?: string | number;
    userId: string;
    preferredProvider?: 'openai' | 'anthropic';
    isBulk?: boolean;
}

interface SpeechResult {
    audioData: Buffer;
    duration: number;
    model: string;
    provider: 'openai' | 'anthropic';
    format: string;
    charCount: number;
    text: string;
    cost: {
        usd: number;
        zar: number;
    };
    analysis: {
        authority: number;
        clarity: number;
        academicRigor: number;
        accessibility: number;
        narrativeDepth: number;
    };
    optionalData?: {
        file?: string;
        audio?: string;
        recordingDuration?: number;
    };
    routerDecision?: {
        provider: string;
        model: string;
        reason: string;
        confidence: number;
    };
    tokensUsed?: {
        input: number;
        output: number;
        total: number;
    };
}

// ============================================
// GENERATE TEXT WITH CLAUDE
// ============================================

const generateTextWithClaude = async (params: {
    title: string;
    authority: number;
    clarity: number;
    academicRigor: number;
    accessibility: number;
    narrativeDepth: number;
    fileContent?: string;
    recordingDuration?: string | number;
    preferredModel?: string;
}): Promise<string> => {
    if (!anthropic) {
        throw new Error("Anthropic client is not available. Please set ANTHROPIC_API_KEY.");
    }

    const { title, authority, clarity, academicRigor, accessibility, narrativeDepth, fileContent, recordingDuration, preferredModel } = params;

    const analysisContext = `
Content Quality Analysis:
- Authority: ${authority}/100
- Clarity: ${clarity}/100
- Academic Rigor: ${academicRigor}/100
- Accessibility: ${accessibility}/100
- Narrative Depth: ${narrativeDepth}/100

${recordingDuration ? `- Target Duration: ${recordingDuration} seconds` : ''}

Based on this analysis, the speech should:
${authority > 70 ? '- Maintain high authority and credibility' : authority > 50 ? '- Build authority through evidence and examples' : '- Focus on establishing credibility'}
${clarity > 70 ? '- Use clear, concise language' : clarity > 50 ? '- Balance clarity with depth' : '- Simplify complex concepts'}
${academicRigor > 70 ? '- Include academic references and data' : academicRigor > 50 ? '- Balance academic rigor with accessibility' : '- Focus on practical insights'}
${accessibility > 70 ? '- Use inclusive, accessible language' : accessibility > 50 ? '- Make content accessible to wider audience' : '- Simplify for general audience'}
${narrativeDepth > 70 ? '- Include rich narrative and storytelling' : narrativeDepth > 50 ? '- Add depth through examples' : '- Keep straightforward and clear'}

${fileContent ? `\nSource Material:\n${fileContent}\n` : ''}`;

    const systemPrompt = `You are an expert speech writer. Generate a compelling, natural-sounding speech.

Title: ${title}

${analysisContext}

Requirements:
1. Write in a natural, conversational tone suitable for spoken delivery
2. Use clear, concise language
3. Include engaging opening and strong conclusion
4. Structure with logical flow
5. ${recordingDuration ? `Length should be approximately ${Math.round(Number(recordingDuration) * 2)} words (${recordingDuration} seconds at normal speaking pace)` : 'Length: Approximately 500-1000 words'}
6. Adapt content based on the analysis metrics provided
7. ${fileContent ? 'Base content on the source material provided' : 'Create original content'}

Generate the complete speech:`;

    const modelToUse = preferredModel || ANTHROPIC_MODELS.CLAUDE_SONNET_4_6;

    try {
        console.log(`🤖 Generating speech with Claude model: ${modelToUse}`);

        const response = await anthropic.messages.create({
            model: modelToUse,
            max_tokens: 2000,
            system: systemPrompt,
            messages: [
                {
                    role: "user",
                    content: `Please generate a speech about "${title}" based on the analysis metrics.`
                },
            ],
        });

        const result = response.content[0]?.type === "text" ? response.content[0].text : "";

        if (!result) {
            throw new Error("Failed to generate speech content with Claude");
        }

        return result;

    } catch (error: any) {
        console.error("Claude API Error:", error);

        if (error.status === 404 || error.message.includes("model")) {
            const fallbackModels = [ANTHROPIC_MODELS.CLAUDE_OPUS_4_8];

            for (const fallbackModel of fallbackModels) {
                if (fallbackModel === modelToUse) continue;
                if (!checkModelExists(fallbackModel)) continue;

                try {
                    console.log(`⚠️ Trying fallback model: ${fallbackModel}`);
                    const fallbackResponse = await anthropic.messages.create({
                        model: fallbackModel,
                        max_tokens: 2000,
                        system: systemPrompt,
                        messages: [
                            {
                                role: "user",
                                content: `Please generate a speech about "${title}" based on the analysis metrics.`
                            },
                        ],
                    });
                    const fallbackResult = fallbackResponse.content[0]?.type === "text" ? fallbackResponse.content[0].text : "";
                    if (fallbackResult) {
                        console.log(`✅ Fallback successful with model: ${fallbackModel}`);
                        return fallbackResult;
                    }
                } catch (fallbackError) {
                    console.error(`❌ Fallback with ${fallbackModel} failed:`, fallbackError);
                }
            }

            throw new Error("All Claude models failed. Please check your API key and available models.");
        }
        if (error.status === 401) {
            throw new Error("Invalid Anthropic API key. Please check your ANTHROPIC_API_KEY.");
        }
        throw new Error(error.message || "Failed to generate speech content with Claude");
    }
};

// ============================================
// GENERATE TEXT WITH OPENAI
// ============================================

const generateTextWithOpenAI = async (params: {
    title: string;
    authority: number;
    clarity: number;
    academicRigor: number;
    accessibility: number;
    narrativeDepth: number;
    fileContent?: string;
    recordingDuration?: string | number;
}): Promise<string> => {
    if (!openai) {
        throw new Error("OpenAI client is not available. Please set OPENAI_API_KEY.");
    }

    const { title, authority, clarity, academicRigor, accessibility, narrativeDepth, fileContent, recordingDuration } = params;

    const analysisContext = `
Content Quality Analysis:
- Authority: ${authority}/100
- Clarity: ${clarity}/100
- Academic Rigor: ${academicRigor}/100
- Accessibility: ${accessibility}/100
- Narrative Depth: ${narrativeDepth}/100

${recordingDuration ? `- Target Duration: ${recordingDuration} seconds` : ''}

Based on this analysis, the speech should:
${authority > 70 ? '- Maintain high authority and credibility' : authority > 50 ? '- Build authority through evidence and examples' : '- Focus on establishing credibility'}
${clarity > 70 ? '- Use clear, concise language' : clarity > 50 ? '- Balance clarity with depth' : '- Simplify complex concepts'}
${academicRigor > 70 ? '- Include academic references and data' : academicRigor > 50 ? '- Balance academic rigor with accessibility' : '- Focus on practical insights'}
${accessibility > 70 ? '- Use inclusive, accessible language' : accessibility > 50 ? '- Make content accessible to wider audience' : '- Simplify for general audience'}
${narrativeDepth > 70 ? '- Include rich narrative and storytelling' : narrativeDepth > 50 ? '- Add depth through examples' : '- Keep straightforward and clear'}

${fileContent ? `\nSource Material:\n${fileContent}\n` : ''}`;

    const systemPrompt = `You are an expert speech writer. Generate a compelling, natural-sounding speech.

Title: ${title}

${analysisContext}

Requirements:
1. Write in a natural, conversational tone suitable for spoken delivery
2. Use clear, concise language
3. Include engaging opening and strong conclusion
4. Structure with logical flow
5. ${recordingDuration ? `Length should be approximately ${Math.round(Number(recordingDuration) * 2)} words (${recordingDuration} seconds at normal speaking pace)` : 'Length: Approximately 500-1000 words'}
6. Adapt content based on the analysis metrics provided
7. ${fileContent ? 'Base content on the source material provided' : 'Create original content'}

Generate the complete speech:`;

    try {
        const response = await openai.chat.completions.create({
            model: OPENAI_MODELS.GPT_4O,
            max_tokens: 2000,
            temperature: 0.7,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: `Please generate a speech about "${title}" based on the analysis metrics.` },
            ],
        });

        const result = response.choices[0]?.message?.content || "";

        if (!result) {
            throw new Error("Failed to generate speech content with OpenAI");
        }

        return result;

    } catch (error: any) {
        console.error("OpenAI API Error:", error);
        throw new Error(error.message || "Failed to generate speech content with OpenAI");
    }
};

// ============================================
// ✅ TTS CHUNKING (Fixes 4096 char limit)
// ============================================

const MAX_TTS_CHARS = 4096;

const splitTextForTTS = (text: string, maxChars: number = MAX_TTS_CHARS): string[] => {
    const sentences = text.match(/[^.!?]+[.!?]+(\s|$)/g) || [text];
    const chunks: string[] = [];
    let current = "";

    for (const sentence of sentences) {
        if ((current + sentence).length > maxChars) {
            if (current) {
                chunks.push(current.trim());
                current = "";
            }
            if (sentence.length > maxChars) {
                for (let i = 0; i < sentence.length; i += maxChars) {
                    chunks.push(sentence.slice(i, i + maxChars).trim());
                }
            } else {
                current = sentence;
            }
        } else {
            current += sentence;
        }
    }
    if (current.trim()) chunks.push(current.trim());

    return chunks.filter((c) => c.length > 0);
};

// ============================================
// ✅ GENERATE WITH OPENAI TTS (Chunked)
// ============================================
const generateWithOpenAITTS = async (
    text: string
): Promise<{ audioData: Buffer; duration: number; model: string; format: string; charCount: number; cost: any; tokensUsed: any }> => {
    if (!openai) {
        throw new Error("OpenAI client is not available for TTS. Please set OPENAI_API_KEY.");
    }

    if (!text || text.length < 10) {
        throw new Error("Text must be at least 10 characters for TTS generation");
    }

    const model = "tts-1";
    const voice = "alloy";

    const chunks = splitTextForTTS(text);
    console.log(`🔊 TTS: splitting ${text.length} chars into ${chunks.length} chunk(s)`);

    const audioBuffers: Buffer[] = [];
    for (let i = 0; i < chunks.length; i++) {
        console.log(`🔊 TTS chunk ${i + 1}/${chunks.length} (${chunks[i].length} chars)`);
        const response = await openai.audio.speech.create({
            model: model,
            voice: voice,
            input: chunks[i],
            speed: 1.0,
            response_format: "mp3",
        });
        
        // ✅ FIX: Properly convert ArrayBuffer to Buffer
        const arrayBuffer = await response.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        const buffer = Buffer.from(uint8Array.buffer, uint8Array.byteOffset, uint8Array.byteLength);
        audioBuffers.push(buffer);
    }

    const totalLength = audioBuffers.reduce((sum, buf) => sum + buf.length, 0);
    const audioBuffer = Buffer.alloc(totalLength);
    let offset = 0;
    for (const buf of audioBuffers) {
        buf.copy(audioBuffer, offset);
        offset += buf.length;
    }

    const charCount = text.length;

    // ✅ Use calculateDraftCost (same as writing)
    const inputTokens = Math.round(charCount / 4);
    const outputTokens = 0;
    const cost = calculateDraftCost(model, inputTokens, outputTokens);

    return {
        audioData: audioBuffer,
        duration: audioBuffer.length / 32000,
        model: model,
        format: "mp3",
        charCount: charCount,
        cost: cost,
        tokensUsed: {
            input: inputTokens,
            output: outputTokens,
            total: inputTokens + outputTokens
        }
    };
};

// ============================================
// GENERATE WITH CLAUDE + TTS
// ============================================

const generateWithClaude = async (params: SpeechParams): Promise<SpeechResult> => {
    if (!anthropic) {
        throw new Error("Claude is not available. Please set ANTHROPIC_API_KEY.");
    }
    if (!openai) {
        throw new Error("OpenAI TTS is required for speech output. Please set OPENAI_API_KEY.");
    }

    const {
        title,
        authority,
        clarity,
        academicRigor,
        accessibility,
        narrativeDepth,
        fileContent,
        file,
        audio,
        recordingDuration
    } = params;

    const routerDecision = smartRouter({
        title,
        authority,
        clarity,
        academicRigor,
        accessibility,
        narrativeDepth,
        fileContent,
        recordingDuration,
        isBulk: params.isBulk || false,
    });

    const speechText = await generateTextWithClaude({
        title,
        authority,
        clarity,
        academicRigor,
        accessibility,
        narrativeDepth,
        fileContent,
        recordingDuration,
        preferredModel: routerDecision.model,
    });

    const audioResult = await generateWithOpenAITTS(speechText);

    // ✅ Calculate Claude cost using calculateDraftCost (same as writing)
    const inputTokens = Math.round((speechText.length / 4) * 0.3);
    const outputTokens = Math.round(speechText.length / 4);
    const claudeCost = calculateDraftCost(routerDecision.model, inputTokens, outputTokens);

    const totalCost = {
        usd: parseFloat((claudeCost.usd + audioResult.cost.usd).toFixed(4)),
        zar: parseFloat((claudeCost.zar + audioResult.cost.zar).toFixed(2))
    };

    const optionalData: any = {};
    if (file) optionalData.file = file.originalname || 'file_uploaded';
    if (audio) optionalData.audio = audio;
    if (recordingDuration) optionalData.recordingDuration = Number(recordingDuration);

    return {
        audioData: audioResult.audioData,
        duration: audioResult.duration,
        model: `${routerDecision.model} + ${audioResult.model}`,
        provider: "anthropic",
        format: audioResult.format,
        charCount: audioResult.charCount,
        text: speechText,
        cost: totalCost,
        analysis: {
            authority,
            clarity,
            academicRigor,
            accessibility,
            narrativeDepth
        },
        optionalData: Object.keys(optionalData).length > 0 ? optionalData : undefined,
        routerDecision: {
            provider: routerDecision.provider,
            model: routerDecision.model,
            reason: routerDecision.reason,
            confidence: routerDecision.confidence
        },
        tokensUsed: {
            input: inputTokens + audioResult.tokensUsed.input,
            output: outputTokens + audioResult.tokensUsed.output,
            total: inputTokens + outputTokens + audioResult.tokensUsed.input + audioResult.tokensUsed.output
        }
    };
};

// ============================================
// GENERATE WITH OPENAI + TTS
// ============================================

const generateWithOpenAI = async (params: SpeechParams): Promise<SpeechResult> => {
    if (!openai) {
        throw new Error("OpenAI is not available. Please set OPENAI_API_KEY.");
    }

    const {
        title,
        authority,
        clarity,
        academicRigor,
        accessibility,
        narrativeDepth,
        fileContent,
        file,
        audio,
        recordingDuration
    } = params;

    const routerDecision = smartRouter({
        title,
        authority,
        clarity,
        academicRigor,
        accessibility,
        narrativeDepth,
        fileContent,
        recordingDuration,
        isBulk: params.isBulk || false,
    });

    const speechText = await generateTextWithOpenAI({
        title,
        authority,
        clarity,
        academicRigor,
        accessibility,
        narrativeDepth,
        fileContent,
        recordingDuration
    });

    const audioResult = await generateWithOpenAITTS(speechText);

    // ✅ Calculate OpenAI cost using calculateDraftCost (same as writing)
    const inputTokens = Math.round((speechText.length / 4) * 0.3);
    const outputTokens = Math.round(speechText.length / 4);
    const openAICost = calculateDraftCost(routerDecision.model, inputTokens, outputTokens);

    const totalCost = {
        usd: parseFloat((openAICost.usd + audioResult.cost.usd).toFixed(4)),
        zar: parseFloat((openAICost.zar + audioResult.cost.zar).toFixed(2))
    };

    const optionalData: any = {};
    if (file) optionalData.file = file.originalname || 'file_uploaded';
    if (audio) optionalData.audio = audio;
    if (recordingDuration) optionalData.recordingDuration = Number(recordingDuration);

    return {
        audioData: audioResult.audioData,
        duration: audioResult.duration,
        model: `${routerDecision.model} + ${audioResult.model}`,
        provider: "openai",
        format: audioResult.format,
        charCount: audioResult.charCount,
        text: speechText,
        cost: totalCost,
        analysis: {
            authority,
            clarity,
            academicRigor,
            accessibility,
            narrativeDepth
        },
        optionalData: Object.keys(optionalData).length > 0 ? optionalData : undefined,
        routerDecision: {
            provider: routerDecision.provider,
            model: routerDecision.model,
            reason: routerDecision.reason,
            confidence: routerDecision.confidence
        },
        tokensUsed: {
            input: inputTokens + audioResult.tokensUsed.input,
            output: outputTokens + audioResult.tokensUsed.output,
            total: inputTokens + outputTokens + audioResult.tokensUsed.input + audioResult.tokensUsed.output
        }
    };
};

// ============================================
// MAIN GENERATION FUNCTION
// ============================================

export const aiGenerateSpeechService = async (params: SpeechParams): Promise<SpeechResult> => {
    const { title, preferredProvider, authority, clarity, academicRigor, accessibility, narrativeDepth, fileContent, recordingDuration, isBulk } = params;

    if (!title) {
        throw new Error("Title is required");
    }

    if (!isSpeechEnabled) {
        throw new Error(
            "No AI service is configured. Please set either OPENAI_API_KEY or ANTHROPIC_API_KEY in your .env file."
        );
    }

    // ✅ Validate provider
    if (preferredProvider && !isProviderSupported(preferredProvider)) {
        console.warn(`⚠️ Provider ${preferredProvider} is not supported. Using auto-selection.`);
    }

    const routerDecision = smartRouter({
        title,
        authority: authority || 0,
        clarity: clarity || 0,
        academicRigor: academicRigor || 0,
        accessibility: accessibility || 0,
        narrativeDepth: narrativeDepth || 0,
        fileContent,
        recordingDuration,
        preferredProvider,
        isBulk: isBulk || false,
    });

    console.log("🤖 Smart Router Decision for Speech:", routerDecision);

    let result: SpeechResult;

    if (routerDecision.provider === 'openai' && openai) {
        result = await generateWithOpenAI({ ...params, isBulk });
    } else if (routerDecision.provider === 'anthropic' && anthropic) {
        result = await generateWithClaude({ ...params, isBulk });
    } else if (openai) {
        result = await generateWithOpenAI({ ...params, isBulk });
    } else if (anthropic) {
        result = await generateWithClaude({ ...params, isBulk });
    } else {
        throw new Error("No AI service available. Please check your API keys.");
    }

    return result;
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

export const getAvailableProviders = (): string[] => {
    const providers: string[] = [];
    if (openai) providers.push('openai');
    if (anthropic) providers.push('anthropic');
    return providers;
};

export const isSpeechReady = (): boolean => {
    return !!(openai || anthropic);
};

export const getOpenAIStatus = (): boolean => {
    return !!openai;
};

export const getClaudeStatus = (): boolean => {
    return !!anthropic;
};

export { smartRouter };