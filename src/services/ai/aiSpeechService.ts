// services/ai/speech/aiSpeechService.ts
import { Response } from "express";
import { errorResponseHandler } from "../../lib/errors/error-response-handler";
import { httpStatusCode } from "../../lib/constant";
import { aiGenerateSpeechService } from "./aiGenerateSpeechService";
import { aiContentModel } from "../../models/aiContentModel/aiContentModel";
import { usersModel } from "../../models/user/user-schema";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

// ✅ Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================
// MAIN SPEECH GENERATION SERVICE (WITH CREDITS)
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
            description,
            author
        } = payload;

        console.log("🚀 Speech Generation Service Started");
        console.log("📦 Payload received:", {
            title,
            authority,
            clarity,
            academicRigor,
            accessibility,
            narrativeDepth,
            userId,
            fileName: file?.originalname,
            fileSize: file?.size,
            recordingDuration
        });

        // ✅ Validate
        if (!title) {
            console.log("❌ Validation failed: Title is required");
            return errorResponseHandler("Title is required", httpStatusCode.BAD_REQUEST, res);
        }

        if (!userId) {
            console.log("❌ Validation failed: User ID is required");
            return errorResponseHandler("User ID is required", httpStatusCode.BAD_REQUEST, res);
        }

        // ============================================
        // ✅ GET USER AND CHECK CREDITS
        // ============================================
        console.log(`🔍 Fetching user with ID: ${userId}`);
        const user = await usersModel.findById(userId);
        if (!user) {
            console.log("❌ User not found:", userId);
            return errorResponseHandler("User not found", httpStatusCode.NOT_FOUND, res);
        }

        // Get current credits
        let currentCredits = user.credits || 0;
        console.log(`👤 User found: ${user.email}`);
        console.log(`💰 Current credits: ${currentCredits}`);

        // ✅ CHECK IF USER HAS ENOUGH CREDITS (MINIMUM 1 CREDIT)
        if (currentCredits < 1) {
            console.log(`❌ Insufficient credits: ${currentCredits} < 1`);
            return errorResponseHandler(
                "Insufficient credits. You need at least 1 credit to generate speech. Please top up your credits.",
                httpStatusCode.PAYMENT_REQUIRED,
                res
            );
        }

        // ============================================
        // ✅ GENERATE SPEECH
        // ============================================
        console.log("🤖 Generating speech with AI...");
        console.log("📝 Generation params:", {
            title,
            authority,
            clarity,
            academicRigor,
            accessibility,
            narrativeDepth,
            userId,
            preferredProvider
        });

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

        console.log("✅ Speech generated successfully");
        console.log("📊 Generation result:", {
            hasContent: !!result.text,
            contentLength: result.text?.length || 0,
            charCount: result.charCount,
            provider: result.provider,
            model: result.model,
            cost: result.cost
        });

        // ============================================
        // ✅ CREDIT DEDUCTION LOGIC (SAME AS WRITING)
        // ============================================
        
        // ✅ Get ZAR cost from AI response
        const zarCost = result.cost?.zar || 0;
        
        // ✅ Calculate credits to deduct (zarCost * 5)
        let creditsToDeduct = zarCost * 5;
        
        // ✅ Force minimum deduction of 1 credit
        if (creditsToDeduct < 1 && result.text && result.text.length > 0) {
            creditsToDeduct = 1;
            console.log(`💰 Minimum credit deduction applied: 1 credit (zarCost was ${zarCost})`);
        }

        // ✅ Round to 2 decimal places
        const roundedCredits = Math.round(creditsToDeduct * 100) / 100;

        console.log("💰 Credit calculation:");
        console.log(`   - ZAR Cost: ${zarCost}`);
        console.log(`   - Multiplier: 5`);
        console.log(`   - Credits to deduct: ${zarCost} × 5 = ${creditsToDeduct}`);
        console.log(`   - Rounded credits: ${roundedCredits}`);

        // ✅ CHECK IF USER HAS ENOUGH CREDITS AFTER CALCULATION
        if (currentCredits < roundedCredits) {
            console.log(`❌ Insufficient credits: ${currentCredits} < ${roundedCredits}`);
            return errorResponseHandler(
                `Insufficient credits. You have ${currentCredits} credits, but need ${roundedCredits} credits for this generation. Please top up your credits.`,
                httpStatusCode.PAYMENT_REQUIRED,
                res
            );
        }

        // ✅ DEDUCT CREDITS AFTER SUCCESSFUL GENERATION
        let newCredits = currentCredits - roundedCredits;
        console.log(`💳 Credits before deduction: ${currentCredits}`);
        console.log(`💳 Credits after deduction: ${newCredits}`);
        console.log(`💳 Difference: ${roundedCredits} credits`);

        try {
            console.log(`🔄 Updating user credits in database...`);
            
            const updatedUser = await usersModel.findByIdAndUpdate(
                userId,
                {
                    $set: {
                        credits: newCredits
                    },
                    $push: {
                        creditHistory: {
                            action: 'AI_SPEECH_GENERATION',
                            amount: -roundedCredits,
                            balance: newCredits,
                            description: `AI Speech generation: "${title}" - Cost: ${roundedCredits} credits`,
                            timestamp: new Date(),
                            metadata: {
                                title: title,
                                zarCost: zarCost,
                                multiplier: 5,
                                creditsDeducted: roundedCredits,
                                charCount: result.charCount || 0,
                                duration: result.duration,
                                modelUsed: result.model || 'unknown',
                                provider: result.provider || 'unknown'
                            }
                        }
                    }
                },
                { new: true, runValidators: true }
            );

            if (!updatedUser) {
                console.error(`❌ User not found during credit update: ${userId}`);
            } else {
                console.log(`✅ Credits deducted successfully!`);
                console.log(`   - User: ${updatedUser.email}`);
                console.log(`   - Deducted: ${roundedCredits} credits`);
                console.log(`   - New balance: ${updatedUser.credits}`);
                console.log(`   - Previous balance: ${currentCredits}`);
            }

        } catch (dbError) {
            console.error("❌ Credit deduction error:", dbError);
            console.log("⚠️ Generation succeeded but credit deduction failed!");
        }

        // ============================================
        // ✅ SAVE AUDIO FILE
        // ============================================
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

        // ============================================
        // ✅ SAVE TO DATABASE
        // ============================================
        let savedContent = null;
        try {
            console.log("💾 Saving generated content to database...");
            
            // Check if content already exists
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
                existingContent.cost = {
                    usd: result.cost?.usd || 0,
                    zar: zarCost
                };
                existingContent.metadata = {
                    ...existingContent.metadata,
                    inputMethod: payload.inputMethod || 'ai',
                    ...(file && { fileName: file.originalname }),
                    ...(recordingDuration && { recordingDuration: Number(recordingDuration) }),
                    lastGeneratedAt: new Date().toISOString(),
                    creditsUsed: roundedCredits,
                    zarCost: zarCost,
                    multiplier: 5
                };
                existingContent.status = 'Pending';

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
                    aiModel: result.model,
                    charCount: result.charCount,
                    cost: {
                        usd: result.cost?.usd || 0,
                        zar: zarCost
                    },
                    author: author || 'AI Assistant',
                    status: 'Pending',
                    metadata: {
                        inputMethod: payload.inputMethod || 'ai',
                        ...(file && { fileName: file.originalname }),
                        ...(recordingDuration && { recordingDuration: Number(recordingDuration) }),
                        generatedAt: new Date().toISOString(),
                        creditsUsed: roundedCredits,
                        zarCost: zarCost,
                        multiplier: 5
                    }
                });

                await newContent.save();
                savedContent = newContent;
                console.log(`✅ Saved new speech: ${newContent.identifier}`);
            }

        } catch (dbError: any) {
            console.error("❌ Database save error:", dbError);
        }

        // ============================================
        // ✅ BUILD RESPONSE
        // ============================================
        const responseData: any = {
            audioUrl: audioUrl,
            duration: result.duration,
            format: result.format || "mp3",
            size: result.audioData.length,
            provider: result.provider,
            model: result.model,
            charCount: result.charCount,
            text: result.text,
            cost: {
                usd: result.cost?.usd || 0,
                zar: zarCost,
                credits: roundedCredits
            },
            creditsUsed: roundedCredits,
            creditsRemaining: newCredits,
            analysis: result.analysis,
            metadata: {
                title: title,
                generatedAt: new Date().toISOString()
            }
        };

        if (savedContent) {
            responseData.database = {
                id: savedContent._id,
                identifier: savedContent.identifier,
                status: savedContent.status,
                savedAt: savedContent.createdAt
            };
        }

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

        console.log("🎉 Speech generation completed successfully!");
        console.log("📊 Final summary:", {
            title,
            creditsUsed: roundedCredits,
            creditsRemaining: newCredits,
            zarCost: zarCost,
            multiplier: 5
        });

        return {
            success: true,
            message: savedContent ? "Speech generated and saved successfully" : "Speech generated successfully",
            data: responseData
        };

    } catch (error: any) {
        console.error("❌ Speech generation error:", error);
        console.error("❌ Error stack:", error.stack);
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

// services/ai/speech/aiSpeechService.ts

const saveAudioFile = async (
    audioData: Buffer,
    format: string,
    userId: string
): Promise<string> => {
    try {
        const projectRoot = path.resolve(__dirname, "../../..");
        const uploadDir = path.join(projectRoot, "public", "uploads", "audio");

        // ✅ Use fs.promises for async operations
        await fs.promises.mkdir(uploadDir, { recursive: true });

        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 8);
        const filename = `speech_${userId}_${timestamp}_${random}.${format || 'mp3'}`;
        const filepath = path.join(uploadDir, filename);

        // ✅ FIX: Convert Buffer to Uint8Array
        const uint8Array = new Uint8Array(audioData);
        await fs.promises.writeFile(filepath, uint8Array);

        console.log(`✅ Audio file saved: ${filename}`);
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
        console.error("❌ Cost estimates error:", error);
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
                            bestFor: "All-in-one OpenAI solution"
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
                            bestFor: "Claude's natural language generation with TTS"
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
        console.error("❌ AI cost estimates error:", error);
        return errorResponseHandler(
            error.message || "Failed to get AI cost estimates",
            httpStatusCode.INTERNAL_SERVER_ERROR,
            res
        );
    }
};