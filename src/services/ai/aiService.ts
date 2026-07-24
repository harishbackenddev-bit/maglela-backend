// services/ai/aiService.ts
import { Response } from "express";
import { errorResponseHandler } from "../../lib/errors/error-response-handler";
import { httpStatusCode } from "../../lib/constant";
import { extractTextFromFile } from "../../utils/fileProcessor";
import { aiGenerateService as aiGenerateCore } from "./aiGenerateService";

// Main AI Generation Service
export const aiGenerateService = async (payload: any, res: Response) => {
    try {
        const { title, type, tone, includeOutline, userId, file } = payload;

        // Validate
        if (!title) {
            return errorResponseHandler("Title is required", httpStatusCode.BAD_REQUEST, res);
        }
        if (!type) {
            return errorResponseHandler("Document type is required", httpStatusCode.BAD_REQUEST, res);
        }
        if (!file) {
            return errorResponseHandler("Source document is required", httpStatusCode.BAD_REQUEST, res);
        }

        // Extract text from file
        const fileContent = await extractTextFromFile(file);
        if (!fileContent || fileContent.length < 50) {
            return errorResponseHandler("File content is too short or unreadable", httpStatusCode.BAD_REQUEST, res);
        }

        // Generate document
        const result = await aiGenerateCore({
            title,
            type,
            tone: tone || "neutral",
            includeOutline: includeOutline === "true" || includeOutline === true,
            fileContent,
            userId
        });

        return {
            success: true,
            message: "Document generated successfully",
            data: result
        };

    } catch (error: any) {
        console.error("AI Generation error:", error);
        return errorResponseHandler(
            error.message || "Failed to generate document",
            httpStatusCode.INTERNAL_SERVER_ERROR,
            res
        );
    }
};

// Cost Estimates Service
export const getCostEstimatesService = async (params: any, res: Response) => {
    try {
        const { users, draftsPerUser } = params;
        const exchangeRate = 16.6;

        // AI Costs
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

        // Support Plans
        const support = {
            lean: { hours: 8, monthlyZAR: 7968 },
            standard: { hours: 16, monthlyZAR: 15936 },
            enterprise: { hours: 32, monthlyZAR: 42496 },
        };

        // Infrastructure
        const cloudInfrastructure = { monthlyZAR: 2440 };

        // Totals
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
        // Implementation using Claude API
        // Import and use claudeService from your existing structure
        
        // For now, return a placeholder response
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
        // Implementation using OpenAI API
        // Import and use openaiService from your existing structure
        
        // For now, return a placeholder response
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