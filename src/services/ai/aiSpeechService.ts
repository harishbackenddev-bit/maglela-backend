// services/ai/speech/aiSpeechService.ts
import { Response } from "express";
import { errorResponseHandler } from "../../lib/errors/error-response-handler";
import { httpStatusCode } from "../../lib/constant";
import {
    aiGenerateSpeechService
} from "./aiGenerateSpeechService";
import { aiContentModel } from "../../models/aiContentModel/aiContentModel";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

// ✅ Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================
// MAIN SPEECH GENERATION SERVICE (WITH AUTO-SAVE)
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
            preferredProvider,
            description, // Optional description for database
            author // Optional author name
        } = payload;

        // Validate
        if (!title) {
            return errorResponseHandler(
                "Title is required",
                httpStatusCode.BAD_REQUEST,
                res
            );
        }

        if (!userId) {
            return errorResponseHandler(
                "User ID is required",
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
        }

        // ✅ If audioUrl is empty, use base64 fallback
        if (!audioUrl) {
            console.warn("⚠️ Audio URL is empty, using base64 fallback");
            const base64Audio = result.audioData.toString('base64');
            audioUrl = `data:audio/mp3;base64,${base64Audio}`;
        }

        // Calculate average score
        const avgScore = Math.floor(
            (result.analysis.authority +
                result.analysis.clarity +
                result.analysis.academicRigor +
                result.analysis.accessibility +
                result.analysis.narrativeDepth) / 5
        );

        // Format duration
        const formatDuration = (seconds: number): string => {
            if (!seconds || isNaN(seconds) || seconds < 0) return '00:00';
            const mins = Math.floor(seconds / 60);
            const secs = Math.floor(seconds % 60);
            return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        };

        // ✅ AUTO-SAVE TO DATABASE
        let savedContent = null;
        try {
            // Check if content already exists with same title
            const existingContent = await aiContentModel.findOne({
                userId,
                title: title.trim(),
                contentType: 'speech',
                status: { $ne: 'Rejected' }
            });

            if (existingContent) {
                // ✅ UPDATE existing content
                existingContent.content = result.text;
                existingContent.parameters = result.analysis;
                existingContent.avgScore = avgScore;
                existingContent.duration = formatDuration(result.duration);
                existingContent.audioUrl = audioUrl;
                existingContent.provider = result.provider;
                existingContent.aiModel = result.model;
                existingContent.charCount = result.charCount;
                existingContent.cost = result.cost;
                existingContent.metadata = {
                    ...existingContent.metadata,
                    inputMethod: payload.inputMethod || 'ai',
                    ...(file && { fileName: file.originalname }),
                    ...(recordingDuration && { recordingDuration: Number(recordingDuration) }),
                    lastGeneratedAt: new Date().toISOString()
                };
                existingContent.status = 'Pending'; // Reset status for admin review

                await existingContent.save();
                savedContent = existingContent;
                console.log(`✅ Updated existing speech: ${existingContent.identifier}`);

            } else {
                // ✅ CREATE new content
                const newContent = new aiContentModel({
                    userId,
                    contentType: 'speech',
                    title: title.trim(),
                    description: description || `Speech generated for: ${title}`,
                    content: result.text,
                    parameters: result.analysis,
                    avgScore: avgScore,
                    duration: formatDuration(result.duration),
                    audioUrl: audioUrl,
                    provider: result.provider,
                    model: result.model,
                    charCount: result.charCount,
                    cost: result.cost,
                    author: author || 'AI Assistant',
                    status: 'Pending',
                    metadata: {
                        inputMethod: payload.inputMethod || 'ai',
                        ...(file && { fileName: file.originalname }),
                        ...(recordingDuration && { recordingDuration: Number(recordingDuration) }),
                        generatedAt: new Date().toISOString()
                    }
                });

                await newContent.save();
                savedContent = newContent;
                console.log(`✅ Saved new speech: ${newContent.identifier}`);
            }

        } catch (dbError: any) {
            console.error("❌ Database save error:", dbError);
            // Continue even if DB save fails - user can save manually later
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

        // Add database info if saved
        if (savedContent) {
            responseData.database = {
                id: savedContent._id,
                identifier: savedContent.identifier,
                status: savedContent.status,
                savedAt: savedContent.createdAt
            };
        }

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
            message: savedContent ? "Speech generated and saved successfully" : "Speech generated successfully",
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
// SAVE AUDIO FILE
// ============================================

const saveAudioFile = async (
    audioData: Buffer,
    format: string,
    userId: string
): Promise<string> => {
    try {
        const projectRoot = path.resolve(__dirname, "../../..");
        const uploadDir = path.join(projectRoot, "public", "uploads", "audio");

        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 8);
        const filename = `speech_${userId}_${timestamp}_${random}.${format || 'mp3'}`;
        const filepath = path.join(uploadDir, filename);

        // ✅ Convert Buffer to Uint8Array for TypeScript compatibility
        const uint8Array = new Uint8Array(audioData);
        fs.writeFileSync(filepath, uint8Array);

        return `/uploads/audio/${filename}`;

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