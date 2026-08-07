// services/ai/aiService.ts
import { Response } from "express";
import { errorResponseHandler } from "../../lib/errors/error-response-handler";
import { httpStatusCode } from "../../lib/constant";
import { extractTextFromFile } from "../../utils/fileProcessor";
import { aiGenerateService as aiGenerateCore } from "./aiGenerateService";
import { aiContentModel } from "../../models/aiContentModel/aiContentModel";
import { usersModel } from "../../models/user/user-schema";

// Main AI Generation Service
export const aiGenerateService = async (payload: any, res: Response) => {
    try {
        const { title, type, tone, includeOutline, userId, file } = payload;

        console.log("🚀 AI Generation Service Started");
        console.log("📦 Payload received:", {
            title: payload.title,
            type: payload.type,
            tone: payload.tone,
            userId: payload.userId,
            fileName: payload.file?.originalname,
            fileSize: payload.file?.size
        });

        // Validate
        if (!title) {
            console.log("❌ Validation failed: Title is required");
            return errorResponseHandler("Title is required", httpStatusCode.BAD_REQUEST, res);
        }
        if (!type) {
            console.log("❌ Validation failed: Document type is required");
            return errorResponseHandler("Document type is required", httpStatusCode.BAD_REQUEST, res);
        }
        if (!file) {
            console.log("❌ Validation failed: Source document is required");
            return errorResponseHandler("Source document is required", httpStatusCode.BAD_REQUEST, res);
        }

        console.log("✅ Validation passed");

        // ✅ GET USER AND CHECK CREDITS
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
                "Insufficient credits. You need at least 1 credit to generate content. Please top up your credits.",
                httpStatusCode.PAYMENT_REQUIRED,
                res
            );
        }

        // Extract text from file
        console.log("📄 Extracting text from file:", file.originalname);
        const fileContent = await extractTextFromFile(file);
        if (!fileContent || fileContent.length < 50) {
            console.log(`❌ File content too short: ${fileContent?.length || 0} characters`);
            return errorResponseHandler(
                "File content is too short or unreadable",
                httpStatusCode.BAD_REQUEST,
                res
            );
        }
        console.log(`✅ File content extracted: ${fileContent.length} characters, ${fileContent.split(/\s+/).length} words`);

        // Generate document FIRST to get the cost
        console.log("🤖 Generating document with AI...");
        console.log("📝 Generation params:", {
            title,
            type,
            tone: tone || "neutral",
            includeOutline: includeOutline === "true" || includeOutline === true,
            userId
        });

        const result = await aiGenerateCore({
            title,
            type,
            tone: tone || "neutral",
            includeOutline: includeOutline === "true" || includeOutline === true,
            fileContent,
            userId
        });

        console.log("✅ Document generated successfully");
        console.log("📊 Generation result:", {
            hasContent: !!result.content,
            contentLength: result.content?.length || 0,
            wordCount: result.wordCount,
            provider: result.provider,
            modelUsed: result.modelUsed,
            costEstimate: result.costEstimate,
            tokensUsed: result.tokensUsed
        });

        // ============================================
        // ✅ CREDIT DEDUCTION LOGIC - ALWAYS DEDUCT
        // ============================================
        
        // ✅ Get ZAR cost from AI response
        const zarCost = result.costEstimate?.zar || 0;
        
        // ✅ Calculate credits to deduct (zarCost * 5)
        let creditsToDeduct = zarCost * 5;
        
        // ✅ Force minimum deduction of 1 credit
        if (creditsToDeduct < 1 && result.content && result.content.length > 0) {
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
                            action: 'AI_WRITING_GENERATION',
                            amount: -roundedCredits,
                            balance: newCredits,
                            description: `AI Writing generation: "${title}" (${type}) - Cost: ${roundedCredits} credits`,
                            timestamp: new Date(),
                            metadata: {
                                documentType: type,
                                title: title,
                                zarCost: zarCost,
                                multiplier: 5,
                                creditsDeducted: roundedCredits,
                                contentLength: result.content?.length || 0,
                                wordCount: result.wordCount || 0,
                                modelUsed: result.modelUsed || 'unknown',
                                provider: result.provider || 'unknown',
                                tokensUsed: result.tokensUsed
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

        // ✅ Save generated content with cost and credit info
        try {
            console.log("💾 Saving generated content to database...");
            const newContent = new aiContentModel({
                userId,
                contentType: "writing",
                title: title.trim(),
                description: `Document generated: ${title}`,
                content: result.content,
                provider: result.provider || "openai",
                aiModel: result.modelUsed || "gpt-4o",
                charCount: result.wordCount || 0,
                cost: {
                    usd: result.costEstimate?.usd || 0,
                    zar: zarCost,
                    credits: roundedCredits
                },
                status: "Pending",
                metadata: {
                    type,
                    tone: tone || "neutral",
                    includeOutline: includeOutline === "true" || includeOutline === true,
                    outline: result.outline,
                    wordCount: result.wordCount,
                    tokensUsed: result.tokensUsed,
                    fileName: file.originalname,
                    fileType: file.mimetype,
                    generatedAt: new Date(),
                    creditsUsed: roundedCredits,
                    zarCost: zarCost,
                    multiplier: 5
                },
            });

            await newContent.save();
            console.log(`✅ Document saved with ID: ${newContent._id}`);
            console.log(`📄 Document details:`, {
                id: newContent._id,
                title: newContent.title,
                type: newContent.metadata.type,
                creditsUsed: newContent.metadata.creditsUsed
            });
        } catch (dbError) {
            console.error("❌ Database save error:", dbError);
        }

        // ✅ Return success with credit info
        console.log("🎉 AI Generation completed successfully!");
        console.log("📊 Final summary:", {
            documentTitle: title,
            documentType: type,
            creditsUsed: roundedCredits,
            creditsRemaining: newCredits,
            zarCost: zarCost,
            multiplier: 5
        });

        return {
            success: true,
            message: "Document generated successfully",
            data: {
                ...result,
                cost: {
                    zar: zarCost,
                    credits: roundedCredits
                },
                creditsUsed: roundedCredits,
                creditsRemaining: newCredits,
                multiplier: 5
            }
        };

    } catch (error: any) {
        console.error("❌ AI Generation error:", error);
        console.error("❌ Error stack:", error.stack);
        console.error("❌ Error details:", {
            message: error.message,
            name: error.name,
            code: error.code
        });
        return errorResponseHandler(
            error.message || "Failed to generate document",
            httpStatusCode.INTERNAL_SERVER_ERROR,
            res
        );
    }
};

// ============================================
// ADDITIONAL SERVICES
// ============================================

// Cost Estimates Service
export const getCostEstimatesService = async (params: any, res: Response) => {
    try {
        const { users, draftsPerUser } = params;
        const exchangeRate = 16.6;

        const aiCosts = {
            claudeSonnet: {
                perDraft: 0.09,
                monthlyEstimate: (users * draftsPerUser * 0.09) * exchangeRate,
            },
            gpt4o: {
                perSummary: 0.05,
                monthlyEstimate: (users * draftsPerUser * 0.05) * exchangeRate,
            },
            haiku: {
                perBackground: 0.01,
                monthlyEstimate: (users * draftsPerUser * 0.01) * exchangeRate,
            },
        };

        const support = {
            lean: { hours: 8, monthlyZAR: 7968 },
            standard: { hours: 16, monthlyZAR: 15936 },
            enterprise: { hours: 32, monthlyZAR: 42496 },
        };

        const cloudInfrastructure = { monthlyZAR: 2440 };

        const total = {
            lean: Math.round(aiCosts.claudeSonnet.monthlyEstimate + aiCosts.gpt4o.monthlyEstimate + aiCosts.haiku.monthlyEstimate + support.lean.monthlyZAR + cloudInfrastructure.monthlyZAR),
            standard: Math.round(aiCosts.claudeSonnet.monthlyEstimate + aiCosts.gpt4o.monthlyEstimate + aiCosts.haiku.monthlyEstimate + support.standard.monthlyZAR + cloudInfrastructure.monthlyZAR),
            enterprise: Math.round(aiCosts.claudeSonnet.monthlyEstimate + aiCosts.gpt4o.monthlyEstimate + aiCosts.haiku.monthlyEstimate + support.enterprise.monthlyZAR + cloudInfrastructure.monthlyZAR),
        };

        return {
            success: true,
            data: {
                scenario: `${users} users, ${draftsPerUser} drafts/user/month`,
                exchangeRate,
                aiCosts,
                support,
                cloudInfrastructure,
                total,
                planningNumber: {
                    zar: total.standard,
                    usd: Math.round(total.standard / exchangeRate),
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

// AI Cost Estimates Service
export const getAICostEstimatesService = async (params: any, res: Response) => {
    try {
        const exchangeRate = 16.6;
        const estimates = {
            models: [
                {
                    name: "Claude Sonnet 4.6",
                    description: "Deep research drafts, long documents, voice matching",
                    costPerDraft: 0.09,
                    costPerDraftZAR: Math.round(0.09 * exchangeRate * 100) / 100,
                    bestFor: "Final quality drafts",
                },
                {
                    name: "GPT-4o",
                    description: "Structured summaries, classification, reliable outputs",
                    costPerTask: 0.05,
                    costPerTaskZAR: Math.round(0.05 * exchangeRate * 100) / 100,
                    bestFor: "Quick summaries & sorting",
                },
                {
                    name: "Claude Haiku 4.5",
                    description: "Fast, simple tasks — routing, tagging, extraction",
                    costPerTask: 0.01,
                    costPerTaskZAR: Math.round(0.01 * exchangeRate * 100) / 100,
                    bestFor: "Background processing",
                },
                {
                    name: "Google Gemini Flash",
                    description: "High-volume batch work at very low cost",
                    costPerTask: 0.006,
                    costPerTaskZAR: Math.round(0.006 * exchangeRate * 100) / 100,
                    bestFor: "Bulk processing only",
                }
            ],
            recommendations: {
                hybrid: "Use Claude Sonnet 4.6 for final drafts and GPT-4o for summaries. Saves approximately 30-40% on the AI bill",
                costSavings: "~R800–R2,000 per month"
            },
            monthlyEstimates: {
                "10 users, 10 drafts": Math.round(10 * 10 * 0.09 * exchangeRate),
                "50 users, 20 drafts": Math.round(50 * 20 * 0.09 * exchangeRate),
                "100 users, 50 drafts": Math.round(100 * 50 * 0.09 * exchangeRate),
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

// Claude Service
export const generateWithClaudeService = async (payload: any, res: Response) => {
    try {
        const { content, title, type, tone } = payload;
        return {
            success: true,
            message: "Document generated with Claude",
            data: {
                content: "Generated content from Claude",
                modelUsed: "claude-sonnet-4.6"
            }
        };
    } catch (error: any) {
        return errorResponseHandler(
            error.message || "Failed with Claude",
            httpStatusCode.INTERNAL_SERVER_ERROR,
            res
        );
    }
};

// OpenAI Service
export const generateWithOpenAIService = async (payload: any, res: Response) => {
    try {
        const { content, title, type, tone } = payload;
        return {
            success: true,
            message: "Document generated with OpenAI",
            data: {
                content: "Generated content from OpenAI",
                modelUsed: "gpt-4o"
            }
        };
    } catch (error: any) {
        return errorResponseHandler(
            error.message || "Failed with OpenAI",
            httpStatusCode.INTERNAL_SERVER_ERROR,
            res
        );
    }
};