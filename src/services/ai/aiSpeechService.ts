// services/ai/speech/aiSpeechService.ts
import { Response } from "express";
import { errorResponseHandler } from "../../lib/errors/error-response-handler";
import { httpStatusCode } from "../../lib/constant";
import { 
    aiGenerateSpeechService
} from "./aiGenerateSpeechService";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

// ✅ Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================
// MAIN SPEECH GENERATION SERVICE
// ============================================

export const generateSpeechService = async (payload: any, res: Response) => {
    try {
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
            recordingDuration,
            userId,
            preferredProvider
        } = payload;

        // Validate
        if (!title) {
            return errorResponseHandler(
                "Title is required",
                httpStatusCode.BAD_REQUEST,
                res
            );
        }

        // Generate speech with AI
        const result = await aiGenerateSpeechService({
            title,
            authority: authority || 0,
            clarity: clarity || 0,
            academicRigor: academicRigor || 0,
            accessibility: accessibility || 0,
            narrativeDepth: narrativeDepth || 0,
            fileContent: fileContent,
            file: file,
            audio: audio,
            recordingDuration: recordingDuration,
            userId,
            preferredProvider
        });

        // ✅ Save audio file and get URL
        let audioUrl = "";
        try {
            audioUrl = await saveAudioFile(
                result.audioData, 
                result.format || "mp3", 
                userId
            );
            console.log("✅ Audio saved successfully:", audioUrl);
        } catch (saveError) {
            console.error("❌ Failed to save audio file:", saveError);
            // Continue even if save fails - use base64 fallback
        }

        // ✅ If audioUrl is empty, use base64 fallback
        if (!audioUrl) {
            console.warn("⚠️ Audio URL is empty, using base64 fallback");
            const base64Audio = result.audioData.toString('base64');
            audioUrl = `data:audio/mp3;base64,${base64Audio}`;
        }

        // Build response data
        const responseData: any = {
            audioUrl: audioUrl,
            duration: result.duration,
            format: result.format || "mp3",
            size: result.audioData.length,
            provider: result.provider,
            model: result.model,
            charCount: result.charCount,
            text: result.text,
            cost: result.cost,
            analysis: result.analysis,
            metadata: {
                title: title,
                generatedAt: new Date().toISOString()
            }
        };

        // Add optional fields if they exist
        if (file) {
            responseData.file = {
                name: file.originalname || 'file_uploaded',
                size: file.size,
                mimetype: file.mimetype
            };
        }

        if (audio) {
            responseData.audio = audio;
        }

        if (recordingDuration) {
            responseData.recordingDuration = Number(recordingDuration);
        }

        return {
            success: true,
            message: "Speech generated successfully",
            data: responseData
        };

    } catch (error: any) {
        console.error("Speech generation error:", error);
        return errorResponseHandler(
            error.message || "Failed to generate speech",
            httpStatusCode.INTERNAL_SERVER_ERROR,
            res
        );
    }
};

// ============================================
// ✅ FIXED: SAVE AUDIO FILE - Type Safe
// ============================================

const saveAudioFile = async (
    audioData: Buffer,
    format: string,
    userId: string
): Promise<string> => {
    try {
        // ✅ Use project root directory
        const projectRoot = path.resolve(__dirname, "../../..");
        const uploadDir = path.join(projectRoot, "public", "uploads", "audio");
        
        console.log("📁 Project root:", projectRoot);
        console.log("📁 Upload directory:", uploadDir);
        
        // ✅ Create directory if it doesn't exist
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
            console.log("📁 Created upload directory:", uploadDir);
        }

        // ✅ Generate unique filename
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 8);
        const filename = `speech_${userId}_${timestamp}_${random}.${format || 'mp3'}`;
        const filepath = path.join(uploadDir, filename);
        
        console.log("💾 Saving audio to:", filepath);
        
        // ✅ FIX: Convert Buffer to Uint8Array for TypeScript compatibility
        const uint8Array = new Uint8Array(audioData);
        fs.writeFileSync(filepath, uint8Array);
        
        // ✅ Verify file was saved
        if (fs.existsSync(filepath)) {
            const stats = fs.statSync(filepath);
            console.log(`✅ Audio saved: ${filename} (${stats.size} bytes)`);
            return `/uploads/audio/${filename}`;
        } else {
            console.error("❌ File not found after save!");
            return "";
        }
        
    } catch (error) {
        console.error("❌ Error saving audio file:", error);
        return "";
    }
};

// ============================================
// COST ESTIMATES SERVICE
// ============================================

export const getCostEstimatesService = async (params: any, res: Response) => {
    try {
        const { users, minutesPerUser } = params;
        const exchangeRate = 16.6;

        const charsPerMinute = 150 * 5;
        const totalChars = users * minutesPerUser * charsPerMinute;

        const speechCosts = {
            openai: {
                standard: {
                    per1000Chars: 0.015,
                    monthlyEstimate: (totalChars / 1000) * 0.015 * exchangeRate,
                    monthlyEstimateUSD: (totalChars / 1000) * 0.015,
                },
                high: {
                    per1000Chars: 0.030,
                    monthlyEstimate: (totalChars / 1000) * 0.030 * exchangeRate,
                    monthlyEstimateUSD: (totalChars / 1000) * 0.030,
                }
            },
            anthropic: {
                claude: {
                    per1000Chars: 0.015,
                    monthlyEstimate: (totalChars / 1000) * 0.015 * exchangeRate,
                    monthlyEstimateUSD: (totalChars / 1000) * 0.015,
                    description: "Claude generates content + OpenAI TTS"
                }
            }
        };

        return {
            success: true,
            data: {
                scenario: `${users} users, ${minutesPerUser} minutes/user/month`,
                totalCharacters: totalChars,
                exchangeRate,
                costs: speechCosts,
                planningNumber: {
                    zar: Math.round((totalChars / 1000) * 0.015 * exchangeRate),
                    usd: Math.round((totalChars / 1000) * 0.015)
                }
            }
        };

    } catch (error: any) {
        return errorResponseHandler(
            error.message || "Failed to get cost estimates",
            httpStatusCode.INTERNAL_SERVER_ERROR,
            res
        );
    }
};

// ============================================
// AI COST ESTIMATES SERVICE
// ============================================

export const getAICostEstimatesService = async (params: any, res: Response) => {
    try {
        const exchangeRate = 16.6;
        
        const estimates = {
            providers: [
                {
                    name: "OpenAI",
                    description: "GPT-4o generates speech text + TTS converts to audio",
                    models: [
                        {
                            name: "OpenAI GPT-4o + TTS",
                            description: "OpenAI generates speech content and converts to voice",
                            costPer1000Chars: 0.015 + 0.015,
                            costPer1000CharsZAR: Math.round((0.015 + 0.015) * exchangeRate * 100) / 100,
                            bestFor: "All-in-one OpenAI solution",
                            features: [
                                "Generates speech content automatically",
                                "Uses analysis metrics",
                                "Natural language understanding",
                                "Can include outlines",
                                "Tone and style control"
                            ]
                        }
                    ]
                },
                {
                    name: "Anthropic (Claude)",
                    description: "Claude generates speech text + OpenAI TTS converts to audio",
                    models: [
                        {
                            name: "Claude 3.5 Sonnet + TTS",
                            description: "Claude generates speech content, OpenAI TTS for voice",
                            costPer1000Chars: 0.015 + 0.015,
                            costPer1000CharsZAR: Math.round((0.015 + 0.015) * exchangeRate * 100) / 100,
                            bestFor: "Claude's natural language generation with TTS",
                            features: [
                                "Generates speech content automatically",
                                "Uses analysis metrics",
                                "Superior natural language understanding",
                                "Can include outlines",
                                "Tone and style control"
                            ]
                        }
                    ]
                }
            ],
            recommendations: {
                bestValue: "Use OpenAI for cost-effective generation",
                bestQuality: "Use Claude for superior natural language",
                hybrid: "Claude generates content, OpenAI TTS for voice",
                costSavings: "~R500-1000 per month using OpenAI over Claude"
            },
            monthlyEstimates: {
                "10 users, 30 mins": Math.round(10 * 30 * 150 * 5 / 1000 * 0.030 * exchangeRate),
                "50 users, 30 mins": Math.round(50 * 30 * 150 * 5 / 1000 * 0.030 * exchangeRate),
                "100 users, 60 mins": Math.round(100 * 60 * 150 * 5 / 1000 * 0.030 * exchangeRate),
            }
        };

        return {
            success: true,
            data: estimates
        };

    } catch (error: any) {
        return errorResponseHandler(
            error.message || "Failed to get AI cost estimates",
            httpStatusCode.INTERNAL_SERVER_ERROR,
            res
        );
    }
};