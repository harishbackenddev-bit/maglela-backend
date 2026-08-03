// controllers/ai/aiWritingController.ts
import { Request, Response } from "express";
import { httpStatusCode } from "../../lib/constant";
import { errorParser } from "../../lib/errors/error-response-handler";
import { formatZodErrors } from "../../validation/format-zod-errors";
import { aiGenerateSchema } from "../../validation/ai-validation";
import { 
    aiGenerateService, 
    getCostEstimatesService,
    getAICostEstimatesService,
    generateWithClaudeService,
    generateWithOpenAIService
} from "../../services/ai/aiService";

export const generateDocument = async (req: Request, res: Response) => {
    try {
        const validation = aiGenerateSchema.safeParse({
            ...req.body,
            file: req.file
        });
        
        if (!validation.success) {
            return res.status(httpStatusCode.BAD_REQUEST).json({ 
                success: false, 
                message: formatZodErrors(validation.error) 
            });
        }

        const userId = (req as any).currentUser;
        const response = await aiGenerateService({
            ...req.body,
            userId,
            file: req.file
        }, res);

        if (response.success) {
            return res.status(httpStatusCode.CREATED).json(response);
        }
        
        // If response is not success but also not handled by errorResponseHandler
        return res.status(httpStatusCode.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: "Failed to generate document"
        });

    } catch (error: any) {
        const { code, message } = errorParser(error);
        return res.status(code || httpStatusCode.INTERNAL_SERVER_ERROR).json({ 
            success: false, 
            message: message || "An error occurred" 
        });
    }
};

export const getCostEstimates = async (req: Request, res: Response) => {
    try {
        const { users, draftsPerUser } = req.query;
        const response = await getCostEstimatesService({
            users: Number(users) || 50,
            draftsPerUser: Number(draftsPerUser) || 20
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

export const getAICostEstimates = async (req: Request, res: Response) => {
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

export const generateWithClaude = async (req: Request, res: Response) => {
    try {
        const validation = aiGenerateSchema.safeParse(req.body);
        if (!validation.success) {
            return res.status(httpStatusCode.BAD_REQUEST).json({ 
                success: false, 
                message: formatZodErrors(validation.error) 
            });
        }

        const userId = (req as any).currentUser;
        const response = await generateWithClaudeService({
            ...req.body,
            userId
        }, res);

        if (response.success) {
            return res.status(httpStatusCode.CREATED).json(response);
        }
        
        return res.status(httpStatusCode.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: "Failed to generate with Claude"
        });

    } catch (error: any) {
        const { code, message } = errorParser(error);
        return res.status(code || httpStatusCode.INTERNAL_SERVER_ERROR).json({ 
            success: false, 
            message: message || "An error occurred" 
        });
    }
};

export const generateWithOpenAI = async (req: Request, res: Response) => {
    try {
        const validation = aiGenerateSchema.safeParse(req.body);
        if (!validation.success) {
            return res.status(httpStatusCode.BAD_REQUEST).json({ 
                success: false, 
                message: formatZodErrors(validation.error) 
            });
        }

        const userId = (req as any).currentUser;
        const response = await generateWithOpenAIService({
            ...req.body,
            userId
        }, res);

        if (response.success) {
            return res.status(httpStatusCode.CREATED).json(response);
        }
        
        return res.status(httpStatusCode.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: "Failed to generate with OpenAI"
        });

    } catch (error: any) {
        const { code, message } = errorParser(error);
        return res.status(code || httpStatusCode.INTERNAL_SERVER_ERROR).json({ 
            success: false, 
            message: message || "An error occurred" 
        });
    }
};