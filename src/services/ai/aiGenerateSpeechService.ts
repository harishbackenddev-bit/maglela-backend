// services/ai/speech/aiGenerateSpeechService.ts
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { calculateSpeechCost } from "../../config/ai-speech-config";

// ============================================
// INITIALIZE CLIENTS (Like AI Writing)
// ============================================

let openai: OpenAI | null = null;
let anthropic: Anthropic | null = null;

// Initialize OpenAI (Optional)
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

// Initialize Anthropic (Optional)
if (process.env.ANTHROPIC_API_KEY) {
    try {
        anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
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
    preferredProvider?: 'openai' | 'anthropic'; // Optional: force a specific provider
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
}): Promise<string> => {
    if (!anthropic) {
        throw new Error("Anthropic client is not available. Please set ANTHROPIC_API_KEY.");
    }

    const { title, authority, clarity, academicRigor, accessibility, narrativeDepth, fileContent, recordingDuration } = params;

    // Build analysis context from metrics
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

    const response = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 2000,
        temperature: 0.7,
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

    // Build analysis context from metrics
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

    const response = await openai.chat.completions.create({
        model: "gpt-4o",
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
};

// ============================================
// GENERATE WITH OPENAI TTS
// ============================================

const generateWithOpenAITTS = async (text: string): Promise<{ audioData: Buffer; duration: number; model: string; format: string; charCount: number; cost: any }> => {
    if (!openai) {
        throw new Error("OpenAI client is not available for TTS. Please set OPENAI_API_KEY.");
    }

    if (!text || text.length < 10) {
        throw new Error("Text must be at least 10 characters for TTS generation");
    }

    const model = "tts-1";
    const voice = "alloy";

    const response = await openai.audio.speech.create({
        model: model,
        voice: voice,
        input: text,
        speed: 1.0,
        response_format: "mp3",
    });

    const audioBuffer = Buffer.from(await response.arrayBuffer());
    const charCount = text.length;
    const cost = calculateSpeechCost(model, charCount);

    return {
        audioData: audioBuffer,
        duration: audioBuffer.length / 32000,
        model: model,
        format: "mp3",
        charCount: charCount,
        cost: cost
    };
};

// ============================================
// GENERATE WITH CLAUDE + TTS (Like AI Writing)
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

    // Step 1: Generate speech text with Claude
    const speechText = await generateTextWithClaude({
        title,
        authority,
        clarity,
        academicRigor,
        accessibility,
        narrativeDepth,
        fileContent,
        recordingDuration
    });

    // Step 2: Convert to speech with OpenAI TTS
    const audioResult = await generateWithOpenAITTS(speechText);

    // Calculate costs (Claude + TTS)
    const claudeCostPer1000 = 0.015;
    const claudeCost = {
        usd: parseFloat(((speechText.length / 1000) * claudeCostPer1000).toFixed(4)),
        zar: parseFloat(((speechText.length / 1000) * claudeCostPer1000 * 16.6).toFixed(2))
    };

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
        model: `claude-3-5-sonnet + ${audioResult.model}`,
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
        optionalData: Object.keys(optionalData).length > 0 ? optionalData : undefined
    };
};

// ============================================
// GENERATE WITH OPENAI + TTS (Like AI Writing)
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

    // Step 1: Generate speech text with OpenAI
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

    // Step 2: Convert to speech with OpenAI TTS
    const audioResult = await generateWithOpenAITTS(speechText);

    // Calculate costs
    const openAICostPer1000 = 0.015;
    const openAICost = {
        usd: parseFloat(((speechText.length / 1000) * openAICostPer1000).toFixed(4)),
        zar: parseFloat(((speechText.length / 1000) * openAICostPer1000 * 16.6).toFixed(2))
    };

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
        model: `gpt-4o + ${audioResult.model}`,
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
        optionalData: Object.keys(optionalData).length > 0 ? optionalData : undefined
    };
};

// ============================================
// MAIN GENERATION FUNCTION (Like AI Writing)
// ============================================

export const aiGenerateSpeechService = async (params: SpeechParams): Promise<SpeechResult> => {
    const { title, preferredProvider } = params;

    if (!title) {
        throw new Error("Title is required");
    }

    // Check if any AI service is available
    if (!isSpeechEnabled) {
        throw new Error(
            "No AI service is configured. Please set either OPENAI_API_KEY or ANTHROPIC_API_KEY in your .env file."
        );
    }

    let result: SpeechResult;

    // Determine which provider to use (Like AI Writing pattern)
    // Priority: preferredProvider > available services
    if (preferredProvider === 'openai' && openai) {
        result = await generateWithOpenAI(params);
    } else if (preferredProvider === 'anthropic' && anthropic) {
        result = await generateWithClaude(params);
    } else if (openai) {
        // Fallback to OpenAI if available
        result = await generateWithOpenAI(params);
    } else if (anthropic) {
        // Fallback to Claude if OpenAI not available
        result = await generateWithClaude(params);
    } else {
        throw new Error("No AI service available. Please check your API keys.");
    }

    return result;
};

// ============================================
// UTILITY FUNCTIONS (Like AI Writing)
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