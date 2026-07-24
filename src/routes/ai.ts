// routes/index.ts - Add AI routes
import { Router } from "express";
import { checkAuth } from "src/middleware/check-auth";
import {uploadProfile} from "src/config/multerConfig";
import { generateDocument, getCostEstimates, getAICostEstimates, generateWithClaude, generateWithOpenAI } from "../controllers/ai/aiWritingController";
import { upload } from "src/config/aimulterConfig";

const router = Router();



// AI Writing Routes
router.post("/ai-writing/generate", checkAuth, upload.single("file"), generateDocument);
router.get("/ai-writing/cost-estimates", checkAuth, getCostEstimates);
router.get("/ai-writing/estimates", checkAuth, getAICostEstimates);
router.post("/ai-writing/claude", checkAuth, generateWithClaude);
router.post("/ai-writing/openai", checkAuth, generateWithOpenAI);

export { router }