// controllers/ai/aiSpeechController.ts
import { Request, Response } from "express";
import { httpStatusCode } from "../../lib/constant";
import { errorParser } from "../../lib/errors/error-response-handler";
import { formatZodErrors } from "../../validation/format-zod-errors";
import { aiSpeechGenerateSchema } from "../../validation/ai-speech-validation";
import { 
    generateSpeechService,
    getCostEstimatesService,
    getAICostEstimatesService
} from "../../services/ai/aiSpeechService";
import { extractTextFromFile } from "../../utils/fileProcessor";

// ============================================
// GENERATE SPEECH (Like generateDocument)
// ============================================

export const generateSpeech = async (req: Request, res: Response) => {
    try {
        const validation = aiSpeechGenerateSchema.safeParse({
            title: req.body.title,
            authority: req.body.authority,
            clarity: req.body.clarity,
            academicRigor: req.body.academicRigor,
            accessibility: req.body.accessibility,
            narrativeDepth: req.body.narrativeDepth,
            file: req.file,
            audio: req.body.audio,
            recordingDuration: req.body.recordingDuration
        });

        if (!validation.success) {
            return res.status(httpStatusCode.BAD_REQUEST).json({ 
                success: false, 
                message: formatZodErrors(validation.error) 
            });
        }

        const userId = (req as any).currentUser;
        
        // Extract file content if file is uploaded
        let fileContent = "";
        if (req.file) {
            try {
                fileContent = await extractTextFromFile(req.file);
            } catch (error) {
                console.error("File extraction error:", error);
            }
        }

        const response = await generateSpeechService({
            title: req.body.title,
            authority: Number(req.body.authority) || 0,
            clarity: Number(req.body.clarity) || 0,
            academicRigor: Number(req.body.academicRigor) || 0,
            accessibility: Number(req.body.accessibility) || 0,
            narrativeDepth: Number(req.body.narrativeDepth) || 0,
            fileContent: fileContent,
            file: req.file,
            audio: req.body.audio,
            recordingDuration: req.body.recordingDuration,
            userId: userId
        }, res);

        if (response.success) {
            return res.status(httpStatusCode.CREATED).json(response);
        }

        return res.status(httpStatusCode.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: "Failed to generate speech"
        });

    } catch (error: any) {
        const { code, message } = errorParser(error);
        return res.status(code || httpStatusCode.INTERNAL_SERVER_ERROR).json({ 
            success: false, 
            message: message || "An error occurred" 
        });
    }
};

// ============================================
// COST ESTIMATES (Like getCostEstimates)
// ============================================

export const getSpeechCostEstimates = async (req: Request, res: Response) => {
    try {
        const { users, minutesPerUser } = req.query;
        const response = await getCostEstimatesService({
            users: Number(users) || 50,
            minutesPerUser: Number(minutesPerUser) || 30
        }, res);

        if (response.success) {
            return res.status(httpStatusCode.OK).json(response);
        }

        return res.status(httpStatusCode.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: "Failed to get cost estimates"
        });

    } catch (error: any) {
        const { code, message } = errorParser(error);
        return res.status(code || httpStatusCode.INTERNAL_SERVER_ERROR).json({ 
            success: false, 
            message: message || "An error occurred" 
        });
    }
};

// ============================================
// AI COST ESTIMATES (Like getAICostEstimates)
// ============================================

export const getAISpeechCostEstimates = async (req: Request, res: Response) => {
    try {
        const response = await getAICostEstimatesService(req.query, res);
        if (response.success) {
            return res.status(httpStatusCode.OK).json(response);
        }

        return res.status(httpStatusCode.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: "Failed to get AI cost estimates"
        });

    } catch (error: any) {
        const { code, message } = errorParser(error);
        return res.status(code || httpStatusCode.INTERNAL_SERVER_ERROR).json({ 
            success: false, 
            message: message || "An error occurred" 
        });
    }
};

// ============================================
// GENERATE WITH CLAUDE (Like generateWithClaude)
// ============================================

export const generateWithClaudeSpeech = async (req: Request, res: Response) => {
    try {
        const validation = aiSpeechGenerateSchema.safeParse({
            title: req.body.title,
            authority: req.body.authority,
            clarity: req.body.clarity,
            academicRigor: req.body.academicRigor,
            accessibility: req.body.accessibility,
            narrativeDepth: req.body.narrativeDepth,
            file: req.file,
            audio: req.body.audio,
            recordingDuration: req.body.recordingDuration
        });

        if (!validation.success) {
            return res.status(httpStatusCode.BAD_REQUEST).json({ 
                success: false, 
                message: formatZodErrors(validation.error) 
            });
        }

        const userId = (req as any).currentUser;
        
        let fileContent = "";
        if (req.file) {
            try {
                fileContent = await extractTextFromFile(req.file);
            } catch (error) {
                console.error("File extraction error:", error);
            }
        }

        const response = await generateSpeechService({
            title: req.body.title,
            authority: Number(req.body.authority) || 0,
            clarity: Number(req.body.clarity) || 0,
            academicRigor: Number(req.body.academicRigor) || 0,
            accessibility: Number(req.body.accessibility) || 0,
            narrativeDepth: Number(req.body.narrativeDepth) || 0,
            fileContent: fileContent,
            file: req.file,
            audio: req.body.audio,
            recordingDuration: req.body.recordingDuration,
            userId: userId,
            preferredProvider: 'anthropic' // Force Claude
        }, res);

        if (response.success) {
            return res.status(httpStatusCode.CREATED).json(response);
        }

        return res.status(httpStatusCode.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: "Failed to generate with Claude Speech"
        });

    } catch (error: any) {
        const { code, message } = errorParser(error);
        return res.status(code || httpStatusCode.INTERNAL_SERVER_ERROR).json({ 
            success: false, 
            message: message || "An error occurred" 
        });
    }
};

// ============================================
// GENERATE WITH OPENAI (Like generateWithOpenAI)
// ============================================

export const generateWithOpenAISpeech = async (req: Request, res: Response) => {
    try {
        const validation = aiSpeechGenerateSchema.safeParse({
            title: req.body.title,
            authority: req.body.authority,
            clarity: req.body.clarity,
            academicRigor: req.body.academicRigor,
            accessibility: req.body.accessibility,
            narrativeDepth: req.body.narrativeDepth,
            file: req.file,
            audio: req.body.audio,
            recordingDuration: req.body.recordingDuration
        });

        if (!validation.success) {
            return res.status(httpStatusCode.BAD_REQUEST).json({ 
                success: false, 
                message: formatZodErrors(validation.error) 
            });
        }

        const userId = (req as any).currentUser;
        
        let fileContent = "";
        if (req.file) {
            try {
                fileContent = await extractTextFromFile(req.file);
            } catch (error) {
                console.error("File extraction error:", error);
            }
        }

        const response = await generateSpeechService({
            title: req.body.title,
            authority: Number(req.body.authority) || 0,
            clarity: Number(req.body.clarity) || 0,
            academicRigor: Number(req.body.academicRigor) || 0,
            accessibility: Number(req.body.accessibility) || 0,
            narrativeDepth: Number(req.body.narrativeDepth) || 0,
            fileContent: fileContent,
            file: req.file,
            audio: req.body.audio,
            recordingDuration: req.body.recordingDuration,
            userId: userId,
            preferredProvider: 'openai' // Force OpenAI
        }, res);

        if (response.success) {
            return res.status(httpStatusCode.CREATED).json(response);
        }

        return res.status(httpStatusCode.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: "Failed to generate with OpenAI Speech"
        });

    } catch (error: any) {
        const { code, message } = errorParser(error);
        return res.status(code || httpStatusCode.INTERNAL_SERVER_ERROR).json({ 
            success: false, 
            message: message || "An error occurred" 
        });
    }
};