// validation/ai-speech-validation.ts
import { z } from "zod";

export const aiSpeechGenerateSchema = z.object({
    // Required fields
    title: z.string().min(3, "Title must be at least 3 characters"),
    
    // Analysis metrics (optional with defaults)
    authority: z.string().or(z.number()).optional().default("0"),
    clarity: z.string().or(z.number()).optional().default("0"),
    academicRigor: z.string().or(z.number()).optional().default("0"),
    accessibility: z.string().or(z.number()).optional().default("0"),
    narrativeDepth: z.string().or(z.number()).optional().default("0"),
    
    // Optional fields
    file: z.any().optional(), // Source document (binary)
    audio: z.string().optional(), // Audio reference
    recordingDuration: z.string().or(z.number()).optional(), // Duration in seconds
});

export const audioTranscriptionSchema = z.object({
    file: z.any().refine((file) => file, "Audio file is required"),
    language: z.string().optional().default("en"),
});