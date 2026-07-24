// validation/ai-validation.ts
import { z } from "zod";

export const aiGenerateSchema = z.object({
    title: z.string().min(1, "Title is required").max(200, "Title too long"),
    type: z.enum([
        "policy-brief",
        "op-ed", 
        "impact-report",
        "speech",
        "press-release",
        "summary",
        "media-story",
        "blog-post"
    ]),
    tone: z.enum([
        "formal",
        "authoritative", 
        "accessible",
        "persuasive",
        "neutral"
    ]).default("neutral"),
    includeOutline: z.union([
        z.string().transform(val => val === "true" || val === "1"),
        z.boolean()
    ]).default(false),
});

export const aiCostEstimateSchema = z.object({
    users: z.string().optional().transform(val => parseInt(val) || 50),
    draftsPerUser: z.string().optional().transform(val => parseInt(val) || 20),
});