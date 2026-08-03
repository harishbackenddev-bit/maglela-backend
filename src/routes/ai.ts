// routes/aiRoutes.ts
import { Router } from "express";
import { checkAuth } from "../middleware/check-auth";
import { upload } from "../config/aimulterConfig";

// AI Writing Controllers
import {
    generateDocument,
    getCostEstimates as getWritingCosts,
    getAICostEstimates,
    generateWithClaude,
    generateWithOpenAI as generateWithOpenAIWriting
} from "../controllers/ai/aiWritingController";

// AI Speech Controllers
import {
    generateSpeech,
    getSpeechCostEstimates,
    getAISpeechCostEstimates,
    generateWithClaudeSpeech,
    generateWithOpenAISpeech
} from "../controllers/ai/aiSpeechController";

const router = Router();

// ============================================
// AI WRITING ROUTES
// ============================================
router.post("/ai-writing/generate", checkAuth, upload.single("file"), generateDocument);
router.get("/ai-writing/cost-estimates", checkAuth, getWritingCosts);
router.get("/ai-writing/estimates", checkAuth, getAICostEstimates);
router.post("/ai-writing/claude", checkAuth, generateWithClaude);
router.post("/ai-writing/openai", checkAuth, generateWithOpenAIWriting);

// ============================================
// AI SPEECH ROUTES (Same Pattern as Writing)
// ============================================
router.post("/ai-speech/generate", checkAuth, upload.single("file"), generateSpeech);
router.get("/ai-speech/cost-estimates", checkAuth, getSpeechCostEstimates);
router.get("/ai-speech/estimates", checkAuth, getAISpeechCostEstimates);
router.post("/ai-speech/claude", checkAuth, generateWithClaudeSpeech);
router.post("/ai-speech/openai", checkAuth, generateWithOpenAISpeech);

export { router };